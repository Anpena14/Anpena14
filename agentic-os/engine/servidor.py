"""Servidor local: sirve ui/ y una API JSON. Solo escucha en 127.0.0.1.

Protecciones: comprobación de Host (evita DNS rebinding), clave por sesión en cada petición que cambia algo
(evita que otra web la dispare), y solo se sirven archivos de ui/ de una lista fija.
"""
import http.server
import json
import os
import re
import secrets
import threading
import urllib.parse

from . import base, chat, conectores, consumo, flujo, grafo, router

UI = os.path.join(base.RAIZ, "ui")
PAGINAS = {"/": "index.html"}
TIPOS = {".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json"}
REINICIAR = threading.Event()


def _archivo_ui(p):
    """Solo sirve archivos que existan dentro de ui/ con una extensión conocida."""
    rel = PAGINAS.get(p, p.lstrip("/"))
    ruta = os.path.realpath(os.path.join(UI, rel))
    if not ruta.startswith(os.path.realpath(UI) + os.sep) or os.path.splitext(ruta)[1] not in TIPOS or not os.path.isfile(ruta):
        return None
    return ruta
TOKEN = secrets.token_urlsafe(24)


def _leer(ruta):
    try:
        with open(ruta, encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        return ""


def _api_estado():
    c = base.config()
    return {
        "boveda": c["boveda_abs"], "boveda_es_prueba": base.boveda_es_prueba(c), "puede_escribir": base.puede_escribir_boveda(c),
        "boveda_real": c.get("boveda_real"), "boveda_real_existe": bool(c.get("boveda_real")) and os.path.isdir(os.path.expanduser(c["boveda_real"])),
        "fichas_autorizadas": list(c.get("fichas_autorizadas", {})), "estados": base.ESTADOS, "max_ciclos": flujo.MAX_CICLOS,
    }


def _entregables():
    c = base.config()
    out = []
    inbox = os.path.join(c["boveda_abs"], "01-Inbox")
    for f in sorted(os.listdir(inbox), reverse=True) if os.path.isdir(inbox) else []:
        if f.endswith(".md"):
            out.append({"nombre": f[:-3], "tipo": "Propuesta · bandeja de prueba", "tarea": (re.search(r"T-\d+", f) or [None])[0]})
    for nombre, rel in c.get("fichas_autorizadas", {}).items():
        out.append({"nombre": f"Ficha de {nombre}", "tipo": "Contexto · ficha depurada", "tarea": None})
    out.append({"nombre": "Cierre de sesión", "tipo": "Plantilla", "tarea": None})
    return out


def _skills():
    c = base.config()
    out = []
    for sid, s in base.skills().items():
        faltan = [f for f in s["fichas"] if f not in c.get("fichas_autorizadas", {})]
        out.append({"id": sid, **{k: s[k] for k in ("nombre", "descripcion", "agente_sugerido", "agentes", "fichas")},
                    "disponible": not faltan, "motivo": f"Ficha no autorizada en el piloto: {', '.join(faltan)}" if faltan else ""})
    return out


class Manejador(http.server.BaseHTTPRequestHandler):
    server_version = "AgenticOS/0.1"

    # ---------- utilidades ----------
    def _host_ok(self):
        host = (self.headers.get("Host") or "").split(":")[0]
        return host in ("127.0.0.1", "localhost")

    def _json(self, datos, codigo=200):
        b = json.dumps(datos, ensure_ascii=False).encode()
        self.send_response(codigo)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def _cuerpo(self):
        n = int(self.headers.get("Content-Length") or 0)
        if n > 100_000:
            raise ValueError("Cuerpo demasiado grande")
        return json.loads(self.rfile.read(n) or b"{}")

    def log_message(self, *a):
        pass

    # ---------- GET ----------
    def do_GET(self):
        if not self._host_ok():
            return self.send_error(403, "Host no permitido")
        ruta = urllib.parse.urlparse(self.path)
        q = urllib.parse.parse_qs(ruta.query)
        p = ruta.path
        archivo = None if p.startswith("/api/") else _archivo_ui(p)
        if archivo:
            ext = os.path.splitext(archivo)[1]
            with open(archivo, "rb") as f:
                b = f.read()
            if ext == ".html":
                b = b.replace(b"__AOS_TOKEN__", TOKEN.encode())
            self.send_response(200)
            self.send_header("Content-Type", TIPOS[ext] + "; charset=utf-8")
            self.send_header("Cache-Control", "no-store" if "/vendor/" not in archivo else "max-age=86400")
            self.send_header("Content-Security-Policy", "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'")
            self.send_header("Content-Length", str(len(b)))
            self.end_headers()
            return self.wfile.write(b)
        if p == "/api/estado":
            return self._json(_api_estado())
        if p == "/api/agentes":
            return self._json(conectores.estado_agentes(refrescar=q.get("refrescar", ["1"])[0] == "1"))
        if p == "/api/skills":
            return self._json(_skills())
        if p == "/api/tareas":
            return self._json(sorted(base.tareas(), key=lambda t: t["id"], reverse=True))
        if p.startswith("/api/tareas/"):
            t = base.tarea(p.rsplit("/", 1)[1])
            if not t:
                return self._json({"error": "No existe"}, 404)
            t = dict(t, en_curso=t["id"] in flujo.EN_CURSO, bloqueos=flujo.validar_tarea(t) if t["estado"] in ("pendiente", "fallida") else [])
            for e in t["ejecuciones"]:
                carpeta = os.path.join(base.RAIZ, e.get("carpeta", "_"))
                e["salida_texto"] = _leer(os.path.join(carpeta, "salida.md"))
                if e.get("propuesta"):
                    rp = os.path.join(base.config()["boveda_abs"], e["propuesta"])
                    e["propuesta_texto"] = _leer(rp)
            return self._json(t)
        if p == "/api/consumo":
            return self._json(consumo.resumen())
        if p == "/api/chat":
            return self._json(chat.historial()[-80:])
        if p == "/api/version":
            return self._json({"version": _leer(os.path.join(base.RAIZ, "VERSION")).strip() or "0"})
        if p == "/api/grafo":
            return self._json(grafo.construir())
        if p == "/api/nota":
            v = grafo.vista_previa(q.get("ruta", [""])[0])
            return self._json(v if v else {"error": "No disponible"}, 200 if v else 404)
        if p == "/api/eventos":
            try:
                desde = int(q.get("desde", ["0"])[0])
            except ValueError:
                desde = 0
            evs, ultimo = base.eventos_desde(desde)
            colores = {k: v.get("color", "#94a3b8") for k, v in base.agentes().items()}
            return self._json({"eventos": evs, "ultimo": ultimo, "colores": colores})
        if p == "/api/actividad":
            return self._json(base.leer_actividad())
        if p == "/api/entregables":
            return self._json(_entregables())
        self.send_error(404)

    # ---------- POST ----------
    def do_POST(self):
        if not self._host_ok() or not secrets.compare_digest(self.headers.get("X-AOS-Token", ""), TOKEN):
            return self._json({"error": "No autorizado"}, 403)
        try:
            b = self._cuerpo()
        except Exception:
            return self._json({"error": "JSON no válido"}, 400)
        p = urllib.parse.urlparse(self.path).path

        if p == "/api/chat":
            if b.get("borrar"):
                chat.borrar()
                return self._json({"ok": True})
            r = chat.enviar(str(b.get("texto") or ""), str(b.get("agente") or "auto"))
            return self._json(r, 400 if r.get("error") else 200)
        if p == "/api/router":
            return self._json(router.elegir(str(b.get("texto") or ""), b.get("permitidos")))
        if p == "/api/actualizar":
            import importlib.util
            spec = importlib.util.spec_from_file_location("actualizar", os.path.join(base.RAIZ, "actualizar.py"))
            mod = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(mod)
            try:
                if b.get("token"):
                    mod.guardar_token(str(b["token"]))
                r = mod.actualizar(base.RAIZ, verbose=False)
            except mod.SinAcceso as e:
                return self._json({"ok": False, "pide_token": True, "msg": str(e)})
            except Exception as e:
                return self._json({"ok": False, "msg": f"No se pudo actualizar: {e}"})
            if r["cambiados"] or r["nuevos"] or r["fusionados"]:
                base.actividad(f"Actualizado {r['antes']} → {r['despues']}: {len(r['cambiados']) + len(r['nuevos'])} archivos", "info")
                REINICIAR.set()
            return self._json({"ok": True, **r, "reinicia": REINICIAR.is_set()})
        if p == "/api/tareas":
            campos = {k: str(b.get(k) or "").strip() for k in ("proyecto", "encargo", "agente", "skill", "criterio", "profundidad")}
            eleccion = None
            if campos["skill"] == "auto" and campos["proyecto"]:
                campos["skill"] = router.elegir_skill(campos["encargo"], campos["proyecto"]) or ""
            if campos["agente"] == "auto" and campos["skill"] in base.skills():
                eleccion = router.elegir(campos["encargo"], base.skills()[campos["skill"]]["agentes"])
                campos["agente"] = eleccion["agente"] or ""
            faltan = [k for k in ("proyecto", "encargo", "agente", "skill", "criterio") if not campos[k]]
            if faltan:
                return self._json({"error": "Faltan: " + ", ".join(faltan)}, 400)
            if len(campos["encargo"]) > 1000 or len(campos["criterio"]) > 600:
                return self._json({"error": "El encargo o el criterio son demasiado largos."}, 400)
            if campos["profundidad"] not in ("Breve", "Normal", "Detallada"):
                campos["profundidad"] = "Normal"
            # Se valida ANTES de guardar: una tarea con datos privados o fuera de alcance nunca llega al disco.
            rechazos = flujo.validar_tarea({**campos, "id": "nueva", "ejecuciones": []})
            if rechazos:
                return self._json({"error": "No se creó la tarea: " + " ".join(rechazos)}, 400)
            t = base.nueva_tarea(**campos)
            bloqueos = flujo.validar_tarea(t)
            if b.get("ejecutar") and not bloqueos:
                threading.Thread(target=flujo.ejecutar_tarea, args=(t["id"],), daemon=True).start()
            if eleccion:
                base.actividad(f"Router eligió {base.agentes()[t['agente']]['nombre']} para {t['id']}: {eleccion['motivo']}", "info", t["id"])
            return self._json({"tarea": t, "bloqueos": bloqueos, "ejecutando": bool(b.get("ejecutar")) and not bloqueos, "router": eleccion})

        m = re.fullmatch(r"/api/tareas/(T-\d+)/(ejecutar|cerrar|devolver)", p)
        if m:
            tid, accion = m.groups()
            if accion == "cerrar":
                return self._json(flujo.cerrar_tarea(tid))
            if accion == "devolver":
                return self._json(flujo.devolver_tarea(tid))
            t = base.tarea(tid)
            if not t:
                return self._json({"error": "No existe"}, 404)
            bloqueos = flujo.validar_tarea(t)
            if bloqueos:
                return self._json({"ok": False, "msg": " ".join(bloqueos)})
            threading.Thread(target=flujo.ejecutar_tarea, args=(tid,), daemon=True).start()
            return self._json({"ok": True, "msg": f"{base.agentes()[t['agente']]['nombre']} empezó {tid}."})

        m = re.fullmatch(r"/api/agentes/(\w+)/probar", p)
        if m and m.group(1) in base.agentes():
            return self._json(conectores.comprobar(m.group(1), probar=True))
        return self._json({"error": "Ruta no encontrada"}, 404)


def servir(puerto=None, abrir=True):
    puerto = int(puerto or base.config().get("puerto", 8787))
    srv = None
    for p in range(puerto, puerto + 10):  # si el puerto está ocupado, prueba los siguientes
        try:
            srv = http.server.ThreadingHTTPServer(("127.0.0.1", p), Manejador)
            puerto = p
            break
        except OSError:
            print(f"El puerto {p} está ocupado; pruebo el siguiente…")
    if srv is None:
        raise SystemExit("No encontré un puerto libre. Cierra otros paneles abiertos y vuelve a intentarlo.")
    url = f"http://127.0.0.1:{puerto}"
    print(f"Agentic OS en {url}  ·  bóveda: {base.config()['boveda_abs']}  ·  Ctrl+C para cerrar")
    if abrir:
        import webbrowser
        threading.Timer(0.6, lambda: webbrowser.open(url)).start()
    def vigilar():  # tras «Actualizar», reinicia el panel en el mismo puerto
        REINICIAR.wait()
        import time
        time.sleep(1.2)
        srv.shutdown()
    threading.Thread(target=vigilar, daemon=True).start()
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\nPanel cerrado.")
        return srv
    if REINICIAR.is_set():
        import sys
        srv.server_close()
        print("Reiniciando con la versión nueva…")
        os.execv(sys.executable, [sys.executable, os.path.join(base.RAIZ, "aos.py"), "panel", "--sin-abrir", "--puerto", str(puerto)])
    return srv
