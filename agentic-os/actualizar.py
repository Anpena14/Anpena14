#!/usr/bin/env python3
"""Actualiza esta carpeta del Agentic OS EN SU SITIO, sin descargar otro zip a mano.

Descarga la última versión publicada en GitHub (anpena14/anpena14, rama del Agentic OS, carpeta agentic-os/)
y reemplaza solo el código. Conserva:
  - data/ (tareas, chat, evidencias, consumo) y las propuestas de boveda-prueba/01-Inbox/
  - tus valores de config.json, agentes.json y skills.json (solo se añaden claves nuevas)
  - cualquier archivo que no venga en la actualización (p. ej. PROMPT-PARA-CLAUDE.md)
Antes de tocar nada guarda una copia de lo que cambia en data/respaldos/<fecha>/.

Uso, dentro de la carpeta:   python3 actualizar.py

Repositorio PRIVADO: hace falta un token de GitHub de solo lectura (fine-grained, solo este repo, permiso
«Contents: Read-only»). Se busca, en orden: variable AOS_GITHUB_TOKEN o GITHUB_TOKEN, el archivo
~/.config/agentic-os/github_token (fuera del proyecto, permisos 600) o `gh auth token` si usas GitHub CLI.
Guardarlo:  python3 actualizar.py --guardar-token
"""
import datetime as dt
import io
import json
import os
import shutil
import sys
import tarfile
import urllib.error
import urllib.request

REPO = "anpena14/anpena14"
RAMA = "claude/peaceful-cannon-re5lkd"
SUBCARPETA = "agentic-os/"
URL = f"https://api.github.com/repos/{REPO}/tarball/refs/heads/{RAMA}"
RUTA_TOKEN = os.path.expanduser("~/.config/agentic-os/github_token")


def token():
    for var in ("AOS_GITHUB_TOKEN", "GITHUB_TOKEN"):
        if os.environ.get(var, "").strip():
            return os.environ[var].strip()
    try:
        with open(RUTA_TOKEN, encoding="utf-8") as f:
            t = f.read().strip()
            if t:
                return t
    except OSError:
        pass
    try:
        import subprocess
        r = subprocess.run(["gh", "auth", "token"], capture_output=True, text=True, timeout=10)
        if r.returncode == 0 and r.stdout.strip():
            return r.stdout.strip()
    except Exception:
        pass
    return None


def guardar_token(valor):
    valor = (valor or "").strip()
    if not valor:
        raise ValueError("Token vacío.")
    os.makedirs(os.path.dirname(RUTA_TOKEN), exist_ok=True)
    fd = os.open(RUTA_TOKEN, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        f.write(valor)
    os.chmod(RUTA_TOKEN, 0o600)


class SinAcceso(RuntimeError):
    pass
FUSIONAR = {"config.json", "agentes.json", "skills.json"}
NO_TOCAR = ("data/", "boveda-prueba/01-Inbox/")


def destino():
    """La carpeta del Agentic OS: la de este archivo, o la actual si se ejecuta con 'curl | python3 -'."""
    aqui = os.path.dirname(os.path.abspath(__file__)) if "__file__" in globals() and os.path.exists(__file__) else os.getcwd()
    if not os.path.exists(os.path.join(aqui, "aos.py")):
        aqui = os.getcwd()
    if not os.path.exists(os.path.join(aqui, "aos.py")):
        sys.exit("Ejecuta esto dentro de la carpeta del Agentic OS (donde está aos.py).")
    return aqui


def fusionar(actual, nuevo):
    """Añade claves nuevas sin pisar las tuyas (recursivo en diccionarios)."""
    if not isinstance(actual, dict) or not isinstance(nuevo, dict):
        return actual
    out = dict(actual)
    for k, v in nuevo.items():
        if k not in out:
            out[k] = v
        elif isinstance(out[k], dict) and isinstance(v, dict):
            out[k] = fusionar(out[k], v)
    return out


def version(ruta):
    try:
        with open(os.path.join(ruta, "VERSION"), encoding="utf-8") as f:
            return f.read().strip()
    except OSError:
        return "0"


def actualizar(raiz=None, url=URL, verbose=True):
    raiz = raiz or destino()
    log = print if verbose else (lambda *a, **k: None)
    antes = version(raiz)
    log(f"Descargando la última versión de {REPO} ({RAMA})…")
    cab = {"User-Agent": "agentic-os-actualizador", "Accept": "application/vnd.github+json"}
    tk = token() if url.startswith("https://api.github.com/") else None
    if tk:
        cab["Authorization"] = f"Bearer {tk}"
    req = urllib.request.Request(url, headers=cab)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            datos = r.read()
    except urllib.error.HTTPError as e:
        if e.code in (401, 403, 404):
            raise SinAcceso("El repositorio es privado y " + ("el token no tiene acceso (revisa que sea de este repo con «Contents: Read-only» y que no haya caducado)." if tk else
                            "no hay token guardado. Crea uno de solo lectura en GitHub y guárdalo con: python3 actualizar.py --guardar-token")) from None
        raise
    sello = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
    respaldo = os.path.join(raiz, "data", "respaldos", sello)
    cambiados, nuevos, fusionados = [], [], []
    with tarfile.open(fileobj=io.BytesIO(datos), mode="r:gz") as tar:
        miembros = [m for m in tar.getmembers() if m.isfile() and "/" in m.name and m.name.split("/", 1)[1].startswith(SUBCARPETA)]
        if not miembros:
            raise RuntimeError("La descarga no contiene la carpeta agentic-os/.")
        for m in miembros:
            rel = m.name.split("/", 1)[1][len(SUBCARPETA):]
            if not rel or rel.startswith(NO_TOCAR) or ".." in rel.split("/") or rel.startswith("/"):
                continue
            contenido = tar.extractfile(m).read()
            ruta = os.path.join(raiz, rel)
            existe = os.path.exists(ruta)
            if rel in FUSIONAR and existe:
                with open(ruta, encoding="utf-8") as f:
                    actual = json.load(f)
                mezcla = fusionar(actual, json.loads(contenido.decode("utf-8")))
                if mezcla != actual:
                    os.makedirs(os.path.dirname(os.path.join(respaldo, rel)) or respaldo, exist_ok=True)
                    shutil.copy2(ruta, os.path.join(respaldo, rel))
                    with open(ruta, "w", encoding="utf-8") as f:
                        json.dump(mezcla, f, ensure_ascii=False, indent=2)
                    fusionados.append(rel)
                continue
            if existe:
                with open(ruta, "rb") as f:
                    if f.read() == contenido:
                        continue
                os.makedirs(os.path.dirname(os.path.join(respaldo, rel)), exist_ok=True)
                shutil.copy2(ruta, os.path.join(respaldo, rel))
                cambiados.append(rel)
            else:
                nuevos.append(rel)
            os.makedirs(os.path.dirname(ruta), exist_ok=True)
            with open(ruta, "wb") as f:
                f.write(contenido)
            if m.mode & 0o111:
                os.chmod(ruta, 0o755)
    despues = version(raiz)
    log(f"Versión: {antes} → {despues}")
    log(f"Archivos actualizados: {len(cambiados)} · nuevos: {len(nuevos)} · ajustes añadidos: {len(fusionados)}")
    if cambiados or fusionados:
        log(f"Copia de lo anterior en: data/respaldos/{sello}/")
    log("Listo. Si el panel estaba abierto, ciérralo y vuelve a abrirlo (o pulsa «Actualizar» en el panel la próxima vez).")
    return {"antes": antes, "despues": despues, "cambiados": cambiados, "nuevos": nuevos, "fusionados": fusionados, "respaldo": sello if (cambiados or fusionados) else None}


if __name__ == "__main__":
    if "--guardar-token" in sys.argv:
        import getpass
        guardar_token(getpass.getpass("Pega tu token de GitHub (no se verá): "))
        print(f"Guardado en {RUTA_TOKEN} (solo tú puedes leerlo).")
        sys.exit(0)
    try:
        actualizar()
    except Exception as e:
        sys.exit(f"No se pudo actualizar: {e}")
