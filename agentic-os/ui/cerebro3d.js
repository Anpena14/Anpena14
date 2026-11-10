// Cerebro 3D en vivo (three.js): tu bóveda como galaxia de notas; los agentes viajan con su color.
// Solo dibuja; los datos vienen de /api/grafo y /api/eventos (servidor local).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/CSS2DRenderer.js';

const PALETA = ['#ac9eff', '#78d7ff', '#8cf2cc', '#ffca87', '#f5a3c7', '#9fb4ff', '#c3f07a', '#ffb38a', '#7fe0e0', '#d7b8ff', '#ffd86b', '#a3c9ff', '#b5f5d0', '#ff9fb2'];
export const NOMBRES = { codex: 'Codex', claude: 'Claude', antigravity: 'Antigravity', hermes: 'Hermes', local: 'Ollama', simulador: 'Simulador' };
const ORDEN = ['codex', 'claude', 'hermes', 'antigravity', 'local', 'simulador'];
const QUIETO = matchMedia('(prefers-reduced-motion: reduce)').matches;
const rnd = (a, b) => a + Math.random() * (b - a);
const suave = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

function texturaBrillo() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.18, 'rgba(255,255,255,.85)'); r.addColorStop(.45, 'rgba(255,255,255,.22)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function montar(contenedor, op = {}) {
  const compacto = !!op.compacto;
  contenedor.style.position = contenedor.style.position || 'relative';
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.setClearColor(0x000000, 0);
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;outline:none';
  renderer.domElement.tabIndex = 0;
  contenedor.appendChild(renderer.domElement);
  const etiquetas = new CSS2DRenderer();
  etiquetas.domElement.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden';
  contenedor.appendChild(etiquetas.domElement);
  const capa = document.createElement('div'); capa.className = 'c3d-capa'; contenedor.appendChild(capa);
  const ticker = document.createElement('div'); ticker.className = 'c3d-ticker'; if (!compacto) capa.appendChild(ticker);
  const tip = document.createElement('div'); tip.className = 'c3d-tip'; capa.appendChild(tip);

  const escena = new THREE.Scene();
  escena.fog = new THREE.FogExp2(0x0c1018, compacto ? .0011 : .0009);
  const camara = new THREE.PerspectiveCamera(55, 1, 1, 6000);
  camara.position.set(0, 160, 620);
  const controles = new OrbitControls(camara, renderer.domElement);
  controles.enableDamping = true; controles.dampingFactor = .06; controles.rotateSpeed = .6; controles.zoomSpeed = .8;
  controles.autoRotate = !QUIETO; controles.autoRotateSpeed = compacto ? .9 : .45; controles.enabled = !compacto;
  controles.minDistance = 60; controles.maxDistance = 2200;
  const brillo = texturaBrillo();

  const S = { nodos: [], porId: {}, enlaces: [], vecinos: {}, colorCarpeta: {}, carpetas: [], modo: op.modo || 'anillos', ocultas: new Set(),
    agentes: {}, colores: {}, seq: 0, seguir: null, sel: null, hover: null, busca: '', alpha: 1, R: 200, listo: false, ultimaAccion: 0 };

  // ---------- objetos de la escena ----------
  const grupo = new THREE.Group(); escena.add(grupo);
  let nucleos, halos, lineas, lineasVivas, geoLineas, geoVivas;
  const etiquetasCarpeta = {}, etiquetasDin = [];
  function etiqueta(texto, clase) { const d = document.createElement('div'); d.className = 'c3d-label ' + (clase || ''); d.textContent = texto; return new CSS2DObject(d) }
  for (let i = 0; i < 14; i++) { const o = etiqueta('', 'nota'); o.visible = false; grupo.add(o); etiquetasDin.push(o) }

  // estrellas de fondo dentro del cerebro
  { const n = compacto ? 300 : 900, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const r = rnd(500, 1800), a = rnd(0, 6.28), b = Math.acos(rnd(-1, 1)); pos.set([r * Math.sin(b) * Math.cos(a), r * Math.cos(b), r * Math.sin(b) * Math.sin(a)], i * 3) }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    escena.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 2.2, map: brillo, transparent: true, opacity: .55, depthWrite: false, blending: THREE.AdditiveBlending, color: 0x9fb4ff }))) }

  // ---------- datos ----------
  async function cargar() {
    const g = await (await fetch('/api/grafo')).json();
    S.grafo = g; S.carpetas = g.carpetas;
    g.carpetas.forEach((c, i) => S.colorCarpeta[c] = PALETA[i % PALETA.length]);
    S.R = 90 + Math.sqrt(g.nodos.length) * 17;
    const viejos = S.porId;
    S.nodos = g.nodos.map(n => { const v = viejos[n.id]; const ang = rnd(0, 6.28), r = rnd(.2, 1) * S.R;
      return { ...n, x: v ? v.x : Math.cos(ang) * r, y: v ? v.y : rnd(-S.R, S.R) * .5, z: v ? v.z : Math.sin(ang) * r, vx: 0, vy: 0, vz: 0, fase: rnd(0, 6.28),
        r: n.tipo === 'carpeta' ? 6 + Math.min(8, Math.sqrt(n.grado) * 1.1) : 1.8 + Math.min(5, Math.sqrt(n.grado) * .8) } });
    S.porId = Object.fromEntries(S.nodos.map(n => [n.id, n]));
    S.enlaces = g.enlaces.filter(e => S.porId[e[0]] && S.porId[e[1]]).map(e => ({ a: S.porId[e[0]], b: S.porId[e[1]], carpeta: e[2] === 'carpeta' }));
    S.vecinos = {}; S.enlaces.forEach(e => { (S.vecinos[e.a.id] ||= new Set()).add(e.b.id); (S.vecinos[e.b.id] ||= new Set()).add(e.a.id) });
    construirMallas(); S.alpha = 1; S.listo = true; colocarAgentes();
    op.onDatos && op.onDatos(g);
  }
  function construirMallas() {
    [nucleos, halos, lineas, lineasVivas].forEach(o => o && grupo.remove(o));
    Object.values(etiquetasCarpeta).forEach(o => grupo.remove(o));
    const N = S.nodos.length;
    nucleos = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshBasicMaterial({ color: 0xffffff }), N);
    nucleos.instanceMatrix.setUsage(THREE.DynamicDrawUsage); grupo.add(nucleos);
    const hg = new THREE.BufferGeometry();
    hg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    hg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    hg.setAttribute('tam', new THREE.BufferAttribute(new Float32Array(N), 1));
    const hm = new THREE.ShaderMaterial({ uniforms: { mapa: { value: brillo }, escala: { value: 1 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
      vertexShader: 'attribute float tam; varying vec3 vC; uniform float escala; void main(){ vC=color; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=tam*escala*(420.0/-mv.z); gl_Position=projectionMatrix*mv; }',
      fragmentShader: 'uniform sampler2D mapa; varying vec3 vC; void main(){ vec4 t=texture2D(mapa,gl_PointCoord); gl_FragColor=vec4(vC*t.a, t.a); }' });
    halos = new THREE.Points(hg, hm); halos.frustumCulled = false; grupo.add(halos);
    const L = S.enlaces.length;
    geoLineas = new THREE.BufferGeometry();
    geoLineas.setAttribute('position', new THREE.BufferAttribute(new Float32Array(L * 6), 3));
    geoLineas.setAttribute('color', new THREE.BufferAttribute(new Float32Array(L * 6), 3));
    lineas = new THREE.LineSegments(geoLineas, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .5, blending: THREE.AdditiveBlending, depthWrite: false }));
    lineas.frustumCulled = false; grupo.add(lineas);
    geoVivas = new THREE.BufferGeometry();
    geoVivas.setAttribute('position', new THREE.BufferAttribute(new Float32Array(L * 6), 3));
    geoVivas.setAttribute('color', new THREE.BufferAttribute(new Float32Array(L * 6), 3));
    lineasVivas = new THREE.LineSegments(geoVivas, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false }));
    lineasVivas.frustumCulled = false; grupo.add(lineasVivas);
    for (const n of S.nodos) if (n.tipo === 'carpeta' && !compacto) { const o = etiqueta(n.nombre, 'carpeta'); o.element.style.color = S.colorCarpeta[n.carpeta]; etiquetasCarpeta[n.id] = o; grupo.add(o) }
  }

  // ---------- física 3D ----------
  function anclas() {
    const out = {}, n = S.carpetas.length;
    S.carpetas.forEach((c, i) => {
      if (S.modo === 'anillos') { const a = i / n * Math.PI * 2; out[c] = { x: Math.cos(a) * S.R * .8, y: Math.sin(a * 2) * S.R * .12, z: Math.sin(a) * S.R * .8 } }
      else { const y = 1 - (i + .5) / n * 2, rr = Math.sqrt(1 - y * y), th = i * 2.399963; out[c] = { x: Math.cos(th) * rr * S.R * .85, y: y * S.R * .85, z: Math.sin(th) * rr * S.R * .85 } }
    });
    return out;
  }
  function paso() {
    const N = S.nodos, a = Math.max(S.alpha, .02), anc = anclas();
    for (let i = 0; i < N.length; i++) { const p = N[i]; if (S.ocultas.has(p.carpeta)) continue;
      for (let j = i + 1; j < N.length; j++) { const q = N[j]; if (S.ocultas.has(q.carpeta)) continue;
        let dx = q.x - p.x, dy = q.y - p.y, dz = q.z - p.z, d2 = dx * dx + dy * dy + dz * dz + .01; if (d2 > 160000) continue;
        const f = (p.tipo === 'carpeta' || q.tipo === 'carpeta' ? 1600 : 520) / d2 * a, d = Math.sqrt(d2); dx /= d; dy /= d; dz /= d;
        p.vx -= dx * f; p.vy -= dy * f; p.vz -= dz * f; q.vx += dx * f; q.vy += dy * f; q.vz += dz * f } }
    for (const e of S.enlaces) { if (S.ocultas.has(e.a.carpeta) || S.ocultas.has(e.b.carpeta)) continue;
      const dx = e.b.x - e.a.x, dy = e.b.y - e.a.y, dz = e.b.z - e.a.z, d = Math.sqrt(dx * dx + dy * dy + dz * dz) + .01, L = e.carpeta ? 48 : 78, k = (e.carpeta ? .035 : .012) * a, f = (d - L) * k;
      e.a.vx += dx / d * f; e.a.vy += dy / d * f; e.a.vz += dz / d * f; e.b.vx -= dx / d * f; e.b.vy -= dy / d * f; e.b.vz -= dz / d * f }
    for (const p of N) {
      if (p.tipo === 'carpeta' && anc[p.carpeta]) { const t = anc[p.carpeta]; p.vx += (t.x - p.x) * .025 * a; p.vy += (t.y - p.y) * .025 * a; p.vz += (t.z - p.z) * .025 * a }
      p.vx -= p.x * .0007 * a; p.vy -= p.y * .0012 * a; p.vz -= p.z * .0007 * a;
      p.vx *= .82; p.vy *= .82; p.vz *= .82; p.x += p.vx; p.y += p.vy; p.z += p.vz }
    S.alpha *= .993;
  }

  // ---------- agentes ----------
  function crearAgente(id) {
    const color = new THREE.Color(S.colores[id] || '#94a3b8');
    const g = new THREE.Group();
    const nucleo = new THREE.Mesh(new THREE.SphereGeometry(compacto ? 4 : 5.5, 24, 16), new THREE.MeshBasicMaterial({ color, fog: false }));
    const aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: brillo, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: .9, fog: false }));
    aura.scale.setScalar(compacto ? 34 : 46); g.add(nucleo, aura);
    const anillo = new THREE.Mesh(new THREE.TorusGeometry(compacto ? 7 : 9, .5, 8, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .7, blending: THREE.AdditiveBlending, fog: false }));
    g.add(anillo);
    if (!compacto) { const et = etiqueta(NOMBRES[id] || id, 'agente'); et.element.style.color = S.colores[id]; et.position.set(0, -14, 0); g.add(et) }
    grupo.add(g);
    const T = 48, tg = new THREE.BufferGeometry();
    tg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(T * 3), 3));
    tg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(T * 3), 3));
    const estela = new THREE.Line(tg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    estela.frustumCulled = false; grupo.add(estela);
    return { id, g, nucleo, aura, anillo, estela, puntos: [], color, hex: S.colores[id], cola: [], estado: 'casa', pos: new THREE.Vector3(), ang: rnd(0, 6.28) };
  }
  function colocarAgentes() {
    if (!S.listo || !Object.keys(S.colores).length) return;
    ORDEN.filter(id => S.colores[id]).forEach(id => { if (!S.agentes[id]) { const a = crearAgente(id); a.pos.copy(casa(a, 0)); S.agentes[id] = a } });
  }
  function casa(a, t) {
    const ids = Object.keys(S.agentes).length ? Object.keys(S.agentes) : ORDEN, i = Math.max(0, ids.indexOf(a.id)), n = ids.length;
    const ang = i / n * Math.PI * 2 + t * .00012;
    return new THREE.Vector3(Math.cos(ang) * S.R * 1.25, -S.R * .78 + Math.sin(t * .0011 + i) * 6, Math.sin(ang) * S.R * 1.25);
  }
  const vec = n => new THREE.Vector3(n.x, n.y, n.z);
  function buscarNodo(nombre) {
    if (!nombre) return null; const n = nombre.toLowerCase();
    return S.nodos.find(x => x.nombre.toLowerCase() === n) || S.nodos.find(x => x.tipo === 'carpeta' && x.nombre.toLowerCase() === n)
      || S.nodos.find(x => x.tipo === 'nota' && x.nombre.toLowerCase().includes(n)) || null;
  }
  function volar(a, destinoFn, fin, dur = 1700) {
    const p0 = a.pos.clone(), d0 = destinoFn(), medio = p0.clone().lerp(d0, .5);
    medio.y += rnd(90, 170); medio.x += rnd(-60, 60);
    a.vuelo = { p0, medio, destinoFn, t0: performance.now(), dur, fin }; a.estado = 'vuela';
  }
  const ondas = [], chispas = [];
  function onda(p, color, fuerte = 1) {
    const m = new THREE.Mesh(new THREE.RingGeometry(1, 1.6, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .9, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.position.copy(p); grupo.add(m); ondas.push({ m, v: 1, f: fuerte });
  }
  function chispa(p, color, n = 40) {
    const pos = new Float32Array(n * 3), vel = [];
    for (let i = 0; i < n; i++) { pos.set([p.x, p.y, p.z], i * 3); vel.push(new THREE.Vector3(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).normalize().multiplyScalar(rnd(.8, 3.2))) }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ color, size: 7, map: brillo, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    grupo.add(pts); chispas.push({ pts, vel, v: 1 });
  }
  function procesar(a, t) {
    if (a.vuelo) { const v = a.vuelo, k = Math.min(1, (t - v.t0) / v.dur), s = suave(k), d = v.destinoFn();
      const p = v.p0.clone().multiplyScalar((1 - s) * (1 - s)).add(v.medio.clone().multiplyScalar(2 * (1 - s) * s)).add(d.clone().multiplyScalar(s * s));
      a.pos.copy(p); if (k >= 1) { a.vuelo = null; v.fin && v.fin() } }
    else if (a.estado === 'orbita' && a.objetivo) { a.ang += .05; const r = a.objetivo.r + 12, c = vec(a.objetivo);
      a.pos.set(c.x + Math.cos(a.ang) * r, c.y + Math.sin(a.ang * 1.3) * r * .45, c.z + Math.sin(a.ang) * r);
      if (Math.random() < .045) onda(c, a.color, .8) }
    else if (a.estado === 'casa') a.pos.lerp(casa(a, t), .05);
    a.g.position.copy(a.pos);
    const activo = a.estado !== 'casa', pul = 1 + Math.sin(t / 170) * (activo ? .18 : .05);
    a.aura.scale.setScalar((compacto ? 34 : 46) * pul * (activo ? 1.25 : 1)); a.anillo.rotation.x = t / 700; a.anillo.rotation.y = t / 900;
    a.puntos.unshift(a.pos.clone()); a.puntos.length = Math.min(a.puntos.length, 48);
    const P = a.estela.geometry.attributes.position, C = a.estela.geometry.attributes.color;
    for (let i = 0; i < 48; i++) { const q = a.puntos[Math.min(i, a.puntos.length - 1)]; P.setXYZ(i, q.x, q.y, q.z); const f = activo ? Math.pow(1 - i / 48, 1.6) : 0; C.setXYZ(i, a.color.r * f, a.color.g * f, a.color.b * f) }
    P.needsUpdate = C.needsUpdate = true;
    if (a.espera && t < a.espera) return;
    if (a.cola.length && !a.vuelo) a.cola.shift()(a);
  }
  function aplicarEvento(ev) {
    const a = S.agentes[ev.agente]; if (!a) return;
    const T = f => ag => { aviso(ev); f(ag) };
    const destino = () => ev.nodos.map(buscarNodo).find(Boolean) || S.nodos.find(n => n.nombre === 'index') || S.nodos.find(n => n.tipo === 'carpeta');
    if (ev.tipo === 'sale') a.cola.push(T(() => { }));
    else if (ev.tipo === 'lee') a.cola.push(T(ag => { const n = destino(); if (!n) return; ag.objetivo = n; volar(ag, () => vec(n), () => { ag.estado = 'orbita'; ag.visita = n.id; onda(vec(n), ag.color, 1.6) }) }));
    else if (ev.tipo === 'trabaja') a.cola.push(T(ag => { ag.estado = 'orbita'; ag.espera = performance.now() + 1100 }));
    else if (ev.tipo === 'escribe') a.cola.push(T(ag => { const n = destino(); if (!n) return; ag.objetivo = n; volar(ag, () => vec(n), () => { ag.estado = 'orbita'; ag.visita = n.id; chispa(vec(n), ag.color, 60); onda(vec(n), ag.color, 2) }) }));
    else if (ev.tipo === 'termina' || ev.tipo === 'falla') a.cola.push(T(ag => {
      chispa(ag.pos, ev.tipo === 'falla' ? new THREE.Color('#ff6b6b') : ag.color, ev.tipo === 'falla' ? 50 : 24); ag.espera = performance.now() + 700;
      ag.cola.unshift(g => { g.objetivo = null; g.visita = null; volar(g, () => casa(g, performance.now()), () => { g.estado = 'casa' }, 1500) }) }));
  }
  function aviso(ev) {
    op.onEvento && op.onEvento(ev); if (compacto) return;
    const d = document.createElement('div'); d.className = 'c3d-aviso'; d.style.setProperty('--c', S.colores[ev.agente] || '#fff'); d.textContent = ev.texto || `${NOMBRES[ev.agente] || ev.agente} · ${ev.tipo}`;
    ticker.prepend(d); while (ticker.children.length > 4) ticker.lastChild.remove(); setTimeout(() => d.classList.add('fuera'), 7000); setTimeout(() => d.remove(), 8000);
  }
  async function sondear() {
    try { const r = await (await fetch('/api/eventos?desde=' + S.seq)).json();
      if (!Object.keys(S.colores).length) { S.colores = r.colores; colocarAgentes() }
      if (!S.primero) { S.primero = true; S.seq = r.ultimo; return }
      r.eventos.forEach(aplicarEvento); S.seq = r.ultimo } catch (e) { }
  }
  function demo() {
    const notas = S.nodos.filter(n => n.tipo === 'nota').sort((a, b) => b.grado - a.grado).slice(0, 30), inbox = buscarNodo('01-Inbox');
    ['codex', 'claude', 'hermes'].forEach((id, i) => { const n = notas[Math.floor(Math.random() * notas.length)]; if (!S.agentes[id] || !n) return;
      setTimeout(() => { const nom = NOMBRES[id];
        aplicarEvento({ agente: id, tipo: 'lee', nodos: [n.nombre], texto: `Demostración · ${nom} visita «${n.nombre}»` });
        aplicarEvento({ agente: id, tipo: 'trabaja', nodos: [n.nombre], texto: `Demostración · ${nom} trabaja` });
        if (inbox) aplicarEvento({ agente: id, tipo: 'escribe', nodos: [inbox.nombre], texto: `Demostración · ${nom} deja una propuesta` });
        aplicarEvento({ agente: id, tipo: 'termina', nodos: [], texto: `Demostración · ${nom} vuelve` }) }, i * 1100) });
  }

  // ---------- dibujo ----------
  const m4 = new THREE.Matrix4(), col = new THREE.Color(), tmp = new THREE.Color(), q0 = new THREE.Quaternion(), sv = new THREE.Vector3();
  function actualizarMallas(t) {
    if (!nucleos) return;
    const foco = S.hover || S.sel, vec = foco ? S.vecinos[foco.id] || new Set() : null, visitas = {};
    Object.values(S.agentes).forEach(a => { if (a.visita) visitas[a.visita] = a.color });
    const HP = halos.geometry.attributes.position, HC = halos.geometry.attributes.color, HT = halos.geometry.attributes.tam;
    S.nodos.forEach((n, i) => {
      const oculto = S.ocultas.has(n.carpeta), coincide = S.busca && n.nombre.toLowerCase().includes(S.busca);
      const dim = (foco && n !== foco && !vec.has(n.id)) || (S.busca && !coincide);
      const resp = 1 + Math.sin(t / 900 + n.fase) * .08, esc = oculto ? 0.0001 : n.r * resp * (n === foco ? 1.5 : 1);
      sv.set(esc, esc, esc); m4.compose(sv.clone().set(n.x, n.y + Math.sin(t / 1300 + n.fase) * 1.2, n.z), q0, sv); nucleos.setMatrixAt(i, m4);
      col.set(visitas[n.id] || S.colorCarpeta[n.carpeta]); if (dim) col.multiplyScalar(.22);
      nucleos.setColorAt(i, col);
      HP.setXYZ(i, n.x, n.y + Math.sin(t / 1300 + n.fase) * 1.2, n.z);
      const fuerza = oculto ? 0 : dim ? .12 : visitas[n.id] ? 1.3 + Math.sin(t / 150) * .3 : coincide || n === S.sel ? 1.2 : n.tipo === 'carpeta' ? .75 : .5;
      tmp.copy(col).multiplyScalar(fuerza); HC.setXYZ(i, tmp.r, tmp.g, tmp.b);
      HT.setX(i, oculto ? 0 : (n.r * (visitas[n.id] ? 9 : n.tipo === 'carpeta' ? 7 : 5.5)));
    });
    nucleos.instanceMatrix.needsUpdate = true; if (nucleos.instanceColor) nucleos.instanceColor.needsUpdate = true;
    HP.needsUpdate = HC.needsUpdate = HT.needsUpdate = true;
    const LP = geoLineas.attributes.position, LC = geoLineas.attributes.color, VP = geoVivas.attributes.position, VC = geoVivas.attributes.color;
    let nv = 0;
    S.enlaces.forEach((e, i) => {
      const oculto = S.ocultas.has(e.a.carpeta) || S.ocultas.has(e.b.carpeta);
      LP.setXYZ(i * 2, e.a.x, e.a.y, e.a.z); LP.setXYZ(i * 2 + 1, e.b.x, e.b.y, e.b.z);
      const vis = visitas[e.a.id] || visitas[e.b.id], act = foco && (e.a === foco || e.b === foco);
      col.set(S.colorCarpeta[e.a.carpeta]).multiplyScalar(oculto ? 0 : foco || S.busca ? .06 : e.carpeta ? .16 : .3);
      LC.setXYZ(i * 2, col.r, col.g, col.b); LC.setXYZ(i * 2 + 1, col.r, col.g, col.b);
      if ((vis || act) && !oculto) { col.set(vis ? vis : '#dfe8ff').multiplyScalar(vis ? .9 + Math.sin(t / 160) * .3 : .8);
        VP.setXYZ(nv * 2, e.a.x, e.a.y, e.a.z); VP.setXYZ(nv * 2 + 1, e.b.x, e.b.y, e.b.z); VC.setXYZ(nv * 2, col.r, col.g, col.b); VC.setXYZ(nv * 2 + 1, col.r, col.g, col.b); nv++ }
    });
    geoVivas.setDrawRange(0, nv * 2);
    LP.needsUpdate = LC.needsUpdate = VP.needsUpdate = VC.needsUpdate = true;
    // etiquetas
    for (const [id, o] of Object.entries(etiquetasCarpeta)) { const n = S.porId[id]; o.position.set(n.x, n.y + n.r + 6, n.z); o.visible = !S.ocultas.has(n.carpeta); o.element.classList.toggle('tenue', !!(foco && n !== foco && !vec.has(n.id))) }
    const quiero = [];
    if (!compacto) {
      if (foco) quiero.push([foco, '']);
      Object.entries(visitas).forEach(([id, c]) => S.porId[id] && quiero.push([S.porId[id], c]));
      if (S.busca) S.nodos.filter(n => n.nombre.toLowerCase().includes(S.busca)).slice(0, 6).forEach(n => quiero.push([n, '']));
      if (foco) [...vec].slice(0, 8).forEach(id => S.porId[id] && S.porId[id].tipo === 'nota' && quiero.push([S.porId[id], '']));
    }
    etiquetasDin.forEach((o, i) => { const q = quiero[i]; if (!q || q[0].tipo === 'carpeta') { o.visible = false; return } const [n, c] = q;
      o.visible = true; o.element.textContent = n.nombre; o.element.style.color = c ? '#' + c.getHexString() : ''; o.position.set(n.x, n.y + n.r + 5, n.z) });
  }
  function efectos() {
    for (let i = ondas.length - 1; i >= 0; i--) { const o = ondas[i]; o.v -= .014; const s = 4 + (1 - o.v) * 38 * o.f; o.m.scale.setScalar(s); o.m.material.opacity = Math.max(0, o.v * .8); o.m.lookAt(camara.position);
      if (o.v <= 0) { grupo.remove(o.m); o.m.geometry.dispose(); o.m.material.dispose(); ondas.splice(i, 1) } }
    for (let i = chispas.length - 1; i >= 0; i--) { const c = chispas[i], P = c.pts.geometry.attributes.position; c.v -= .016;
      c.vel.forEach((v, j) => { P.setXYZ(j, P.getX(j) + v.x, P.getY(j) + v.y, P.getZ(j) + v.z); v.multiplyScalar(.965) }); P.needsUpdate = true; c.pts.material.opacity = Math.max(0, c.v);
      if (c.v <= 0) { grupo.remove(c.pts); c.pts.geometry.dispose(); c.pts.material.dispose(); chispas.splice(i, 1) } }
  }
  const objetivoCam = new THREE.Vector3(); let volarCam = null;
  function bucle(t) {
    requestAnimationFrame(bucle);
    if (document.hidden) return;
    if (S.listo) { paso(); if (!QUIETO) paso() }
    Object.values(S.agentes).forEach(a => procesar(a, t));
    actualizarMallas(t); efectos();
    if (S.seguir && S.agentes[S.seguir]) { controles.target.lerp(S.agentes[S.seguir].pos, .08); controles.autoRotate = false }
    else if (volarCam) { controles.target.lerp(volarCam.p, .08); camara.position.lerp(volarCam.cam, .06); if (camara.position.distanceTo(volarCam.cam) < 2) volarCam = null }
    else if (!QUIETO && !compacto && performance.now() - S.ultimaAccion > 9000) controles.autoRotate = true;
    controles.update();
    if (halos) halos.material.uniforms.escala.value = renderer.getPixelRatio();
    renderer.render(escena, camara); etiquetas.render(escena, camara);
  }

  // ---------- interacción ----------
  function medir() { const r = contenedor.getBoundingClientRect(); if (!r.width || !r.height) return; renderer.setSize(r.width, r.height, false); etiquetas.setSize(r.width, r.height); camara.aspect = r.width / r.height; camara.updateProjectionMatrix() }
  new ResizeObserver(medir).observe(contenedor); medir();
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  function apuntar(e) { const r = renderer.domElement.getBoundingClientRect(); ptr.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(ptr, camara) }
  function nodoBajo(e) { if (!nucleos) return null; apuntar(e); const h = ray.intersectObject(nucleos)[0]; return h ? S.nodos[h.instanceId] : null }
  function agenteBajo(e) { apuntar(e); const objs = Object.values(S.agentes).map(a => a.nucleo); const h = ray.intersectObjects(objs)[0]; return h && Object.values(S.agentes).find(a => a.nucleo === h.object) }
  const ocupado = () => { S.ultimaAccion = performance.now(); controles.autoRotate = false };
  let abajo = null;
  renderer.domElement.addEventListener('pointerdown', e => { abajo = { x: e.clientX, y: e.clientY }; if (!compacto) ocupado() });
  renderer.domElement.addEventListener('pointermove', e => {
    if (compacto) return; const n = nodoBajo(e), ag = !n && agenteBajo(e); S.hover = n; renderer.domElement.style.cursor = n || ag ? 'pointer' : 'grab';
    if (n || ag) { tip.style.display = 'block'; const r = contenedor.getBoundingClientRect(); tip.style.left = Math.min(r.width - 260, e.clientX - r.left + 14) + 'px'; tip.style.top = (e.clientY - r.top + 14) + 'px';
      tip.textContent = n ? `${n.nombre} · ${n.tipo === 'carpeta' ? 'carpeta' : n.sub || n.carpeta} · ${n.grado} conexiones` : `${NOMBRES[ag.id]} · ${ag.estado === 'casa' ? 'en espera' : 'trabajando'} · clic para seguir` } else tip.style.display = 'none';
  });
  renderer.domElement.addEventListener('pointerleave', () => { S.hover = null; tip.style.display = 'none' });
  renderer.domElement.addEventListener('pointerup', e => {
    if (!abajo || Math.hypot(e.clientX - abajo.x, e.clientY - abajo.y) > 5) { abajo = null; return } abajo = null;
    if (compacto) { op.onClick && op.onClick(); return }
    const ag = agenteBajo(e); if (ag) { S.seguir = S.seguir === ag.id ? null : ag.id; op.onAgente && op.onAgente(ag.id, !!S.seguir); return }
    const n = nodoBajo(e); S.sel = n; op.onSelect && op.onSelect(n);
  });
  renderer.domElement.addEventListener('dblclick', e => { const n = nodoBajo(e); if (n) enfocar(n) });
  renderer.domElement.addEventListener('wheel', () => ocupado(), { passive: true });
  function enfocar(n) { ocupado(); const p = vec(n), dir = camara.position.clone().sub(controles.target).normalize(); volarCam = { p, cam: p.clone().add(dir.multiplyScalar(170)) } }

  cargar(); sondear(); setInterval(sondear, 900);
  setInterval(async () => { try { const g = await (await fetch('/api/grafo')).json(); if (S.grafo && g.generado !== S.grafo.generado) cargar() } catch (e) { } }, 30000);
  requestAnimationFrame(bucle);
  return {
    estado: S,
    buscar(q) { S.busca = (q || '').trim().toLowerCase(); const n = S.busca && S.nodos.find(x => x.nombre.toLowerCase().includes(S.busca)); if (n) enfocar(n) },
    modo(m) { S.modo = m; S.alpha = 1 },
    alternarCarpeta(c) { S.ocultas.has(c) ? S.ocultas.delete(c) : S.ocultas.add(c); S.alpha = Math.max(S.alpha, .5) },
    seleccionar(id) { const n = S.porId[id]; if (n) { S.sel = n; enfocar(n); op.onSelect && op.onSelect(n) } },
    seguir(id) { S.seguir = S.seguir === id ? null : id; ocupado(); return S.seguir },
    encuadrar() { S.seguir = null; S.sel = null; volarCam = { p: new THREE.Vector3(), cam: new THREE.Vector3(0, 160, Math.max(520, S.R * 2.6)) }; S.ultimaAccion = 0 },
    demo, vecinos: id => [...(S.vecinos[id] || [])].map(x => S.porId[x]),
  };
}
window.Cerebro = { montar, NOMBRES };
