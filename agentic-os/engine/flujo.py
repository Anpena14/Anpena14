"""Flujo de una tarea: skill registrada → solo la ficha autorizada → agente elegido → evidencia → propuesta en la bandeja."""
import datetime as dt
import hashlib
import os
import re
import threading

from . import base, conectores

MAX_CICLOS = 3  # misma regla que Pulso: máximo tres ciclos por encargo
SECCIONES = ("## Resultado", "## Cierre", "## Criterio de cierre")
EN_CURSO = set()
_LOCK = threading.Lock()

# Lo que nunca debe salir en un encargo (depuración): credenciales, correos, enlaces, cifras de dinero, rutas privadas.
PATRONES_PRIVADOS = {
    "correo electrónico": r"[\w.+-]+@[\w-]+\.[\w.]+",
    "enlace web": r"https?://\S+",
    "cifra de dinero": r"(?:RD\$|US\$|USD|DOP|\$)\s?\d[\d.,]*",
    "credencial o token": r"\b(?:sk-[A-Za-z0-9]{10,}|ghp_[A-Za-z0-9]{10,}|xox[abp]-[A-Za-z0-9-]{10,}|AIza[0-9A-Za-z_-]{20,})",
    "ruta privada": r"(?:/Users/|~/|[A-Z]:\\\\Users)",
}


def revisar_privacidad(texto):
    return [nombre for nombre, p in PATRONES_PRIVADOS.items() if re.search(p, texto)]


def sha(texto):
    return hashlib.sha256(texto.encode("utf-8")).hexdigest()


def cargar_fichas(skill):
    c = base.config()
    autorizadas = c.get("fichas_autorizadas", {})
    fichas, errores = {}, []
    for nombre in skill["fichas"]:
        rel = autorizadas.get(nombre)
        if not rel:
            errores.append(f"La ficha «{nombre}» no está autorizada en config.json para el piloto.")
            continue
        ruta = os.path.join(c["boveda_abs"], rel)
        if not os.path.isfile(ruta):
            errores.append(f"No existe la ficha «{nombre}» en {rel}.")
            continue
        with open(ruta, encoding="utf-8") as fh:
            texto = fh.read()
        privados = revisar_privacidad(texto)
        if privados:
            errores.append(f"La ficha «{nombre}» contiene datos no depurados: {', '.join(privados)}.")
            continue
        fichas[nombre] = {"ruta": rel, "texto": texto, "sha256": sha(texto)}
    return fichas, errores


def validar_tarea(t):
    """Errores que impiden ejecutar (se muestran en el panel)."""
    errores = []
    skills, agentes = base.skills(), base.agentes()
    s = skills.get(t["skill"])
    if not s:
        return [f"Skill no registrada: {t['skill']}"]
    if t["agente"] not in agentes:
        errores.append(f"Agente no registrado: {t['agente']}")
    elif t["agente"] not in s["agentes"]:
        errores.append(f"La skill «{s['nombre']}» no admite al agente {agentes[t['agente']]['nombre']}.")
    if t["proyecto"] not in s["fichas"]:
        errores.append(f"La skill «{s['nombre']}» trabaja con {', '.join(s['fichas'])}, no con {t['proyecto']}.")
    privados = revisar_privacidad(t["encargo"] + "\n" + t["criterio"])
    if privados:
        errores.append(f"El encargo o el criterio contienen datos privados ({', '.join(privados)}). Depúralos.")
    if len([e for e in t["ejecuciones"] if not e.get("simulada")]) >= MAX_CICLOS:
        errores.append(f"La tarea ya usó sus {MAX_CICLOS} ciclos. Crea un encargo nuevo con lo aprendido.")
    _, err_fichas = cargar_fichas(s)
    return errores + err_fichas


def armar_encargo(t, s, a, fichas):
    partes = [
        f"Eres «{a['nombre']}» en el Agentic OS de Aneudys. Tu rol: {a['rol']}.",
        f"Skill: {s['nombre']}. {s['instrucciones']}",
        f"Profundidad: {t.get('profundidad', 'Normal')}.",
        "Alcance: trabaja SOLO con la ficha incluida abajo (también está como archivo en tu carpeta de trabajo). "
        "No ejecutes comandos, no modifiques archivos y no busques otras fuentes. No inventes datos: si falta algo, escribe «por confirmar».",
        f"\n# Encargo\nID: {t['id']} · Proyecto: {t['proyecto']}\n{t['encargo']}",
        f"\n# Criterio de cierre\n{t['criterio']}",
    ]
    for nombre, f in fichas.items():
        partes.append(f"\n# Ficha autorizada: {nombre}\n\n{f['texto']}")
    partes.append("""
# Formato de respuesta (obligatorio, en español)
## Resultado
(tu trabajo)

## Cierre
- Pedido:
- Decisión del usuario: pendiente de revisión
- Trabajo terminado y evidencia:
- Archivo, versión o chat:
- Bloqueo o riesgo concreto:
- Siguiente paso:

## Criterio de cierre
- Cumplido: sí / no / parcial
- Justificación:""")
    return "\n".join(partes)


def verificar_salida(r):
    """Un resultado es verificable si el agente terminó bien, respondió, siguió el formato y evaluó el criterio."""
    s = r["salida"] or ""
    checks = [
        {"nombre": "El agente terminó sin error", "ok": r["codigo"] == 0, "detalle": f"código {r['codigo']}"},
        {"nombre": "Hay respuesta", "ok": len(s.strip()) > 40, "detalle": f"{len(s)} caracteres"},
        {"nombre": "Sigue el formato (Resultado, Cierre, Criterio)", "ok": all(x in s for x in SECCIONES),
         "detalle": ", ".join(x[3:] for x in SECCIONES if x not in s) or "completo"},
        {"nombre": "Evalúa el criterio de cierre", "ok": bool(re.search(r"Cumplido:\s*\S", s)), "detalle": (re.search(r"Cumplido:\s*(.+)", s) or [None, "falta"])[1].strip()[:40]},
        {"nombre": "No dejó archivos en la carpeta aislada", "ok": not r.get("archivos_creados"), "detalle": ", ".join(r.get("archivos_creados") or []) or "ninguno"},
    ]
    return checks


def seccion(texto, titulo):
    m = re.search(rf"^##\s*{re.escape(titulo)}\s*$(.*?)(?=^##\s|\Z)", texto, re.M | re.S)
    return m.group(1).strip() if m else ""


def escribir_propuesta(t, e, a, salida, fichas, simulada):
    c = base.config()
    if not base.puede_escribir_boveda(c):
        return None, "La bóveda configurada no es de prueba (falta .boveda-de-prueba) y permitir_boveda_real es false."
    fecha = dt.date.today().isoformat()
    nombre = f"Propuesta {t['id']} ciclo {e['ciclo']}{' SIMULADA' if simulada else ''} {fecha}.md"
    enlaces = " · ".join(f"[[{n}]]" for n in fichas)
    cuerpo = f"""---
tags: [propuesta, agentes{', simulado' if simulada else ''}]
origen: {a['nombre']}
actualizado: {fecha}
tarea: {t['id']}
estado: pendiente de revisión
evidencia: "data/ejecuciones/{t['id']}/{e['id']}"
---

# Propuesta {t['id']} · {t['encargo'][:80]}

> [!warning] Propuesta {'SIMULADA ' if simulada else ''}pendiente de revisión
> Generada por **{a['nombre']}** con la skill «{base.skills()[t['skill']]['nombre']}». No se ha incorporado a la ficha oficial. Fichas usadas: {enlaces}.

- **Proyecto:** [[{t['proyecto']}]]
- **Encargo:** {t['encargo']}
- **Criterio de cierre:** {t['criterio']}
- **Evidencia:** carpeta `data/ejecuciones/{t['id']}/{e['id']}` del panel (encargo, salida y comprobaciones; SHA-256 de la salida `{e['salida_sha256'][:12]}…`).

## Resultado

{seccion(salida, 'Resultado') or '(sin sección Resultado)'}

## Cierre

{seccion(salida, 'Cierre') or '(sin sección Cierre)'}

## Criterio de cierre

{seccion(salida, 'Criterio de cierre') or '(sin evaluación)'}
"""
    ruta = os.path.join(c["boveda_abs"], "01-Inbox", nombre)
    base.escribir_texto(ruta, cuerpo)
    return os.path.relpath(ruta, c["boveda_abs"]), None


def ejecutar_tarea(tid):
    """Ejecuta un ciclo de la tarea. Pensado para correr en un hilo; el panel consulta el estado."""
    with _LOCK:
        if tid in EN_CURSO:
            return {"ok": False, "msg": "La tarea ya se está ejecutando."}
        EN_CURSO.add(tid)
    try:
        t = base.tarea(tid)
        if not t:
            return {"ok": False, "msg": "No existe la tarea."}
        errores = validar_tarea(t)
        if errores:
            base.actividad(f"{tid} no se ejecutó: {' '.join(errores)}", "error", tid)
            return {"ok": False, "msg": " ".join(errores)}
        s, a = base.skills()[t["skill"]], base.agentes()[t["agente"]]
        fichas, _ = cargar_fichas(s)
        encargo = armar_encargo(t, s, a, fichas)
        simulada = a["tipo"] == "simulador"
        ciclo = len(t["ejecuciones"]) + 1
        e = {"id": f"ciclo-{ciclo}", "ciclo": ciclo, "agente": t["agente"], "inicio": base.ahora(), "simulada": simulada}
        estado_previo = t["estado"]
        t["estado"] = "en_curso"
        base.guardar_tarea(t)
        base.actividad(f"{a['nombre']} empezó {tid} ({s['nombre']})", "inicio", tid)
        base.evento("sale", t["agente"], [t["proyecto"]], tid, f"{a['nombre']} va a {t['proyecto']}")
        base.evento("lee", t["agente"], list(fichas) or [t["proyecto"]], tid, f"{a['nombre']} lee la ficha de {t['proyecto']}")
        base.evento("trabaja", t["agente"], list(fichas) or [t["proyecto"]], tid, f"{a['nombre']} trabaja en {tid}")

        archivos = {f"ficha-{n}.md": f["texto"] for n, f in fichas.items()}
        r = conectores.ejecutar(t["agente"], encargo, archivos)
        checks = verificar_salida(r)
        verificable = all(c["ok"] for c in checks)
        carpeta = os.path.join(base.DATOS, "ejecuciones", tid, e["id"])
        base.escribir_texto(os.path.join(carpeta, "encargo.md"), encargo)
        base.escribir_texto(os.path.join(carpeta, "salida.md"), r["salida"] or "")
        if r["error"]:
            base.escribir_texto(os.path.join(carpeta, "errores.txt"), r["error"])
        e.update(fin=base.ahora(), codigo=r["codigo"], segundos=r["segundos"], argv=r["argv"], modelo=r["modelo"],
                 checks=checks, verificable=verificable and not simulada, encargo_sha256=sha(encargo),
                 salida_sha256=sha(r["salida"] or ""), fichas={n: {"ruta": f["ruta"], "sha256": f["sha256"]} for n, f in fichas.items()},
                 error=(r["error"] or "")[:500], carpeta=os.path.relpath(carpeta, base.RAIZ))
        if verificable:
            prop, err = escribir_propuesta(t, e, a, r["salida"], fichas, simulada)
            e["propuesta"], e["propuesta_error"] = prop, err
        base.escribir_json(os.path.join(carpeta, "evidencia.json"), e)
        t = base.tarea(tid)
        t["ejecuciones"].append(e)
        if simulada:
            t["estado"] = "simulada" if verificable else "fallida"
        elif verificable:
            t["estado"] = "lista_para_revision"
        else:
            t["estado"] = "fallida"
        base.guardar_tarea(t)
        fallos = [c["nombre"] for c in checks if not c["ok"]]
        if verificable and e.get("propuesta"):
            base.evento("escribe", t["agente"], ["01-Inbox", "Bandeja de entrada"], tid, f"{a['nombre']} deja una propuesta en la bandeja")
        base.evento("termina" if verificable else "falla", t["agente"], [], tid, base.ESTADOS[t["estado"]])
        base.actividad(f"{a['nombre']} terminó {tid}: {base.ESTADOS[t['estado']]}" + (f" · no superó: {', '.join(fallos)}" if fallos else ""),
                       "fin" if verificable else "error", tid)
        return {"ok": verificable, "estado": t["estado"], "previo": estado_previo}
    except Exception as ex:  # nunca perder la tarea: se marca fallida y se conserva
        t = base.tarea(tid)
        if t:
            t["estado"] = "fallida"
            t.setdefault("ejecuciones", []).append({"id": "error", "inicio": base.ahora(), "error": f"{ex.__class__.__name__}: {ex}", "checks": [], "verificable": False})
            base.guardar_tarea(t)
        base.actividad(f"{tid} falló por un error interno: {ex}", "error", tid)
        if t:
            base.evento("falla", t.get("agente"), [], tid, "error interno")
        return {"ok": False, "msg": str(ex)}
    finally:
        with _LOCK:
            EN_CURSO.discard(tid)


def cerrar_tarea(tid):
    t = base.tarea(tid)
    if not t or t["estado"] != "lista_para_revision":
        return {"ok": False, "msg": "Solo se puede cerrar una tarea lista para revisión (con resultado verificable)."}
    t["estado"] = "cerrada"
    base.guardar_tarea(t)
    base.actividad(f"{tid} cerrada tras tu revisión", "cierre", tid)
    return {"ok": True}


def devolver_tarea(tid):
    t = base.tarea(tid)
    if not t or t["estado"] not in ("lista_para_revision", "simulada"):
        return {"ok": False, "msg": "Solo se devuelve una tarea en revisión o simulada."}
    t["estado"] = "pendiente"
    base.guardar_tarea(t)
    base.actividad(f"{tid} devuelta a pendiente", "tarea", tid)
    return {"ok": True}
