#!/usr/bin/env python3
"""Agentic OS local de Aneudys (piloto).

  python3 aos.py                      abre el panel en http://127.0.0.1:8787
  python3 aos.py verificar [agente]   comprueba instalación, autenticación (llamada mínima real) y permisos
  python3 aos.py demo [agente]        crea una tarea de muestra de Pulso y la ejecuta (por defecto, el simulador)
  python3 aos.py tareas               lista las tareas guardadas
  python3 aos.py actualizar           trae la última versión desde GitHub sin tocar tus datos

Requiere solo Python 3.9+ (incluido en macOS con las herramientas de desarrollo).
"""
import sys

from engine import base, conectores, flujo, servidor


def main(argv):
    cmd = argv[0] if argv else "panel"
    if cmd == "panel":
        puerto = argv[argv.index("--puerto") + 1] if "--puerto" in argv else None
        servidor.servir(puerto, abrir="--sin-abrir" not in argv)
    elif cmd == "actualizar":
        import actualizar
        actualizar.actualizar()
    elif cmd == "verificar":
        ids = argv[1:] or list(base.agentes())
        for aid in ids:
            r = conectores.comprobar(aid, probar=True)
            print(f"\n{base.agentes()[aid]['nombre']}  →  {r['estado'].upper()}")
            for k in ("instalado", "autenticado", "permisos"):
                ok = {True: "✔", False: "✖", None: "·"}[r[k]["ok"]]
                print(f"  {ok} {k}: {r[k]['detalle']}")
    elif cmd == "demo":
        agente = argv[1] if len(argv) > 1 else "simulador"
        t = base.nueva_tarea("Pulso", "Resume las reglas de negocio de Pulso que afectan a ventas y caja, para retomar el desarrollo.",
                             agente, "contexto-pulso", "Lista cada regla con la sección de la ficha de la que sale y marca qué falta confirmar.")
        print(f"Tarea {t['id']} creada para {agente}. Ejecutando…")
        r = flujo.ejecutar_tarea(t["id"])
        t = base.tarea(t["id"])
        print(f"Estado: {base.ESTADOS[t['estado']]}  ({r.get('msg', '')})")
        if t["ejecuciones"]:
            e = t["ejecuciones"][-1]
            for c in e.get("checks", []):
                print(f"  {'✔' if c['ok'] else '✖'} {c['nombre']} — {c['detalle']}")
            print(f"Evidencia: {e.get('carpeta')}\nPropuesta: {e.get('propuesta') or '—'}")
    elif cmd == "tareas":
        for t in base.tareas():
            print(f"{t['id']}  {base.ESTADOS[t['estado']]:<20} {t['agente']:<12} {t['proyecto']:<8} {t['encargo'][:60]}")
    else:
        print(__doc__)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
