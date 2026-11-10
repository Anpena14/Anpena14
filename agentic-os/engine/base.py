"""Configuración, almacenamiento persistente y utilidades del motor. Sin dependencias externas."""
import datetime as dt
import json
import os
import threading

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _ampliar_path():
    """Al abrir con doble clic, macOS no carga el PATH de tu terminal: añadimos las carpetas habituales
    donde viven claude, codex, gemini, hermes y ollama."""
    import glob as _g
    casa = os.path.expanduser("~")
    extra = ["/opt/homebrew/bin", "/usr/local/bin", f"{casa}/.local/bin", f"{casa}/.npm-global/bin", f"{casa}/.bun/bin",
             f"{casa}/.hermes/bin", f"{casa}/.cargo/bin", f"{casa}/.volta/bin", f"{casa}/Library/pnpm", "/Applications/Ollama.app/Contents/Resources"]
    extra += sorted(_g.glob(f"{casa}/.nvm/versions/node/*/bin"), reverse=True)
    actual = os.environ.get("PATH", "").split(os.pathsep)
    os.environ["PATH"] = os.pathsep.join(actual + [d for d in extra if os.path.isdir(d) and d not in actual])


_ampliar_path()
DATOS = os.environ.get("AOS_DATOS") or os.path.join(RAIZ, "data")
_LOCK = threading.RLock()


def leer_json(ruta, defecto=None):
    try:
        with open(ruta, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return defecto


def escribir_json(ruta, datos):
    """Escritura atómica: el estado sobrevive a un corte o reinicio a mitad de escritura."""
    os.makedirs(os.path.dirname(ruta), exist_ok=True)
    tmp = ruta + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(datos, f, ensure_ascii=False, indent=2)
    os.replace(tmp, ruta)


def escribir_texto(ruta, texto):
    os.makedirs(os.path.dirname(ruta), exist_ok=True)
    tmp = ruta + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(texto)
    os.replace(tmp, ruta)


def ahora():
    return dt.datetime.now().astimezone().isoformat(timespec="seconds")


def sin_ayuda(d):
    return {k: v for k, v in d.items() if not k.startswith("_")}


def config():
    c = sin_ayuda(leer_json(os.path.join(RAIZ, "config.json"), {}))
    c["boveda"] = os.environ.get("AOS_BOVEDA") or c.get("boveda", "boveda-prueba")
    c["boveda_real"] = os.environ.get("AOS_BOVEDA_REAL") or c.get("boveda_real")
    c["boveda_abs"] = os.path.abspath(os.path.join(RAIZ, os.path.expanduser(c["boveda"])))
    return c


def agentes():
    return sin_ayuda(leer_json(os.path.join(RAIZ, "agentes.json"), {}))


def skills():
    return sin_ayuda(leer_json(os.path.join(RAIZ, "skills.json"), {}))


def boveda_es_prueba(c=None):
    c = c or config()
    return os.path.exists(os.path.join(c["boveda_abs"], ".boveda-de-prueba"))


def puede_escribir_boveda(c=None):
    c = c or config()
    return boveda_es_prueba(c) or bool(c.get("permitir_boveda_real"))


# ---------- registro de actividad ----------
def actividad(texto, tipo="info", tarea=None):
    with _LOCK:
        ruta = os.path.join(DATOS, "actividad.json")
        log = leer_json(ruta, [])
        log.append({"ts": ahora(), "tipo": tipo, "texto": texto, "tarea": tarea})
        escribir_json(ruta, log[-300:])


def leer_actividad(n=50):
    return list(reversed(leer_json(os.path.join(DATOS, "actividad.json"), [])[-n:]))


# ---------- tareas ----------
ESTADOS = {
    "pendiente": "Pendiente",
    "en_curso": "En curso",
    "lista_para_revision": "Lista para revisión",
    "fallida": "Fallida",
    "simulada": "Simulada",
    "cerrada": "Cerrada",
}
RUTA_TAREAS = os.path.join(DATOS, "tareas.json")


def tareas():
    return leer_json(RUTA_TAREAS, [])


def tarea(tid):
    return next((t for t in tareas() if t["id"] == tid), None)


def guardar_tarea(t):
    with _LOCK:
        todas = tareas()
        for i, x in enumerate(todas):
            if x["id"] == t["id"]:
                todas[i] = t
                break
        else:
            todas.append(t)
        t["actualizada"] = ahora()
        escribir_json(RUTA_TAREAS, todas)
    return t


def nueva_tarea(proyecto, encargo, agente, skill, criterio, profundidad="Normal"):
    with _LOCK:
        n = max([int(t["id"][2:]) for t in tareas()] or [0]) + 1
        t = {
            "id": f"T-{n:04d}", "proyecto": proyecto, "encargo": encargo, "agente": agente, "skill": skill,
            "criterio": criterio, "profundidad": profundidad, "estado": "pendiente",
            "creada": ahora(), "actualizada": ahora(), "ejecuciones": [],
        }
        guardar_tarea(t)
    actividad(f"Tarea creada: {encargo}", "tarea", t["id"])
    return t


# ---------- eventos en vivo (para animar el cerebro) ----------
_EVENTOS = []
_SEQ = [0]


def evento(tipo, agente, nodos=None, tarea=None, texto=""):
    """tipo: sale | lee | trabaja | escribe | termina | falla. 'nodos' son nombres de notas o carpetas."""
    with _LOCK:
        _SEQ[0] += 1
        _EVENTOS.append({"seq": _SEQ[0], "ts": ahora(), "tipo": tipo, "agente": agente, "nodos": nodos or [], "tarea": tarea, "texto": texto})
        del _EVENTOS[:-200]


def eventos_desde(seq):
    with _LOCK:
        return [e for e in _EVENTOS if e["seq"] > seq], _SEQ[0]
