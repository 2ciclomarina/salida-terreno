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
  puntos.forEach((p, i) => {
    if (!isFinite(p.lat) || !isFinite(p.lng)) return;
    const mk = L.marker([p.lat, p.lng], { icon: L.divIcon({ className: '', html: `<div class="pin">${i + 1}</div>`, iconSize: [28, 28], iconAnchor: [14, 14] }) })
      .addTo(m).bindPopup(op.popup ? op.popup(p) : `<b>${esc(p.nombre)}</b><br>${esc(p.descripcion || '')}`);
    marcas[p.id] = mk;
    coords.push([p.lat, p.lng]);
  });
  if (coords.length) m.fitBounds(coords, { padding: [40, 40], maxZoom: 16 });
  else m.setView([-36.83, -73.05], 12);
  if (op.foco && marcas[op.foco]) { m.setView(marcas[op.foco].getLatLng(), 16); marcas[op.foco].openPopup(); }
  S.mapa = m;
  if (op.seguir) iniciarGPS();
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
// Vuelve a pedir los datos al servidor (por ejemplo, para ver una evaluación nueva)
async function refrescarDatos(silencioso) {
  if (!S.usuario || S.rol !== 'estudiante') return;
  if (!navigator.onLine) { if (!silencioso) aviso('Sin conexión.', 'error'); return; }
  if (!silencioso) cargando(true, 'Actualizando…');
  try {
    await cargarInicio();
    renderEstudiante();
    if (!silencioso) aviso('Información actualizada.');
  } catch (e) { if (!silencioso) aviso(e.message, 'error'); }
  finally { if (!silencioso) cargando(false); }
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
  if (loc) return { origen: 'local', respuesta: loc.respuesta, fotoB64: loc.fotoB64, fotosB64: loc.fotosB64, estado: 'pendiente' };
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

/* Panel del estudiante */
function renderEstudiante() {
  const e = S.usuario, acts = S.datos.actividades;
  const hechas = acts.filter(a => respuestaDe(a)).length, tot = acts.length;
  const pct = tot ? Math.round(hechas / tot * 100) : 0;
  $('#est-info').innerHTML = `<div class="rounded-3xl bg-gradient-to-br from-teal-600 to-sky-600 text-white p-5 shadow-lg">
    <div class="flex items-start justify-between gap-2">
      <div><div class="text-sm opacity-90">Hola 👋</div>
        <div class="text-xl font-extrabold leading-tight">${esc(e.nombre)}</div>
        <div class="text-xs opacity-90">RUT ${esc(e.rut)} · ${esc(e.curso)}</div></div>
      <button data-accion="actualizar" class="shrink-0 text-xs bg-white/20 hover:bg-white/30 rounded-full px-3 py-1.5 font-semibold">🔄 Actualizar</button>
    </div>
    <div class="mt-4">
      <div class="flex justify-between text-xs mb-1"><span>Su avance</span><span><b>${hechas}</b> de ${tot} actividades</span></div>
      <div class="h-3 bg-white/25 rounded-full overflow-hidden"><div class="h-3 bg-white rounded-full transition-all" style="width:${pct}%"></div></div>
      ${tot && hechas === tot ? '<div class="text-xs mt-2 font-semibold">🎉 ¡Completó todas las actividades!</div>' : ''}
    </div>
  </div>`;
  renderContenidoEst();
}
const TABS_EST = [['pendientes', '⏳', 'Pendientes'], ['realizadas', '✅', 'Realizadas'], ['todas', '📚', 'Todas'], ['mapa', '🗺️', 'Mapa']];
function renderTabsEst() {
  const acts = S.datos.actividades, n = acts.filter(a => respuestaDe(a)).length;
  const cnt = { pendientes: acts.length - n, realizadas: n, todas: acts.length };
  $('#est-tabs').innerHTML = TABS_EST.map(([k, ic, t]) =>
    `<button data-accion="tab-est" data-tab="${k}" class="py-2 rounded-xl flex flex-col items-center leading-tight ${S.tab === k ? 'tab-activa' : ''}">
      <span class="text-lg">${ic}</span><span>${t}${cnt[k] !== undefined ? ' (' + cnt[k] + ')' : ''}</span></button>`).join('');
}

/* Recorrido por lugares: las actividades se agrupan bajo cada punto de visita */
const puntoNum = id => (S.datos.puntos || []).findIndex(p => p.id === id) + 1;
function agruparPorPunto(lista) {
  const grupos = (S.datos.puntos || []).map((p, i) => ({ punto: p, n: i + 1, acts: [] }));
  const generales = [];
  lista.forEach(a => {
    const g = grupos.find(x => x.punto.id === a.punto_id);
    if (g) g.acts.push(a); else generales.push(a);
  });
  return { grupos: grupos.filter(g => g.acts.length), generales };
}
function cabeceraPunto(g) {
  const todas = S.datos.actividades.filter(a => a.punto_id === g.punto.id);
  const hechas = todas.filter(a => respuestaDe(a)).length;
  const listo = todas.length > 0 && hechas === todas.length;
  return `<div class="rounded-2xl bg-white shadow px-3 py-2.5 flex items-center gap-3 border-l-4 ${listo ? 'border-emerald-500' : 'border-teal-600'}">
    <div class="pin shrink-0">${g.n}</div>
    <div class="flex-1 min-w-0">
      <div class="font-bold leading-tight">${esc(g.punto.nombre)}${listo ? ' ✅' : ''}</div>
      <div class="text-xs text-slate-500">${hechas} de ${todas.length} resueltas</div>
      ${g.punto.descripcion ? `<div class="text-xs text-slate-500 mt-0.5">${esc(g.punto.descripcion)}</div>` : ''}
    </div>
    <button data-accion="ver-punto" data-punto="${esc(g.punto.id)}" class="shrink-0 text-xs bg-teal-50 text-teal-700 font-semibold rounded-full px-3 py-1.5">🗺️ Ver en el mapa</button>
  </div>`;
}
function cabeceraGeneral() {
  return `<div class="rounded-2xl bg-white shadow px-3 py-2.5 flex items-center gap-3 border-l-4 border-slate-400">
    <div class="h-7 w-7 shrink-0 rounded-full bg-slate-500 text-white flex items-center justify-center text-sm">📌</div>
    <div><div class="font-bold leading-tight">Actividades generales</div>
      <div class="text-xs text-slate-500">No dependen de un lugar del terreno</div></div>
  </div>`;
}

function renderContenidoEst() {
  renderTabsEst();
  if (S.tab === 'mapa') return renderMapaEst();
  detenerMapa();
  const lista = S.datos.actividades.filter(a => {
    const r = respuestaDe(a);
    return S.tab === 'todas' || (S.tab === 'pendientes' ? !r : !!r);
  });
  let html;
  if (!lista.length) {
    html = `<div class="text-center text-slate-500 py-10 bg-white/80 rounded-2xl">${S.tab === 'pendientes' ? '🎉 No tiene actividades pendientes.' : 'Aún no hay actividades aquí.'}</div>`;
  } else {
    const { grupos, generales } = agruparPorPunto(lista);
    if (!grupos.length) html = lista.map(tarjetaActividad).join('');
    else html = grupos.map(g => `<section class="space-y-3">${cabeceraPunto(g)}${g.acts.map(tarjetaActividad).join('')}</section>`).join('') +
      (generales.length ? `<section class="space-y-3">${cabeceraGeneral()}${generales.map(tarjetaActividad).join('')}</section>` : '');
  }
  $('#est-contenido').innerHTML = html;
  pintarImagenes($('#est-contenido'));
}
function bloqueRespuesta(a, r) {
  if (!r) return '';
  const loc = r.origen === 'local';
  let cuerpo = '';
  if (a.tipo === 'grupo') {
    const resp = jsonSeguro(r.respuesta, {}), fotos = loc ? {} : jsonSeguro(r.fotos, {});
    cuerpo = (a.partes || []).map((p, i) => {
      let t = `<div class="text-xs font-semibold text-slate-500">Parte ${i + 1}</div>`;
      if (resp[p.id]) t += `<p class="whitespace-pre-line">${esc(resp[p.id])}</p>`;
      if (p.tipo === 'foto') {
        if (loc && r.fotosB64 && r.fotosB64[p.id]) t += `<img src="${r.fotosB64[p.id]}" class="mt-1 rounded-xl max-h-32" alt="Su fotografía">`;
        else if (fotos[p.id]) t += `<img data-archivo="${esc(fotos[p.id])}" class="mt-1 rounded-xl max-h-32 bg-slate-100" alt="Su fotografía">`;
      }
      return `<div class="mb-2">${t}</div>`;
    }).join('');
  } else {
    cuerpo = r.respuesta ? `<p class="whitespace-pre-line">${esc(r.respuesta)}</p>` : '';
    if (a.tipo === 'foto') {
      if (loc && r.fotoB64) cuerpo += `<img src="${r.fotoB64}" class="mt-2 rounded-xl max-h-40" alt="Su fotografía">`;
      else if (r.foto_id) cuerpo += `<img data-archivo="${esc(r.foto_id)}" class="mt-2 rounded-xl max-h-40 bg-slate-100" alt="Su fotografía">`;
    }
  }
  if (!cuerpo) cuerpo = '<p class="text-slate-400">(sin texto)</p>';
  return `<div class="mt-3 rounded-2xl bg-slate-50 border border-slate-200 p-3 text-sm">
    <div class="text-xs font-semibold text-slate-500 mb-1">Su respuesta${loc ? ' (guardada en su teléfono, aún sin enviar)' : ''}</div>${cuerpo}</div>`;
}

/* Rúbrica: criterios y niveles */
function filasRubrica(rubrica, niveles) {
  return (rubrica || []).map((c, i) => {
    const k = (niveles || [])[i] || 'N', n = NIVELES[k] || NIVELES.N;
    const d = k === 'L' ? c.logrado : k === 'M' ? c.medio : c.no;
    return `<div class="rounded-xl bg-white border p-2 mt-1"><div class="flex items-center justify-between gap-2">
      <span class="text-sm font-semibold">${esc(c.criterio)}</span>${chip(n[0], n[1])}</div>
      ${d ? `<div class="text-xs text-slate-500 mt-1">${esc(d)}</div>` : ''}</div>`;
  }).join('');
}
function verRubrica(rubrica) {
  if (!rubrica || !rubrica.length) return '';
  return `<details class="text-xs bg-slate-50 rounded-xl p-2"><summary class="cursor-pointer font-semibold text-slate-600">📋 ¿Cómo se evaluará?</summary>
    <div class="mt-2 space-y-2">${rubrica.map(c => `<div><div class="font-semibold">${esc(c.criterio)}</div>
      <div>✅ Logrado: ${esc(c.logrado || '—')}</div><div>🟡 Medianamente logrado: ${esc(c.medio || '—')}</div><div>⚪ No observado: ${esc(c.no || '—')}</div></div>`).join('')}</div></details>`;
}
// Lo que ve el estudiante después de que su profesor revisó la actividad
function bloqueEvaluacion(a, r) {
  const ev = jsonSeguro(r.evaluacion, {});
  let det = '';
  if (a.tipo === 'alternativas') {
    const ok = Number(r.puntaje_final) > 0;
    det = `<div class="mt-1">${ok ? '✔ <b>Correcta</b>' : '✖ <b>Incorrecta</b>'}</div>` +
      (!ok && a.correcta ? `<div class="text-xs text-slate-600">La alternativa correcta era: <b>${esc(a.correcta)}</b></div>` : '');
  } else if (a.tipo === 'grupo') {
    det = (a.partes || []).map((p, i) => {
      let t = '';
      if (p.tipo === 'alternativas') {
        if (ev.alt) t = ev.alt[p.id] ? '✔ <b>Correcta</b>' : '✖ <b>Incorrecta</b>' + (p.correcta ? ` <span class="text-xs text-slate-600">(la correcta era: ${esc(p.correcta)})</span>` : '');
      } else if ((p.rubrica || []).length && ev[p.id]) t = filasRubrica(p.rubrica, ev[p.id]);
      return t ? `<div class="mt-2"><div class="text-xs font-semibold text-slate-500">Parte ${i + 1}</div>${t}</div>` : '';
    }).join('');
  } else if ((a.rubrica || []).length && ev.main) det = filasRubrica(a.rubrica, ev.main);
  return `<div class="mt-3 text-sm bg-emerald-50 border border-emerald-200 rounded-2xl p-3">
    <div class="font-bold">Su evaluación: ${esc(r.puntaje_final)} de ${esc(a.puntaje_max)} pt</div>${det}
    ${r.retro_docente ? `<div class="mt-2 text-slate-700">💬 ${esc(r.retro_docente)}</div>` : ''}</div>`;
}

function tarjetaActividad(a) {
  const v = estadoVentana(a), r = respuestaDe(a), T = TIPOS[a.tipo] || TIPOS.desarrollo;
  let est;
  if (r) est = r.origen === 'local' ? chip('Por enviar', 'amber') : r.estado === 'evaluada' ? chip('Evaluada', 'emerald') : chip('Enviada', 'sky');
  else est = v === 'abierta' ? chip('Abierta', 'emerald') : v === 'pronto' ? chip('Aún no abre', 'slate') : chip('Cerrada', 'rose');
  let tiempo = '';
  if (!r) {
    if (v === 'abierta') tiempo = `⏱ Cierra en ${tiempoRestante(Date.parse(a.fecha_fin) - ahoraSrv())}`;
    else if (v === 'pronto') tiempo = `🔒 Abre el ${fechaCorta(a.fecha_inicio)}`;
    else tiempo = `⌛ Cerró el ${fechaCorta(a.fecha_fin)}`;
  }
  let boton = '';
  if (!r) {
    boton = v === 'abierta'
      ? `<button data-accion="responder" data-id="${esc(a.id)}" class="mt-3 w-full bg-teal-700 hover:bg-teal-800 text-white font-bold py-3 rounded-2xl shadow">Responder</button>`
      : `<button disabled class="mt-3 w-full bg-slate-200 text-slate-500 font-semibold py-3 rounded-2xl">${v === 'pronto' ? 'Todavía no disponible' : 'El plazo terminó'}</button>`;
  }
  let res = '';
  if (r && r.estado === 'evaluada') res = bloqueEvaluacion(a, r);
  else if (r && r.origen !== 'local') res = '<div class="mt-2 text-xs text-slate-500">Su profesor revisará su respuesta. Cuando termine, pinche «🔄 Actualizar» para ver su evaluación.</div>';
  const nPartes = a.tipo === 'grupo' ? ` · ${(a.partes || []).length} partes` : '';
  return `<article class="bg-white/95 rounded-3xl shadow overflow-hidden flex">
    <div class="w-2 bg-${T.c}-500"></div>
    <div class="p-4 flex-1 min-w-0">
      <div class="flex items-start gap-3">
        <div class="h-11 w-11 shrink-0 rounded-2xl bg-${T.c}-100 flex items-center justify-center text-2xl">${T.ic}</div>
        <div class="flex-1 min-w-0">
          <h3 class="font-bold leading-tight">${esc(a.titulo)}</h3>
          <p class="text-xs text-slate-500">${T.nom}${nPartes} · ${esc(a.puntaje_max)} pt</p>
        </div>
        ${est}
      </div>
      ${tiempo ? `<div class="mt-2 text-xs font-semibold text-slate-600">${tiempo}</div>` : ''}
      ${bloqueRespuesta(a, r)}${res}${boton}
    </div></article>`;
}

function camposGrupo(a) {
  return (a.partes || []).map((p, i) => {
    const T = TIPOS[p.tipo] || TIPOS.desarrollo;
    let cuerpo = '';
    if (p.tipo === 'alternativas') {
      cuerpo = (p.opciones || []).map((o, j) => `<label class="block cursor-pointer"><input type="radio" name="alt_${esc(p.id)}" value="${j}" class="peer sr-only">
        <div class="flex items-center gap-3 p-3 rounded-2xl border-2 border-slate-200 bg-white peer-checked:border-teal-600 peer-checked:bg-teal-50 transition">
        <span class="h-8 w-8 shrink-0 rounded-full bg-slate-100 flex items-center justify-center font-bold text-sm">${String.fromCharCode(65 + j)}</span>
        <span class="text-sm">${esc(o)}</span></div></label>`).join('');
    } else if (p.tipo === 'desarrollo') {
      cuerpo = verRubrica(p.rubrica) + `<textarea id="t_${esc(p.id)}" rows="5" class="w-full border-2 border-slate-200 rounded-2xl p-3 focus:outline-none focus:border-teal-600" placeholder="Escriba aquí su respuesta"></textarea>`;
    } else {
      cuerpo = verRubrica(p.rubrica) + `<label class="flex flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-amber-400 bg-amber-50 p-4 cursor-pointer text-center">
          <span class="text-3xl">📷</span><span class="font-semibold text-sm">Tomar o elegir fotografía</span>
          <input id="f_${esc(p.id)}" type="file" accept="image/*" capture="environment" class="hidden"></label>
        <img id="pv_${esc(p.id)}" class="hidden rounded-2xl max-h-48 mx-auto" alt="Vista previa">
        <textarea id="t_${esc(p.id)}" rows="2" class="w-full border-2 border-slate-200 rounded-2xl p-3 focus:outline-none focus:border-teal-600" placeholder="Descripción de la fotografía (opcional)"></textarea>`;
    }
    return `<div class="rounded-2xl border-2 border-${T.c}-200 p-3 space-y-2">
      <div class="flex items-center gap-2"><span class="h-7 w-7 rounded-full bg-${T.c}-500 text-white text-sm font-bold flex items-center justify-center">${i + 1}</span>
        <span class="text-xs font-semibold text-slate-500">${T.ic} ${T.nom} · ${esc(p.puntaje)} pt</span></div>
      <div class="text-sm whitespace-pre-line">${esc(p.enunciado)}</div>
      <div class="space-y-2">${cuerpo}</div></div>`;
  }).join('');
}

async function abrirResponder(id) {
  const a = S.datos.actividades.find(x => x.id === id);
  if (!a || estadoVentana(a) !== 'abierta') return aviso('Esta actividad no está disponible en este momento.', 'error');
  const T = TIPOS[a.tipo] || TIPOS.desarrollo;
  const pt = (S.datos.puntos || []).find(p => p.id === a.punto_id);
  let campos = '';
  if (a.tipo === 'alternativas') {
    campos = a.opciones.map((o, i) => `<label class="block cursor-pointer"><input type="radio" name="alt" value="${i}" class="peer sr-only">
      <div class="flex items-center gap-3 p-3 rounded-2xl border-2 border-slate-200 bg-white peer-checked:border-teal-600 peer-checked:bg-teal-50 transition">
      <span class="h-9 w-9 shrink-0 rounded-full bg-slate-100 flex items-center justify-center font-bold">${String.fromCharCode(65 + i)}</span>
      <span class="text-sm">${esc(o)}</span></div></label>`).join('');
  } else if (a.tipo === 'desarrollo') {
    campos = verRubrica(a.rubrica) + `<textarea id="r-texto" rows="7" class="w-full border-2 border-slate-200 rounded-2xl p-3 focus:outline-none focus:border-teal-600" placeholder="Escriba aquí su respuesta"></textarea>`;
  } else if (a.tipo === 'foto') {
    campos = verRubrica(a.rubrica) + `<label class="flex flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-amber-400 bg-amber-50 p-5 cursor-pointer text-center">
        <span class="text-4xl">📷</span><span class="font-semibold text-sm">Tomar o elegir fotografía</span>
        <input id="r-foto" type="file" accept="image/*" capture="environment" class="hidden"></label>
      <img id="r-prev" class="hidden rounded-2xl max-h-60 mx-auto" alt="Vista previa">
      <textarea id="r-texto" rows="3" class="w-full border-2 border-slate-200 rounded-2xl p-3 focus:outline-none focus:border-teal-600" placeholder="Descripción de la fotografía (opcional)"></textarea>`;
  } else {
    campos = camposGrupo(a);
  }
  // Franja con el lugar del terreno donde se realiza la actividad
  const franjaLugar = pt ? `<div class="rounded-2xl bg-teal-50 border border-teal-200 p-3 space-y-2">
      <div class="flex items-center gap-3">
        <span class="pin shrink-0">${puntoNum(pt.id)}</span>
        <div class="flex-1 min-w-0"><div class="text-xs text-slate-500">Esta actividad se realiza en:</div>
          <div class="font-bold leading-tight">${esc(pt.nombre)}</div></div>
      </div>
      <div class="flex flex-wrap gap-2">
        <button type="button" id="btn-mapa-lugar" class="text-xs bg-white border rounded-full px-3 py-1.5 font-semibold text-teal-700">🗺️ Ver el lugar en el mapa</button>
        <a target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&amp;destination=${pt.lat},${pt.lng}" class="text-xs bg-white border rounded-full px-3 py-1.5 font-semibold text-teal-700">🧭 Cómo llegar</a>
      </div>
      <div id="mapa-lugar" class="hidden h-48 rounded-xl overflow-hidden border" style="isolation:isolate"></div>
    </div>` : '';
  modal(`<div class="space-y-3 pt-2">
    <div class="flex items-center gap-3 pr-6">
      <div class="h-12 w-12 shrink-0 rounded-2xl bg-${T.c}-100 flex items-center justify-center text-2xl">${T.ic}</div>
      <div><h3 class="text-lg font-extrabold leading-tight">${esc(a.titulo)}</h3>
      <p class="text-xs text-slate-500">${T.nom} · ${esc(a.puntaje_max)} pt · ⏱ cierra en ${tiempoRestante(Date.parse(a.fecha_fin) - ahoraSrv())}</p></div>
    </div>
    ${franjaLugar}
    ${a.imagen_id ? `<img data-archivo="${esc(a.imagen_id)}" class="rounded-2xl max-h-64 mx-auto bg-slate-100" alt="Imagen de apoyo">` : ''}
    ${a.enunciado ? `<div class="bg-slate-50 rounded-2xl p-3 text-sm whitespace-pre-line">${esc(a.enunciado)}</div>` : ''}
    <div class="space-y-3">${campos}</div>
    ${a.requiere_gps !== 'no' ? '<p class="text-xs text-slate-500 bg-sky-50 rounded-xl p-2">📍 Al enviar se registrará su ubicación. Active el GPS de su teléfono.</p>' : ''}
    <button id="btn-enviar-resp" data-accion="enviar-resp" data-id="${esc(a.id)}" class="w-full bg-teal-700 hover:bg-teal-800 text-white font-bold py-3 rounded-2xl shadow">Enviar respuesta</button>
  </div>`);
  pintarImagenes($('#modal-cuerpo'));

  // Mapa pequeño con el lugar, dentro de la misma ventana (no se pierde lo que se escribió)
  const bm = $('#btn-mapa-lugar');
  if (bm && pt) bm.onclick = () => {
    const cont = $('#mapa-lugar');
    if (!cont.classList.contains('hidden')) { cont.classList.add('hidden'); bm.textContent = '🗺️ Ver el lugar en el mapa'; return; }
    cont.classList.remove('hidden');
    bm.textContent = '🗺️ Ocultar mapa';
    if (!S.mapaModal) {
      const c = capasBase();
      const m = L.map('mapa-lugar', { layers: [c.topo] });
      L.marker([pt.lat, pt.lng], { icon: L.divIcon({ className: '', html: `<div class="pin">${puntoNum(pt.id)}</div>`, iconSize: [28, 28], iconAnchor: [14, 14] }) })
        .addTo(m).bindPopup('<b>' + esc(pt.nombre) + '</b>');
      m.setView([pt.lat, pt.lng], 16);
      S.mapaModal = m;
    }
    setTimeout(() => { if (S.mapaModal) S.mapaModal.invalidateSize(); }, 120);
  };

  const f = $('#r-foto');
  if (f) f.onchange = () => {
    if (!f.files[0]) return;
    const p = $('#r-prev');
    p.src = URL.createObjectURL(f.files[0]);
    p.classList.remove('hidden');
  };
  if (a.tipo === 'grupo') {
    (a.partes || []).filter(p => p.tipo === 'foto').forEach(p => {
      const fi = $('#f_' + p.id);
      if (fi) fi.onchange = () => {
        if (!fi.files[0]) return;
        const pv = $('#pv_' + p.id);
        pv.src = URL.createObjectURL(fi.files[0]);
        pv.classList.remove('hidden');
      };
    });
  }
}
async function enviarRespuestaUI(id) {
  const a = S.datos.actividades.find(x => x.id === id);
  if (estadoVentana(a) !== 'abierta') return aviso('El plazo de esta actividad terminó.', 'error');
  let respuesta = '', file = null;
  const files = {};
  if (a.tipo === 'alternativas') {
    const sel = $('input[name=alt]:checked');
    if (!sel) return aviso('Elija una alternativa.', 'error');
    respuesta = a.opciones[+sel.value];
  } else if (a.tipo === 'desarrollo') {
    respuesta = $('#r-texto').value.trim();
    if (respuesta.length < 3) return aviso('Escriba su respuesta antes de enviar.', 'error');
  } else if (a.tipo === 'foto') {
    file = $('#r-foto').files[0];
    if (!file) return aviso('Tome o elija una fotografía.', 'error');
    respuesta = $('#r-texto').value.trim();
  } else {
    const resp = {};
    const ps = a.partes || [];
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      if (p.tipo === 'alternativas') {
        const s = $(`input[name="alt_${p.id}"]:checked`);
        if (!s) return aviso('Elija una alternativa en la parte ' + (i + 1) + '.', 'error');
        resp[p.id] = p.opciones[+s.value];
      } else if (p.tipo === 'desarrollo') {
        const v = $('#t_' + p.id).value.trim();
        if (v.length < 3) return aviso('Escriba su respuesta en la parte ' + (i + 1) + '.', 'error');
        resp[p.id] = v;
      } else {
        const fi = $('#f_' + p.id).files[0];
        if (!fi) return aviso('Tome o elija la fotografía de la parte ' + (i + 1) + '.', 'error');
        files[p.id] = fi;
        const t = $('#t_' + p.id);
        resp[p.id] = t ? t.value.trim() : '';
      }
    }
    respuesta = JSON.stringify(resp);
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
    const fotosB64 = {};
    for (const pid of Object.keys(files)) fotosB64[pid] = await comprimirImagen(files[pid]);
    await colaPut({
      client_id: uuid(), rut: S.usuario.key, actividad_id: id, respuesta, fotoB64: foto, fotosB64,
      lat: pos ? pos.lat : null, lng: pos ? pos.lng : null, precision: pos ? pos.precision : 0, ts_cliente: ahoraSrv()
    });
    cerrarModal();
    await refrescarPend(); await actualizarContador(); renderEstudiante();
    if (navigator.onLine) sincronizar();
    else { aviso('Respuesta guardada en su teléfono. Se enviará sola cuando tenga internet.'); registrarSync(); }
  } catch (e) { btn.disabled = false; btn.textContent = 'Enviar respuesta'; aviso(e.message, 'error'); }
}
function renderMapaEst() {
  $('#est-contenido').innerHTML = `<div id="mapa" class="h-[62vh] rounded-3xl overflow-hidden border shadow" style="isolation:isolate"></div>
    <button data-accion="centrar" class="w-full bg-white border font-semibold py-2.5 rounded-2xl">📍 Centrar en mi posición</button>
    <p id="gps-estado" class="text-xs text-slate-500 text-center">Buscando su ubicación…</p>`;
  const foco = S.foco; S.foco = null;
  crearMapa('mapa', S.datos.puntos, {
    seguir: true, foco,
    popup: p => {
      const as = S.datos.actividades.filter(x => x.punto_id === p.id).map(x => '• ' + esc(x.titulo)).join('<br>');
      return `<b>${esc(p.nombre)}</b><br>${esc(p.descripcion || '')}${as ? '<br><br><b>Actividades:</b><br>' + as : ''}`;
    }
  });
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
      case 'ver-punto': S.tab = 'mapa'; S.foco = b.dataset.punto; window.scrollTo(0, 0); return renderContenidoEst();
      case 'responder': return await abrirResponder(id);
      case 'enviar-resp': return await enviarRespuestaUI(id);
      case 'actualizar': return await refrescarDatos(false);
      case 'centrar':
        if (S.pos && S.mapa) S.mapa.setView(S.pos, 17); else aviso('Aún no tenemos su ubicación.', 'error');
        return;
      default:
        if (typeof accionDocente === 'function') return await accionDocente(a, b, id);
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
  localStorage.removeItem('sesion');
  // Refresca la cuenta regresiva y los estados cada 30 s
  setInterval(() => {
    if (S.rol === 'estudiante' && S.datos && !$('#pantalla-estudiante').classList.contains('hidden') && S.tab !== 'mapa' && $('#modal').classList.contains('hidden')) renderContenidoEst();
  }, 30000);
  // Al volver a abrir la aplicación, trae la información nueva (por ejemplo, una evaluación)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && S.rol === 'estudiante' && S.datos && $('#modal').classList.contains('hidden') && S.tab !== 'mapa') refrescarDatos(true);
  });

  let s = null;
  try { s = JSON.parse(localStorage.getItem(CLAVE_SESION) || 'null'); } catch (_) {}
  if (s && s.token && s.rol === ROL_PAGINA) {
    Object.assign(S, s);
    if (ROL_PAGINA === 'docente') abrirDocente(); else abrirEstudiante();
  } else mostrar('login');
}
document.addEventListener('DOMContentLoaded', iniciar);
