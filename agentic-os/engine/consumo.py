"""Consumo de suscripciones y tokens, leído de los registros LOCALES de cada herramienta (nada sale de tu Mac).

- Claude Code: ~/.claude/projects/**/*.jsonl (tokens por mensaje).
- Codex: ~/.codex/sessions/**/*.jsonl (tokens y, si el registro lo trae, % usado del límite de 5 h y semanal).
- Gemini CLI / Antigravity: sin registro local de tokens conocido; se muestra lo ejecutado desde el panel.
- IA local (Ollama) y Hermes: tokens de las ejecuciones hechas desde el panel (data/consumo_local.jsonl).
Los límites exactos del plan solo los muestra cada app (/usage en Claude Code, /status en Codex). Si pones tus
límites en config.json → "planes", el widget dibuja la barra de porcentaje.
"""
import datetime as dt
import glob
import json
import os
import time

from . import base

RUTA_LOCAL = os.path.join(base.DATOS, "consumo_local.jsonl")
_CACHE = {}


def registrar_local(agente, modelo, entrada, salida):
    os.makedirs(base.DATOS, exist_ok=True)
    with open(RUTA_LOCAL, "a", encoding="utf-8") as f:
        f.write(json.dumps({"ts": time.time(), "agente": agente, "modelo": modelo, "entrada": int(entrada or 0), "salida": int(salida or 0)}) + "\n")


def _ts(valor):
    if isinstance(valor, (int, float)):
        return float(valor) / (1000 if valor > 1e12 else 1)
    try:
        return dt.datetime.fromisoformat(str(valor).replace("Z", "+00:00")).timestamp()
    except ValueError:
        return None


def _archivos(patron, dias=8):
    limite = time.time() - dias * 86400
    out = []
    for f in glob.glob(os.path.expanduser(patron), recursive=True):
        try:
            if os.path.getmtime(f) >= limite:
                out.append(f)
        except OSError:
            pass
    return out


def _leer_jsonl(ruta):
    """Lee con caché por fecha de modificación (los registros pueden ser grandes)."""
    try:
        m = os.path.getmtime(ruta)
    except OSError:
        return []
    c = _CACHE.get(ruta)
    if c and c[0] == m:
        return c[1]
    filas = []
    with open(ruta, encoding="utf-8", errors="ignore") as f:
        for linea in f:
            try:
                filas.append(json.loads(linea))
            except ValueError:
                pass
    _CACHE[ruta] = (m, filas)
    return filas


def _ventanas(eventos, ahora):
    """eventos: [(ts, total)] → tokens en 5 h, hoy y 7 días + serie diaria de 7 días."""
    hoy0 = dt.datetime.fromtimestamp(ahora).replace(hour=0, minute=0, second=0, microsecond=0).timestamp()
    v = {"5h": 0, "hoy": 0, "7d": 0}
    dias = {}
    for ts, tot in eventos:
        if ts >= ahora - 5 * 3600:
            v["5h"] += tot
        if ts >= hoy0:
            v["hoy"] += tot
        if ts >= ahora - 7 * 86400:
            v["7d"] += tot
            d = dt.datetime.fromtimestamp(ts).strftime("%Y-%m-%d")
            dias[d] = dias.get(d, 0) + tot
    serie = []
    for i in range(6, -1, -1):
        d = (dt.datetime.fromtimestamp(ahora) - dt.timedelta(days=i)).strftime("%Y-%m-%d")
        serie.append({"dia": d, "tokens": dias.get(d, 0)})
    return v, serie


def claude(ahora):
    eventos, por_req, modelos = [], {}, {}
    for f in _archivos("~/.claude/projects/**/*.jsonl"):
        for d in _leer_jsonl(f):
            msg = d.get("message") if isinstance(d.get("message"), dict) else {}
            u = msg.get("usage")
            if d.get("type") != "assistant" or not isinstance(u, dict):
                continue
            ts = _ts(d.get("timestamp"))
            if not ts:
                continue
            clave = d.get("requestId") or msg.get("id") or d.get("uuid")
            tot = sum(int(u.get(k) or 0) for k in ("input_tokens", "output_tokens", "cache_creation_input_tokens"))
            por_req[clave] = (ts, tot, int(u.get("cache_read_input_tokens") or 0), msg.get("model"))
    for ts, tot, cache, modelo in por_req.values():
        eventos.append((ts, tot))
        if modelo:
            modelos[modelo] = modelos.get(modelo, 0) + tot
    v, serie = _ventanas(eventos, ahora)
    return {"id": "claude", "nombre": "Claude Code", "fuente": "~/.claude/projects", "hay_datos": bool(eventos),
            "tokens": v, "serie": serie, "modelos": sorted(modelos.items(), key=lambda x: -x[1])[:3], "limites": [],
            "nota": "Tokens nuevos (entrada + salida + escritura de caché). El % de tu plan lo muestra /usage en Claude Code."}


def _buscar_limites(obj, out):
    if isinstance(obj, dict):
        if "used_percent" in obj:
            out.append(obj)
        for v in obj.values():
            _buscar_limites(v, out)
    elif isinstance(obj, list):
        for v in obj:
            _buscar_limites(v, out)


def codex(ahora):
    eventos, ultimo, ultimo_ts = [], None, 0
    for f in _archivos("~/.codex/sessions/**/*.jsonl"):
        previo = None
        for d in _leer_jsonl(f):
            p = d.get("payload") if isinstance(d.get("payload"), dict) else d
            if p.get("type") != "token_count":
                continue
            ts = _ts(d.get("timestamp")) or os.path.getmtime(f)
            info = p.get("info") or {}
            last = (info.get("last_token_usage") or {}) if isinstance(info, dict) else {}
            tot = int(last.get("total_tokens") or (int(last.get("input_tokens") or 0) + int(last.get("output_tokens") or 0)))
            if not last and isinstance(info, dict) and info.get("total_token_usage"):
                acum = int(info["total_token_usage"].get("total_tokens") or 0)
                tot, previo = (acum - (previo or 0)), acum
            if tot > 0:
                eventos.append((ts, tot))
            lim = []
            _buscar_limites(p.get("rate_limits") or d.get("rate_limits") or {}, lim)
            if lim and ts >= ultimo_ts:
                ultimo, ultimo_ts = lim, ts
    v, serie = _ventanas(eventos, ahora)
    limites = []
    for i, l in enumerate(ultimo or []):
        minutos = l.get("window_minutes")
        nombre = "Ventana de 5 h" if minutos and minutos <= 600 else "Semanal" if minutos else ("Principal" if i == 0 else "Secundario")
        limites.append({"nombre": nombre, "usado": float(l.get("used_percent") or 0),
                        "reinicia_en_s": l.get("resets_in_seconds") or (l.get("resets_at") and max(0, _ts(l["resets_at"]) - ahora))})
    return {"id": "codex", "nombre": "Codex", "fuente": "~/.codex/sessions", "hay_datos": bool(eventos) or bool(limites),
            "tokens": v, "serie": serie, "modelos": [], "limites": limites,
            "nota": "El % de uso sale del último registro de Codex." if limites else "Sin % de límite en los registros; /status en Codex lo muestra."}


def local(ahora):
    eventos, por_agente = [], {}
    try:
        with open(RUTA_LOCAL, encoding="utf-8") as f:
            for linea in f:
                try:
                    d = json.loads(linea)
                except ValueError:
                    continue
                tot = d["entrada"] + d["salida"]
                eventos.append((d["ts"], tot))
                k = d.get("modelo") or d["agente"]
                por_agente[k] = por_agente.get(k, 0) + tot
    except FileNotFoundError:
        pass
    v, serie = _ventanas(eventos, ahora)
    cargados = []
    try:
        from . import conectores
        cargados = [m.get("name") for m in conectores._ollama("/api/ps", timeout=2).get("models", [])]
    except Exception:
        pass
    return {"id": "local", "nombre": "IA local (Ollama · Hermes)", "fuente": "ejecuciones desde el panel", "hay_datos": bool(eventos),
            "tokens": v, "serie": serie, "modelos": sorted(por_agente.items(), key=lambda x: -x[1])[:3], "limites": [],
            "cargados": cargados, "nota": "Tokens de entrada + salida que reportan Ollama y Hermes en cada ejecución. Gratis: corre en tu Mac."}


def gemini(ahora):
    hay = bool(_archivos("~/.gemini/tmp/**/*.json", 8))
    return {"id": "antigravity", "nombre": "Antigravity / Gemini", "fuente": "~/.gemini", "hay_datos": False, "tokens": {"5h": 0, "hoy": 0, "7d": 0},
            "serie": [], "modelos": [], "limites": [],
            "nota": ("Hay sesiones de Gemini CLI, pero no registran tokens en un formato estable. " if hay else "") + "Consulta tu cuota en la app de Antigravity."}


def resumen():
    ahora = time.time()
    out = []
    for fn in (claude, codex, gemini, local):
        try:
            out.append(fn(ahora))
        except Exception as e:  # un registro raro no debe tumbar el panel
            out.append({"id": fn.__name__, "nombre": fn.__name__, "hay_datos": False, "tokens": {"5h": 0, "hoy": 0, "7d": 0}, "serie": [], "modelos": [], "limites": [], "nota": f"No se pudo leer: {e}"})
    planes = base.config().get("planes", {})
    for s in out:
        p = planes.get(s["id"], {})
        s["plan"] = p.get("nombre")
        for ventana in ("5h", "7d"):
            lim = p.get(f"limite_tokens_{ventana}")
            if lim:
                s["limites"].append({"nombre": f"Tu límite {ventana} (config)", "usado": round(100 * s["tokens"][ventana] / lim, 1), "reinicia_en_s": None})
    return {"generado": ahora, "servicios": out}
