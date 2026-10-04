'use strict';
/* =========================================================
   SALIDA A TERRENO – Lógica del cliente
   ========================================================= */
const API_URL = 'https://script.google.com/macros/s/AKfycbxYz1D54NQju3TEtZZJDYs-ZeCaKCKwn-mI__boa3HWrzhFkV7zuxJNKa-cTHRebRdC6w/exec';
const MAX_FOTO_KB = 500;
const EXIGENCIA = 60; // % para nota 4,0

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
  ['login', 'carta', 'estudiante', 'docente'].forEach(p => $('#pantalla-' + p).classList.toggle('hidden', p !== id));
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
  const l = $('#logo');
  if (S.insignia) { l.src = S.insignia; l.classList.remove('hidden'); } else l.classList.add('hidden');
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
function guardarSesion() { localStorage.setItem('sesion', JSON.stringify({ rol: S.rol, token: S.token, usuario: S.usuario })); }
async function cerrarSesion(confirmar) {
  if (confirmar && S.rol === 'estudiante') {
    const n = (await colaAll()).filter(i => i.rut === S.usuario.key).length;
    if (n && !confirm('Tiene ' + n + ' respuesta(s) por enviar. Se enviarán cuando vuelva a ingresar con internet. ¿Desea salir?')) return;
  }
  localStorage.removeItem('sesion');
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
  return `<article class="bg-white rounded-2xl shadow p-4">
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
  const kpi = (t, v) => `<div class="bg-white rounded-2xl shadow p-4 text-center"><div class="text-2xl font-extrabold">${v}</div><div class="text-xs text-slate-500">${t}</div></div>`;
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
    <div class="bg-white rounded-2xl shadow p-4 mt-4 space-y-3"><h3 class="font-bold">Entrega por actividad</h3>${porAct || '<p class="text-sm text-slate-500">Aún no hay actividades.</p>'}</div>
    <div class="bg-white rounded-2xl shadow p-4 mt-4 overflow-x-auto">
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
      <div class="bg-white rounded-2xl shadow p-4">
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
        ${P.puntos.map((p, i) => `<div class="bg-white rounded-2xl shadow p-4">
          <b>${i + 1}. ${esc(p.nombre)}</b><p class="text-sm text-slate-500">${esc(p.descripcion || '')}</p>
          <p class="text-xs
