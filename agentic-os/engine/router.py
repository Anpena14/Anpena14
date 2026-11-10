"""Router: elige el agente que más conviene para un texto (tarea o mensaje del chat).

Orden de decisión (config.json → "router"):
  1. "externo": tu router (por ejemplo, uno de código abierto basado en Jev) por HTTP o por comando.
     Contrato: recibe JSON {"texto", "agentes": [{"id","nombre","rol","conectado","nube"}], "privado": bool}
     y devuelve JSON {"agente": "<id>", "motivo": "..."}.
  2. "ollama": un modelo local clasifica el texto (no sale de tu Mac).
  3. "reglas": palabras clave (siempre disponible, sin coste).
Solo se elige entre agentes CONECTADOS (o el simulador si no hay ninguno). Si hay datos privados, solo agentes locales.
"""
import json
import re
import subprocess
import urllib.request

from . import base

REGLAS = [
    ("privado", r"factura|cv\b|curr[ií]cul|cliente|salario|n[oó]mina|contrase|clave|banco|cifra|precio|matr[ií]cula", ["hermes", "local"]),
    ("código", r"c[oó]digo|implementa|bug|error|test|prueba unitaria|refactor|repo|commit|api|endpoint|typescript|react|python|script|compila|build", ["codex", "claude"]),
    ("revisión", r"revisa|revisi[oó]n|prueba en|navegador|interfaz|ui\b|visual|pantalla|accesib|qa\b", ["antigravity", "codex", "claude"]),
    ("redacción", r"redacta|resume|resumen|documento|informe|presentaci|correo|carta|traduce|analiza|expl[ií]ca|qu[eé] es|c[oó]mo|plan\b|estrategia|idea", ["claude", "hermes", "local"]),
    ("rutina", r"recuerda|programa|cada d[ií]a|todas las|rutina|agenda|telegram", ["hermes", "claude"]),
]
ORDEN_DEFECTO = ["claude", "codex", "hermes", "antigravity", "local", "simulador"]


def _candidatos():
    from . import conectores
    chequeos = base.leer_json(conectores.RUTA_CHEQUEOS, {})
    out = []
    for aid, a in base.agentes().items():
        estado = chequeos.get(aid, {}).get("estado", "pendiente")
        out.append({"id": aid, "nombre": a["nombre"], "rol": a["rol"], "nube": a.get("nube", True),
                    "conectado": estado == "conectado", "simulado": estado == "simulado"})
    return out


def _por_reglas(texto, disponibles, privado):
    t = texto.lower()
    for nombre, patron, preferidos in REGLAS:
        if re.search(patron, t):
            for p in preferidos:
                if p in disponibles:
                    return p, f"Reglas: parece de {nombre}; {base.agentes()[p]['nombre']} es el mejor conectado para eso."
    for p in ORDEN_DEFECTO:
        if p in disponibles:
            return p, f"Reglas: sin pista clara; uso {base.agentes()[p]['nombre']}, el primero conectado."
    return None, "No hay agentes conectados."


def _por_ollama(texto, cands, cfg):
    from . import conectores
    lista = "\n".join(f"- {c['id']}: {c['nombre']} ({c['rol']})" for c in cands)
    prompt = (f"Elige el mejor agente para esta petición. Agentes disponibles:\n{lista}\n\nPetición: {texto[:1500]}\n\n"
              'Responde SOLO con JSON: {"agente": "<id>", "motivo": "<una frase en español>"}')
    cod, out, err, seg, modelo = conectores._ejecutar_ollama(prompt, 60)
    if cod != 0:
        return None, None
    m = re.search(r"\{.*\}", out, re.S)
    try:
        d = json.loads(m.group(0)) if m else {}
    except ValueError:
        return None, None
    ids = {c["id"] for c in cands}
    if d.get("agente") in ids:
        return d["agente"], f"Modelo local ({modelo}): {d.get('motivo', '')}"
    return None, None


def _por_externo(texto, cands, privado, cfg):
    payload = {"texto": texto, "agentes": cands, "privado": privado}
    try:
        if cfg.get("url"):
            req = urllib.request.Request(cfg["url"], data=json.dumps(payload).encode(), headers={"Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=int(cfg.get("timeout", 20))) as r:
                d = json.load(r)
        elif cfg.get("cmd"):
            r = subprocess.run(cfg["cmd"], input=json.dumps(payload), capture_output=True, text=True, timeout=int(cfg.get("timeout", 20)))
            d = json.loads(r.stdout)
        else:
            return None, None
    except Exception as e:
        return None, f"Router externo no respondió ({e.__class__.__name__}); sigo con el siguiente método."
    ids = {c["id"] for c in cands}
    if d.get("agente") in ids:
        return d["agente"], f"{cfg.get('nombre', 'Router externo')}: {d.get('motivo', '')}"
    return None, None


def elegir(texto, permitidos=None):
    """Devuelve {"agente", "motivo", "metodo", "privado"}. 'permitidos' limita la elección (p. ej. los de una skill)."""
    from . import flujo
    cfg = base.config().get("router", {})
    privado = bool(flujo.revisar_privacidad(texto)) or bool(re.search(REGLAS[0][1], texto.lower()))
    cands = [c for c in _candidatos() if (c["conectado"]) and (not permitidos or c["id"] in permitidos)]
    if privado:
        cands = [c for c in cands if not c["nube"]]
    if not cands:
        sim = [c for c in _candidatos() if c["simulado"] and (not permitidos or c["id"] in permitidos)]
        if sim:
            return {"agente": sim[0]["id"], "motivo": "No hay agentes reales conectados" + (" y locales para un texto privado" if privado else "") + "; uso el simulador.", "metodo": "respaldo", "privado": privado}
        motivo = ("El texto parece privado y no hay un agente local conectado (Hermes u Ollama). Conecta uno o quita los datos privados."
                  if privado else "No hay agentes conectados. Pulsa «Probar» en el equipo para conectar alguno.")
        return {"agente": None, "motivo": motivo, "metodo": "ninguno", "privado": privado}
    notas = []
    for metodo in cfg.get("orden", ["externo", "ollama", "reglas"]):
        if metodo == "externo" and cfg.get("externo", {}).get("activo"):
            ag, motivo = _por_externo(texto, cands, privado, cfg["externo"])
            if ag:
                return {"agente": ag, "motivo": motivo, "metodo": "externo", "privado": privado}
            if motivo:
                notas.append(motivo)
        elif metodo == "ollama" and cfg.get("usar_ollama", True) and any(c["id"] == "local" for c in _candidatos() if c["conectado"]):
            ag, motivo = _por_ollama(texto, cands, cfg)
            if ag:
                return {"agente": ag, "motivo": motivo, "metodo": "ollama", "privado": privado}
        elif metodo == "reglas":
            ag, motivo = _por_reglas(texto, [c["id"] for c in cands], privado)
            if ag:
                return {"agente": ag, "motivo": " ".join(notas + [motivo]), "metodo": "reglas", "privado": privado}
    return {"agente": None, "motivo": "No se pudo elegir agente.", "metodo": "ninguno", "privado": privado}


def elegir_skill(texto, proyecto):
    """Elige la skill registrada más adecuada para una tarea de un proyecto."""
    t = texto.lower()
    skills = {k: v for k, v in base.skills().items() if proyecto in v["fichas"]}
    if re.search(r"revisa|revisi[oó]n|comprueba|valida", t) and "revisar-entrega" in skills:
        return "revisar-entrega"
    if re.search(r"cierra|cierre|registra la sesi", t) and "cierre-sesion" in skills:
        return "cierre-sesion"
    return next(iter(skills), None)
