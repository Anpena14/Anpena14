"""Chat con tus agentes (texto o voz desde el navegador).

- Cada mensaje va al agente elegido o, en "auto", al que elija el router.
- El agente solo recibe la conversación reciente; no ve tu bóveda. Si el mensaje trae datos privados,
  solo se permite un agente local (Hermes u Ollama).
- La conversación se guarda en data/chat.json y sobrevive al reinicio.
"""
import os
import threading
import uuid

from . import base, conectores, flujo, router

RUTA = os.path.join(base.DATOS, "chat.json")
_LOCK = threading.Lock()
MAX_TURNOS = 12


def historial():
    return base.leer_json(RUTA, [])


def _guardar(msgs):
    base.escribir_json(RUTA, msgs[-400:])


def _actualizar(mid, **campos):
    with _LOCK:
        msgs = historial()
        for m in msgs:
            if m["id"] == mid:
                m.update(campos)
        _guardar(msgs)


def borrar():
    with _LOCK:
        _guardar([])


def _prompt(agente, msgs, texto):
    a = base.agentes()[agente]
    lineas = [f"Eres «{a['nombre']}» dentro del Agentic OS de Aneudys (rol: {a['rol']}). Responde en español, claro y breve, "
              "como en una conversación hablada (tus respuestas pueden leerse en voz alta: evita tablas y bloques de código largos salvo que te los pidan). "
              "No tienes acceso a archivos ni a la bóveda en este chat; si hace falta, sugiere crear una tarea. No inventes datos.\n"]
    previos = [m for m in msgs if m.get("estado") == "lista"][-MAX_TURNOS:]
    if previos:
        lineas.append("# Conversación previa")
        for m in previos:
            quien = "Aneudys" if m["rol"] == "usuario" else base.agentes().get(m.get("agente"), {}).get("nombre", "Agente")
            lineas.append(f"{quien}: {m['texto'][:2000]}")
    lineas.append(f"\n# Mensaje nuevo de Aneudys\n{texto}")
    return "\n".join(lineas)


def enviar(texto, agente="auto"):
    texto = (texto or "").strip()
    if not texto:
        return {"error": "Mensaje vacío."}
    if len(texto) > 4000:
        return {"error": "El mensaje es demasiado largo (máx. 4000 caracteres)."}
    agentes = base.agentes()
    decision = None
    if agente == "auto":
        decision = router.elegir(texto)
        agente = decision["agente"]
        if not agente:
            return {"error": decision["motivo"]}
    if agente not in agentes:
        return {"error": "Agente no registrado."}
    privados = flujo.revisar_privacidad(texto)
    if privados and agentes[agente].get("nube", True):
        return {"error": f"El mensaje tiene datos privados ({', '.join(privados)}). Usa Hermes u Ollama, que corren en tu Mac, o quítalos."}
    with _LOCK:
        msgs = historial()
        previos = list(msgs)
        u = {"id": uuid.uuid4().hex[:10], "rol": "usuario", "texto": texto, "ts": base.ahora(), "estado": "lista"}
        r = {"id": uuid.uuid4().hex[:10], "rol": "agente", "agente": agente, "texto": "", "ts": base.ahora(), "estado": "pensando",
             "router": decision and {"motivo": decision["motivo"], "metodo": decision["metodo"]}}
        msgs += [u, r]
        _guardar(msgs)
    prompt = _prompt(agente, previos, texto)
    threading.Thread(target=_responder, args=(r["id"], agente, prompt), daemon=True).start()
    return {"usuario": u, "respuesta": r}


def _responder(mid, agente, prompt):
    nombre = base.agentes()[agente]["nombre"]
    base.evento("lee", agente, ["index", "Cerebro"], None, f"{nombre} piensa tu mensaje")
    base.evento("trabaja", agente, ["index"], None, f"{nombre} responde en el chat")
    try:
        r = conectores.ejecutar(agente, prompt, {})
        ok = r["codigo"] == 0 and (r["salida"] or "").strip()
        texto = (r["salida"] or "").strip() if ok else f"No pude responder: {(r['error'] or 'sin salida').strip()[:400]}"
        _actualizar(mid, texto=texto, estado="lista" if ok else "error", segundos=r["segundos"], modelo=r.get("modelo"))
        base.evento("termina" if ok else "falla", agente, [], None, f"{nombre} respondió" if ok else f"{nombre} no pudo responder")
    except Exception as e:
        _actualizar(mid, texto=f"Error interno: {e}", estado="error")
        base.evento("falla", agente, [], None, "error interno")
