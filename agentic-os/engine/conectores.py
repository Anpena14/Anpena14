"""Conectores de agentes: comprobaciones separadas (instalación, autenticación, permisos) y ejecución.

Reglas de seguridad:
- Solo se ejecutan agentes del registro, con su lista de argumentos fija. Nunca se usa una shell.
- El texto de la tarea solo puede ocupar el lugar de {prompt} como UN argumento.
- Cada ejecución corre en una carpeta temporal que solo contiene la ficha autorizada.
"""
import json
import os
import shutil
import subprocess
import tempfile
import time
import urllib.request

from . import base

PALABRA_PRUEBA = "LISTO"
PROMPT_PRUEBA = f"Prueba de conexión del Agentic OS. Responde únicamente con la palabra {PALABRA_PRUEBA}."
RUTA_CHEQUEOS = os.path.join(base.DATOS, "agentes.json")


def _armar(cmd, prompt, workdir):
    if cmd.count("{prompt}") != 1:
        raise ValueError("El comando del agente debe tener exactamente un {prompt}.")
    return [prompt if x == "{prompt}" else x.replace("{workdir}", workdir) for x in cmd]


def _correr(argv, cwd, timeout):
    t0 = time.time()
    try:
        r = subprocess.run(argv, cwd=cwd, capture_output=True, text=True, timeout=timeout, stdin=subprocess.DEVNULL)
        return r.returncode, r.stdout, r.stderr, round(time.time() - t0, 1)
    except FileNotFoundError:
        return 127, "", f"No se encontró el programa «{argv[0]}».", 0.0
    except subprocess.TimeoutExpired as e:
        return 124, e.stdout or "", f"Se superó el tiempo máximo ({timeout} s).", round(time.time() - t0, 1)


# ---------- Ollama (motor local) ----------
def _ollama(ruta, cuerpo=None, timeout=10):
    c = base.config()
    url = c.get("ollama_url", "http://127.0.0.1:11434").rstrip("/") + ruta
    datos = json.dumps(cuerpo).encode() if cuerpo is not None else None
    req = urllib.request.Request(url, data=datos, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.load(r)


def _modelo_ollama():
    c = base.config()
    if c.get("ollama_modelo"):
        return c["ollama_modelo"]
    modelos = [m["name"] for m in _ollama("/api/tags").get("models", [])]
    return modelos[0] if modelos else None


def _ejecutar_ollama(prompt, timeout):
    t0 = time.time()
    try:
        modelo = _modelo_ollama()
        if not modelo:
            return 1, "", "Ollama responde pero no tiene modelos descargados (ollama pull <modelo>).", 0.0, None
        r = _ollama("/api/chat", {"model": modelo, "stream": False, "messages": [{"role": "user", "content": prompt}]}, timeout)
        from . import consumo
        consumo.registrar_local("local", modelo, r.get("prompt_eval_count"), r.get("eval_count"))
        return 0, r["message"]["content"], "", round(time.time() - t0, 1), modelo
    except Exception as e:
        return 1, "", f"Ollama no responde en {base.config().get('ollama_url')}: {e}", round(time.time() - t0, 1), None


# ---------- comprobaciones ----------
def comprobar(aid, probar=False):
    """Devuelve el estado del agente. 'probar' hace una llamada real mínima para verificar la autenticación."""
    a = base.agentes()[aid]
    chequeos = base.leer_json(RUTA_CHEQUEOS, {})
    previo = chequeos.get(aid, {})
    res = {"id": aid, "comprobado": base.ahora()}
    tipo = a["tipo"]

    if tipo == "simulador":
        res.update(instalado={"ok": True, "detalle": "Integrado en el panel"},
                   autenticado={"ok": None, "detalle": "No aplica"},
                   permisos={"ok": True, "detalle": a["permisos"]}, estado="simulado")
    elif tipo == "ollama":
        try:
            modelos = [m["name"] for m in _ollama("/api/tags").get("models", [])]
            inst = {"ok": True, "detalle": f"Ollama activo · {len(modelos)} modelo(s): {', '.join(modelos[:4]) or 'ninguno'}"}
        except Exception as e:
            modelos, inst = [], {"ok": False, "detalle": f"Ollama no responde ({e.__class__.__name__}). Abre la app Ollama o ejecuta: ollama serve"}
        aut = {"ok": None, "detalle": "Motor local: no usa credenciales."}
        if probar and inst["ok"]:
            cod, out, err, seg, modelo = _ejecutar_ollama(PROMPT_PRUEBA, 120)
            ok = cod == 0 and PALABRA_PRUEBA in out.upper()
            aut = {"ok": ok, "detalle": (f"Respuesta de prueba correcta con {modelo} ({seg} s)" if ok else (err or f"Respuesta inesperada: {out[:120]}")), "probado": base.ahora()}
        elif previo.get("autenticado", {}).get("probado"):
            aut = previo["autenticado"]
        res.update(instalado=inst, autenticado=aut, permisos={"ok": True, "detalle": a["permisos"]})
        res["estado"] = "conectado" if inst["ok"] and aut.get("ok") else "pendiente"
    else:  # cli / ide
        ruta = shutil.which(a["binario"])
        if not ruta:
            inst = {"ok": False, "detalle": f"No se encontró «{a['binario']}» en el PATH."}
        else:
            cod, out, err, _ = _correr(a["version"], None, 20)
            inst = {"ok": cod == 0, "detalle": f"{ruta} · {(out or err).strip().splitlines()[0] if (out or err).strip() else 'sin versión'}"}
        aut = previo.get("autenticado") if previo.get("autenticado", {}).get("probado") else {"ok": None, "detalle": "Sin verificar: pulsa «Probar» (hace una llamada mínima real)."}
        perm = {"ok": None, "detalle": a["permisos"]}
        if probar and inst["ok"]:
            with tempfile.TemporaryDirectory(prefix="aos-prueba-") as wd:
                cod, out, err, seg = _correr(_armar(a["cmd"], PROMPT_PRUEBA, wd), wd, 180)
                quedo = sorted(os.listdir(wd))
            ok = cod == 0 and PALABRA_PRUEBA in out.upper()
            detalle = f"Respuesta de prueba correcta ({seg} s)" if ok else f"Código {cod}. {(err or out).strip()[:300]}"
            aut = {"ok": ok, "detalle": detalle, "probado": base.ahora()}
            perm = {"ok": not quedo, "detalle": a["permisos"] + (" · Prueba: no dejó archivos en la carpeta aislada." if not quedo else f" · Atención: dejó archivos {quedo}.")}
        elif previo.get("permisos", {}).get("ok") is not None:
            perm = previo["permisos"]
        res.update(instalado=inst, autenticado=aut, permisos=perm)
        res["estado"] = "conectado" if inst["ok"] and aut.get("ok") else "pendiente"
        if tipo == "ide":
            res["puente"] = "Gemini CLI"
    chequeos[aid] = res
    base.escribir_json(RUTA_CHEQUEOS, chequeos)
    if probar:
        base.actividad(f"{a['nombre']}: {res['estado']} · {res['autenticado']['detalle']}", "agente")
    return res


def estado_agentes(refrescar=True):
    out = []
    chequeos = base.leer_json(RUTA_CHEQUEOS, {})
    for aid, a in base.agentes().items():
        r = comprobar(aid) if refrescar else chequeos.get(aid) or comprobar(aid)
        out.append({**{k: a.get(k) for k in ("nombre", "rol", "tipo", "nube", "nota", "color", "conectar")}, **r})
    return out


# ---------- ejecución ----------
def _registrar_uso_archivo(aid, ruta):
    """Lee el informe de uso de Hermes (--usage-file) de forma tolerante y lo suma al consumo local."""
    try:
        with open(ruta, encoding="utf-8") as f:
            d = json.load(f)
    except (OSError, ValueError):
        return
    finally:
        try:
            os.remove(ruta)
        except OSError:
            pass
    ent = sal = 0

    def recorrer(o):
        nonlocal ent, sal
        if isinstance(o, dict):
            for k, v in o.items():
                if isinstance(v, (int, float)) and "token" in k.lower():
                    if any(x in k.lower() for x in ("input", "prompt")):
                        ent += int(v)
                    elif any(x in k.lower() for x in ("output", "completion")):
                        sal += int(v)
                else:
                    recorrer(v)
        elif isinstance(o, list):
            for v in o:
                recorrer(v)
    recorrer(d)
    from . import consumo
    consumo.registrar_local(aid, d.get("model") if isinstance(d, dict) else None, ent, sal)


def ejecutar(aid, prompt, archivos):
    """Ejecuta el agente con el encargo. 'archivos' {nombre: texto} se copian a la carpeta aislada.
    Devuelve dict con codigo, salida, error, segundos, argv (sin el prompt) y modelo."""
    a = base.agentes()[aid]
    timeout = int(base.config().get("timeout_segundos", 600))
    if a["tipo"] == "simulador":
        from . import simulador
        salida = simulador.responder(prompt)
        return {"codigo": 0, "salida": salida, "error": "", "segundos": 0.0, "argv": ["(simulador interno)"], "modelo": None, "archivos_creados": []}
    if a["tipo"] == "ollama":
        cod, out, err, seg, modelo = _ejecutar_ollama(prompt, timeout)
        return {"codigo": cod, "salida": out, "error": err, "segundos": seg, "argv": ["POST /api/chat"], "modelo": modelo, "archivos_creados": []}
    with tempfile.TemporaryDirectory(prefix="aos-tarea-") as wd:
        for nombre, texto in archivos.items():
            with open(os.path.join(wd, nombre), "w", encoding="utf-8") as f:
                f.write(texto)
        argv = _armar(a["cmd"], prompt, wd)
        uso = None
        if a.get("usage_file"):  # Hermes escribe un informe JSON de tokens fuera de la carpeta aislada
            fd, uso = tempfile.mkstemp(prefix="aos-uso-", suffix=".json")
            os.close(fd)
            argv = argv + ["--usage-file", uso]
        cod, out, err, seg = _correr(argv, wd, timeout)
        creados = sorted(set(os.listdir(wd)) - set(archivos))
        if uso:
            _registrar_uso_archivo(aid, uso)
    visible = ["<encargo: ver encargo.md>" if x == prompt else x for x in argv]
    return {"codigo": cod, "salida": out, "error": err, "segundos": seg, "argv": visible, "modelo": None, "archivos_creados": creados}
