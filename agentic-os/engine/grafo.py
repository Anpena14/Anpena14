"""Grafo del cerebro: lee títulos, carpetas y [[enlaces]] de la bóveda en SOLO LECTURA.

El grafo se queda en tu Mac (lo usa el navegador local). Nunca se envía a un agente: los agentes
siguen recibiendo solo la ficha autorizada.
"""
import os
import re
import time

from . import base

ENLACE = re.compile(r"\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]")
_CACHE = {"clave": None, "datos": None}
MAX_NOTAS = 2000


def boveda_mapa():
    """La bóveda que se dibuja: la real si existe y está activada en config; si no, la de prueba."""
    c = base.config()
    real = os.path.expanduser(c.get("boveda_real") or "")
    if c.get("mapa_usa_boveda_real", True) and real and os.path.isdir(real):
        return real, True
    return c["boveda_abs"], False


def _notas(raiz):
    for d, dirs, fs in os.walk(raiz):
        dirs[:] = sorted(x for x in dirs if not x.startswith("."))
        for f in sorted(fs):
            if f.endswith(".md"):
                yield os.path.join(d, f)


def construir():
    raiz, es_real = boveda_mapa()
    rutas = list(_notas(raiz))[:MAX_NOTAS]
    clave = (raiz, len(rutas), max((os.path.getmtime(r) for r in rutas), default=0))
    if _CACHE["clave"] == clave:
        return _CACHE["datos"]
    nodos, por_nombre = [], {}
    for r in rutas:
        rel = os.path.relpath(r, raiz)
        nombre = os.path.basename(r)[:-3]
        carpeta = rel.split(os.sep)[0] if os.sep in rel else "(raíz)"
        n = {"id": rel, "nombre": nombre, "carpeta": carpeta, "sub": os.path.dirname(rel), "tipo": "nota"}
        nodos.append(n)
        por_nombre.setdefault(nombre.lower(), rel)
    enlaces, vistos = [], set()
    for n in nodos:
        try:
            with open(os.path.join(raiz, n["id"]), encoding="utf-8", errors="ignore") as f:
                texto = f.read(200_000)
        except OSError:
            continue
        for destino in ENLACE.findall(texto):
            d = por_nombre.get(destino.strip().split("/")[-1].lower())
            if d and d != n["id"] and (n["id"], d) not in vistos and (d, n["id"]) not in vistos:
                vistos.add((n["id"], d))
                enlaces.append([n["id"], d])
    # Nodos de carpeta: dan estructura al mapa (cada nota cuelga de su carpeta).
    carpetas = sorted({n["carpeta"] for n in nodos})
    for c in carpetas:
        nodos.append({"id": "carpeta:" + c, "nombre": c, "carpeta": c, "sub": "", "tipo": "carpeta"})
    for n in nodos:
        if n["tipo"] == "nota":
            enlaces.append([n["id"], "carpeta:" + n["carpeta"], "carpeta"])
    grado = {}
    for e in enlaces:
        for x in e[:2]:
            grado[x] = grado.get(x, 0) + 1
    for n in nodos:
        n["grado"] = grado.get(n["id"], 0)
    datos = {"boveda": os.path.basename(raiz.rstrip(os.sep)), "ruta": raiz, "es_real": es_real, "nodos": nodos,
             "enlaces": enlaces, "carpetas": carpetas, "generado": time.time()}
    _CACHE.update(clave=clave, datos=datos)
    return datos


def vista_previa(rel):
    """Primeras líneas de una nota (sin frontmatter). Valida que la ruta esté dentro de la bóveda."""
    raiz, _ = boveda_mapa()
    ruta = os.path.realpath(os.path.join(raiz, rel))
    if not ruta.startswith(os.path.realpath(raiz) + os.sep) or not ruta.endswith(".md") or not os.path.isfile(ruta):
        return None
    with open(ruta, encoding="utf-8", errors="ignore") as f:
        texto = f.read(6000)
    texto = re.sub(r"\A---\n.*?\n---\n", "", texto, flags=re.S).strip()
    return {"ruta": rel, "texto": texto[:1200], "enlaces": sorted(set(ENLACE.findall(texto)))[:30]}
