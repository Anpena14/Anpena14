"""Agente simulado: comprueba el flujo de punta a punta sin llamar a ninguna IA."""
import re


def responder(prompt):
    if "# Mensaje nuevo de Aneudys" in prompt:
        msg = prompt.split("# Mensaje nuevo de Aneudys", 1)[1].strip()
        return (f"[Simulado] Recibí: «{msg[:120]}». Soy el simulador: confirmo que el chat, la voz y el registro funcionan, "
                "pero no pienso de verdad. Conecta Claude, Codex, Hermes u Ollama con «Probar» para respuestas reales.")
    tid = (re.search(r"ID: (T-\d+)", prompt) or [None, "T-?"])[1]
    titulos = re.findall(r"^## (.+)$", prompt, re.M)
    return f"""## Resultado
[SIMULADO] Respuesta de prueba para {tid}. No la generó ninguna IA: solo demuestra que el encargo, la ficha y el registro funcionan.
Secciones de la ficha recibidas: {', '.join(titulos[:8]) or 'ninguna'}.

## Cierre
- Pedido: (simulado)
- Decisión del usuario: pendiente de revisión
- Trabajo terminado y evidencia: ninguna (simulación)
- Archivo, versión o chat: —
- Bloqueo o riesgo concreto: no es un resultado real
- Siguiente paso: ejecutar con un agente conectado

## Criterio de cierre
- Cumplido: no
- Justificación: simulación
"""
