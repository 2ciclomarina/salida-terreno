'use strict';
/* =========================================================
   SALIDA A TERRENO – Lógica común y de alumnos
   (La parte del docente está en app-docente.js)
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
