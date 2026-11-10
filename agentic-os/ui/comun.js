// Utilidades compartidas por las páginas del panel. La interfaz solo habla con la API local; no ejecuta nada.
const AOS_TOKEN = document.querySelector('meta[name="aos-token"]').content;
async function api(ruta, cuerpo) {
  const op = cuerpo === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-AOS-Token': AOS_TOKEN }, body: JSON.stringify(cuerpo) };
  const r = await fetch(ruta, op);
  return r.json();
}
function h(tag, props, ...hijos) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (k === 'class') e.className = v; else if (k.startsWith('on')) e[k] = v; else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v);
  }
  for (const x of hijos.flat()) if (x != null && x !== false) e.append(x.nodeType ? x : document.createTextNode(String(x)));
  return e;
}
const NOMBRE_ESTADO = { conectado: 'Conectado', pendiente: 'Pendiente', simulado: 'Simulado' };
const ESTADOS_TAREA = { pendiente: 'Pendiente', en_curso: 'En curso', lista_para_revision: 'Lista para revisión', fallida: 'Fallida', simulada: 'Simulada', cerrada: 'Cerrada' };
function hora(iso) { try { return new Date(iso).toLocaleString('es-DO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return iso; } }
