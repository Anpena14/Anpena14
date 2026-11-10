"""Pruebas del piloto. Usan una copia temporal de la bóveda de prueba y de los datos.

    python3 -m unittest discover -s tests -v
"""
import json
import os
import shutil
import sys
import tempfile
import threading
import unittest
import urllib.request

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TMP = tempfile.mkdtemp(prefix="aos-test-")
shutil.copytree(os.path.join(RAIZ, "boveda-prueba"), os.path.join(TMP, "boveda"))
os.environ["AOS_DATOS"] = os.path.join(TMP, "data")
os.environ["AOS_BOVEDA"] = os.path.join(TMP, "boveda")
os.environ["AOS_BOVEDA_REAL"] = os.path.join(TMP, "no-existe")  # el mapa usa la bóveda de prueba en las pruebas
sys.path.insert(0, RAIZ)

from engine import base, conectores, flujo, servidor  # noqa: E402


def leer(ruta):
    with open(ruta, encoding="utf-8") as f:
        return f.read()


def tarea(**kw):
    d = dict(proyecto="Pulso", encargo="Resume las reglas de caja.", agente="simulador", skill="contexto-pulso",
             criterio="Cada regla cita su sección.")
    d.update(kw)
    return base.nueva_tarea(**d)


class Flujo(unittest.TestCase):
    def test_simulador_de_punta_a_punta(self):
        t = tarea()
        flujo.ejecutar_tarea(t["id"])
        t = base.tarea(t["id"])
        self.assertEqual(t["estado"], "simulada")
        e = t["ejecuciones"][-1]
        self.assertTrue(all(c["ok"] for c in e["checks"]))
        self.assertFalse(e["verificable"], "una simulación nunca cuenta como resultado verificable")
        self.assertIn("SIMULADA", e["propuesta"])
        self.assertTrue(os.path.exists(os.path.join(os.environ["AOS_BOVEDA"], e["propuesta"])))
        for f in ("encargo.md", "salida.md", "evidencia.json"):
            self.assertTrue(os.path.exists(os.path.join(os.environ["AOS_DATOS"], "ejecuciones", t["id"], e["id"], f)))

    def test_encargo_solo_lleva_la_ficha_autorizada(self):
        t = tarea()
        s = base.skills()["contexto-pulso"]
        fichas, err = flujo.cargar_fichas(s)
        self.assertEqual(list(fichas), ["Pulso"])
        enc = flujo.armar_encargo(t, s, base.agentes()["codex"], fichas)
        self.assertIn("Ficha autorizada: Pulso", enc)
        self.assertNotIn("Macetamania#", enc)

    def test_resultado_real_pasa_a_revision_y_fallo_conserva_la_tarea(self):
        original = conectores.ejecutar
        try:
            conectores.ejecutar = lambda a, p, f: {"codigo": 0, "salida": "## Resultado\nTexto suficiente para revisar el encargo con detalle.\n## Cierre\n- Pedido: x\n## Criterio de cierre\n- Cumplido: sí",
                                                   "error": "", "segundos": 1, "argv": ["x"], "modelo": None, "archivos_creados": []}
            t = tarea(agente="claude")
            flujo.ejecutar_tarea(t["id"])
            self.assertEqual(base.tarea(t["id"])["estado"], "lista_para_revision")
            self.assertTrue(flujo.cerrar_tarea(t["id"])["ok"])

            conectores.ejecutar = lambda a, p, f: {"codigo": 127, "salida": "", "error": "No se encontró", "segundos": 0,
                                                   "argv": ["x"], "modelo": None, "archivos_creados": []}
            t2 = tarea(agente="codex")
            flujo.ejecutar_tarea(t2["id"])
            t2 = base.tarea(t2["id"])
            self.assertEqual(t2["estado"], "fallida")
            self.assertEqual(len(t2["ejecuciones"]), 1)
            self.assertFalse(flujo.cerrar_tarea(t2["id"])["ok"], "una tarea fallida no se puede cerrar")
            for _ in range(2):
                flujo.ejecutar_tarea(t2["id"])
            self.assertTrue(any("ciclos" in x for x in flujo.validar_tarea(base.tarea(t2["id"]))), "máximo tres ciclos")
        finally:
            conectores.ejecutar = original

    def test_privacidad_y_alcance(self):
        self.assertTrue(flujo.revisar_privacidad("cobra RD$ 4,500 y escribe a ana@correo.com"))
        self.assertTrue(flujo.revisar_privacidad("clave sk-abcdefghijklmnopq"))
        self.assertFalse(flujo.revisar_privacidad(leer(os.path.join(os.environ["AOS_BOVEDA"], "20-Proyectos/Software/Pulso.md"))))
        t = {"id": "x", "proyecto": "Macetamania", "skill": "voz-macetamania", "agente": "claude", "encargo": "post", "criterio": "x", "ejecuciones": []}
        self.assertTrue(any("no está autorizada" in e for e in flujo.validar_tarea(t)))
        t = {"id": "x", "proyecto": "Pulso", "skill": "revisar-entrega", "agente": "hermes", "encargo": "x", "criterio": "x", "ejecuciones": []}
        self.assertTrue(any("no admite" in e for e in flujo.validar_tarea(t)))

    def test_no_escribe_en_una_boveda_real(self):
        marca = os.path.join(os.environ["AOS_BOVEDA"], ".boveda-de-prueba")
        os.remove(marca)
        try:
            self.assertFalse(base.puede_escribir_boveda())
            t = tarea()
            flujo.ejecutar_tarea(t["id"])
            e = base.tarea(t["id"])["ejecuciones"][-1]
            self.assertIsNone(e["propuesta"])
            self.assertIn("no es de prueba", e["propuesta_error"])
        finally:
            open(marca, "w").close()

    def test_el_texto_nunca_es_un_comando(self):
        malicioso = "x; rm -rf ~ && echo pwned"
        argv = conectores._armar(["codex", "exec", "-C", "{workdir}", "{prompt}"], malicioso, "/tmp/w")
        self.assertEqual(argv, ["codex", "exec", "-C", "/tmp/w", malicioso])
        with self.assertRaises(ValueError):
            conectores._armar(["x", "{prompt}", "{prompt}"], "a", "/tmp")


class Cerebro(unittest.TestCase):
    def test_grafo_y_eventos(self):
        from engine import grafo
        g = grafo.construir()
        nombres = {n["nombre"] for n in g["nodos"]}
        self.assertIn("Pulso", nombres)
        self.assertTrue(any(n["tipo"] == "carpeta" for n in g["nodos"]))
        self.assertIsNone(grafo.vista_previa("../../etc/passwd"), "no sale de la bóveda")
        self.assertIn("Pulso", grafo.vista_previa("20-Proyectos/Software/Pulso.md")["texto"])
        _, antes = base.eventos_desde(0)
        flujo.ejecutar_tarea(tarea()["id"])
        evs, _ = base.eventos_desde(antes)
        self.assertEqual([e["tipo"] for e in evs], ["sale", "lee", "trabaja", "escribe", "termina"])
        self.assertEqual(evs[1]["nodos"], ["Pulso"])
        self.assertTrue(all(e["agente"] == "simulador" for e in evs))


class Servidor(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        import http.server
        cls.srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), servidor.Manejador)
        cls.url = f"http://127.0.0.1:{cls.srv.server_address[1]}"
        threading.Thread(target=cls.srv.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.srv.shutdown()
        cls.srv.server_close()

    def pedir(self, ruta, cuerpo=None, token=True, host=None):
        h = {"Content-Type": "application/json"}
        if token:
            h["X-AOS-Token"] = servidor.TOKEN
        if host:
            h["Host"] = host
        req = urllib.request.Request(self.url + ruta, data=json.dumps(cuerpo).encode() if cuerpo is not None else None, headers=h)
        try:
            with urllib.request.urlopen(req) as r:
                return r.status, r.read().decode()
        except urllib.error.HTTPError as e:
            return e.code, e.read().decode()

    def test_paginas_y_clave(self):
        st, html = self.pedir("/")
        self.assertEqual(st, 200)
        self.assertIn(servidor.TOKEN, html)
        self.assertEqual(self.pedir("/maps.html")[0], 200)
        self.assertEqual(self.pedir("/../config.json")[0], 404)

    def test_protecciones(self):
        self.assertEqual(self.pedir("/api/tareas", {}, token=False)[0], 403)
        self.assertEqual(self.pedir("/api/estado", host="evil.example")[0], 403)
        st, cuerpo = self.pedir("/api/tareas", {"proyecto": "Pulso", "skill": "contexto-pulso", "agente": "claude",
                                                "encargo": "usa la clave sk-abcdefghijklmnop", "criterio": "x"})
        self.assertEqual(st, 400)
        self.assertNotIn("sk-abcdefghijklmnop", json.dumps(base.tareas()), "lo privado no se guarda")

    def test_crear_y_persistir(self):
        st, cuerpo = self.pedir("/api/tareas", {"proyecto": "Pulso", "skill": "cierre-sesion", "agente": "simulador",
                                                "encargo": "Cierre de prueba", "criterio": "Usa la plantilla"})
        self.assertEqual(st, 200)
        tid = json.loads(cuerpo)["tarea"]["id"]
        en_disco = json.loads(leer(os.path.join(os.environ["AOS_DATOS"], "tareas.json")))
        self.assertIn(tid, [t["id"] for t in en_disco])
        for campo in ("id", "proyecto", "encargo", "agente", "estado", "criterio"):
            self.assertIn(campo, en_disco[-1])


if __name__ == "__main__":
    unittest.main()


class Novedades(unittest.TestCase):
    def test_router_respeta_privacidad_y_conexion(self):
        from engine import router
        chequeos = {"claude": {"estado": "conectado"}, "codex": {"estado": "conectado"}, "simulador": {"estado": "simulado"}}
        base.escribir_json(conectores.RUTA_CHEQUEOS, chequeos)
        self.assertEqual(router.elegir("Corrige el bug del endpoint en React")["agente"], "codex")
        self.assertEqual(router.elegir("Explícame qué es DDMRP")["agente"], "claude")
        r = router.elegir("Resume la factura del cliente")
        self.assertIn(r["agente"], (None, "simulador"), "lo privado nunca va a un agente en la nube")
        chequeos["hermes"] = {"estado": "conectado"}
        base.escribir_json(conectores.RUTA_CHEQUEOS, chequeos)
        self.assertEqual(router.elegir("Resume la factura del cliente")["agente"], "hermes")

    def test_chat_con_simulador_y_bloqueo_privado(self):
        import time
        from engine import chat
        r = chat.enviar("Hola, ¿me oyes?", "simulador")
        self.assertNotIn("error", r)
        for _ in range(50):
            m = chat.historial()[-1]
            if m["estado"] != "pensando":
                break
            time.sleep(.05)
        self.assertEqual(m["estado"], "lista")
        self.assertIn("Simulado", m["texto"])
        self.assertIn("error", chat.enviar("mi clave es sk-abcdefghijklmnopq", "claude"))

    def test_consumo_lee_registros_locales(self):
        import time
        from engine import consumo
        casa = tempfile.mkdtemp()
        os.makedirs(os.path.join(casa, ".claude/projects/p"))
        os.makedirs(os.path.join(casa, ".codex/sessions/2026/11/10"))
        ahora = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        with open(os.path.join(casa, ".claude/projects/p/s.jsonl"), "w") as f:
            for _ in range(2):  # mismo requestId repetido: debe contarse una vez
                f.write(json.dumps({"type": "assistant", "timestamp": ahora, "requestId": "r1", "message": {"model": "m", "usage": {"input_tokens": 100, "output_tokens": 50, "cache_creation_input_tokens": 10}}}) + "\n")
        with open(os.path.join(casa, ".codex/sessions/2026/11/10/rollout.jsonl"), "w") as f:
            f.write(json.dumps({"timestamp": ahora, "type": "event_msg", "payload": {"type": "token_count", "info": {"last_token_usage": {"total_tokens": 700}},
                                "rate_limits": {"primary": {"used_percent": 42.0, "window_minutes": 300, "resets_in_seconds": 3600}}}}) + "\n")
        viejo = os.environ.get("HOME")
        os.environ["HOME"] = casa
        try:
            r = {s["id"]: s for s in consumo.resumen()["servicios"]}
        finally:
            os.environ["HOME"] = viejo
        self.assertEqual(r["claude"]["tokens"]["hoy"], 160)
        self.assertEqual(r["codex"]["tokens"]["hoy"], 700)
        self.assertEqual(r["codex"]["limites"][0]["usado"], 42.0)

    def test_actualizar_conserva_datos_y_ajustes(self):
        import importlib.util, io, tarfile
        spec = importlib.util.spec_from_file_location("actualizar", os.path.join(RAIZ, "actualizar.py"))
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        dest = tempfile.mkdtemp()
        for rel, txt in {"aos.py": "viejo", "config.json": json.dumps({"boveda_real": "MIA", "puerto": 1}), "data/tareas.json": "[]", "PROMPT.md": "mio"}.items():
            os.makedirs(os.path.dirname(os.path.join(dest, rel)) or dest, exist_ok=True)
            with open(os.path.join(dest, rel), "w") as f:
                f.write(txt)
        buf = io.BytesIO()
        with tarfile.open(fileobj=buf, mode="w:gz") as tar:
            for rel, txt in {"agentic-os/aos.py": "nuevo", "agentic-os/VERSION": "9.9", "agentic-os/config.json": json.dumps({"boveda_real": "OTRA", "puerto": 2, "nueva": True}),
                             "agentic-os/data/tareas.json": "PISADO", "agentic-os/../fuera.txt": "x", "otra/cosa.txt": "x"}.items():
                info = tarfile.TarInfo("repo-rama/" + rel); b = txt.encode(); info.size = len(b); tar.addfile(info, io.BytesIO(b))
        ruta_tar = os.path.join(tempfile.mkdtemp(), "t.tar.gz")
        with open(ruta_tar, "wb") as f:
            f.write(buf.getvalue())
        r = mod.actualizar(dest, url="file://" + ruta_tar, verbose=False)
        self.assertEqual(leer(os.path.join(dest, "aos.py")), "nuevo")
        self.assertEqual(leer(os.path.join(dest, "data/tareas.json")), "[]", "no toca tus datos")
        self.assertEqual(leer(os.path.join(dest, "PROMPT.md")), "mio")
        cfg = json.loads(leer(os.path.join(dest, "config.json")))
        self.assertEqual((cfg["boveda_real"], cfg["puerto"], cfg["nueva"]), ("MIA", 1, True), "conserva tus valores y añade los nuevos")
        self.assertFalse(os.path.exists(os.path.join(os.path.dirname(dest), "fuera.txt")))
        self.assertEqual(r["despues"], "9.9")
        self.assertTrue(os.path.exists(os.path.join(dest, "data", "respaldos", r["respaldo"], "aos.py")))
