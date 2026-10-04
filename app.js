'use strict';
/* =========================================================
   SALIDA A TERRENO – Lógica del cliente
   Esta misma lógica se usa en index.html (alumnos) y docente.html
   ========================================================= */
const API_URL = 'https://script.google.com/macros/s/AKfycbxYz1D54NQju3TEtZZJDYs-ZeCaKCKwn-mI__boa3HWrzhFkV7zuxJNKa-cTHRebRdC6w/exec';
const MAX_FOTO_KB = 500;
const EXIGENCIA = 60; // % para nota 4,0
const MODO = (document.body && document.body.dataset.modo) || 'alumno';
const ROL_PAGINA = MODO === 'docente' ? 'docente' : 'estudiante';
const CLAVE_SESION = 'sesion_' + MODO;

const S = {
  rol: null, token: null, usuario: null, datos: null, offset: 0, pend: [],
  tab: 'pendientes', tabDoc: 'resumen', panel: null, insignia: null,
  mapa: null, watchId: null, pos: null, yo: null, yoPrec: null, firma: null,
  filtroIA: { act: '', pend: true }
};

/* ---------- Utilidades ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now() + Math.random().toString(16).slice(2));
const fechaCorta = iso => new Date(iso).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const rutKey = r => String(r || '').replace(/[^0-9kK]/g, '').toUpperCase();

function dvRut(cuerpo) {
  let s = 0, m = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) { s += (+cuerpo[i]) * m; m = m === 7 ? 2 : m + 1; }
  const r = 11 - (s % 11);
  return r === 11 ? '0' : r === 10 ? 'K' : String(r);
}
function normalizarRut(r) {
  const l = rutKey(r);
  if (l.length < 2) return null;
  const c = l.slice(0, -1), d = l.slice(-1);
  return dvRut(c) === d ? c + '-' + d : null;
}
function notaChile(p, ex = EXIGENCIA) {
  const n = p >= ex ? 4 + 3 * (p - ex) / (100 - ex) : 1 + 3 * p / ex;
  return Math.round(Math.min(7, Math.max(1, n)) * 10) / 10;
}
function aLocalInput(iso) {
  const d = new Date(iso), p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
function aviso(msg, tipo = 'ok') {
  const a = $('#aviso');
  a.textContent = msg;
  a.className = 'fixed bottom-5 left-1/2 -translate-x-1/2 z-50 max-w-[92vw] px-4 py-3 rounded-xl text-white text-sm shadow-lg ' +
    (tipo === 'error' ? 'bg-rose-600' : 'bg-slate-800');
  clearTimeout(aviso._t);
  aviso._t = setTimeout(() => a.classList.add('hidden'), 4500);
}
function cargando(on, msg = 'Cargando…') {
  $('#cargando-msg').textContent = msg;
  $('#cargando').classList.toggle('hidden', !on);
}
const chip = (t, c) => `<span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-${c}-100 text-${c}-800">${esc(t)}</span>`;
function modal(html) { $('#modal-cuerpo').innerHTML = html; $('#modal').classList.remove('hidden'); }
function cerrarModal() { $('#modal').classList.add('hidden'); $('#modal-cuerpo').innerHTML = ''; }
function mostrar(id) {
  ['login', 'carta', 'estudiante', 'docente'].forEach(p => {
    const el = $('#pantalla-' + p);
    if (el) el.classList.toggle('hidden', p !== id);
  });
  $('#btn-salir').classList.toggle('hidden', id === 'login');
  window.scrollTo(0, 0);
}

/* ---------- IndexedDB ---------- */
let _db = null;
function abrirDB() {
  if (!_db) {
    _db = new Promise((res, rej) => {
      const r = indexedDB.open('terreno-db', 1);
      r.onupgradeneeded = () => {
        const d = r.result;
        d.createObjectStore('cola', { keyPath: 'client_id' });
        d.createObjectStore('cache', { keyPath: 'clave' });
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }
  return _db;
}
async function idb(store, modo, fn) {
  const db = await abrirDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(store, modo);
    const rq = fn(tx.objectStore(store));
    tx.oncomplete = () => res(rq ? rq.result : undefined);
    tx.onerror = () => rej(tx.error);
  });
}
const cachePut = (clave, valor) => idb('cache', 'readwrite', s => s.put({ clave, valor }));
const cacheGet = async c => { const r = await idb('cache', 'readonly', s => s.get(c)); return r ? r.valor : undefined; };
const colaPut = i => idb('cola', 'readwrite', s => s.put(i));
const colaAll = () => idb('cola', 'readonly', s => s.getAll());
const colaDel = k => idb('cola', 'readwrite', s => s.delete(k));

/* ---------- API (Google Apps Script) ----------
   Se usa text/plain para evitar el preflight CORS, que Apps Script no responde. */
async function api(accion, datos = {}, { auth = true } = {}) {
  const cuerpo = JSON.stringify(Object.assign({ accion, token: auth ? S.token : undefined }, datos));
  const r = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: cuerpo, redirect: 'follow' });
  const j = await r.json();
  if (!j.ok) { const e = new Error(j.error || 'Error'); e.codigo = j.codigo; throw e; }
  return j.datos;
}

/* ---------- Imágenes y GPS ---------- */
function cargarImg(file) {
  return new Promise((res, rej) => {
    const u = URL.createObjectURL(file), img = new Image();
    img.onload = () => { URL.revokeObjectURL(u); res(img); };
    img.onerror = () => rej(new Error('No se pudo leer la imagen'));
    img.src = u;
  });
}
async function comprimirImagen(file, maxKB = MAX_FOTO_KB) {
  const img = await cargarImg(file);
  const mayor = Math.max(img.naturalWidth, img.naturalHeight);
  let lado = Math.min(1600, mayor), calidad = 0.8, url = '';
  for (let i = 0; i < 10; i++) {
    const k = Math.min(1, lado / mayor);
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * k);
    c.height = Math.round(img.naturalHeight * k);
    const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
    g.drawImage(img, 0, 0, c.width, c.height);
    url = c.toDataURL('image/jpeg', calidad);
    if (url.length * 0.75 / 1024 <= maxKB) break;
    if (calidad > 0.45) calidad -= 0.1; else lado *= 0.8;
  }
  return url;
}
async function redimensionarPNG(file, max = 480) {
  const img = await cargarImg(file);
  const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement('canvas');
  c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/png');
}
function obtenerPosicion() {
  return new Promise(res => {
    if (!navigator.geolocation) return res(null);
    navigator.geolocation.getCurrentPosition(
      p => res({ lat: p.coords.latitude, lng: p.coords.longitude, precision: p.coords.accuracy }),
      () => res(null), { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  });
}

/* ---------- Archivos de Drive (con caché local) ---------- */
async function dataUrlArchivo(id) {
  const k = 'arch:' + id;
  const v = await cacheGet(k);
  if (v) return v;
  if (!navigator.onLine) return null;
  const d = await api('getArchivo', { id });
  await cachePut(k, d.dataUrl);
  return d.dataUrl;
}
async function pintarImagenes(root) {
  for (const img of $$('img[data-archivo]', root)) {
    const u = await dataUrlArchivo(img.dataset.archivo).catch(() => null);
    if (u) img.src = u;
  }
}
function precargarImagenes() {
  (S.datos.actividades || []).filter(a => a.imagen_id).forEach(a => dataUrlArchivo(a.imagen_id).catch(() => {}));
}

/* ---------- Insignia ---------- */
function pintarLogo() {
  const l = $('#logo'), ic = $('#icono-app');
  if (S.insignia) {
    l.src = S.insignia; l.classList.remove('hidden');
    if (ic) ic.classList.add('hidden');
  } else {
    l.classList.add('hidden');
    if (ic) ic.classList.remove('hidden');
  }
}
async function cargarInsignia() {
  try {
    if (navigator.onLine) {
      const j = await (await fetch(API_URL + '?accion=insignia')).json();
      if (j.ok) { S.insignia = j.datos.insignia; await cachePut('insignia', S.insignia || ''); }
    } else S.insignia = (await cacheGet('insignia')) || null;
  } catch (_) { S.insignia = (await cacheGet('insignia')) || null; }
  pintarLogo();
  return S.insignia;
}

/* ---------- Estado de red y sincronización ---------- */
function actualizarRed() {
  const e = $('#estado-red'), on = navigator.onLine;
  e.textContent = on ? 'En línea' : 'Sin conexión';
  e.className = 'text-xs px-2 py-1 rounded-full ' + (on ? 'bg-emerald-500' : 'bg-rose-500');
}
async function actualizarContador() {
  const c = $('#cola-contador');
  if (S.rol !== 'estudiante' || !S.usuario) return c.classList.add('hidden');
  const n = (await colaAll()).filter(i => i.rut === S.usuario.key).length;
  c.textContent = n + ' por enviar';
  c.classList.toggle('hidden', n === 0);
}
async function refrescarPend() {
  S.pend = S.usuario ? (await colaAll()).filter(i => i.rut === S.usuario.key) : [];
}
function registrarSync() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(r => r.sync && r.sync.register('sync-respuestas')).catch(() => {});
  }
}
let sincronizando = false;
async function sincronizar() {
  if (sincronizando || !navigator.onLine || !S.token || S.rol !== 'estudiante') return;
  sincronizando = true;
  try {
    const items = (await colaAll()).filter(i => i.rut === S.usuario.key).sort((a, b) => a.ts_cliente - b.ts_cliente);
    let enviados = 0;
    for (const it of items) {
      try {
        await api('enviarRespuesta', it);
        await colaDel(it.client_id);
        enviados++;
      } catch (e) {
        if (e.codigo === 'RECHAZADA') { await colaDel(it.client_id); aviso('Una respuesta no se pudo enviar: ' + e.message, 'error'); }
        else if (e.codigo === 'SESION') { cerrarSesion(); aviso('Su sesión venció. Ingrese de nuevo; sus respuestas siguen guardadas.', 'error'); return; }
        else throw e;
      }
    }
    if (enviados) { await cargarInicio(); aviso('Sus respuestas se enviaron correctamente.'); if (!$('#pantalla-estudiante').classList.contains('hidden')) renderContenidoEst(); }
    await actualizarContador();
  } catch (e) { console.warn('Sincronización pendiente:', e); }
  finally { sincronizando = false; }
}

/* ---------- Sesión ---------- */
function guardarSesion() { localStorage.setItem(CLAVE_SESION, JSON.stringify({ rol: S.rol, token: S.token, usuario: S.usuario })); }
async function cerrarSesion(confirmar) {
  if (confirmar && S.rol === 'estudiante') {
    const n = (await colaAll()).filter(i => i.rut === S.usuario.key).length;
    if (n && !confirm('Tiene ' + n + ' respuesta(s) por enviar. Se enviarán cuando vuelva a ingresar con internet. ¿Desea salir?')) return;
  }
  localStorage.removeItem(CLAVE_SESION);
  detenerMapa();
  Object.assign(S, { rol: null, token: null, usuario: null, datos: null, panel: null, pend: [] });
  $('#cola-contador').classList.add('hidden');
  mostrar('login');
}

/* =========================================================
   ESTUDIANTE
   ========================================================= */
async function abrirEstudiante() {
  try {
    cargando(true);
    await cargarInicio();
    cargando(false);
    if (!S.datos.firmaOk) { mostrar('carta'); iniciarFirma(); }
    else { mostrar('estudiante'); renderEstudiante(); sincronizar(); }
  } catch (e) {
    cargando(false);
    aviso(e.message === 'offline' ? 'Sin conexión y sin datos guardados.' : e.message, 'error');
    if (!S.token) mostrar('login');
  }
}
async function cargarInicio() {
  const clave = 'inicio:' + S.usuario.key;
  try {
    if (!navigator.onLine) throw new Error('offline');
    S.datos = await api('getInicio');
    S.offset = S.datos.ahora - Date.now();
    await cachePut(clave, { datos: S.datos, offset: S.offset });
    precargarImagenes();
  } catch (e) {
    if (e.codigo === 'SESION') { await cerrarSesion(); aviso('Su sesión venció. Ingrese nuevamente.', 'error'); throw e; }
    const c = await cacheGet(clave);
    if (!c) throw e;
    S.datos = c.datos; S.offset = c.offset;
  }
  await refrescarPend();
  await actualizarContador();
}
const ahoraSrv = () => Date.now() + (S.offset || 0);
function estadoVentana(a) {
  const t = ahoraSrv();
  if (t < Date.parse(a.fecha_inicio)) return 'pronto';
  if (t > Date.parse(a.fecha_fin)) return 'cerrada';
  return 'abierta';
}
function respuestaDe(a) {
  const srv = S.datos.respuestas.find(r => r.actividad_id === a.id);
  if (srv) return Object.assign({ origen: 'servidor' }, srv);
  const loc = S.pend.find(p => p.actividad_id === a.id);
  if (loc) return { origen: 'local', respuesta: loc.respuesta, estado: 'pendiente' };
  return null;
}

/* Firma */
function iniciarFirma() {
  const c = $('#firma-canvas'), ratio = window.devicePixelRatio || 1;
  const w = c.clientWidth, h = c.clientHeight;
  c.width = w * ratio; c.height = h * ratio;
  const g = c.getContext('2d');
  g.scale(ratio, ratio);
  g.lineWidth = 2.2; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#0f172a';
  let dibujando = false, hayTrazo = false;
  const pos = e => { const r = c.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  c.onpointerdown = e => { c.setPointerCapture(e.pointerId); dibujando = true; const p = pos(e); g.beginPath(); g.moveTo(p.x, p.y); e.preventDefault(); };
  c.onpointermove = e => { if (!dibujando) return; const p = pos(e); g.lineTo(p.x, p.y); g.stroke(); hayTrazo = true; };
  c.onpointerup = c.onpointercancel = () => { dibujando = false; };
  $('#firma-limpiar').onclick = () => { g.clearRect(0, 0, w, h); hayTrazo = false; };
  S.firma = {
    vacia: () => !hayTrazo,
    dataUrl: () => {
      const t = document.createElement('canvas');
      t.width = c.width; t.height = c.height;
      const tg = t.getContext('2d');
      tg.fillStyle = '#fff'; tg.fillRect(0, 0, t.width, t.height); tg.drawImage(c, 0, 0);
      return t.toDataURL('image/png');
    }
  };
  $('#chk-acepto').checked = false;
  $('#btn-acepto').disabled = true;
}
async function aceptarCarta() {
  if (!S.firma || S.firma.vacia()) return aviso('Firme en el recuadro antes de continuar.', 'error');
  if (!navigator.onLine) return aviso('Necesita conexión a internet para registrar su firma.', 'error');
  cargando(true, 'Registrando su firma…');
  try {
    await api('firmar', { firmaB64: S.firma.dataUrl() });
    S.datos.firmaOk = true;
    await cachePut('inicio:' + S.usuario.key, { datos: S.datos, offset: S.offset });
    cargando(false);
    mostrar('estudiante'); renderEstudiante();
  } catch (e) { cargando(false); aviso(e.message, 'error'); }
}

/* Dashboard */
function renderEstudiante() {
  const e = S.usuario;
  $('#est-info').innerHTML = `<div class="font-bold text-lg">${esc(e.nombre)}</div>
    <div class="text-sm text-slate-500">RUT ${esc(e.rut)} · ${esc(e.curso)}</div>`;
  renderContenidoEst();
}
function renderContenidoEst() {
  $$('[data-accion="tab-est"]').forEach(b => b.classList.toggle('tab-activa', b.dataset.tab === S.tab));
  if (S.tab === 'mapa') return renderMapaEst();
  detenerMapa();
  const lista = S.datos.actividades.filter(a => {
    const r = respuestaDe(a);
    return S.tab === 'todas' || (S.tab === 'pendientes' ? !r : !!r);
  });
  $('#est-contenido').innerHTML = lista.length
    ? lista.map(tarjetaActividad).join('')
    : `<div class="text-center text-slate-500 py-10">${S.tab === 'pendientes' ? '🎉 No tiene actividades pendientes.' : 'Aún no hay actividades aquí.'}</div>`;
}
function tarjetaActividad(a) {
  const v = estadoVentana(a), r = respuestaDe(a);
  let est;
  if (r) est = r.origen === 'local' ? chip('Por enviar', 'amber') : r.estado === 'evaluada' ? chip('Evaluada', 'emerald') : chip('Enviada', 'sky');
  else est = v === 'abierta' ? chip('Abierta', 'emerald') : v === 'pronto' ? chip('Aún no abre', 'slate') : chip('Cerrada', 'rose');
  let boton = '';
  if (!r) {
    boton = v === 'abierta'
      ? `<button data-accion="responder" data-id="${esc(a.id)}" class="mt-3 w-full bg-teal-700 text-white font-bold py-2.5 rounded-xl">Responder</button>`
      : `<button disabled class="mt-3 w-full bg-slate-200 text-slate-500 font-semibold py-2.5 rounded-xl">${v === 'pronto' ? 'Disponible desde ' + fechaCorta(a.fecha_inicio) : 'El plazo terminó'}</button>`;
  }
  const res = r && r.estado === 'evaluada'
    ? `<div class="mt-3 text-sm bg-emerald-50 rounded-xl p-3">Puntaje: <b>${esc(r.puntaje_final)}</b> de ${esc(a.puntaje_max)}${r.retro_docente ? `<div class="mt-1">${esc(r.retro_docente)}</div>` : ''}</div>` : '';
  const tipo = { alternativas: 'Alternativas', desarrollo: 'Desarrollo', foto: 'Fotografía' }[a.tipo] || a.tipo;
  return `<article class="bg-white/95 rounded-2xl shadow p-4">
    <div class="flex items-start justify-between gap-2">
      <h3 class="font-bold">${esc(a.titulo)}</h3>${est}
    </div>
    <p class="text-xs text-slate-500 mt-1">${tipo} · ${esc(a.puntaje_max)} pt · ${fechaCorta(a.fecha_inicio)} a ${fechaCorta(a.fecha_fin)}</p>
    ${res}${boton}</article>`;
}

async function abrirResponder(id) {
  const a = S.datos.actividades.find(x => x.id === id);
  if (!a || estadoVentana(a) !== 'abierta') return aviso('Esta actividad no está disponible en este momento.', 'error');
  let campos = '';
  if (a.tipo === 'alternativas') {
    campos = a.opciones.map((o, i) => `<label class="flex items-start gap-3 p-3 border rounded-xl"><input type="radio" name="alt" value="${i}" class="mt-1"><span>${esc(o)}</span></label>`).join('');
  } else if (a.tipo === 'desarrollo') {
    campos = `<textarea id="r-texto" rows="6" class="w-full border rounded-xl p-3" placeholder="Escriba aquí su respuesta"></textarea>`;
  } else {
    campos = `<input id="r-foto" type="file" accept="image/*" capture="environment" class="w-full text-sm">
      <img id="r-prev" class="hidden rounded-xl max-h-60 mx-auto" alt="Vista previa">
      <textarea id="r-texto" rows="3" class="w-full border rounded-xl p-3" placeholder="Descripción de la fotografía (opcional)"></textarea>`;
  }
  modal(`<div class="space-y-3 pt-3">
    <h3 class="text-lg font-extrabold pr-6">${esc(a.titulo)}</h3>
    ${a.imagen_id ? `<img data-archivo="${esc(a.imagen_id)}" class="rounded-xl max-h-64 mx-auto bg-slate-100" alt="Imagen de apoyo">` : ''}
    <p class="whitespace-pre-line">${esc(a.enunciado)}</p>
    <div class="space-y-2">${campos}</div>
    ${a.requiere_gps !== 'no' ? '<p class="text-xs text-slate-500">Al enviar se registrará su ubicación. Active el GPS de su teléfono.</p>' : ''}
    <button id="btn-enviar-resp" data-accion="enviar-resp" data-id="${esc(a.id)}" class="w-full bg-teal-700 text-white font-bold py-3 rounded-xl">Enviar respuesta</button>
  </div>`);
  pintarImagenes($('#modal-cuerpo'));
  const f = $('#r-foto');
  if (f) f.onchange = async () => {
    if (!f.files[0]) return;
    const p = $('#r-prev');
    p.src = URL.createObjectURL(f.files[0]);
    p.classList.remove('hidden');
  };
}
async function enviarRespuestaUI(id) {
  const a = S.datos.actividades.find(x => x.id === id);
  if (estadoVentana(a) !== 'abierta') return aviso('El plazo de esta actividad terminó.', 'error');
  let respuesta = '', file = null;
  if (a.tipo === 'alternativas') {
    const sel = $('input[name=alt]:checked');
    if (!sel) return aviso('Elija una alternativa.', 'error');
    respuesta = a.opciones[+sel.value];
  } else if (a.tipo === 'desarrollo') {
    respuesta = $('#r-texto').value.trim();
    if (respuesta.length < 3) return aviso('Escriba su respuesta antes de enviar.', 'error');
  } else {
    file = $('#r-foto').files[0];
    if (!file) return aviso('Tome o elija una fotografía.', 'error');
    respuesta = $('#r-texto').value.trim();
  }
  const btn = $('#btn-enviar-resp');
  const pideGPS = a.requiere_gps !== 'no';
  let pos = null;
  if (pideGPS) {
    btn.disabled = true; btn.textContent = 'Obteniendo su ubicación…';
    pos = await obtenerPosicion();
    if (!pos) { btn.disabled = false; btn.textContent = 'Enviar respuesta'; return aviso('No pudimos obtener su ubicación. Active el GPS y permita el acceso.', 'error'); }
  }
  btn.disabled = true;
  btn.textContent = 'Guardando…';
  try {
    const foto = file ? await comprimirImagen(file) : null;
    await colaPut({
      client_id: uuid(), rut: S.usuario.key, actividad_id: id, respuesta, fotoB64: foto,
      lat: pos ? pos.lat : null, lng: pos ? pos.lng : null, precision: pos ? pos.precision : 0, ts_cliente: ahoraSrv()
    });
    cerrarModal();
    await refrescarPend(); await actualizarContador(); renderContenidoEst();
    if (navigator.onLine) sincronizar();
    else { aviso('Respuesta guardada en su teléfono. Se enviará sola cuando tenga internet.'); registrarSync(); }
  } catch (e) { btn.disabled = false; btn.textContent = 'Enviar respuesta'; aviso(e.message, 'error'); }
}

/* Mapas (Leaflet) */
function crearMapa(idDiv, puntos, seguir) {
  detenerMapa();
  const opt = (att, extra) => Object.assign({ maxZoom: 17, crossOrigin: true, attribution: att }, extra || {});
  const topo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', opt('© OpenStreetMap, SRTM | © OpenTopoMap (CC-BY-SA)'));
  const osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', opt('© OpenStreetMap'));
  const esri = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', opt('© Esri'));
  const m = L.map(idDiv, { layers: [topo] });
  L.control.layers({ 'Topográfico (relieve)': topo, 'Topográfico Esri': esri, 'Calles': osm }).addTo(m);
  const coords = [];
  puntos.forEach((p, i) => {
    if (!isFinite(p.lat) || !isFinite(p.lng)) return;
    L.marker([p.lat, p.lng], { icon: L.divIcon({ className: '', html: `<div class="pin">${i + 1}</div>`, iconSize: [28, 28], iconAnchor: [14, 14] }) })
      .addTo(m).bindPopup(`<b>${esc(p.nombre)}</b><br>${esc(p.descripcion || '')}`);
    coords.push([p.lat, p.lng]);
  });
  if (coords.length) m.fitBounds(coords, { padding: [40, 40], maxZoom: 16 });
  else m.setView([-36.83, -73.05], 12);
  S.mapa = m;
  if (seguir) iniciarGPS();
  setTimeout(() => m.invalidateSize(), 150);
}
function iniciarGPS() {
  if (!navigator.geolocation) return;
  S.watchId = navigator.geolocation.watchPosition(p => {
    const ll = [p.coords.latitude, p.coords.longitude];
    S.pos = ll;
    if (!S.mapa) return;
    if (!S.yo) {
      S.yo = L.circleMarker(ll, { radius: 9, color: '#fff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 }).addTo(S.mapa);
      S.yoPrec = L.circle(ll, { radius: p.coords.accuracy, color: '#2563eb', weight: 1, fillOpacity: 0.1 }).addTo(S.mapa);
    } else { S.yo.setLatLng(ll); S.yoPrec.setLatLng(ll).setRadius(p.coords.accuracy); }
    const g = $('#gps-estado');
    if (g) g.textContent = `Su posición: ${ll[0].toFixed(5)}, ${ll[1].toFixed(5)} (±${Math.round(p.coords.accuracy)} m)`;
  }, () => { const g = $('#gps-estado'); if (g) g.textContent = 'No se pudo obtener su ubicación. Active el GPS.'; },
  { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 });
}
function detenerMapa() {
  if (S.watchId != null) { navigator.geolocation.clearWatch(S.watchId); S.watchId = null; }
  if (S.mapa) { S.mapa.remove(); S.mapa = null; }
  S.yo = null; S.yoPrec = null;
}
function renderMapaEst() {
  $('#est-contenido').innerHTML = `<div id="mapa" class="h-[62vh] rounded-2xl overflow-hidden border"></div>
    <button data-accion="centrar" class="w-full bg-white border font-semibold py-2.5 rounded-xl">📍 Centrar en mi posición</button>
    <p id="gps-estado" class="text-xs text-slate-500 text-center">Buscando su ubicación…</p>`;
  crearMapa('mapa', S.datos.puntos, true);
}

/* =========================================================
   DOCENTE
   ========================================================= */
async function abrirDocente() {
  try { mostrar('docente'); await cargarPanel(); renderDocente(); }
  catch (e) { /* el aviso ya se mostró */ }
}
async function cargarPanel() {
  cargando(true);
  try { S.panel = await api('getPanel'); }
  catch (e) {
    if (e.codigo === 'SESION') { await cerrarSesion(); aviso('Su sesión venció. Ingrese nuevamente.', 'error'); }
    else aviso(e.message, 'error');
    throw e;
  } finally { cargando(false); }
}
const TABS_DOC = [['resumen', '📊 Resumen'], ['actividades', '📝 Actividades'], ['puntos', '📍 Puntos'], ['ia', '🤖 Evaluación IA'], ['ubicaciones', '🧭 Ubicaciones'], ['reportes', '📄 Reportes'], ['ajustes', '⚙️ Ajustes']];
function renderDocente() {
  $('#doc-tabs').innerHTML = TABS_DOC.map(([k, t]) =>
    `<button data-accion="tab-doc" data-tab="${k}" class="px-3 py-2 rounded-xl whitespace-nowrap ${S.tabDoc === k ? 'tab-activa' : ''}">${t}</button>`).join('');
  detenerMapa();
  const f = { resumen: renderResumen, actividades: renderActividades, puntos: renderPuntos, ia: renderIA, ubicaciones: renderUbicaciones, reportes: renderReportes, ajustes: renderAjustes }[S.tabDoc];
  f();
}
const actPor = id => S.panel.actividades.find(a => a.id === id);
const nombreDe = rut => { const e = S.panel.estudiantes.find(x => rutKey(x.rut) === rutKey(rut)); return e ? e.nombre : rut; };

function calcularEstudiantes() {
  const P = S.panel;
  const maxTotal = P.actividades.reduce((s, a) => s + Number(a.puntaje_max || 0), 0);
  return P.estudiantes.filter(e => String(e.activo).toLowerCase() !== 'no').map(e => {
    const k = rutKey(e.rut);
    const rs = P.respuestas.filter(r => rutKey(r.rut) === k);
    const pts = rs.reduce((s, r) => s + (r.estado === 'evaluada' ? Number(r.puntaje_final || 0) : 0), 0);
    const pct = maxTotal ? pts / maxTotal * 100 : 0;
    return {
      est: e, key: k, rs, respondidas: rs.length, porEvaluar: rs.filter(r => r.estado !== 'evaluada').length,
      pts, pct, nota: notaChile(pct), firma: P.firmas.some(f => rutKey(f.rut) === k)
    };
  }).sort((a, b) => a.est.nombre.localeCompare(b.est.nombre, 'es'));
}

/* Resumen */
function renderResumen() {
  const P = S.panel, est = calcularEstudiantes(), nAct = P.actividades.length;
  const entregas = est.length && nAct ? Math.round(est.reduce((s, e) => s + e.respondidas, 0) / (est.length * nAct) * 100) : 0;
  const prom = est.length ? (est.reduce((s, e) => s + e.nota, 0) / est.length).toFixed(1) : '–';
  const kpi = (t, v) => `<div class="bg-white/95 rounded-2xl shadow p-4 text-center"><div class="text-2xl font-extrabold">${v}</div><div class="text-xs text-slate-500">${t}</div></div>`;
  const barra = (p, c = 'teal') => `<div class="h-2 bg-slate-100 rounded-full overflow-hidden"><div class="h-2 bg-${c}-600" style="width:${Math.min(100, Math.round(p))}%"></div></div>`;
  const porAct = P.actividades.map(a => {
    const n = P.respuestas.filter(r => r.actividad_id === a.id).length;
    const p = est.length ? n / est.length * 100 : 0;
    return `<div class="text-sm"><div class="flex justify-between"><span>${esc(a.titulo)}</span><span>${n}/${est.length}</span></div>${barra(p, 'sky')}</div>`;
  }).join('');
  $('#doc-contenido').innerHTML = `
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      ${kpi('Estudiantes', est.length)}${kpi('Con carta firmada', est.filter(e => e.firma).length)}${kpi('Entregas', entregas + '%')}${kpi('Nota promedio*', prom)}
    </div>
    <div class="bg-white/95 rounded-2xl shadow p-4 mt-4 space-y-3"><h3 class="font-bold">Entrega por actividad</h3>${porAct || '<p class="text-sm text-slate-500">Aún no hay actividades.</p>'}</div>
    <div class="bg-white/95 rounded-2xl shadow p-4 mt-4 overflow-x-auto">
      <h3 class="font-bold mb-2">Avance por estudiante</h3>
      <table class="w-full text-sm"><thead><tr class="text-left text-slate-500"><th class="py-1">Estudiante</th><th>Firma</th><th>Respondidas</th><th class="w-32">Logro</th><th>Nota*</th><th>Por evaluar</th></tr></thead><tbody>
      ${est.map(e => `<tr class="border-t"><td class="py-2">${esc(e.est.nombre)}<div class="text-xs text-slate-400">${esc(e.est.curso)}</div></td>
        <td>${e.firma ? '✅' : '—'}</td><td>${e.respondidas}/${nAct}</td><td>${barra(e.pct)}<span class="text-xs">${Math.round(e.pct)}%</span></td>
        <td class="font-semibold">${e.nota.toFixed(1)}</td><td>${e.porEvaluar || ''}</td></tr>`).join('')}
      </tbody></table>
      <p class="text-xs text-slate-400 mt-2">*Nota calculada con ${EXIGENCIA}% de exigencia sobre el puntaje total de todas las actividades. Es provisoria mientras haya respuestas por evaluar.</p>
    </div>`;
}

/* Actividades */
function renderActividades() {
  const P = S.panel;
  $('#doc-contenido').innerHTML = `
    <div class="flex justify-between items-center mb-3"><h3 class="font-bold text-lg">Actividades</h3>
      <button data-accion="nueva-act" class="bg-teal-700 text-white font-semibold px-4 py-2 rounded-xl">+ Nueva</button></div>
    <div class="space-y-3">${P.actividades.map(a => `
      <div class="bg-white/95 rounded-2xl shadow p-4">
        <div class="flex justify-between gap-2"><b>${esc(a.titulo)}</b>${chip(a.tipo, 'slate')}</div>
        <p class="text-xs text-slate-500 mt-1">${fechaCorta(a.fecha_inicio)} → ${fechaCorta(a.fecha_fin)} · ${esc(a.puntaje_max)} pt${a.requiere_gps === 'no' ? ' · sin GPS' : ' · con GPS'}${a.punto_id && P.puntos.find(p => p.id === a.punto_id) ? ' · 📍 ' + esc(P.puntos.find(p => p.id === a.punto_id).nombre) : ''}</p>
        <div class="flex gap-2 mt-3">
          <button data-accion="editar-act" data-id="${esc(a.id)}" class="px-3 py-1.5 rounded-lg bg-slate-100 text-sm">Editar</button>
          <button data-accion="borrar-act" data-id="${esc(a.id)}" class="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 text-sm">Eliminar</button>
        </div></div>`).join('') || '<p class="text-slate-500">Aún no hay actividades.</p>'}</div>`;
}
function formActividad(id) {
  const ahora = new Date(), fin = new Date(Date.now() + 2 * 3600e3);
  const a = id ? actPor(id) : { tipo: 'alternativas', opciones: ['', '', '', ''], puntaje_max: 1, fecha_inicio: ahora.toISOString(), fecha_fin: fin.toISOString() };
  const corr = a.tipo === 'alternativas' && a.correcta ? a.opciones.indexOf(a.correcta) + 1 : 1;
  const inp = 'w-full border rounded-xl px-3 py-2';
  modal(`<form id="f-act" class="space-y-3 pt-3">
    <h3 class="text-lg font-extrabold pr-6">${id ? 'Editar' : 'Nueva'} actividad</h3>
    <label class="block text-sm">Título<input name="titulo" required class="${inp}" value="${esc(a.titulo || '')}"></label>
    <label class="block text-sm">Tipo
      <select name="tipo" class="${inp}">
        ${[['alternativas', 'Opción múltiple'], ['desarrollo', 'Desarrollo'], ['foto', 'Fotografía']].map(([v, t]) => `<option value="${v}" ${a.tipo === v ? 'selected' : ''}>${t}</option>`).join('')}
      </select></label>
    <label class="block text-sm">Enunciado<textarea name="enunciado" rows="4" required class="${inp}">${esc(a.enunciado || '')}</textarea></label>
    <div id="bloque-alt"><label class="block text-sm">Alternativas (una por línea)
      <textarea name="opciones" rows="4" class="${inp}">${esc((a.opciones || []).join('\n'))}</textarea></label>
      <label class="block text-sm mt-2">N° de la alternativa correcta<input name="correcta" type="number" min="1" value="${corr}" class="${inp}"></label></div>
    <label id="bloque-pauta" class="block text-sm">Pauta de corrección (la IA la usa para sugerir puntaje)
      <textarea name="pauta" rows="3" class="${inp}">${esc(a.pauta || '')}</textarea></label>
    <div class="grid grid-cols-2 gap-3">
      <label class="block text-sm">Puntaje máximo<input name="puntaje_max" type="number" step="0.5" min="0.5" value="${esc(a.puntaje_max)}" class="${inp}"></label>
      <label class="block text-sm">Punto de visita
        <select name="punto_id" class="${inp}"><option value="">(ninguno)</option>
        ${S.panel.puntos.map(p => `<option value="${esc(p.id)}" ${a.punto_id === p.id ? 'selected' : ''}>${esc(p.nombre)}</option>`).join('')}</select></label>
      <label class="block text-sm">Abre<input name="fecha_inicio" type="datetime-local" required value="${aLocalInput(a.fecha_inicio)}" class="${inp}"></label>
      <label class="block text-sm">Cierra<input name="fecha_fin" type="datetime-local" required value="${aLocalInput(a.fecha_fin)}" class="${inp}"></label>
    </div>
    <label class="block text-sm">Imagen de apoyo (opcional)<input name="imagen" type="file" accept="image/*" class="${inp}"></label>
    <label class="flex items-center gap-2 text-sm bg-teal-50 rounded-xl p-3">
      <input type="checkbox" name="requiere_gps" ${a.requiere_gps !== 'no' ? 'checked' : ''}>
      <span>Registrar la ubicación (GPS) del estudiante al responder</span>
    </label>
    <button class="w-full bg-teal-700 text-white font-bold py-3 rounded-xl">Guardar</button>
  </form>`);
  const f = $('#f-act');
  const alternar = () => {
    const t = f.tipo.value;
    $('#bloque-alt').classList.toggle('hidden', t !== 'alternativas');
    $('#bloque-pauta').classList.toggle('hidden', t === 'alternativas');
  };
  f.tipo.onchange = alternar; alternar();
  f.onsubmit = async ev => {
    ev.preventDefault();
    const d = new FormData(f), tipo = d.get('tipo');
    const opciones = String(d.get('opciones')).split('\n').map(s => s.trim()).filter(Boolean);
    let correcta = '';
    if (tipo === 'alternativas') {
      const n = +d.get('correcta');
      if (opciones.length < 2 || !(n >= 1 && n <= opciones.length)) return aviso('Escriba al menos 2 alternativas e indique el número de la correcta.', 'error');
      correcta = opciones[n - 1];
    }
    const ini = new Date(d.get('fecha_inicio')), fin = new Date(d.get('fecha_fin'));
    if (!(fin > ini)) return aviso('La hora de cierre debe ser posterior a la de apertura.', 'error');
    cargando(true, 'Guardando…');
    try {
      const file = d.get('imagen');
      const imagenB64 = file && file.size ? await comprimirImagen(file) : null;
      await api('guardarActividad', {
        imagenB64,
        actividad: {
          id: id || '', titulo: d.get('titulo').trim(), tipo, enunciado: d.get('enunciado').trim(),
          opciones: tipo === 'alternativas' ? opciones : [], correcta, pauta: tipo === 'alternativas' ? '' : d.get('pauta').trim(),
          puntaje_max: +d.get('puntaje_max'), fecha_inicio: ini.toISOString(), fecha_fin: fin.toISOString(),
          punto_id: d.get('punto_id'), imagen_id: a.imagen_id || '', orden: a.orden || '',
          requiere_gps: d.get('requiere_gps') ? 'si' : 'no'
        }
      });
      cerrarModal(); await cargarPanel(); renderDocente(); aviso('Actividad guardada.');
    } catch (e) { cargando(false); aviso(e.message, 'error'); }
  };
}

/* Puntos */
function renderPuntos() {
  const P = S.panel;
  $('#doc-contenido').innerHTML = `
    <div class="grid md:grid-cols-2 gap-4">
      <div class="space-y-3">
        <div class="flex justify-between items-center"><h3 class="font-bold text-lg">Puntos de visita</h3>
          <button data-accion="nuevo-punto" class="bg-teal-700 text-white font-semibold px-4 py-2 rounded-xl">+ Nuevo</button></div>
        ${P.puntos.map((p, i) => `<div class="bg-white/95 rounded-2xl shadow p-4">
          <b>${i + 1}. ${esc(p.nombre)}</b><p class="text-sm text-slate-500">${esc(p.descripcion || '')}</p>
          <p class="text-xs text-slate-400">${Number(p.lat).toFixed(5)}, ${Number(p.lng).toFixed(5)}</p>
          <div class="flex gap-2 mt-2"><button data-accion="editar-punto" data-id="${esc(p.id)}" class="px-3 py-1.5 rounded-lg bg-slate-100 text-sm">Editar</button>
          <button data-accion="borrar-punto" data-id="${esc(p.id)}" class="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 text-sm">Eliminar</button></div></div>`).join('') || '<p class="text-slate-500">Aún no hay puntos.</p>'}
      </div>
      <div id="mapa-docente" class="h-80 md:h-[28rem] rounded-2xl overflow-hidden border"></div>
    </div>`;
  crearMapa('mapa-docente', P.puntos, false);
}
function formPunto(id) {
  const p = id ? S.panel.puntos.find(x => x.id === id) : { nombre: '', descripcion: '', lat: '', lng: '' };
  const inp = 'w-full border rounded-xl px-3 py-2';
  modal(`<form id="f-punto" class="space-y-3 pt-3"><h3 class="text-lg font-extrabold pr-6">${id ? 'Editar' : 'Nuevo'} punto</h3>
    <label class="block text-sm">Nombre<input name="nombre" required class="${inp}" value="${esc(p.nombre)}"></label>
    <label class="block text-sm">Descripción<textarea name="descripcion" rows="2" class="${inp}">${esc(p.descripcion || '')}</textarea></label>
    <div class="grid grid-cols-2 gap-3">
      <label class="block text-sm">Latitud<input name="lat" required inputmode="decimal" class="${inp}" value="${esc(p.lat)}" placeholder="-36.83"></label>
      <label class="block text-sm">Longitud<input name="lng" required inputmode="decimal" class="${inp}" value="${esc(p.lng)}" placeholder="-73.05"></label>
    </div>
    <button type="button" id="btn-mi-pos" class="text-sm underline text-teal-700">Usar mi ubicación actual</button>
    <button class="w-full bg-teal-700 text-white font-bold py-3 rounded-xl">Guardar</button></form>`);
  const f = $('#f-punto');
  $('#btn-mi-pos').onclick = async () => {
    const pos = await obtenerPosicion();
    if (!pos) return aviso('No se pudo obtener la ubicación.', 'error');
    f.lat.value = pos.lat.toFixed(6); f.lng.value = pos.lng.toFixed(6);
  };
  f.onsubmit = async ev => {
    ev.preventDefault();
    const d = new FormData(f);
    const lat = parseFloat(String(d.get('lat')).replace(',', '.')), lng = parseFloat(String(d.get('lng')).replace(',', '.'));
    if (!isFinite(lat) || !isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return aviso('Las coordenadas no son válidas.', 'error');
    cargando(true, 'Guardando…');
    try {
      await api('guardarPunto', { punto: { id: id || '', nombre: d.get('nombre').trim(), descripcion: d.get('descripcion').trim(), lat, lng } });
      cerrarModal(); await cargarPanel(); renderDocente();
    } catch (e) { cargando(false); aviso(e.message, 'error'); }
  };
}

/* Evaluación asistida por IA */
function renderIA() {
  const P = S.panel, f = S.filtroIA;
  const rs = P.respuestas.filter(r => {
    const a = actPor(r.actividad_id);
    return a && a.tipo !== 'alternativas' && (!f.act || r.actividad_id === f.act) && (!f.pend || r.estado !== 'evaluada');
  });
  $('#doc-contenido').innerHTML = `
    <div class="bg-white/95 rounded-2xl shadow p-4 flex flex-wrap gap-3 items-center">
      <select id="filtro-act" class="border rounded-xl px-3 py-2 text-sm"><option value="">Todas las actividades</option>
        ${P.actividades.filter(a => a.tipo !== 'alternativas').map(a => `<option value="${esc(a.id)}" ${f.act === a.id ? 'selected' : ''}>${esc(a.titulo)}</option>`).join('')}</select>
      <label class="text-sm flex items-center gap-2"><input id="filtro-pend" type="checkbox" ${f.pend ? 'checked' : ''}> Solo por evaluar</label>
      <button data-accion="ia-todas" class="ml-auto bg-slate-800 text-white text-sm font-semibold px-3 py-2 rounded-xl">🤖 Sugerir con IA a todas</button>
    </div>
    <div class="space-y-3 mt-3">${rs.map(tarjetaEval).join('') || '<p class="text-slate-500 text-center py-8">No hay respuestas para mostrar.</p>'}</div>`;
  $('#filtro-act').onchange = e => { S.filtroIA.act = e.target.value; renderIA(); };
  $('#filtro-pend').onchange = e => { S.filtroIA.pend = e.target.checked; renderIA(); };
}
function enlacesUbicacion(r) {
  const la = parseFloat(r.lat), lo = parseFloat(r.lng);
  if (!isFinite(la) || !isFinite(lo)) return '<p class="text-xs text-slate-400">Sin ubicación registrada.</p>';
  return `<p class="text-xs text-slate-600">📍 ${la.toFixed(5)}, ${lo.toFixed(5)} (±${esc(r.precision_m)} m) ·
    <a class="underline text-teal-700" target="_blank" rel="noopener" href="https://www.google.com/maps?q=${la},${lo}">Google Maps</a> ·
    <a class="underline text-teal-700" target="_blank" rel="noopener" href="https://earth.google.com/web/search/${la},${lo}">Google Earth</a></p>`;
}
function tarjetaEval(r) {
  const a = actPor(r.actividad_id);
  const p0 = r.puntaje_final !== '' ? r.puntaje_final : r.puntaje_ia;
  const c0 = r.retro_docente || r.comentario_ia || '';
  const inp = 'border rounded-xl px-3 py-2';
  return `<article id="ev-${esc(r.id)}" class="bg-white/95 rounded-2xl shadow p-4 space-y-2">
    <div class="flex justify-between gap-2"><b>${esc(nombreDe(r.rut))}</b>${r.estado === 'evaluada' ? chip('Evaluada', 'emerald') : chip('Por evaluar', 'amber')}</div>
    <p class="text-xs text-slate-500">${esc(a.titulo)} · máx. ${esc(a.puntaje_max)} pt</p>
    <p class="text-sm bg-slate-50 rounded-xl p-3 whitespace-pre-line">${esc(r.respuesta) || '<i>(solo fotografía)</i>'}</p>
    ${r.foto_id ? `<button data-accion="ver-foto" data-id="${esc(r.foto_id)}" class="text-sm underline text-teal-700">📷 Ver fotografía</button>` : ''}
    ${enlacesUbicacion(r)}
    ${a.pauta ? `<details class="text-sm"><summary class="cursor-pointer text-slate-500">Ver pauta</summary><p class="mt-1 whitespace-pre-line">${esc(a.pauta)}</p></details>` : ''}
    <div class="flex flex-wrap gap-2 items-start">
      <input data-campo="puntaje" type="number" step="0.5" min="0" max="${esc(a.puntaje_max)}" value="${esc(p0)}" placeholder="Pts" class="${inp} w-24">
      <textarea data-campo="retro" rows="2" placeholder="Comentario breve para el estudiante" class="${inp} flex-1 min-w-[12rem]">${esc(c0)}</textarea>
    </div>
    <p data-campo="ia-nota" class="text-xs text-indigo-600 ${r.puntaje_ia !== '' ? '' : 'hidden'}">Sugerencia de la IA: ${esc(r.puntaje_ia)} pt. Revise antes de aprobar.</p>
    <div class="flex flex-wrap gap-2">
      <button data-accion="ia-uno" data-id="${esc(r.id)}" class="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-sm font-semibold">🤖 Sugerir con IA</button>
      <button data-accion="aprobar-ia" data-id="${esc(r.id)}" class="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold">✔ Aprobar sugerencia</button>
      <button data-accion="guardar-eval" data-id="${esc(r.id)}" class="px-3 py-1.5 rounded-lg bg-slate-800 text-white text-sm font-semibold">Guardar mi evaluación</button>
    </div></article>`;
}
async function iaUna(id, silencioso) {
  const r = S.panel.respuestas.find(x => x.id === id);
  if (!silencioso) cargando(true, 'Consultando a la IA…');
  try {
    const d = await api('evaluarIA', { respuesta_id: id });
    r.puntaje_ia = d.puntaje; r.comentario_ia = d.comentario;
    if (!silencioso) renderIA();
  } finally { if (!silencioso) cargando(false); }
}
async function guardarEval(id, usarIA) {
  const r = S.panel.respuestas.find(x => x.id === id);
  let puntaje, retro;
  if (usarIA) {
    if (r.puntaje_ia === '' || r.puntaje_ia == null) return aviso('Primero pida la sugerencia de la IA.', 'error');
    puntaje = r.puntaje_ia; retro = r.comentario_ia;
  } else {
    const card = $('#ev-' + id);
    puntaje = $('[data-campo=puntaje]', card).value;
    retro = $('[data-campo=retro]', card).value.trim();
    if (puntaje === '') return aviso('Indique el puntaje.', 'error');
  }
  cargando(true, 'Guardando…');
  try {
    const d = await api('guardarEvaluacion', { respuesta_id: id, puntaje_final: Number(puntaje), retro });
    r.puntaje_final = d.puntaje_final; r.retro_docente = retro; r.estado = 'evaluada';
    renderIA(); aviso('Evaluación guardada.');
  } catch (e) { aviso(e.message, 'error'); } finally { cargando(false); }
}
async function iaTodas() {
  const f = S.filtroIA;
  const rs = S.panel.respuestas.filter(r => { const a = actPor(r.actividad_id); return a && a.tipo !== 'alternativas' && (!f.act || r.actividad_id === f.act) && r.estado !== 'evaluada' && (r.puntaje_ia === '' || r.puntaje_ia == null); });
  if (!rs.length) return aviso('No hay respuestas sin sugerencia.');
  let n = 0;
  for (const r of rs) {
    cargando(true, `Consultando a la IA (${++n}/${rs.length})…`);
    try { await iaUna(r.id, true); } catch (e) { aviso(e.message, 'error'); break; }
  }
  cargando(false); renderIA();
}

/* Ubicaciones */
function renderUbicaciones() {
  const rs = S.panel.respuestas.slice().sort((a, b) => String(a.timestamp_cliente).localeCompare(String(b.timestamp_cliente)));
  $('#doc-contenido').innerHTML = `
    <div class="bg-white/95 rounded-2xl shadow p-4 overflow-x-auto">
      <h3 class="font-bold mb-1">Ubicación de cada respuesta</h3>
      <p class="text-xs text-slate-500 mb-3">Las coordenadas se guardan solas cuando el estudiante responde una actividad que pide ubicación. También quedan en la hoja "Respuestas" (columnas lat, lng y mapa_url).</p>
      <table class="w-full text-sm"><thead><tr class="text-left text-slate-500"><th class="py-1">Estudiante</th><th>Actividad</th><th>Hora</th><th>Ubicación</th></tr></thead><tbody>
      ${rs.map(r => {
        const a = actPor(r.actividad_id);
        return `<tr class="border-t align-top"><td class="py-2">${esc(nombreDe(r.rut))}</td><td>${esc(a ? a.titulo : r.actividad_id)}</td><td>${fechaCorta(r.timestamp_cliente || r.timestamp_servidor)}</td><td>${enlacesUbicacion(r)}</td></tr>`;
      }).join('') || '<tr><td colspan="4" class="py-6 text-center text-slate-500">Aún no hay respuestas.</td></tr>'}
      </tbody></table></div>`;
}

/* Reportes */
function renderReportes() {
  const est = calcularEstudiantes();
  $('#doc-contenido').innerHTML = `
    <div class="bg-white/95 rounded-2xl shadow p-4 space-y-3">
      <h3 class="font-bold">Reporte individual (PDF)</h3>
      <select id="sel-est" class="w-full border rounded-xl px-3 py-2">${est.map(e => `<option value="${esc(e.key)}">${esc(e.est.nombre)} – ${esc(e.est.curso)}</option>`).join('')}</select>
      <button data-accion="rep-ind" class="bg-teal-700 text-white font-semibold px-4 py-2 rounded-xl">Descargar PDF</button>
    </div>
    <div class="bg-white/95 rounded-2xl shadow p-4 space-y-3 mt-4">
      <h3 class="font-bold">Reporte general del curso</h3>
      <div class="flex gap-2 flex-wrap">
        <button data-accion="rep-gen" class="bg-teal-700 text-white font-semibold px-4 py-2 rounded-xl">Descargar PDF</button>
        <button data-accion="rep-csv" class="bg-slate-800 text-white font-semibold px-4 py-2 rounded-xl">Exportar CSV</button>
      </div>
    </div>`;
}
function svgMapa(resp, puntos) {
  const pr = resp.map(r => ({ lat: Number(r.lat), lng: Number(r.lng), n: r.n })).filter(p => isFinite(p.lat) && isFinite(p.lng) && (p.lat || p.lng));
  const pu = puntos.map((p, i) => ({ lat: Number(p.lat), lng: Number(p.lng), nombre: p.nombre, i: i + 1 })).filter(p => isFinite(p.lat) && isFinite(p.lng));
  const todos = pr.concat(pu);
  if (!todos.length) return '<p>Sin coordenadas registradas.</p>';
  const lats = todos.map(p => p.lat), lngs = todos.map(p => p.lng);
  const minLa = Math.min(...lats), maxLa = Math.max(...lats), minLo = Math.min(...lngs), maxLo = Math.max(...lngs);
  const W = 640, H = 320, m = 34, kx = Math.cos(((minLa + maxLa) / 2) * Math.PI / 180);
  const dx = (maxLo - minLo) * kx || 0.001, dy = (maxLa - minLa) || 0.001;
  const k = Math.min((W - 2 * m) / dx, (H - 2 * m) / dy);
  const X = lng => m + (lng - minLo) * kx * k, Y = lat => H - m - (lat - minLa) * k;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="background:#f1f5f9;border:1px solid #cbd5e1">
    ${pu.map(p => `<rect x="${X(p.lng) - 7}" y="${Y(p.lat) - 7}" width="14" height="14" fill="#0f766e"/><text x="${X(p.lng) + 10}" y="${Y(p.lat) + 4}" font-size="11" fill="#0f766e">${esc(p.nombre)}</text>`).join('')}
    ${pr.map(p => `<circle cx="${X(p.lng)}" cy="${Y(p.lat)}" r="9" fill="#2563eb"/><text x="${X(p.lng)}" y="${Y(p.lat) + 4}" font-size="11" fill="#fff" text-anchor="middle">${p.n}</text>`).join('')}
    <text x="8" y="14" font-size="10" fill="#475569">■ Puntos de visita   ● Ubicación de cada respuesta (N° de actividad)</text></svg>`;
}
async function reporteIndividual(key) {
  const d = calcularEstudiantes().find(x => x.key === key);
  if (!d) return;
  cargando(true, 'Generando PDF…');
  try {
    const logo = S.insignia || await cargarInsignia();
    const acts = S.panel.actividades;
    const fotos = {};
    for (const r of d.rs) if (r.foto_id) fotos[r.foto_id] = await dataUrlArchivo(r.foto_id).catch(() => null);
    const resp = d.rs.map(r => ({ lat: r.lat, lng: r.lng, n: acts.findIndex(a => a.id === r.actividad_id) + 1 }));
    const detalle = acts.map((a, i) => {
      const r = d.rs.find(x => x.actividad_id === a.id);
      const hayGPS = r && isFinite(parseFloat(r.lat)) && isFinite(parseFloat(r.lng));
      return `<div class="avoid" style="border:1px solid #cbd5e1;border-radius:8px;padding:10px;margin-bottom:10px">
        <b>${i + 1}. ${esc(a.titulo)}</b> <span style="color:#64748b">(${esc(a.puntaje_max)} pt)</span>
        ${r ? `<p style="margin:6px 0;white-space:pre-line">${esc(r.respuesta) || '<i>(solo fotografía)</i>'}</p>
          ${r.foto_id && fotos[r.foto_id] ? `<img src="${fotos[r.foto_id]}" style="max-height:200px;max-width:100%;border-radius:6px">` : ''}
          <p style="margin:6px 0;color:#475569">Hora: ${fechaCorta(r.timestamp_cliente || r.timestamp_servidor)}${hayGPS ? ' · Ubicación: ' + Number(r.lat).toFixed(5) + ', ' + Number(r.lng).toFixed(5) : ''}</p>
          <p style="margin:0"><b>Puntaje:</b> ${r.estado === 'evaluada' ? esc(r.puntaje_final) : 'Por evaluar'}${r.retro_docente ? ` · <b>Nota del docente:</b> ${esc(r.retro_docente)}` : ''}</p>`
          : '<p style="margin:6px 0;color:#be123c">Sin respuesta.</p>'}</div>`;
    }).join('');
    const html = `<div style="width:720px;font-family:Arial,sans-serif;font-size:12px;color:#111;background:#fff">
      <div style="display:flex;align-items:center;gap:12px;border-bottom:3px solid #0f766e;padding-bottom:8px;margin-bottom:12px">
        ${logo ? `<img src="${logo}" style="height:60px">` : ''}<div><div style="font-size:18px;font-weight:bold">Reporte individual · Salida a Terreno</div>
        <div style="color:#64748b">Emitido el ${new Date().toLocaleDateString('es-CL')}</div></div></div>
      <p><b>Estudiante:</b> ${esc(d.est.nombre)} &nbsp; <b>RUT:</b> ${esc(d.est.rut)} &nbsp; <b>Curso:</b> ${esc(d.est.curso)}</p>
      <p><b>Actividades respondidas:</b> ${d.respondidas}/${acts.length} &nbsp; <b>Logro:</b> ${Math.round(d.pct)}% &nbsp; <b>Nota${d.porEvaluar ? ' (provisoria)' : ''}:</b> ${d.nota.toFixed(1)}</p>
      <h3 style="margin:12px 0 6px">Mapa de ubicaciones</h3>${svgMapa(resp, S.panel.puntos)}
      <h3 style="margin:14px 0 6px">Detalle de actividades</h3>${detalle}</div>`;
    await html2pdf().set({
      margin: 10, filename: 'Reporte_' + d.est.nombre.replace(/\s+/g, '_') + '.pdf',
      image: { type: 'jpeg', quality: 0.95 }, html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' }, pagebreak: { mode: ['css', 'legacy'], avoid: '.avoid' }
    }).from(html, 'string').save();
  } catch (e) { aviso('No se pudo generar el PDF: ' + e.message, 'error'); }
  finally { cargando(false); }
}
function sintesisGrupo(est) {
  const P = S.panel;
  if (!est.length) return 'Sin estudiantes registrados.';
  const prom = est.reduce((s, e) => s + e.nota, 0) / est.length;
  const entrega = P.actividades.length ? est.reduce((s, e) => s + e.respondidas, 0) / (est.length * P.actividades.length) * 100 : 0;
  const logros = P.actividades.map(a => {
    const rs = P.respuestas.filter(r => r.actividad_id === a.id && r.estado === 'evaluada');
    return { t: a.titulo, p: rs.length ? rs.reduce((s, r) => s + Number(r.puntaje_final || 0), 0) / (rs.length * Number(a.puntaje_max || 1)) * 100 : null };
  }).filter(x => x.p !== null).sort((a, b) => b.p - a.p);
  let t = `El grupo tiene ${est.length} estudiantes, con una entrega promedio de ${Math.round(entrega)}% y una nota promedio de ${prom.toFixed(1)}. ${est.filter(e => e.firma).length} firmaron la carta de compromiso.`;
  if (logros.length) t += ` La actividad con mayor logro fue "${logros[0].t}" (${Math.round(logros[0].p)}%) y la de menor logro fue "${logros[logros.length - 1].t}" (${Math.round(logros[logros.length - 1].p)}%).`;
  return t;
}
async function reporteGeneral() {
  const est = calcularEstudiantes();
  cargando(true, 'Generando PDF…');
  try {
    const logo = S.insignia || await cargarInsignia();
    const html = `<div style="width:720px;font-family:Arial,sans-serif;font-size:12px;color:#111;background:#fff">
      <div style="display:flex;align-items:center;gap:12px;border-bottom:3px solid #0f766e;padding-bottom:8px;margin-bottom:12px">
        ${logo ? `<img src="${logo}" style="height:60px">` : ''}<div><div style="font-size:18px;font-weight:bold">Reporte general · Salida a Terreno</div>
        <div style="color:#64748b">Emitido el ${new Date().toLocaleDateString('es-CL')}</div></div></div>
      <p>${esc(sintesisGrupo(est))}</p>
      <table style="width:100%;border-collapse:collapse;margin-top:10px">
        <tr style="background:#0f766e;color:#fff"><th style="padding:5px;text-align:left">Estudiante</th><th>Curso</th><th>Firma</th><th>Entregas</th><th>Logro</th><th>Nota</th></tr>
        ${est.map(e => `<tr class="avoid" style="border-bottom:1px solid #e2e8f0"><td style="padding:5px">${esc(e.est.nombre)}</td><td style="text-align:center">${esc(e.est.curso)}</td>
          <td style="text-align:center">${e.firma ? 'Sí' : 'No'}</td><td style="text-align:center">${e.respondidas}/${S.panel.actividades.length}</td>
          <td style="text-align:center">${Math.round(e.pct)}%</td><td style="text-align:center"><b>${e.nota.toFixed(1)}</b></td></tr>`).join('')}
      </table></div>`;
    await html2pdf().set({
      margin: 10, filename: 'Reporte_general_salida_terreno.pdf', image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' }, pagebreak: { mode: ['css', 'legacy'], avoid: '.avoid' }
    }).from(html, 'string').save();
  } catch (e) { aviso('No se pudo generar el PDF: ' + e.message, 'error'); }
  finally { cargando(false); }
}
function exportarCSV() {
  const est = calcularEstudiantes();
  const cel = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  const filas = [['Nombre', 'RUT', 'Curso', 'Firma', 'Respondidas', 'Total actividades', 'Puntaje', 'Logro %', 'Nota']]
    .concat(est.map(e => [e.est.nombre, e.est.rut, e.est.curso, e.firma ? 'Sí' : 'No', e.respondidas, S.panel.actividades.length, e.pts, Math.round(e.pct), e.nota.toFixed(1).replace('.', ',')]));
  const blob = new Blob(['\ufeff' + filas.map(f => f.map(cel).join(';')).join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'resumen_salida_terreno.csv'; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/* Ajustes */
function renderAjustes() {
  $('#doc-contenido').innerHTML = `
    <div class="bg-white/95 rounded-2xl shadow p-4 space-y-3">
      <h3 class="font-bold">Insignia del colegio</h3>
      <p class="text-sm text-slate-500">Se muestra en la cabecera y en los reportes en PDF.</p>
      ${S.insignia ? `<img src="${S.insignia}" class="h-20" alt="Insignia actual">` : ''}
      <input id="inp-insignia" type="file" accept="image/*" class="text-sm">
      <button data-accion="subir-insignia" class="bg-teal-700 text-white font-semibold px-4 py-2 rounded-xl">Guardar insignia</button>
    </div>

    <div class="bg-white/95 rounded-2xl shadow p-4 space-y-3 mt-4">
      <h3 class="font-bold">Cargar nómina de estudiantes desde Excel</h3>
      <p class="text-sm text-slate-500">El archivo debe tener 3 columnas, en este orden: <b>RUT</b>, <b>NOMBRE COMPLETO</b> y <b>CURSO</b>. La primera fila puede ser el encabezado.</p>
      <button data-accion="plantilla-xlsx" class="px-3 py-2 rounded-xl bg-slate-100 text-sm font-semibold">⬇️ Descargar plantilla de Excel</button>
      <div class="flex flex-wrap gap-2 items-center">
        <input id="inp-xlsx" type="file" accept=".xlsx,.xls,.csv" class="text-sm">
        <button data-accion="leer-xlsx" class="bg-teal-700 text-white font-semibold px-4 py-2 rounded-xl">1. Leer archivo</button>
      </div>
      <div id="xlsx-avisos" class="text-sm"></div>
      <p class="text-sm text-slate-500">Revise la lista (una línea por estudiante: <code>rut;nombre completo;curso</code>). También puede copiar y pegar las 3 columnas directo desde Excel.</p>
      <textarea id="inp-est" rows="8" class="w-full border rounded-xl p-3 text-sm" placeholder="12.345.678-5;Ana Pérez Soto;3° Medio A"></textarea>
      <button data-accion="importar-est" class="bg-slate-800 text-white font-semibold px-4 py-2 rounded-xl">2. Importar estudiantes</button>
    </div>`;
}

/* =========================================================
   EVENTOS
   ========================================================= */
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-accion]');
  if (!b) return;
  const a = b.dataset.accion, id = b.dataset.id;
  try {
    switch (a) {
      case 'cerrar-modal': return cerrarModal();
      case 'tab-est': S.tab = b.dataset.tab; return renderContenidoEst();
      case 'tab-doc': S.tabDoc = b.dataset.tab; return renderDocente();
      case 'responder': return abrirResponder(id);
      case 'enviar-resp': return enviarRespuestaUI(id);
      case 'centrar': if (S.pos && S.mapa) S.mapa.setView(S.pos, 17); else aviso('Aún no tenemos su ubicación.', 'error'); return;
      case 'nueva-act': return formActividad();
      case 'editar-act': return formActividad(id);
      case 'borrar-act':
        if (!confirm('¿Eliminar esta actividad? Las respuestas ya enviadas se conservan en la planilla.')) return;
        cargando(true); await api('eliminarActividad', { id }); await cargarPanel(); return renderDocente();
      case 'nuevo-punto': return formPunto();
      case 'editar-punto': return formPunto(id);
      case 'borrar-punto':
        if (!confirm('¿Eliminar este punto?')) return;
        cargando(true); await api('eliminarPunto', { id }); await cargarPanel(); return renderDocente();
      case 'ia-uno': return iaUna(id, false);
      case 'aprobar-ia': return guardarEval(id, true);
      case 'guardar-eval': return guardarEval(id, false);
      case 'ia-todas': return iaTodas();
      case 'ver-foto': {
        cargando(true, 'Cargando fotografía…');
        const u = await dataUrlArchivo(id); cargando(false);
        return modal(`<div class="pt-4"><img src="${u}" class="w-full rounded-xl" alt="Fotografía"></div>`);
      }
      case 'rep-ind': return reporteIndividual($('#sel-est').value);
      case 'rep-gen': return reporteGeneral();
      case 'rep-csv': return exportarCSV();
      case 'subir-insignia': {
        const f = $('#inp-insignia').files[0];
        if (!f) return aviso('Elija una imagen.', 'error');
        cargando(true, 'Subiendo…');
        await api('subirInsignia', { imagenB64: await redimensionarPNG(f) });
        await cargarInsignia(); renderAjustes(); cargando(false); aviso('Insignia actualizada.'); return;
      }
      case 'plantilla-xlsx': {
        if (typeof XLSX === 'undefined') return aviso('No se pudo cargar el lector de Excel. Revise su conexión y recargue.', 'error');
        const ws = XLSX.utils.aoa_to_sheet([['RUT', 'NOMBRE COMPLETO', 'CURSO'], ['12.345.678-5', 'Ana Pérez Soto', '3° Medio A']]);
        ws['!cols'] = [{ wch: 16 }, { wch: 38 }, { wch: 16 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Nómina');
        XLSX.writeFile(wb, 'nomina_estudiantes.xlsx');
        return;
      }
      case 'leer-xlsx': {
        const f = $('#inp-xlsx').files[0];
        if (!f) return aviso('Elija primero el archivo de Excel.', 'error');
        if (typeof XLSX === 'undefined') return aviso('No se pudo cargar el lector de Excel. Revise su conexión y recargue.', 'error');
        const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' });
        const filas = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, defval: '' });
        const ok = [], mal = [];
        filas.forEach((r, i) => {
          const r0 = String(r[0] || '').trim(), nom = String(r[1] || '').trim(), cur = String(r[2] || '').trim();
          if (!r0 && !nom && !cur) return;
          if (i === 0 && /rut/i.test(r0)) return;
          const rut = normalizarRut(r0);
          if (!rut || !nom || !cur) mal.push('Fila ' + (i + 1) + ': ' + (nom || r0 || '(vacía)'));
          else ok.push(rut + ';' + nom + ';' + cur);
        });
        $('#inp-est').value = ok.join('\n');
        $('#xlsx-avisos').innerHTML =
          `<p class="text-emerald-700 font-semibold">✔ ${ok.length} estudiante(s) listo(s) para importar.</p>` +
          (mal.length ? `<p class="text-rose-700 font-semibold mt-1">⚠ ${mal.length} fila(s) con RUT inválido o datos incompletos (no se incluyeron):</p><ul class="list-disc pl-5 text-rose-700">${mal.map(m => `<li>${esc(m)}</li>`).join('')}</ul>` : '');
        return;
      }
      case 'importar-est': {
        const filas = $('#inp-est').value.split('\n').map(l => l.split(/[;\t]/).map(s => s.trim())).filter(c => c.length >= 3 && c[0])
          .map(c => ({ rut: c[0], nombre: c[1], curso: c[2] }));
        if (!filas.length) return aviso('No se encontraron líneas válidas.', 'error');
        cargando(true, 'Importando…');
        const d = await api('importarEstudiantes', { filas });
        await cargarPanel(); renderDocente(); aviso(d.agregados + ' estudiante(s) agregado(s).'); return;
      }
    }
  } catch (err) { cargando(false); aviso(err.message, 'error'); }
});

function iniciarEventosLogin() {
  const fe = $('#form-estudiante'), fd = $('#form-docente');
  if (fe) fe.onsubmit = async e => {
    e.preventDefault();
    const rut = normalizarRut($('#inp-rut').value);
    if (!rut) return aviso('El RUT no es válido. Revíselo e intente de nuevo.', 'error');
    if (!navigator.onLine) return aviso('Necesita internet para ingresar por primera vez.', 'error');
    cargando(true, 'Ingresando…');
    try {
      const d = await api('loginEstudiante', { rut }, { auth: false });
      S.rol = 'estudiante'; S.token = d.token; S.usuario = d.estudiante; S.tab = 'pendientes';
      guardarSesion(); cargando(false); await abrirEstudiante();
    } catch (err) { cargando(false); aviso(err.message, 'error'); }
  };
  if (fd) fd.onsubmit = async e => {
    e.preventDefault();
    if (!navigator.onLine) return aviso('Necesita conexión a internet.', 'error');
    cargando(true, 'Ingresando…');
    try {
      const d = await api('loginDocente', { password: $('#inp-clave').value }, { auth: false });
      S.rol = 'docente'; S.token = d.token; S.usuario = { nombre: 'Docente' };
      $('#inp-clave').value = '';
      guardarSesion(); cargando(false); await abrirDocente();
    } catch (err) { cargando(false); aviso(err.message, 'error'); }
  };
  const chk = $('#chk-acepto'), bac = $('#btn-acepto');
  if (chk && bac) { chk.onchange = e => { bac.disabled = !e.target.checked; }; bac.onclick = aceptarCarta; }
  $('#btn-salir').onclick = () => cerrarSesion(true);
  $('#modal').addEventListener('click', e => { if (e.target.id === 'modal') cerrarModal(); });
}

/* ---------- Arranque ---------- */
async function iniciar() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => console.warn('SW no registrado', err));
    navigator.serviceWorker.addEventListener('message', e => { if (e.data === 'SYNC') sincronizar(); });
  }
  iniciarEventosLogin();
  actualizarRed();
  window.addEventListener('online', () => { actualizarRed(); sincronizar(); });
  window.addEventListener('offline', actualizarRed);
  cargarInsignia();
  localStorage.removeItem('sesion'); // sesión de versiones anteriores
  // Refresca los estados "abierta/cerrada" cada 30 s
  setInterval(() => {
    if (S.rol === 'estudiante' && !$('#pantalla-estudiante').classList.contains('hidden') && S.tab !== 'mapa' && $('#modal').classList.contains('hidden')) renderContenidoEst();
  }, 30000);

  let s = null;
  try { s = JSON.parse(localStorage.getItem(CLAVE_SESION) || 'null'); } catch (_) {}
  if (s && s.token && s.rol === ROL_PAGINA) {
    Object.assign(S, s);
    if (ROL_PAGINA === 'docente') abrirDocente(); else abrirEstudiante();
  } else mostrar('login');
}
document.addEventListener('DOMContentLoaded', iniciar);
