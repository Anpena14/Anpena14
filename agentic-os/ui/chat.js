// Chat con tus agentes, con voz: habla (micrófono) y escucha las respuestas (voz del sistema).
// Usa la API local /api/chat. El dictado lo hace el navegador (Chrome usa servidores de Google; Safari, los de Apple).
(function () {
  const RS = window.SpeechRecognition || window.webkitSpeechRecognition;
  const guardado = k => { try { return localStorage.getItem('aos-chat-' + k) } catch (e) { return null } };
  const guardar = (k, v) => { try { localStorage.setItem('aos-chat-' + k, v) } catch (e) { } };
  let agentes = [], msgs = [], abierto = false, hablar = guardado('voz') !== '0', manosLibres = guardado('manos') === '1', escuchando = false, rec = null, leidos = new Set(guardado('leidos') ? JSON.parse(guardado('leidos')) : []);

  const orbe = h('button', { class: 'chat-orbe', 'aria-label': 'Abrir el chat con tus agentes', title: 'Habla con tus agentes' }, h('span', { class: 'chat-orbe-nucleo' }, '✳'));
  const lista = h('div', { class: 'chat-lista', 'aria-live': 'polite' });
  const sel = h('select', { class: 'chat-sel', 'aria-label': 'Agente' });
  const entrada = h('textarea', { class: 'chat-in', rows: 1, placeholder: 'Escribe o pulsa el micrófono…', maxlength: 4000 });
  const mic = h('button', { class: 'chat-btn chat-mic', title: RS ? 'Hablar (clic para empezar y parar)' : 'Tu navegador no permite dictado; usa Chrome o Safari', 'aria-label': 'Hablar' }, '🎙');
  const enviarB = h('button', { class: 'chat-btn chat-env', 'aria-label': 'Enviar' }, '➤');
  const vozB = h('button', { class: 'chat-mini', 'aria-pressed': String(hablar), title: 'Leer las respuestas en voz alta' }, '🔊 Voz');
  const manosB = h('button', { class: 'chat-mini', 'aria-pressed': String(manosLibres), title: 'Enviar al terminar de hablar y volver a escuchar tras la respuesta' }, '🗣 Manos libres');
  const borrarB = h('button', { class: 'chat-mini', title: 'Borrar la conversación' }, 'Limpiar');
  const estadoVoz = h('div', { class: 'chat-voz' });
  const panel = h('section', { class: 'chat-panel', 'aria-label': 'Chat con tus agentes', hidden: true },
    h('header', { class: 'chat-cab' }, h('div', {}, h('strong', {}, 'Habla con tus agentes'), h('small', {}, 'Automático: el router elige el mejor')), h('button', { class: 'chat-cerrar', 'aria-label': 'Cerrar' }, '✕')),
    h('div', { class: 'chat-opciones' }, sel, vozB, manosB, borrarB), lista, estadoVoz,
    h('div', { class: 'chat-pie' }, mic, entrada, enviarB),
    h('p', { class: 'chat-nota' }, 'El agente solo ve esta conversación, no tu bóveda. Con datos privados usa Hermes u Ollama.'));
  document.body.append(orbe, panel);

  function abrir(v) { abierto = v ?? !abierto; panel.hidden = !abierto; orbe.classList.toggle('activo', abierto); if (abierto) { entrada.focus(); cargar(); setTimeout(() => lista.scrollTop = lista.scrollHeight, 50) } }
  orbe.onclick = () => abrir(); panel.querySelector('.chat-cerrar').onclick = () => abrir(false);
  addEventListener('keydown', e => { if (e.key === 'Escape' && abierto) abrir(false); if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); abrir(true) } });
  vozB.onclick = () => { hablar = !hablar; vozB.setAttribute('aria-pressed', hablar); guardar('voz', hablar ? '1' : '0'); if (!hablar) speechSynthesis.cancel() };
  manosB.onclick = () => { manosLibres = !manosLibres; manosB.setAttribute('aria-pressed', manosLibres); guardar('manos', manosLibres ? '1' : '0') };
  borrarB.onclick = async () => { if (!confirm('¿Borrar toda la conversación?')) return; await api('/api/chat', { borrar: true }); msgs = []; pintar() };

  async function cargarAgentes() {
    agentes = await api('/api/agentes?refrescar=0');
    const previo = sel.value || guardado('agente') || 'auto';
    sel.replaceChildren(h('option', { value: 'auto' }, '✦ Automático (router)'), ...agentes.map(a => h('option', { value: a.id }, `${a.nombre} · ${NOMBRE_ESTADO[a.estado] || a.estado}`)));
    sel.value = [...sel.options].some(o => o.value === previo) ? previo : 'auto';
  }
  sel.onchange = () => guardar('agente', sel.value);
  const colorDe = id => (agentes.find(a => a.id === id) || {}).color || '#bdb2ff';
  const nombreDe = id => (agentes.find(a => a.id === id) || {}).nombre || id;

  function pintar() {
    lista.replaceChildren(...(msgs.length ? msgs : []).map(m => {
      if (m.rol === 'usuario') return h('div', { class: 'msg yo' }, h('div', { class: 'burbuja' }, m.texto));
      const c = colorDe(m.agente);
      return h('div', { class: 'msg ag ' + m.estado, style: `--c:${c}` },
        h('div', { class: 'quien' }, h('i', { class: 'punto' }), nombreDe(m.agente), m.router ? h('span', { class: 'router', title: m.router.motivo }, 'router') : null, m.segundos ? h('small', {}, ` · ${m.segundos} s`) : null),
        h('div', { class: 'burbuja' }, m.estado === 'pensando' ? h('span', { class: 'puntos' }, h('i'), h('i'), h('i')) : m.texto),
        m.router && m.estado !== 'pensando' ? h('div', { class: 'motivo' }, m.router.motivo) : null);
    }));
    if (!msgs.length) lista.append(h('div', { class: 'chat-vacio' }, h('strong', {}, '¿Qué hacemos hoy?'), h('span', {}, 'Ej.: «Resume qué falta en Pulso» · «Explícame DDMRP en 3 frases» · «Organiza mi semana»')));
    lista.scrollTop = lista.scrollHeight;
  }
  async function cargar() {
    msgs = await api('/api/chat'); pintar();
    for (const m of msgs) if (m.rol === 'agente' && m.estado !== 'pensando' && !leidos.has(m.id)) { leidos.add(m.id); if (m._nuevo || hablarPendiente.has(m.id)) decir(m) }
    guardar('leidos', JSON.stringify([...leidos].slice(-200)));
    if (msgs.some(m => m.estado === 'pensando')) setTimeout(cargar, 1200);
  }
  const hablarPendiente = new Set();
  async function enviar(texto) {
    texto = (texto ?? entrada.value).trim(); if (!texto) return;
    entrada.value = ''; ajustar(); abrir(true);
    const r = await api('/api/chat', { texto, agente: sel.value });
    if (r.error) { msgs.push({ id: 'e' + Date.now(), rol: 'agente', agente: sel.value === 'auto' ? 'simulador' : sel.value, estado: 'error', texto: r.error }); pintar(); return }
    hablarPendiente.add(r.respuesta.id); cargar();
  }
  enviarB.onclick = () => enviar();
  entrada.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() } });
  function ajustar() { entrada.style.height = 'auto'; entrada.style.height = Math.min(140, entrada.scrollHeight) + 'px' }
  entrada.addEventListener('input', ajustar);

  // ---------- voz: salida ----------
  function vozEs() { const v = speechSynthesis.getVoices(); return v.find(x => /es[-_](DO|US|MX|419)/i.test(x.lang)) || v.find(x => /^es/i.test(x.lang)) }
  function limpiar(t) { return t.replace(/```[\s\S]*?```/g, ' (hay un bloque de código en pantalla) ').replace(/[*_#>`|]/g, '').replace(/\[(.*?)\]\(.*?\)/g, '$1').slice(0, 1500) }
  function decir(m) {
    hablarPendiente.delete(m.id);
    if (!hablar || !('speechSynthesis' in window) || m.estado !== 'lista') { if (manosLibres) escuchar(); return }
    speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(limpiar(m.texto)); const v = vozEs(); if (v) u.voice = v; u.lang = v ? v.lang : 'es-ES'; u.rate = 1.03;
    u.onstart = () => orbe.classList.add('hablando'); u.onend = () => { orbe.classList.remove('hablando'); if (manosLibres) escuchar() };
    speechSynthesis.speak(u);
  }
  if ('speechSynthesis' in window) speechSynthesis.onvoiceschanged = () => { };

  // ---------- voz: entrada ----------
  function escuchar() {
    if (!RS) { estadoVoz.textContent = 'Tu navegador no permite dictado. Usa Chrome o Safari.'; return }
    if (escuchando) { rec && rec.stop(); return }
    speechSynthesis.cancel();
    rec = new RS(); rec.lang = 'es-DO'; rec.interimResults = true; rec.continuous = false;
    let final = '';
    rec.onstart = () => { escuchando = true; mic.classList.add('grabando'); orbe.classList.add('escuchando'); estadoVoz.textContent = 'Te escucho…' };
    rec.onresult = e => { let parcial = ''; for (const r of e.results) { if (r.isFinal) final = r[0].transcript; else parcial += r[0].transcript } entrada.value = final || parcial; ajustar() };
    rec.onerror = e => { estadoVoz.textContent = e.error === 'not-allowed' ? 'Permite el micrófono en el navegador para hablar.' : 'No te entendí; prueba otra vez.' };
    rec.onend = () => { escuchando = false; mic.classList.remove('grabando'); orbe.classList.remove('escuchando'); if (!estadoVoz.textContent.startsWith('Permite')) estadoVoz.textContent = '';
      if (final.trim() && manosLibres) enviar(final); };
    rec.start();
  }
  mic.onclick = () => { abrir(true); escuchar() };
  if (!RS) mic.classList.add('sin-voz');
  cargarAgentes(); setInterval(cargarAgentes, 30000); cargar();
  window.ChatAOS = { abrir, enviar };
})();
