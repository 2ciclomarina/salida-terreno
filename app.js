'use strict';
/* =========================================================
   SALIDA A TERRENO – Lógica común y de alumnos
   (La parte del docente está en app-docente.js)
   ========================================================= */
const API_URL = 'https://script.google.com/macros/s/AKfycbwq1XkahCirWI2GqLrsW8czcFgNwZgXCwKIeDonura_mB2SQeVO90JQd-egdkIFFof7ug/exec';
const MAX_FOTO_KB = 500;
const EXIGENCIA = 60; // % para nota 4,0
const MODO = (document.body && document.body.dataset.modo) || 'alumno';
const ROL_PAGINA = MODO === 'docente' ? 'docente' : 'estudiante';
const CLAVE_SESION = 'sesion_' + MODO;

const TIPOS = {
  alternativas: { ic: '✅', nom: 'Alternativas', c: 'sky' },
  desarrollo: { ic: '✍️', nom: 'Desarrollo', c: 'violet' },
  foto: { ic: '📷', nom: 'Fotografía', c: 'amber' },
  grupo: { ic: '🧩', nom: 'Ejercicio con partes', c: 'indigo' }
};
const NIVELES = { L: ['Logrado', 'emerald'], M: ['Medianamente logrado', 'amber'], N: ['No observado', 'rose'] };

const S = {
  rol: null, token: null, usuario: null, datos: null, offset: 0, pend: [],
  tab: 'pendientes', tabDoc: 'resumen', panel: null, insignia: null,
  mapa: null, mapaModal: null, watchId: null, pos: null, yo: null, yoPrec: null, firma: null,
  foco: null, filtroR: { act: '', estado: 'todas' }
};

/* ---------- Utilidades ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now() + Math.random().toString(16).slice(2));
const fechaCorta = iso => new Date(iso).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const rutKey = r => String(r || '').replace(/[^0-9kK]/g, '').toUpperCase();

function jsonSeguro(s, def) {
  if (s && typeof s === 'object') return s;
  try { const v = JSON.parse(s); return v == null ? def : v; } catch (_) { return def; }
}
// Respuesta en texto simple (sirve para el PDF); en ejercicios con partes une todas las partes
function respuestaTexto(a, r) {
  if (!a || a.tipo !== 'grupo') return r.respuesta || '';
  const resp = jsonSeguro(r.respuesta, {});
  return (a.partes || []).map((p, i) => 'Parte ' + (i + 1) + ': ' + (resp[p.id] || (p.tipo === 'foto' ? '(fotografía)' : '(sin respuesta)'))).join('\n');
}
// Identificadores de todas las fotos de una respuesta
function fotosDe(r) {
  const m = jsonSeguro(r.fotos, {});
  const ids = Object.keys(m).map(k => m[k]).filter(Boolean);
  if (!ids.length && r.foto_id) ids.push(r.foto_id);
  return ids;
}
function tiempoRestante(ms) {
  if (ms <= 0) return '0 min';
  const m = Math.round(ms / 60000);
  if (m < 60) return m + ' min';
  const h = Math.floor(m / 60);
  if (h < 24) return h + ' h' + (m % 60 ? ' ' + (m % 60) + ' min' : '');
  const d = Math.floor(h / 24);
  return d + ' d' + (h % 24 ? ' ' + (h % 24) + ' h' : '');
}
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
  aviso._t = setTimeout(() => a.classList.add('hidden'), 6000);
}
function cargando(on, msg = 'Cargando…') {
  $('#cargando-msg').textContent = msg;
  $('#cargando').classList.toggle('hidden', !on);
}
const chip = (t, c) => `<span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-${c}-100 text-${c}-800">${esc(t)}</span>`;
function limpiarMapaModal() { if (S.mapaModal) { S.mapaModal.remove(); S.mapaModal = null; } }
function modal(html) {
  limpiarMapaModal();
  $('#modal-cuerpo').innerHTML = html;
  $('#modal').classList.remove('hidden');
  $('#modal-cuerpo').parentElement.scrollTop = 0;
}
function cerrarModal() { limpiarMapaModal(); $('#modal').classList.add('hidden'); $('#modal-cuerpo').innerHTML = ''; }
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
  const k = 'arch2:' + id; // clave nueva: descarta copias dañadas de versiones anteriores
  const v = await cacheGet(k);
  if (v && String(v).indexOf('data:image/') === 0) return v;
  if (!navigator.onLine) return null;
  const d = await api('getArchivo', { id });
  if (!d.dataUrl || String(d.dataUrl).indexOf('data:image/') !== 0) throw new Error('El archivo no es una imagen válida');
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
    if (enviados) {
      await cargarInicio();
      aviso('Sus respuestas se enviaron correctamente.');
      if (!$('#pantalla-estudiante').classList.contains('hidden')) renderEstudiante();
    }
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

/* ---------- Mapas (Leaflet) ---------- */
function capasBase() {
  const opt = att => ({ maxZoom: 17, crossOrigin: true, attribution: att });
  return {
    topo: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', opt('© OpenStreetMap, SRTM | © OpenTopoMap (CC-BY-SA)')),
    osm: L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', opt('© OpenStreetMap')),
    esri: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', opt('© Esri'))
  };
}
function crearMapa(idDiv, puntos, op) {
  op = op || {};
  detenerMapa();
  const c = capasBase();
  const m = L.map(idDiv, { layers: [c.topo] });
  L.control.layers({ 'Topográfico (relieve)': c.topo, 'Topográfico Esri': c.esri, 'Calles': c.osm }).addTo(m);
  const coords = [], marcas = {};
  puntos.forEach((p, i)
