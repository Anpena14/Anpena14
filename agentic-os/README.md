# Agentic OS local · Aneudys

Centro de mando local para tus agentes: Claude Code, Codex, Antigravity, Hermes y tu IA local con Ollama. Incluye:

- tu cerebro de Obsidian en 3D y en vivo;
- chat con voz;
- router que elige el mejor agente para cada tarea;
- consumo de tus suscripciones y de tus tokens locales.

Todo corre en tu Mac, en `http://127.0.0.1:8787`.

## Abrir

Haz doble clic en **`Abrir Agentic OS.command`**. Deja abierta la ventana de Terminal mientras lo usas.

Desde Terminal también funciona:

```bash
python3 aos.py
```

Si macOS bloquea el `.command`, ve a Ajustes del Sistema → Privacidad y seguridad → «Abrir igualmente».

## Actualizar sin descargar otro zip

- **Desde el panel:** botón **⟳ Actualizar**, arriba a la derecha. Trae la última versión, conserva tus datos y ajustes, y se reinicia solo.
- **Desde Terminal**, dentro de la carpeta:
  ```bash
  python3 aos.py actualizar
  ```
- **Primera vez**, si tu carpeta todavía no tiene `actualizar.py`. En Terminal, entra en la carpeta y pega:
  ```bash
  curl -fsSL https://raw.githubusercontent.com/anpena14/anpena14/refs/heads/claude/peaceful-cannon-re5lkd/agentic-os/actualizar.py | python3 -
  ```

La actualización **nunca toca**:

- `data/`: tareas, chat, evidencias y consumo;
- las propuestas de `boveda-prueba/01-Inbox/`;
- tus valores de `config.json`, `agentes.json` y `skills.json`, a los que solo se añaden claves nuevas;
- archivos tuyos que no vengan en la actualización.

Antes de reemplazar algo guarda una copia en `data/respaldos/<fecha>/`.

## Conectar tus agentes

En **Equipo**, cada agente pendiente muestra el comando exacto para instalarlo o iniciar sesión, con botón para copiarlo. Después pulsa **Probar**: hace una llamada mínima real y comprueba por separado instalación, autenticación y permisos.

| Agente | Instalar | Entrar |
|---|---|---|
| Codex | `npm install -g @openai/codex` | `codex login` |
| Claude Code | `npm install -g @anthropic-ai/claude-code` | `claude` y `/login` |
| Antigravity (vía Gemini CLI) | `npm install -g @google/gemini-cli` | `gemini` |
| Hermes | `curl -fsSL https://hermes-agent.nousresearch.com/install.sh \| bash` | `hermes setup` y `hermes model` (Ollama: `http://localhost:11434/v1`) |
| IA local (Ollama) | `brew install ollama` o la app | `ollama pull qwen3` y deja Ollama abierto |

Al abrir con doble clic, el panel carga el PATH de tu terminal para encontrar estos programas aunque estén en Homebrew, npm, nvm o `~/.local/bin`.

## Chat y voz

- Abre el chat con el **orbe** (abajo a la derecha), con **⌘K** o desde «Chat por voz».
- **🎙 Micrófono:** dictas en español. El dictado lo hace el navegador: Chrome usa servidores de Google y Safari los de Apple.
- **🔊 Voz:** lee las respuestas en voz alta con la voz del sistema.
- **🗣 Manos libres:** envía al terminar de hablar y vuelve a escuchar después de la respuesta.
- **Agente:** «Automático» deja que el router elija, o eliges uno.
- **Qué ve el agente:** solo la conversación, no tu bóveda. Si el mensaje tiene datos privados, solo se permite Hermes u Ollama.

## Router: elige el agente que más conviene

Al escribir una tarea o un mensaje en «Automático», el router decide en este orden (`config.json` → `router`):

1. **Tu router externo**, por ejemplo uno de código abierto basado en **Jev**. Actívalo con `externo.activo: true` y su `url` (POST) o `cmd` (JSON por stdin).
   - Recibe: `{"texto", "agentes": [{"id","nombre","rol","conectado","nube"}], "privado"}`
   - Devuelve: `{"agente": "<id>", "motivo": "..."}`
2. **Tu IA local (Ollama)**, si está conectada: clasifica el texto sin que salga de tu Mac.
3. **Reglas**:

   | Si el texto trata de… | Va a… |
   |---|---|
   | código | Codex |
   | revisión o pruebas | Antigravity |
   | redacción o explicaciones | Claude |
   | algo privado | Hermes u Ollama |

Solo elige entre agentes **conectados**. Lo privado nunca va a la nube. Siempre ves qué agente eligió y por qué.

## Consumo

El widget **Consumo** lee los registros locales de cada herramienta. Nada sale de tu Mac.

- **Claude Code:** tokens de las últimas 5 h, de hoy, de 7 días y por día, desde `~/.claude/projects`. El % de tu plan lo da `/usage` en Claude Code.
- **Codex:** tokens y, si el registro lo trae, el **% usado** de la ventana de 5 h y de la semanal, con su reinicio. Viene de `~/.codex/sessions`.
- **IA local:** tokens que reportan Ollama y Hermes en cada ejecución desde el panel, y los modelos cargados en memoria.
- **Antigravity:** no deja un registro local de tokens estable; tu cuota se consulta en la app.
- **Tus límites:** si pones tus límites en `config.json` → `planes`, se dibuja la barra de % de Claude.

## Cerebro 3D en vivo

Tu bóveda real (`boveda_real` en `config.json`) se dibuja en 3D con three.js, incluido en `ui/vendor/` (funciona sin internet). Se lee **en solo lectura**: títulos, carpetas y `[[enlaces]]`. No se envía a ningún agente.

**Qué puedes hacer**
- Girar arrastrando, hacer zoom con la rueda y doble clic para volar a una nota.
- Al hacer clic en una nota: vista previa, conexiones y «Abrir en Obsidian».
- Filtros por carpeta, búsqueda y vistas «Anillos» y «Áreas».

**Cuando un agente trabaja**
1. Sale de su órbita.
2. Vuela con estela a la nota que lee.
3. La rodea, y los enlaces se encienden con su color.
4. Deja la propuesta en «01-Inbox».
5. Vuelve a su órbita.

Haz clic en un agente para que la cámara lo siga. Con **«Ver demostración»** ves la animación sin ejecutar nada.

**Colores** (se cambian en `agentes.json` → `color`)

| Agente | Color |
|---|---|
| Codex | azul |
| Claude | naranja Claude |
| Hermes | dorado |
| Antigravity | verde |
| Ollama | blanco |

## Tareas

1. **Crear y validar:** se crean desde el lanzador de skills o desde «Nueva tarea». Se guardan en `data/tareas.json`. Una tarea con datos privados se rechaza antes de guardarse.
2. **Contexto:** solo se carga la ficha autorizada (`fichas_autorizadas`).
3. **Ejecución:** el agente trabaja en una carpeta temporal aislada.
4. **Evidencia:** queda en `data/ejecuciones/<ID>/`.
5. **Revisión:** la tarea pasa a **Lista para revisión** solo con un resultado verificable. Si falla, se conserva y se puede reintentar hasta 3 veces.
6. **Propuesta:** se escribe en la bandeja de la bóveda **de prueba**. Pasarla a tus notas reales lo decides tú.

## Fuera de esta versión, a propósito

- Rutinas programadas, Telegram y acceso remoto.
- Escritura en tu bóveda real.
- Cambios en permisos globales o en la configuración de tus agentes.

## Pruebas

```bash
python3 -m unittest discover -s tests -v
```
