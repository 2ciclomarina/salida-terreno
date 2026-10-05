'use strict';
/* =========================================================
   SALIDA A TERRENO – Complementos, Parte 2: Recorrido
   Kilómetros · calorías · ruta con alturas · fotos en los momentos indicados
   Pestañas de recorridos · barra de avance · informes formales (PDF)
   Se carga después de app-extra.js (y de app-docente.js en el panel docente)
   ========================================================= */

TIPOS.recorrido = { ic: '🥾', nom: 'Recorrido', c: 'emerald' };
const PESO_REF = 60;
let REC = null, MAPA = null, GPSW = null, TIMER = null, WAKE = null, LIVE = null;

/* ---------- Utilidades ---------- */
const esRec = a => !!a && a.tipo === 'grupo' && (a.partes || []).some(p => p.tipo === 'recorrido');
const hitosDe = a => (a.partes || []).filter(p => p.tipo === 'foto');
const recDe = r => { const o = jsonSeguro(r && r.respuesta, null); return o && o._rec ? o._rec : null; };
const fmtKm = m => (m / 1000).toFixed(2).replace('.', ',') + ' km';
const fmtDur = s => { s = Math.max(0, Math.round(s)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return h ? h + ' h ' + m + ' min' : m + ' min'; };
const hora = t => new Date(t).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
const r5 = x => Math.round(x * 1e5) / 1e5;
const claveRec = a => 'rec:' + S.usuario.key + ':' + a.id;
const pinIcon = n => L.divIcon({ className: '', html: '<div class="pin">' + n + '</div>', iconSize: [28, 28], iconAnchor: [14, 14] });

// Gasto energético aproximado al caminar (ecuación ACSM: depende de la velocidad y la pendiente)
function kcalEstim(d, movS, sub, peso) {
  if (d < 50 || movS < 30) return 0;
  const v = Math.min(110, Math.max(40, d / (movS / 60)));
  const g = Math.min(0.25, sub / d);
  return (3.5 + 0.1 * v + 1.8 * v * g) * peso / 1000 * 5 * (movS / 60);
}
function statsAlt(alts) {
  const a = alts.filter(x => x != null && isFinite(x));
  if (a.length < 2) return { sub: 0, baj: 0, min: a.length ? Math.round(a[0]) : null, max: a.length ? Math.round(a[0]) : null };
  const s = a.map((_, i) => { const w = a.slice(Math.max(0, i - 1), i + 2); return w.reduce((x, y) => x + y, 0) / w.length; });
  let sub = 0, baj = 0;
  for (let i = 1; i < s.length; i++) { const d = s[i] - s[i - 1]; if (d > 0) sub += d; else baj -= d; }
  return { sub: Math.round(sub), baj: Math.round(baj), min: Math.round(Math.min(...a)), max: Math.round(Math.max(...a)) };
}
function simplificar(pts, max) {
  if (pts.length <= max) return pts.slice();
  const paso = (pts.length - 1) / (max - 1), out = [];
  for (let i = 0; i < max; i++) out.push(pts[Math.round(i * paso)]);
  return out;
}
// Alturas del terreno (Open-Meteo, hasta 100 puntos por consulta)
async function elevaciones(pts) {
  try {
    const out = [];
    for (let i = 0; i < pts.length; i += 100) {
      const l = pts.slice(i, i + 100);
      const r = await fetch('https://api.open-meteo.com/v1/elevation?latitude=' + l.map(p => p[0].toFixed(4)).join(',') + '&longitude=' + l.map(p => p[1].toFixed(4)).join(','));
      if (!r.ok) return null;
      const j = await r.json();
      if (!j.elevation || j.elevation.length !== l.length) return null;
      out.push(...j.elevation);
    }
    return out;
  } catch (_) { return null; }
}
function recalcRec(rec) {
  const s = statsAlt(rec.pts.map(p => p[2]));
  rec.sub = s.sub; rec.baj = s.baj; rec.amin = s.min; rec.amax = s.max;
  rec.kcal = Math.round(kcalEstim(rec.dist, rec.mov, rec.sub, rec.peso || PESO_REF));
  return rec;
}
const resumenTxt = rec => 'Recorrido: ' + fmtKm(rec.dist) + ' · ' + fmtDur(rec.dur) + ' · +' + rec.sub + ' m / −' + rec.baj + ' m · ≈ ' + rec.kcal + ' kcal';
function armarResp(a, rec) {
  const o = {};
  (a.partes || []).forEach(p => {
    if (p.tipo === 'recorrido') o[p.id] = resumenTxt(rec);
    else if (p.tipo === 'foto') o[p.id] = rec.hitos[p.id] ? 'Foto tomada a las ' + hora(rec.hitos[p.id].t) : '(sin fotografía)';
  });
  o._rec = rec;
  return JSON.stringify(o);
}

// Si el recorrido se terminó sin internet, las alturas del terreno se completan al enviarlo
const _apiRec = api;
api = async function (accion, datos, op) {
  if (accion === 'enviarRespuesta' && datos && typeof datos.respuesta === 'string' && navigator.onLine &&
      datos.respuesta.indexOf('"_rec"') > 0 && datos.respuesta.indexOf('"dem":false') > 0) {
    try {
      const o = JSON.parse(datos.respuesta), rec = o._rec;
      const el = await elevaciones(rec.pts);
      if (el) {
        rec.pts.forEach((p, i) => { p[2] = Math.round(el[i]); });
        rec.dem = true; recalcRec(rec);
        const a = (S.datos.actividades || []).find(x => x.id === datos.actividad_id);
        const mk = a && (a.partes || []).find(p => p.tipo === 'recorrido');
        if (mk) o[mk.id] = resumenTxt(rec);
        datos.respuesta = JSON.stringify(o);
      }
    } catch (_) { /* se envía como estaba */ }
  }
  return _apiRec(accion, datos, op);
};

/* ---------- Mapas: se vuelve a encuadrar cuando el mapa ya tiene su tamaño ---------- */
crearMapa = function (idDiv, puntos, op) {
  op = op || {};
  detenerMapa();
  const c = capasBase();
  const m = L.map(idDiv, { layers: [c.topo] });
  L.control.layers({ 'Topográfico (relieve)': c.topo, 'Topográfico Esri': c.esri, 'Calles': c.osm }).addTo(m);
  const lim = L.latLngBounds([]), marcas = {};
  puntos.forEach((p, i) => {
    if (!isFinite(p.lat) || !isFinite(p.lng)) return;
    const mk = L.marker([p.lat, p.lng], { icon: L.divIcon({ className: '', html: `<div class="pin">${i + 1}</div>`, iconSize: [28, 28], iconAnchor: [14, 14] }) })
      .addTo(m).bindPopup(op.popup ? op.popup(p) : `<b>${esc(p.nombre)}</b><br>${esc(p.descripcion || '')}`);
    marcas[p.id] = mk;
    lim.extend([p.lat, p.lng]);
  });
  const ajustar = () => {
    if (lim.isValid()) m.fitBounds(lim, { padding: [40, 40], maxZoom: 16 }); else m.setView([-36.83, -73.05], 12);
    if (op.foco && marcas[op.foco]) { m.setView(marcas[op.foco].getLatLng(), 16); marcas[op.foco].openPopup(); }
  };
  ajustar();
  S.mapa = m;
  if (op.seguir) iniciarGPS();
  setTimeout(() => { if (S.mapa === m) { m.invalidateSize(); ajustar(); } }, 300);
};

/* ---------- Pantalla del recorrido (cubre toda la ventana) ---------- */
function overlay() {
  let o = $('#rec-overlay');
  if (!o) { o = document.createElement('div'); o.id = 'rec-overlay'; o.className = 'fixed inset-0 z-[45] bg-slate-50 overflow-y-auto'; document.body.appendChild(o); }
  o.classList.remove('hidden');
  return o;
}
function cerrarOverlay() {
  const o = $('#rec-overlay');
  if (o) { o.classList.add('hidden'); o.innerHTML = ''; }
  if (MAPA) { MAPA.remove(); MAPA = null; }
  LIVE = null;
}
function nuevoMapa(id) {
  if (MAPA) { MAPA.remove(); MAPA = null; }
  const c = capasBase();
  MAPA = L.map(id, { layers: [c.topo] });
  L.control.layers({ 'Topográfico (relieve)': c.topo, 'Calles': c.osm }).addTo(MAPA);
  const m = MAPA;
  setTimeout(() => { if (MAPA === m) m.invalidateSize(); }, 200);
  return m;
}
const cabeceraRec = t => `<div class="sticky top-0 z-10 bg-gradient-to-r from-teal-800 to-teal-600 text-white px-4 py-3 flex items-center gap-3 shadow">
  <button data-accion="rec-cerrar" class="text-2xl leading-none" aria-label="Cerrar">←</button><div class="font-extrabold flex-1">${esc(t)}</div></div>`;
const celdaRec = (ic, v, t, id) => `<div class="rounded-2xl bg-white shadow p-3 text-center"><div class="text-lg">${ic}</div><div ${id ? `id="${id}" ` : ''}class="font-extrabold">${v}</div><div class="text-[11px] text-slate-500">${t}</div></div>`;

function gridRec(rec) {
  return `<div class="grid grid-cols-3 gap-2">${celdaRec('📏', fmtKm(rec.dist), 'Distancia')}${celdaRec('⏱️', fmtDur(rec.dur), 'Duración')}${celdaRec('🚶', fmtDur(rec.mov), 'En movimiento')}
    ${celdaRec('⬆️', '+' + rec.sub + ' m', 'Subida')}${celdaRec('⬇️', '−' + rec.baj + ' m', 'Bajada')}${celdaRec('🔥', '≈ ' + rec.kcal + ' kcal', 'Calorías aprox.')}</div>
    <p class="text-[11px] text-slate-400">${rec.amin != null ? 'Altura entre ' + rec.amin + ' y ' + rec.amax + ' m. ' : ''}Calorías estimadas con ${rec.peso || PESO_REF} kg: es un cálculo aproximado.</p>`;
}

// Perfil de alturas (también se usa en los PDF)
function svgPerfil(rec) {
  const pts = rec.pts.filter(p => p[2] != null);
  if (pts.length < 2) return '<p style="font-size:12px;color:#64748b">Sin datos de altura.</p>';
  const W = 640, H = 170, mx = 42, my = 16;
  const dmax = Math.max(1, rec.pts[rec.pts.length - 1][3]);
  const amin = Math.min(...pts.map(p => p[2])), amax = Math.max(...pts.map(p => p[2])), rg = Math.max(10, amax - amin);
  const X = d => mx + d / dmax * (W - mx - 10), Y = a => H - my - (a - amin) / rg * (H - 2 * my);
  const linea = pts.map((p, i) => (i ? 'L' : 'M') + X(p[3]).toFixed(1) + ' ' + Y(p[2]).toFixed(1)).join(' ');
  const area = linea + ' L' + X(pts[pts.length - 1][3]).toFixed(1) + ' ' + (H - my) + ' L' + X(pts[0][3]).toFixed(1) + ' ' + (H - my) + ' Z';
  const marcas = Object.keys(rec.hitos).map(k => {
    const h = rec.hitos[k], p = rec.pts[h.i];
    if (!p || p[2] == null) return '';
    return `<circle cx="${X(p[3]).toFixed(1)}" cy="${Y(p[2]).toFixed(1)}" r="9" fill="#4338ca"/><text x="${X(p[3]).toFixed(1)}" y="${(Y(p[2]) + 4).toFixed(1)}" font-size="11" fill="#fff" text-anchor="middle">${h.n}</text>`;
  }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="background:#f8fafc;border-radius:12px"><path d="${area}" fill="#99f6e4" opacity=".6"/><path d="${linea}" fill="none" stroke="#0f766e" stroke-width="2.5"/>${marcas}
    <text x="4" y="${(Y(amax) + 4).toFixed(1)}" font-size="10" fill="#475569">${Math.round(amax)} m</text><text x="4" y="${(Y(amin) + 4).toFixed(1)}" font-size="10" fill="#475569">${Math.round(amin)} m</text>
    <text x="${W - 70}" y="${H - 2}" font-size="10" fill="#475569">${fmtKm(dmax)}</text></svg>`;
}
// Ruta dibujada sin mapa de fondo (para las pestañas y los PDF)
function svgRutaRec(rec) {
  const p = rec.pts;
  if (p.length < 2) return '';
  const la = p.map(x => x[0]), lo = p.map(x => x[1]);
  const minLa = Math.min(...la), maxLa = Math.max(...la), minLo = Math.min(...lo), maxLo = Math.max(...lo);
  const W = 640, H = 240, m = 22, kx = Math.cos(((minLa + maxLa) / 2) * Math.PI / 180);
  const dx = (maxLo - minLo) * kx || 0.0005, dy = (maxLa - minLa) || 0.0005, k = Math.min((W - 2 * m) / dx, (H - 2 * m) / dy);
  const X = g => m + (g - minLo) * kx * k, Y = t => H - m - (t - minLa) * k;
  const linea = p.map((x, i) => (i ? 'L' : 'M') + X(x[1]).toFixed(1) + ' ' + Y(x[0]).toFixed(1)).join(' ');
  const hs = Object.keys(rec.hitos).map(id => { const h = rec.hitos[id]; return h.la == null ? '' : `<circle cx="${X(h.lo).toFixed(1)}" cy="${Y(h.la).toFixed(1)}" r="9" fill="#4338ca"/><text x="${X(h.lo).toFixed(1)}" y="${(Y(h.la) + 4).toFixed(1)}" font-size="11" fill="#fff" text-anchor="middle">${h.n}</text>`; }).join('');
  const a = p[0], z = p[p.length - 1];
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="background:#f1f5f9;border:1px solid #cbd5e1"><path d="${linea}" fill="none" stroke="#dc2626" stroke-width="3"/>
    <circle cx="${X(a[1]).toFixed(1)}" cy="${Y(a[0]).toFixed(1)}" r="7" fill="#16a34a"/><circle cx="${X(z[1]).toFixed(1)}" cy="${Y(z[0]).toFixed(1)}" r="7" fill="#dc2626"/>${hs}
    <text x="6" y="14" font-size="10" fill="#475569">Verde: inicio · Rojo: término · Azul: fotografías</text></svg>`;
}

/* ---------- Estudiante: abrir el recorrido ---------- */
const nuevoRec = a => ({ act: a, estado: 'previo', t0: 0, t0c: 0, pts: [], dist: 0, mov: 0, sub: 0, hitos: {}, fix: null, peso: Number(localStorage.getItem('terreno_peso')) || PESO_REF });

async function abrirRecorrido(a) {
  if (REC && REC.act.id !== a.id && REC.estado === 'activo') return aviso('Tiene otro recorrido en curso. Termínelo primero.', 'error');
  if (!REC || REC.act.id !== a.id) {
    const g = await cacheGet(claveRec(a)).catch(() => null);
    REC = g ? Object.assign(nuevoRec(a), g, { act: a }) : nuevoRec(a);
  }
  if (REC.estado === 'activo' && GPSW == null) iniciarGPSRec();
  pintarRec();
  if (REC.estado === 'previo') cargarPrevio();
}
function pintarRec() {
  const ov = overlay();
  if (REC.estado === 'previo') ov.innerHTML = vistaPrevio();
  else if (REC.estado === 'activo') { ov.innerHTML = vistaActivo(); montarMapaVivo(); }
  else vistaRec(REC.act, { origen: 'local', respuesta: armarResp(REC.act, REC.rec), fotosB64: fotosRec() }, false, true);
}
const fotosRec = () => { const m = {}; Object.keys(REC.hitos).forEach(id => { m[id] = REC.hitos[id].foto; }); return m; };

function vistaPrevio() {
  const a = REC.act, hs = hitosDe(a), pt = (S.datos.puntos || []).find(p => p.id === a.punto_id);
  return cabeceraRec(a.titulo) + `<div class="p-4 space-y-3 max-w-2xl mx-auto">
    ${a.enunciado ? `<div class="bg-white rounded-2xl p-3 text-sm whitespace-pre-line shadow">${esc(a.enunciado)}</div>` : ''}
    ${pt ? `<div class="bg-white rounded-2xl p-3 shadow space-y-2">
      <div class="flex items-center gap-2"><span class="pin shrink-0">${puntoNum(pt.id)}</span><b>Destino: ${esc(pt.nombre)}</b></div>
      <div id="rec-prev-info" class="text-xs text-slate-600">Calculando su distancia al lugar…</div>
      <div class="flex flex-wrap gap-2">${fichaTiene(pt) ? `<button data-accion="ver-ficha" data-punto="${esc(pt.id)}" class="text-xs bg-emerald-50 text-emerald-700 font-semibold rounded-full px-3 py-1.5">📖 Conocer el lugar</button>` : ''}
        <a target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&amp;destination=${pt.lat},${pt.lng}" class="text-xs bg-teal-50 text-teal-700 font-semibold rounded-full px-3 py-1.5">🧭 Cómo llegar</a></div>
      <div id="rec-prev-mapa" class="h-48 rounded-xl overflow-hidden border" style="isolation:isolate"></div></div>` : ''}
    <div id="rec-prev-clima" class="bg-white rounded-2xl p-3 shadow text-sm"><span class="text-slate-500">Buscando su ubicación…</span></div>
    ${hs.length ? `<div class="bg-white rounded-2xl p-3 shadow"><div class="font-bold text-sm">📷 Fotografías que debe tomar durante el recorrido</div>
      <ol class="list-decimal pl-5 text-sm mt-1 space-y-0.5">${hs.map(h => `<li>${esc(h.enunciado)}</li>`).join('')}</ol>
      <p class="text-xs text-slate-500 mt-1">Todos deben tomar estas fotografías para poder terminar.</p></div>` : ''}
    <div class="bg-white rounded-2xl p-3 shadow text-sm space-y-2">
      <label class="block font-semibold">Su peso aproximado (kg), solo para calcular las calorías
        <input id="rec-peso" type="number" min="30" max="150" value="${esc(REC.peso)}" class="mt-1 w-28 border rounded-xl px-3 py-2"></label>
      <p class="text-xs text-slate-500">Este dato se queda en su teléfono y no se envía. Las calorías son un cálculo aproximado.</p></div>
    <div class="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-slate-700 space-y-1">
      <div>📱 <b>Mantenga la aplicación abierta y la pantalla encendida</b> durante todo el recorrido. Con la pantalla apagada el teléfono no registra el trayecto.</div>
      <div>📶 Si no hay internet, el recorrido se guarda y se envía cuando vuelva la señal.</div></div>
    <button data-accion="rec-iniciar" class="w-full bg-teal-700 hover:bg-teal-800 text-white font-bold py-4 rounded-2xl shadow text-lg">▶ Iniciar recorrido</button>
  </div>`;
}
async function cargarPrevio() {
  const a = REC.act, pt = (S.datos.puntos || []).find(p => p.id === a.punto_id);
  const p = await obtenerPosicion();
  if (!REC || REC.estado !== 'previo') return;
  const info = $('#rec-prev-info'), cl = $('#rec-prev-clima');
  if (!p) {
    if (info) info.textContent = 'No pudimos obtener su ubicación. Active el GPS y permita el acceso.';
    if (cl) cl.textContent = 'No pudimos obtener su ubicación. Active el GPS y permita el acceso.';
    return;
  }
  if (cl) cl.innerHTML = p.ambiente ? '<div class="text-xs font-semibold mb-1">Condiciones donde usted está ahora</div>' + htmlClima(p.ambiente) + '<p class="text-[11px] text-slate-400 mt-1">Datos del modelo Open-Meteo para su ubicación; no los mide su teléfono.</p>'
    : '<span class="text-xs text-slate-500">No se pudieron obtener las condiciones del tiempo (se necesita internet).</span>';
  if (!pt || !info) return;
  const recta = distM([p.lat, p.lng], [pt.lat, pt.lng]);
  info.innerHTML = '⏳ Calculando el camino… (en línea recta: ' + fmtDist(recta) + ')';
  let m = null;
  if ($('#rec-prev-mapa')) {
    m = nuevoMapa('rec-prev-mapa');
    L.circleMarker([p.lat, p.lng], { radius: 8, color: '#fff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 }).addTo(m).bindTooltip('Usted');
    L.marker([pt.lat, pt.lng], { icon: pinIcon(puntoNum(pt.id)) }).addTo(m).bindTooltip(pt.nombre);
    const b = L.latLngBounds([[p.lat, p.lng], [pt.lat, pt.lng]]);
    setTimeout(() => { if (MAPA === m) { m.invalidateSize(); m.fitBounds(b, { padding: [30, 30], maxZoom: 16 }); } }, 250);
  }
  const rr = await rutasHasta([p.lat, p.lng], [pt]);
  const r = rr[pt.id], i2 = $('#rec-prev-info');
  if (i2) i2.innerHTML = textoRuta(r, recta);
  if (m && MAPA === m && r && r.poli) { const pl = L.polyline(decodePoli(r.poli), { color: '#0f766e', weight: 4 }).addTo(m); m.fitBounds(pl.getBounds(), { padding: [30, 30], maxZoom: 16 }); }
}

/* ---------- Estudiante: recorrido en curso ---------- */
async function iniciarRec() {
  const a = REC.act;
  if (estadoVentana(a) !== 'abierta') return aviso('Esta actividad no está abierta en este momento.', 'error');
  const w = Math.max(30, Math.min(150, parseFloat(($('#rec-peso') || {}).value) || PESO_REF));
  localStorage.setItem('terreno_peso', String(w));
  cargando(true, 'Obteniendo su ubicación…');
  const p = await obtenerPosicion();
  cargando(false);
  if (!p) return aviso('No pudimos obtener su ubicación. Active el GPS y permita el acceso.', 'error');
  const t = Date.now();
  Object.assign(REC, {
    estado: 'activo', t0: ahoraSrv(), t0c: t, peso: w, dist: 0, mov: 0, sub: 0, altRef: null, hitos: {}, acc: p.precision,
    pts: [{ la: p.lat, lo: p.lng, a: null, t, acc: p.precision, d: 0 }],
    fix: { la: p.lat, lo: p.lng, a: null, acc: p.precision, t }, amb0: p.ambiente || null
  });
  await guardarRec();
  iniciarGPSRec();
  pintarRec();
}
async function guardarRec() {
  if (!REC) return;
  const c = Object.assign({}, REC); delete c.act;
  try { await cachePut(claveRec(REC.act), c); } catch (_) { /* si no se puede guardar, el recorrido sigue */ }
}
function iniciarGPSRec() {
  detenerGPSRec();
  if (!navigator.geolocation) return;
  GPSW = navigator.geolocation.watchPosition(onFix, () => { if (REC) { REC.acc = 999; actualizarRecUI(); } }, { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 });
  TIMER = setInterval(() => actualizarRecUI(), 1000);
  pedirWake();
}
function detenerGPSRec() {
  if (GPSW != null) { navigator.geolocation.clearWatch(GPSW); GPSW = null; }
  if (TIMER) { clearInterval(TIMER); TIMER = null; }
  if (WAKE) { WAKE.release().catch(() => {}); WAKE = null; }
}
async function pedirWake() {
  try {
    if ('wakeLock' in navigator && !WAKE) { WAKE = await navigator.wakeLock.request('screen'); WAKE.addEventListener('release', () => { WAKE = null; }); }
  } catch (_) { /* no todos los teléfonos lo permiten */ }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && REC && REC.estado === 'activo') { pedirWake(); if (GPSW == null) iniciarGPSRec(); }
});

function onFix(p) {
  if (!REC || REC.estado !== 'activo') return;
  const c = p.coords, t = Date.now();
  REC.acc = c.accuracy;
  if (c.accuracy > 40) return actualizarRecUI();
  const alt = c.altitude != null ? c.altitude : null;
  REC.fix = { la: c.latitude, lo: c.longitude, a: alt, acc: c.accuracy, t };
  const q = { la: c.latitude, lo: c.longitude, a: alt, t, acc: c.accuracy, d: REC.dist };
  const u = REC.pts[REC.pts.length - 1];
  if (u) {
    const d = distM([u.la, u.lo], [q.la, q.lo]), dt = (t - u.t) / 1000;
    if (d < Math.max(5, Math.min(c.accuracy * 0.5, 15))) return actualizarRecUI();   // quieto o ruido del GPS
    if (dt > 0 && dt < 120 && d / dt > 12) return actualizarRecUI();                  // salto imposible a pie
    REC.dist += d; q.d = REC.dist;
    if (dt > 0 && d / dt >= 0.3) REC.mov += Math.min(dt, 60);
  }
  if (alt != null) {
    if (REC.altRef == null) REC.altRef = alt;
    else if (Math.abs(alt - REC.altRef) >= 3) { if (alt > REC.altRef) REC.sub = (REC.sub || 0) + (alt - REC.altRef); REC.altRef = alt; }
  }
  REC.pts.push(q);
  if (REC.pts.length % 10 === 0) guardarRec();
  actualizarRecUI(true);
}

function vistaActivo() {
  const a = REC.act, hs = hitosDe(a);
  return cabeceraRec('Recorrido en curso') + `<div class="p-4 space-y-3 max-w-2xl mx-auto">
    <div id="rec-gps" class="text-xs text-center text-slate-600">⏳ Buscando señal…</div>
    <div class="rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white p-4 shadow flex items-center gap-3">
      <div class="text-4xl">🔥</div>
      <div class="flex-1"><div class="text-xs opacity-90">Calorías gastadas (aproximado)</div>
        <div id="rec-kcal" class="text-3xl font-extrabold leading-tight">0 kcal</div>
        <div class="text-[11px] opacity-90">Empiezan a contar cuando camine unos 50 metros.</div></div></div>
    <div class="grid grid-cols-3 gap-2">${celdaRec('📏', '–', 'Distancia', 'rec-km')}${celdaRec('⏱️', '–', 'Tiempo', 'rec-t')}${celdaRec('⬆️', '–', 'Subida', 'rec-sub')}
      ${celdaRec('⛰️', '–', 'Altura (GPS)', 'rec-alt')}${celdaRec('📷', '–', 'Fotografías', 'rec-fotos')}</div>
    <div id="rec-mapa" class="h-56 rounded-2xl overflow-hidden border shadow" style="isolation:isolate"></div>
    ${hs.length ? `<div class="space-y-2">${hs.map((h, i) => {
      const x = REC.hitos[h.id];
      return `<div class="bg-white rounded-2xl p-3 shadow flex items-center gap-3"><span class="pin shrink-0">${i + 1}</span>
        <div class="flex-1 min-w-0"><div class="font-semibold text-sm">${esc(h.enunciado)}</div>
          <div class="text-xs ${x ? 'text-emerald-700' : 'text-slate-500'}">${x ? '✔ Tomada a las ' + hora(x.t) + (x.dp != null ? ' · a ' + fmtDist(x.dp) + ' del lugar' : '') : 'Pendiente'}</div></div>
        <label class="shrink-0 text-xs bg-amber-50 border border-amber-300 rounded-full px-3 py-2 font-semibold cursor-pointer">📷 ${x ? 'Repetir' : 'Tomar'}
          <input type="file" accept="image/*" capture="environment" data-rhito="${esc(h.id)}" class="hidden"></label></div>`;
    }).join('')}</div>` : ''}
    <button data-accion="rec-terminar" class="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-4 rounded-2xl shadow text-lg">⏹ Terminar recorrido</button>
    <button data-accion="rec-descartar" class="w-full text-xs text-slate-500 underline">Descartar este recorrido y empezar de nuevo</button>
    <p class="text-[11px] text-slate-400 text-center">Puede ocultar esta pantalla con la flecha ←; el recorrido sigue registrándose. Para volver, pinche «Abrir recorrido» en la actividad.</p>
  </div>`;
}
function montarMapaVivo() {
  const m = nuevoMapa('rec-mapa');
  LIVE = { pol: L.polyline(REC.pts.map(p => [p.la, p.lo]), { color: '#dc2626', weight: 4 }).addTo(m), yo: null };
  const u = REC.fix || REC.pts[REC.pts.length - 1];
  if (u) { LIVE.yo = L.circleMarker([u.la, u.lo], { radius: 8, color: '#fff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 }).addTo(m); m.setView([u.la, u.lo], 17); }
  else m.setView([-36.83, -73.05], 13);
  actualizarRecUI();
}
function actualizarRecUI(mover) {
  if (!REC || REC.estado !== 'activo') return;
  const set = (id, v) => { const e = $('#' + id); if (e) e.textContent = v; };
  const dur = (Date.now() - REC.t0c) / 1000;
  set('rec-km', fmtKm(REC.dist)); set('rec-t', fmtDur(dur)); set('rec-sub', '+' + Math.round(REC.sub || 0) + ' m');
  set('rec-kcal', '≈ ' + Math.round(kcalEstim(REC.dist, REC.mov, REC.sub || 0, REC.peso)) + ' kcal');
  set('rec-alt', REC.fix && REC.fix.a != null ? Math.round(REC.fix.a) + ' m' : '—');
  set('rec-fotos', Object.keys(REC.hitos).length + ' de ' + hitosDe(REC.act).length);
  set('rec-gps', !REC.fix ? '⏳ Buscando señal…' : REC.acc <= 40 ? '🟢 Señal buena (±' + Math.round(REC.acc) + ' m)' : '🟠 Señal débil: espere unos segundos');
  if (MAPA && LIVE) {
    LIVE.pol.setLatLngs(REC.pts.map(p => [p.la, p.lo]));
    if (REC.fix) {
      const c = [REC.fix.la, REC.fix.lo];
      if (!LIVE.yo) LIVE.yo = L.circleMarker(c, { radius: 8, color: '#fff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 }).addTo(MAPA); else LIVE.yo.setLatLng(c);
      if (mover) MAPA.panTo(c);
    }
  }
}

// Fotografía de un momento indicado por el docente
function posActual() {
  return new Promise(res => {
    if (!navigator.geolocation) return res(null);
    navigator.geolocation.getCurrentPosition(
      p => res({ la: p.coords.latitude, lo: p.coords.longitude, a: p.coords.altitude, acc: p.coords.accuracy, t: Date.now() }),
      () => res(null), { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 });
  });
}
async function fotoHito(hid, file) {
  if (!REC || REC.estado !== 'activo') return;
  cargando(true, 'Guardando la fotografía…');
  try {
    const foto = await comprimirImagen(file);
    const f = (REC.fix && Date.now() - REC.fix.t < 45000) ? REC.fix : await posActual();
    const pt = (S.datos.puntos || []).find(p => p.id === REC.act.punto_id);
    const h = { t: ahoraSrv(), la: f ? f.la : null, lo: f ? f.lo : null, a: f && f.a != null ? f.a : null, acc: f ? f.acc : null, foto, amb: null,
      dp: f && pt ? Math.round(distM([f.la, f.lo], [pt.lat, pt.lng])) : null };
    REC.hitos[hid] = h;
    await guardarRec();
    pintarRec();
    if (f && navigator.onLine) clima(f.la, f.lo, 4000).then(c => { if (c) { h.amb = c; guardarRec(); } });
  } finally { cargando(false); }
}

/* ---------- Estudiante: terminar y enviar ---------- */
async function terminarRec() {
  const a = REC.act, hs = hitosDe(a), faltan = hs.filter(h => !REC.hitos[h.id]).length;
  if (faltan && !confirm('Faltan ' + faltan + ' fotografía(s). ¿Desea terminar igual?')) return;
  if (!faltan && !confirm('¿Terminar el recorrido ahora?')) return;
  cargando(true, 'Calculando su recorrido…');
  try {
    detenerGPSRec();
    const fin = REC.fix;
    const simp = simplificar(REC.pts, 200).map(p => [r5(p.la), r5(p.lo), p.a == null ? null : Math.round(p.a), Math.round(p.d)]);
    let dem = false;
    if (navigator.onLine) {
      const el = await elevaciones(simp);
      if (el) { simp.forEach((p, i) => { p[2] = Math.round(el[i]); }); dem = true; }
    }
    const rec = { v: 1, ini: REC.t0, dur: Math.round((Date.now() - REC.t0c) / 1000), dist: Math.round(REC.dist), mov: Math.round(REC.mov),
      peso: REC.peso, dem, pts: simp, amb0: REC.amb0 || null, amb1: null, hitos: {} };
    hs.forEach((h, n) => {
      const x = REC.hitos[h.id];
      if (!x) return;
      let i = 0;
      if (x.la != null) { let best = Infinity; simp.forEach((p, k) => { const d = distM([x.la, x.lo], [p[0], p[1]]); if (d < best) { best = d; i = k; } }); }
      rec.hitos[h.id] = { n: n + 1, t: x.t, la: x.la != null ? r5(x.la) : null, lo: x.lo != null ? r5(x.lo) : null, a: x.a != null ? Math.round(x.a) : null, dp: x.dp, amb: x.amb, i };
    });
    if (fin && navigator.onLine) rec.amb1 = await clima(fin.la, fin.lo, 4000);
    recalcRec(rec);
    REC.rec = rec; REC.estado = 'fin';
    await guardarRec();
  } finally { cargando(false); }
  pintarRec();
}
async function enviarRec() {
  const a = REC.act, rec = REC.rec, p0 = rec.pts[0] || [null, null];
  cargando(true, 'Guardando…');
  try {
    await colaPut({ client_id: uuid(), rut: S.usuario.key, actividad_id: a.id, respuesta: armarResp(a, rec), fotoB64: null, fotosB64: fotosRec(),
      lat: p0[0], lng: p0[1], precision: 0, ts_cliente: REC.t0, ambiente: rec.amb0 });
    await idb('cache', 'readwrite', s => s.delete(claveRec(a)));
    REC = null; cerrarOverlay();
    await refrescarPend(); await actualizarContador(); renderEstudiante();
    if (navigator.onLine) sincronizar();
    else { aviso('Recorrido guardado en su teléfono. Se enviará solo cuando tenga internet.'); registrarSync(); }
  } finally { cargando(false); }
}
async function descartarRec() {
  if (!REC || !confirm('Se perderá este recorrido (kilómetros y fotografías). ¿Desea descartarlo?')) return;
  detenerGPSRec();
  await idb('cache', 'readwrite', s => s.delete(claveRec(REC.act)));
  REC = null; cerrarOverlay(); renderEstudiante();
}

/* ---------- Ver un recorrido (estudiante y docente) ---------- */
function hitoVista(h, i, rec, imgTag) {
  const x = rec.hitos[h.id];
  const p = x && rec.pts[x.i], alt = p && p[2] != null ? p[2] : (x ? x.a : null);
  return `<div class="bg-white rounded-2xl p-3 shadow space-y-1"><div class="flex items-center gap-2"><span class="pin shrink-0">${i + 1}</span><b class="text-sm">${esc(h.enunciado)}</b></div>` +
    (x ? imgTag(h.id, 'w-full max-h-56 object-cover rounded-xl') +
      `<div class="text-xs text-slate-600">🕒 ${hora(x.t)}${alt != null ? ' · ⛰️ ' + Math.round(alt) + ' m' : ''}${x.dp != null ? ' · 📏 a ' + fmtDist(x.dp) + ' del lugar' : ''}</div>` +
      (x.amb ? `<div class="text-xs text-slate-500">🌍 ${fmtClima(x.amb)}</div>` : '')
      : '<div class="text-xs text-rose-600">Sin fotografía.</div>') + '</div>';
}
function vistaRec(a, r, doc, pend) {
  const rec = recDe(r);
  if (!rec) return aviso('Esta respuesta no trae datos del recorrido.', 'error');
  const loc = r.origen === 'local';
  const fot = loc ? (r.fotosB64 || {}) : jsonSeguro(r.fotos, {});
  const hs = hitosDe(a);
  const imgTag = (hid, cls) => {
    const f = fot[hid];
    if (!f) return '';
    return loc ? `<img src="${f}" class="${cls}" alt="Fotografía">` : `<img data-archivo="${esc(f)}" class="${cls} bg-slate-100" alt="Fotografía">`;
  };
  const ov = overlay();
  ov.innerHTML = cabeceraRec(doc ? 'Recorrido de ' + nombreDe(r.rut) : (pend ? 'Resumen de su recorrido' : 'Mi recorrido')) + `<div class="p-4 space-y-3 max-w-2xl mx-auto">
    ${gridRec(rec)}
    <div id="rec-vmapa" class="h-64 rounded-2xl overflow-hidden border shadow" style="isolation:isolate"></div>
    <div class="bg-white rounded-2xl p-3 shadow"><div class="text-xs font-semibold mb-1">⛰️ Perfil de alturas</div>${svgPerfil(rec)}
      <p class="text-[11px] text-slate-400">${rec.dem ? 'Alturas del terreno (modelo digital de elevación).' : 'Alturas medidas por el GPS del teléfono (aproximadas).'}</p></div>
    ${hs.length ? '<div class="text-sm font-bold">📷 Fotografías del recorrido</div>' : ''}
    ${hs.map((h, i) => hitoVista(h, i, rec, imgTag)).join('')}
    ${rec.amb0 || rec.amb1 ? `<div class="bg-white rounded-2xl p-3 shadow text-xs space-y-1"><div class="font-semibold">🌍 Condiciones del tiempo</div>
      ${rec.amb0 ? '<div>Al iniciar: ' + fmtClima(rec.amb0) + '</div>' : ''}${rec.amb1 ? '<div>Al terminar: ' + fmtClima(rec.amb1) + '</div>' : ''}
      <div class="text-slate-400">Datos del modelo Open-Meteo; no los mide el teléfono.</div></div>` : ''}
    ${pend ? `<button data-accion="rec-enviar" class="w-full bg-teal-700 hover:bg-teal-800 text-white font-bold py-3 rounded-2xl shadow">💾 Guardar y enviar</button>
      <button data-accion="rec-descartar" class="w-full text-sm text-rose-600 underline">Descartar y empezar de nuevo</button>` : ''}
  </div>`;
  const m = nuevoMapa('rec-vmapa');
  const ll = rec.pts.map(p => [p[0], p[1]]);
  const pl = ll.length > 1 ? L.polyline(ll, { color: '#dc2626', weight: 4 }).addTo(m) : null;
  const encuadrar = () => { m.invalidateSize(); if (pl) m.fitBounds(pl.getBounds(), { padding: [30, 30] }); else if (ll.length) m.setView(ll[0], 16); else m.setView([-36.83, -73.05], 13); };
  encuadrar();
  setTimeout(() => { if (MAPA === m) encuadrar(); }, 300);
  if (ll.length) {
    L.circleMarker(ll[0], { radius: 7, color: '#fff', weight: 2, fillColor: '#16a34a', fillOpacity: 1 }).addTo(m).bindTooltip('Inicio');
    L.circleMarker(ll[ll.length - 1], { radius: 7, color: '#fff', weight: 2, fillColor: '#dc2626', fillOpacity: 1 }).addTo(m).bindTooltip('Término');
  }
  hs.forEach((h, i) => {
    const x = rec.hitos[h.id];
    if (!x || x.la == null) return;
    L.marker([x.la, x.lo], { icon: pinIcon(i + 1) }).addTo(m).bindPopup(() => `<b>${esc(h.enunciado)}</b><br>${hora(x.t)}<br>${imgTag(h.id, 'w-40 rounded')}`);
  });
  m.on('popupopen', ev => pintarImagenes(ev.popup.getElement()));
  pintarImagenes(ov);
}
function verRec(id, doc) {
  if (doc) {
    const r = S.panel.respuestas.find(x => x.id === id);
    if (r) vistaRec(actPor(r.actividad_id), Object.assign({ origen: 'servidor' }, r), true, false);
    return;
  }
  const a = S.datos.actividades.find(x => x.id === id), r = a && respuestaDe(a);
  if (a && r) vistaRec(a, r, false, false);
}

/* ---------- Estudiante: tarjeta de la actividad ---------- */
function tarjetaRec(a) {
  const v = estadoVentana(a), r = respuestaDe(a), hs = hitosDe(a), T = TIPOS.recorrido;
  let est;
  if (r) est = r.origen === 'local' ? chip('Por enviar', 'amber') : r.estado === 'evaluada' ? chip('Evaluada', 'emerald') : chip('Enviada', 'sky');
  else est = v === 'abierta' ? chip('Abierta', 'emerald') : v === 'pronto' ? chip('Aún no abre', 'slate') : chip('Cerrada', 'rose');
  let tiempo = '';
  if (!r) {
    if (v === 'abierta') tiempo = `⏱ Puede comenzar hasta dentro de ${tiempoRestante(Date.parse(a.fecha_fin) - ahoraSrv())}`;
    else if (v === 'pronto') tiempo = `🔒 Abre el ${fechaCorta(a.fecha_inicio)}`;
    else tiempo = `⌛ Cerró el ${fechaCorta(a.fecha_fin)}`;
  }
  const rec = r ? recDe(r) : null;
  let boton;
  if (r) boton = `<button data-accion="rec-ver" data-id="${esc(a.id)}" class="mt-3 w-full bg-white border-2 border-teal-600 text-teal-700 font-bold py-2.5 rounded-2xl">🗺️ Ver mi recorrido</button>`;
  else if (v === 'abierta') boton = `<button data-accion="responder" data-id="${esc(a.id)}" class="mt-3 w-full bg-teal-700 hover:bg-teal-800 text-white font-bold py-3 rounded-2xl shadow">🥾 Abrir recorrido</button>`;
  else boton = `<button disabled class="mt-3 w-full bg-slate-200 text-slate-500 font-semibold py-3 rounded-2xl">${v === 'pronto' ? 'Todavía no disponible' : 'El plazo terminó'}</button>`;
  let res = '';
  if (r && r.estado === 'evaluada') res = bloqueEvaluacion(a, r);
  else if (r && r.origen !== 'local') res = '<div class="mt-2 text-xs text-slate-500">Su profesor revisará su recorrido. Cuando termine, pinche «🔄 Actualizar» para ver su evaluación.</div>';
  return `<article class="bg-white/95 rounded-3xl shadow overflow-hidden flex"><div class="w-2 bg-${T.c}-500"></div>
    <div class="p-4 flex-1 min-w-0">
      <div class="flex items-start gap-3"><div class="h-11 w-11 shrink-0 rounded-2xl bg-${T.c}-100 flex items-center justify-center text-2xl">${T.ic}</div>
        <div class="flex-1 min-w-0"><h3 class="font-bold leading-tight">${esc(a.titulo)}</h3><p class="text-xs text-slate-500">${T.nom}${hs.length ? ' · ' + hs.length + ' fotografía(s)' : ''} · ${esc(a.puntaje_max)} pt</p></div>${est}</div>
      ${tiempo ? `<div class="mt-2 text-xs font-semibold text-slate-600">${tiempo}</div>` : ''}
      ${rec ? `<div class="mt-2 rounded-2xl bg-emerald-50 border border-emerald-200 p-3 text-sm">🥾 <b>${fmtKm(rec.dist)}</b> · ${fmtDur(rec.dur)} · ⬆️ +${rec.sub} m · 🔥 ≈ ${rec.kcal} kcal</div>` : ''}
      ${res}${boton}</div></article>`;
}
const _tarjetaActividadRec = tarjetaActividad;
tarjetaActividad = function (a) { return esRec(a) ? tarjetaRec(a) : _tarjetaActividadRec(a); };

const _abrirResponderRec = abrirResponder;
abrirResponder = async function (id) {
  const a = (S.datos.actividades || []).find(x => x.id === id);
  if (esRec(a)) return abrirRecorrido(a);
  return _abrirResponderRec(id);
};

/* ---------- Estudiante: pestaña «Recorridos» ---------- */
function totalesRecEst() {
  const t = { n: 0, dist: 0, dur: 0, sub: 0, kcal: 0 };
  (S.datos.actividades || []).filter(esRec).forEach(a => {
    const r = respuestaDe(a), q = r ? recDe(r) : null;
    if (q) { t.n++; t.dist += q.dist || 0; t.dur += q.dur || 0; t.sub += q.sub || 0; t.kcal += q.kcal || 0; }
  });
  return t;
}
function vistaMisRec() {
  const acts = S.datos.actividades.filter(esRec), T = totalesRecEst();
  const tile = (ic, v, t, cls) => `<div class="rounded-2xl ${cls || 'bg-white/20'} p-2 text-center"><div class="text-lg">${ic}</div><div class="font-extrabold text-sm">${v}</div><div class="text-[10px] opacity-90">${t}</div></div>`;
  const cab = `<div class="rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white p-4 shadow-lg">
    <div class="font-extrabold">🥾 Mis recorridos</div>
    ${T.n ? `<div class="grid grid-cols-4 gap-2 mt-3">${tile('📏', fmtKm(T.dist), 'Distancia')}${tile('⏱️', fmtDur(T.dur), 'Tiempo')}${tile('⬆️', '+' + Math.round(T.sub) + ' m', 'Subida')}${tile('🔥', Math.round(T.kcal), 'kcal aprox.', 'bg-orange-500')}</div>
      <div class="text-[11px] opacity-90 mt-2">${T.n} recorrido(s) terminado(s). Las calorías son un cálculo aproximado.</div>`
      : '<div class="text-sm opacity-90 mt-1">Aún no ha terminado ningún recorrido. Cuando lo haga, aquí verá su camino, las fotografías y las calorías.</div>'}</div>`;
  const tarjetas = acts.map(a => {
    const r = respuestaDe(a), rec = r ? recDe(r) : null, v = estadoVentana(a);
    if (!rec) return `<article class="bg-white/95 rounded-3xl shadow p-4 flex items-center gap-3"><div class="text-3xl">🥾</div>
      <div class="flex-1 min-w-0"><div class="font-bold leading-tight">${esc(a.titulo)}</div><div class="text-xs text-slate-500">Aún no lo realiza</div></div>
      ${v === 'abierta' ? `<button data-accion="responder" data-id="${esc(a.id)}" class="shrink-0 bg-teal-700 text-white font-bold px-4 py-2 rounded-xl text-sm">Abrir</button>` : chip(v === 'pronto' ? 'Aún no abre' : 'Cerrada', v === 'pronto' ? 'slate' : 'rose')}</article>`;
    const loc = r.origen === 'local', fot = loc ? (r.fotosB64 || {}) : jsonSeguro(r.fotos, {});
    const mini = hitosDe(a).filter(h => fot[h.id]).map(h => `<figure class="w-28 shrink-0">
      ${loc ? `<img src="${fot[h.id]}" class="h-24 w-28 object-cover rounded-xl">` : `<img data-archivo="${esc(fot[h.id])}" data-zoom="1" class="h-24 w-28 object-cover rounded-xl bg-slate-100">`}
      <figcaption class="text-[10px] text-slate-600 mt-0.5 leading-tight">${rec.hitos[h.id] ? rec.hitos[h.id].n + '. ' : ''}${esc(h.enunciado)}</figcaption></figure>`).join('');
    return `<article class="bg-white/95 rounded-3xl shadow p-4 space-y-3">
      <div class="flex items-start gap-2"><div class="flex-1 min-w-0"><div class="font-bold leading-tight">${esc(a.titulo)}</div><div class="text-xs text-slate-500">${fechaCorta(rec.ini)}</div></div>
        ${loc ? chip('Por enviar', 'amber') : r.estado === 'evaluada' ? chip('Evaluada', 'emerald') : chip('Enviada', 'sky')}</div>
      <div class="rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white p-3 flex items-center gap-3"><div class="text-3xl">🔥</div>
        <div><div class="text-[11px] opacity-90">Calorías gastadas (aproximado)</div><div class="text-2xl font-extrabold leading-tight">${rec.kcal} kcal</div></div></div>
      <div class="grid grid-cols-4 gap-2 text-center text-xs">${[['📏', fmtKm(rec.dist), 'Distancia'], ['⏱️', fmtDur(rec.dur), 'Duración'], ['⬆️', '+' + rec.sub + ' m', 'Subida'], ['⬇️', '−' + rec.baj + ' m', 'Bajada']]
        .map(([ic, val, t]) => `<div class="rounded-xl bg-slate-50 p-2"><div>${ic}</div><div class="font-bold">${val}</div><div class="text-[10px] text-slate-500">${t}</div></div>`).join('')}</div>
      <div><div class="text-xs font-semibold text-slate-600 mb-1">🗺️ Camino recorrido</div>${svgRutaRec(rec) || '<p class="text-xs text-slate-400">Sin trazado.</p>'}</div>
      <div><div class="text-xs font-semibold text-slate-600 mb-1">⛰️ Perfil de alturas</div>${svgPerfil(rec)}</div>
      ${mini ? `<div><div class="text-xs font-semibold text-slate-600 mb-1">📷 Fotografías en los puntos</div><div class="flex gap-2 overflow-x-auto pb-1">${mini}</div></div>` : ''}
      <button data-accion="rec-ver" data-id="${esc(a.id)}" class="w-full bg-teal-700 text-white font-bold py-2.5 rounded-2xl">🗺️ Ver mapa interactivo y fotografías</button></article>`;
  }).join('');
  return cab + (tarjetas || '<div class="text-center text-slate-500 py-8 bg-white/80 rounded-2xl">No hay recorridos creados todavía.</div>');
}
// La pestaña solo aparece cuando hay al menos un recorrido creado
renderTabsEst = function () {
  const acts = S.datos.actividades, n = acts.filter(a => respuestaDe(a)).length;
  const cnt = { pendientes: acts.length - n, realizadas: n, todas: acts.length };
  const tabs = TABS_EST.slice();
  if (acts.some(esRec)) tabs.splice(3, 0, ['recorridos', '🥾', 'Recorridos']);
  else if (S.tab === 'recorridos') S.tab = 'pendientes';
  const nav = $('#est-tabs');
  nav.className = 'grid ' + (tabs.length > 4 ? 'grid-cols-5' : 'grid-cols-4') + ' gap-1 bg-white/95 rounded-2xl shadow p-1 text-xs font-semibold';
  nav.innerHTML = tabs.map(([k, ic, t]) =>
    `<button data-accion="tab-est" data-tab="${k}" class="py-2 rounded-xl flex flex-col items-center leading-tight ${S.tab === k ? 'tab-activa' : ''}">
      <span class="text-lg">${ic}</span><span>${t}${cnt[k] !== undefined ? ' (' + cnt[k] + ')' : ''}</span></button>`).join('');
};
const _renderContenidoEstRec = renderContenidoEst;
renderContenidoEst = function () {
  const hayRec = (S.datos.actividades || []).some(esRec);
  if (S.tab !== 'recorridos' || !hayRec) return _renderContenidoEstRec();
  renderTabsEst(); detenerMapa();
  $('#est-contenido').innerHTML = vistaMisRec();
  pintarImagenes($('#est-contenido'));
};

/* ---------- Estudiante: barra de avance (verde fluorescente = realizadas, rojo = pendientes) ---------- */
function barraAvance(acts) {
  const n = acts.length;
  if (!n) return '';
  const h = acts.filter(a => respuestaDe(a)).length;
  const seg = acts.map(a => respuestaDe(a)
    ? '<div class="h-4 flex-1 rounded-md" style="background:#39ff14;box-shadow:0 0 8px #39ff14"></div>'
    : '<div class="h-4 flex-1 rounded-md" style="background:#ef4444"></div>').join('');
  return `<div><div class="flex gap-1">${seg}</div>
    <div class="flex justify-between text-[11px] mt-1.5 font-semibold"><span><span style="color:#39ff14">●</span> Realizadas: ${h}</span><span><span style="color:#ff6b6b">●</span> Pendientes: ${n - h}</span></div></div>`;
}
const _renderEstudianteRec = renderEstudiante;
renderEstudiante = function () {
  _renderEstudianteRec();
  const barra = $('#est-info .rounded-full.overflow-hidden');
  if (barra) barra.outerHTML = barraAvance(S.datos.actividades || []);
  const t = totalesRecEst();
  const c = $('#est-info > div');
  if (t.n && c) c.insertAdjacentHTML('beforeend', `<div class="mt-3 text-xs bg-white/20 rounded-xl px-3 py-2">🥾 Sus recorridos: <b>${fmtKm(t.dist)}</b> · ⬆️ +${Math.round(t.sub)} m · 🔥 ≈ ${Math.round(t.kcal)} kcal</div>`);
};

/* =========================================================
   PANEL DOCENTE
   ========================================================= */
if (typeof accionDocente === 'function') {
  const INPR = 'w-full border rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300';
  const DOCENTE_NOMBRE = 'Prof. Cristian Yáñez Reyes';   // nombre que firma los informes
  const COLEGIO = 'Colegio Marina de Chile';

  // Totales de recorridos por estudiante
  const _calcularEstudiantesRec = calcularEstudiantes;
  calcularEstudiantes = function () {
    const r = _calcularEstudiantesRec();
    r.forEach(e => {
      const t = { n: 0, dist: 0, mov: 0, dur: 0, sub: 0, baj: 0, kcal: 0 };
      e.rs.forEach(x => {
        const a = actPor(x.actividad_id);
        const q = esRec(a) ? recDe(x) : null;
        if (q) { t.n++; t.dist += q.dist || 0; t.mov += q.mov || 0; t.dur += q.dur || 0; t.sub += q.sub || 0; t.baj += q.baj || 0; t.kcal += q.kcal || 0; }
      });
      e.rec = t;
    });
    return r;
  };
  const totalesRec = est => est.reduce((t, e) => ({ n: t.n + e.rec.n, dist: t.dist + e.rec.dist, mov: t.mov + e.rec.mov, dur: t.dur + e.rec.dur, sub: t.sub + e.rec.sub, baj: t.baj + e.rec.baj, kcal: t.kcal + e.rec.kcal }), { n: 0, dist: 0, mov: 0, dur: 0, sub: 0, baj: 0, kcal: 0 });

  /* --- Formulario del recorrido --- */
  function formRecorrido(id) {
    const a = id ? actPor(id) : null;
    const mk = a ? (a.partes || []).find(p => p.tipo === 'recorrido') : null;
    const hs = a ? hitosDe(a) : [];
    const hitos = hs.length ? hs.map(h => h.enunciado) : [''];
    modal(`<form id="f-rec" class="space-y-3 pt-2">
      <h3 class="text-lg font-extrabold pr-6">🥾 ${id ? 'Editar' : 'Nuevo'} recorrido</h3>
      <p class="text-xs text-slate-500">Los estudiantes inician y terminan el recorrido desde su teléfono. La aplicación registra kilómetros, ruta con alturas, calorías aproximadas y las fotografías que usted pida.</p>
      <input name="titulo" required class="${INPR}" placeholder="Título (ej: Subida al mirador)" value="${esc(a ? a.titulo : '')}">
      <textarea name="enunciado" rows="3" class="${INPR}" placeholder="Instrucciones para los estudiantes (dónde parten, hasta dónde llegan, qué deben observar)">${esc(a ? a.enunciado : '')}</textarea>
      <label class="block text-sm font-semibold">📍 Lugar de destino
        <select name="punto_id" class="${INPR} mt-1"><option value="">(ninguno)</option>${S.panel.puntos.map(p => `<option value="${esc(p.id)}" ${a && a.punto_id === p.id ? 'selected' : ''}>${esc(p.nombre)}</option>`).join('')}</select></label>
      <div class="text-sm font-semibold">📷 Fotografías que deben tomar durante el recorrido</div>
      <p class="text-xs text-slate-500">Escriba cada momento en que deben fotografiar (ej: «Panorama desde el mirador»). Todos deberán tomar estas fotos para terminar. Si ya hay respuestas, no cambie el orden ni borre momentos.</p>
      <div id="fr-lista" class="space-y-2"></div>
      <button type="button" id="fr-mas" class="text-sm font-semibold text-indigo-700">+ Agregar momento de fotografía</button>
      <div class="grid grid-cols-2 gap-3">
        <label class="block text-sm">Puntos por completar el recorrido<input name="pr" type="number" step="0.5" min="0.5" value="${esc(mk ? mk.puntaje : 3)}" class="${INPR} mt-1"></label>
        <label class="block text-sm">Puntos por cada fotografía<input name="pf" type="number" step="0.5" min="0.5" value="${esc(hs[0] ? hs[0].puntaje : 1)}" class="${INPR} mt-1"></label></div>
      <p id="fr-total" class="text-sm font-semibold text-indigo-700"></p>
      <div class="flex flex-wrap gap-2">
        <button type="button" data-rapido="2" class="px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold">Abrir ahora · 2 h</button>
        <button type="button" data-rapido="4" class="px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold">4 h</button>
        <button type="button" data-rapido="dia" class="px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold">Hasta el fin del día</button></div>
      <div class="grid grid-cols-2 gap-3">
        <label class="block text-sm">Se puede comenzar desde<input name="fecha_inicio" type="datetime-local" required value="${aLocalInput(a ? a.fecha_inicio : new Date().toISOString())}" class="${INPR} mt-1"></label>
        <label class="block text-sm">Se puede comenzar hasta<input name="fecha_fin" type="datetime-local" required value="${aLocalInput(a ? a.fecha_fin : new Date(Date.now() + 3 * 3600e3).toISOString())}" class="${INPR} mt-1"></label></div>
      <p class="text-xs text-slate-500">El recorrido debe comenzar dentro de este horario; puede terminar después.</p>
      <button class="w-full bg-teal-700 text-white font-bold py-3 rounded-2xl shadow">Guardar recorrido</button>
    </form>`);
    const f = $('#f-rec');
    const total = () => {
      const n = hitos.filter(s => s.trim()).length;
      $('#fr-total').textContent = 'Puntaje total: ' + ((+f.pr.value || 0) + n * (+f.pf.value || 0)) + ' pt';
    };
    const pintar = () => {
      $('#fr-lista').innerHTML = hitos.map((t, i) => `<div class="flex items-center gap-2"><span class="pin shrink-0">${i + 1}</span>
        <input data-fh="${i}" value="${esc(t)}" placeholder="Momento de fotografía ${i + 1}" class="${INPR} flex-1">
        <button type="button" data-fd="${i}" class="text-rose-500 text-xl px-1" aria-label="Quitar">×</button></div>`).join('');
      total();
    };
    pintar();
    f.addEventListener('input', ev => { if (ev.target.dataset.fh !== undefined) hitos[+ev.target.dataset.fh] = ev.target.value; total(); });
    f.addEventListener('click', ev => {
      const T = ev.target;
      if (T.id === 'fr-mas') { if (hitos.length < 12) { hitos.push(''); pintar(); } return; }
      const d = T.closest('[data-fd]');
      if (d) { hitos.splice(+d.dataset.fd, 1); pintar(); return; }
      const q = T.closest('[data-rapido]');
      if (q) {
        const ini = new Date(), fn = new Date();
        if (q.dataset.rapido === 'dia') fn.setHours(23, 59, 0, 0); else fn.setTime(ini.getTime() + Number(q.dataset.rapido) * 3600e3);
        f.fecha_inicio.value = aLocalInput(ini.toISOString()); f.fecha_fin.value = aLocalInput(fn.toISOString());
      }
    });
    f.onsubmit = async ev => {
      ev.preventDefault();
      const hl = hitos.map(s => s.trim()).filter(Boolean);
      const pr = Number(f.pr.value) || 1, pf = Number(f.pf.value) || 1;
      const ini = new Date(f.fecha_inicio.value), fin = new Date(f.fecha_fin.value);
      if (!(fin > ini)) return aviso('La hora de cierre debe ser posterior a la de apertura.', 'error');
      const base = { opciones: [], correcta: '', pauta: '', rubrica: [] };
      const partes = [Object.assign({ id: 'p1', tipo: 'recorrido', enunciado: 'Realizar el recorrido', puntaje: pr }, base)]
        .concat(hl.map((t, i) => Object.assign({ id: 'p' + (i + 2), tipo: 'foto', enunciado: t, puntaje: pf }, base)));
      cargando(true, 'Guardando…');
      try {
        await api('guardarActividad', {
          imagenB64: null,
          actividad: {
            id: id || '', titulo: f.titulo.value.trim(), tipo: 'grupo', enunciado: f.enunciado.value.trim(), opciones: [], correcta: '', partes,
            pauta: '', rubrica: [], puntaje_max: pr + hl.length * pf, fecha_inicio: ini.toISOString(), fecha_fin: fin.toISOString(),
            punto_id: f.punto_id.value, imagen_id: a ? a.imagen_id || '' : '', orden: a ? a.orden || '' : '', requiere_gps: 'si'
          }
        });
        cerrarModal(); await cargarPanel(); renderDocente(); aviso('Recorrido guardado.');
      } catch (e) { cargando(false); aviso(e.message, 'error'); }
    };
  }
  // Editar un recorrido abre este formulario; también el botón «Nuevo recorrido»
  const _accionDocenteRec = accionDocente;
  accionDocente = async function (a, b, id) {
    if (a === 'nuevo-rec') return formRecorrido();
    if (a === 'editar-act' && esRec(actPor(id))) return formRecorrido(id);
    return _accionDocenteRec(a, b, id);
  };
  const _renderActividadesRec = renderActividades;
  renderActividades = function () {
    _renderActividadesRec();
    const nueva = $('#doc-contenido [data-accion="nueva-act"]');
    if (nueva) nueva.insertAdjacentHTML('beforebegin', '<button data-accion="nuevo-rec" class="bg-emerald-600 text-white font-semibold px-4 py-2 rounded-xl shadow mr-2">+ Nuevo recorrido</button>');
    $$('#doc-contenido [data-accion="editar-act"]').forEach(b => {
      if (!esRec(actPor(b.dataset.id))) return;
      const card = b.closest('.rounded-3xl');
      if (card) card.innerHTML = card.innerHTML.replace('Ejercicio con partes', '🥾 Recorrido');
    });
  };

  /* --- Pestaña «Recorridos» del docente --- */
  if (!TABS_DOC.some(t => t[0] === 'recorridos')) TABS_DOC.splice(4, 0, ['recorridos', '🥾 Recorridos']);
  function renderRecorridosDoc() {
    const est = calcularEstudiantes(), T = totalesRec(est);
    const kpi = (t, v) => `<div class="rounded-2xl bg-white/95 shadow p-3 text-center"><div class="text-lg font-extrabold">${v}</div><div class="text-xs text-slate-500">${t}</div></div>`;
    const con = est.filter(e => e.rec.n), sin = est.filter(e => !e.rec.n);
    const tarj = con.map(e => {
      const items = e.rs.map(r => ({ r, a: actPor(r.actividad_id) })).filter(x => esRec(x.a) && recDe(x.r));
      return `<div class="bg-white/95 rounded-2xl shadow p-4 space-y-2">
        <div class="flex flex-wrap items-center gap-2"><b class="flex-1 min-w-0">${esc(e.est.nombre)} <span class="text-xs text-slate-400 font-normal">${esc(e.est.curso)}</span></b>
          <span class="text-xs bg-emerald-50 text-emerald-800 rounded-full px-2 py-1">📏 ${fmtKm(e.rec.dist)}</span>
          <span class="text-xs bg-emerald-50 text-emerald-800 rounded-full px-2 py-1">⬆️ +${Math.round(e.rec.sub)} m</span>
          <span class="text-xs bg-orange-100 text-orange-800 rounded-full px-2 py-1">🔥 ≈ ${Math.round(e.rec.kcal)} kcal</span></div>
        ${items.map(({ r, a }) => { const q = recDe(r); return `<div class="flex flex-wrap items-center gap-2 border-t pt-2 text-sm"><span class="flex-1 min-w-0">${esc(a.titulo)} · ${fmtKm(q.dist)} · ${fmtDur(q.dur)} · ≈ ${q.kcal} kcal</span>
          <button data-accion="rec-ver" data-id="${esc(r.id)}" data-doc="1" class="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-semibold">🗺️ Ver camino, alturas y fotos</button></div>`; }).join('')}</div>`;
    }).join('');
    $('#doc-contenido').innerHTML = `<div class="grid grid-cols-2 sm:grid-cols-4 gap-3">${kpi('Recorridos', T.n)}${kpi('Distancia total', fmtKm(T.dist))}${kpi('Subida acumulada', '+' + Math.round(T.sub) + ' m')}${kpi('Calorías (aprox.)', Math.round(T.kcal))}</div>
      <div class="space-y-3 mt-4">${tarj || '<div class="bg-white/90 rounded-2xl p-8 text-center text-slate-500">Aún no hay recorridos terminados. Cree uno en «Actividades → + Nuevo recorrido».</div>'}</div>
      ${sin.length ? `<details class="mt-3 text-sm bg-amber-50 rounded-xl p-3"><summary class="cursor-pointer font-semibold text-amber-800">Sin recorridos (${sin.length})</summary>
        <ul class="mt-2 list-disc pl-5 text-slate-700">${sin.map(e => `<li>${esc(e.est.nombre)} <span class="text-xs text-slate-400">${esc(e.est.curso)}</span></li>`).join('')}</ul></details>` : ''}
      <p class="text-xs text-slate-400 mt-3">Las calorías son un cálculo aproximado. Estos totales también quedan en los informes y en el CSV.</p>`;
  }
  renderDocente = function () {
    const porEvaluar = S.panel.respuestas.filter(r => r.estado !== 'evaluada').length;
    $('#doc-tabs').innerHTML = TABS_DOC.map(([k, t]) =>
      `<button data-accion="tab-doc" data-tab="${k}" class="px-3 py-2 rounded-xl whitespace-nowrap ${S.tabDoc === k ? 'tab-activa' : ''}">${t}${k === 'respuestas' && porEvaluar ? ` <span class="ml-1 text-xs bg-amber-400 text-slate-900 rounded-full px-1.5">${porEvaluar}</span>` : ''}</button>`).join('');
    detenerMapa();
    const f = { resumen: renderResumen, actividades: renderActividades, puntos: renderPuntos, respuestas: renderRespuestas, recorridos: renderRecorridosDoc, ubicaciones: renderUbicaciones, reportes: renderReportes, ajustes: renderAjustes }[S.tabDoc];
    f();
  };

  /* --- Respuestas de recorridos --- */
  function tarjetaRecDoc(r, a) {
    const rec = recDe(r), hs = hitosDe(a), fot = jsonSeguro(r.fotos, {});
    const nf = hs.filter(h => fot[h.id]).length;
    const p0 = r.estado === 'evaluada' ? r.puntaje_final : (r.puntaje_final !== '' && r.puntaje_final != null ? r.puntaje_final : '');
    const lejos = rec ? hs.filter(h => rec.hitos[h.id] && rec.hitos[h.id].dp != null && rec.hitos[h.id].dp > 100).length : 0;
    return `<article id="ev-${esc(r.id)}" class="bg-white/95 rounded-2xl shadow p-4 space-y-2">
      <div class="flex justify-between gap-2 items-start"><div><b>${esc(nombreDe(r.rut))}</b><div class="text-xs text-slate-400">${fechaCorta(r.timestamp_cliente || r.timestamp_servidor)}</div></div>
        ${r.estado === 'evaluada' ? chip('Evaluada', 'emerald') : chip('Por evaluar', 'amber')}</div>
      ${rec ? `<div class="text-sm bg-emerald-50 rounded-xl p-2">🥾 <b>${fmtKm(rec.dist)}</b> · ${fmtDur(rec.dur)} · ⬆️ +${rec.sub} m · ⬇️ −${rec.baj} m · 🔥 ≈ ${rec.kcal} kcal</div>`
        : '<p class="text-xs text-rose-600">Esta respuesta no trae datos del recorrido.</p>'}
      <p class="text-xs text-slate-600">📷 Fotografías: <b>${nf} de ${hs.length}</b>${lejos ? ` · ${lejos} tomada(s) a más de 100 m del lugar` : ''}</p>
      ${rec && rec.amb0 ? `<p class="text-xs text-slate-600">🌍 Al iniciar: ${fmtClima(rec.amb0)}</p>` : ''}
      ${rec ? `<button data-accion="rec-ver" data-id="${esc(r.id)}" data-doc="1" class="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 text-sm font-semibold">🗺️ Ver recorrido, alturas y fotos</button>` : ''}
      ${enlacesUbicacion(r)}
      <div class="flex flex-wrap gap-2 items-start">
        <input data-campo="puntaje" type="number" step="0.1" min="0" max="${esc(a.puntaje_max)}" value="${esc(p0)}" placeholder="Pts" class="border rounded-xl px-3 py-2 w-24">
        <textarea data-campo="retro" rows="2" placeholder="Comentario breve para el estudiante" class="border rounded-xl px-3 py-2 flex-1 min-w-[12rem]">${esc(r.retro_docente || '')}</textarea></div>
      <div class="flex flex-wrap gap-2">
        <button data-accion="rec-aprobar" data-id="${esc(r.id)}" class="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold">✔ Puntaje completo (${esc(a.puntaje_max)})</button>
        <button data-accion="guardar-eval" data-id="${esc(r.id)}" class="px-3 py-1.5 rounded-xl bg-slate-800 text-white text-sm font-semibold">Guardar mi evaluación</button></div></article>`;
  }
  const _tarjetaRespRec = tarjetaResp;
  tarjetaResp = function (r, a) { return esRec(a) ? tarjetaRecDoc(r, a) : _tarjetaRespRec(r, a); };
  const _renderRespuestasRec = renderRespuestas;
  renderRespuestas = function () {
    _renderRespuestasRec();
    const b = $('#doc-contenido [data-accion="ia-todas"]');
    if (b) b.insertAdjacentHTML('beforebegin', '<button data-accion="rec-aprobar-todos"
