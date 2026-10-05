'use strict';
/* =========================================================
   SALIDA A TERRENO – Complementos (Parte 1)
   Carta editable · Presentación del lugar (inicio) · Ficha de cada lugar
   Condiciones del lugar · Distancia por camino · Nota final ajustable
   Se carga después de app.js (y de app-docente.js en el panel docente)
   ========================================================= */

const INP = 'w-full border rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300';

/* ---------- Distancias ---------- */
function distM(a, b) {
  const R = 6371000, r = x => x * Math.PI / 180;
  const dLa = r(b[0] - a[0]), dLo = r(b[1] - a[1]);
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(r(a[0])) * Math.cos(r(b[0])) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const fmtDist = m => m < 1000 ? Math.round(m) + ' m' : (m / 1000).toFixed(1).replace('.', ',') + ' km';

// Decodifica el trazado de la ruta que entrega Google Maps
function decodePoli(s) {
  let i = 0, la = 0, lo = 0;
  const out = [];
  while (i < s.length) {
    let b, sh = 0, r = 0;
    do { b = s.charCodeAt(i++) - 63; r |= (b & 31) << sh; sh += 5; } while (b >= 32);
    la += (r & 1) ? ~(r >> 1) : (r >> 1);
    sh = 0; r = 0;
    do { b = s.charCodeAt(i++) - 63; r |= (b & 31) << sh; sh += 5; } while (b >= 32);
    lo += (r & 1) ? ~(r >> 1) : (r >> 1);
    out.push([la / 1e5, lo / 1e5]);
  }
  return out;
}

// Distancia por camino (Google Maps, desde el servidor) desde un origen hasta varios puntos
async function rutasHasta(origen, puntos) {
  if (!navigator.onLine || !puntos.length) return {};
  try {
    const d = await api('rutasCaminando', {
      origen: { lat: origen[0], lng: origen[1] },
      destinos: puntos.map(p => ({ id: p.id, lat: p.lat, lng: p.lng }))
    });
    const m = {};
    (d.rutas || []).forEach(r => { m[r.id] = r; });
    return m;
  } catch (_) { return {}; }
}
function textoRuta(r, recta) {
  if (r && r.m != null) return `🚶 <b>${fmtDist(r.m)}</b> por camino (≈ ${Math.max(1, Math.round(r.s / 60))} min ${esc(r.modo)}, según Google Maps)`;
  return `📏 <b>${fmtDist(recta)}</b> en línea recta (no se pudo calcular el camino)`;
}

/* ---------- Condiciones del lugar ---------- */
// Temperatura, humedad, presión y altura del terreno para unas coordenadas (Open-Meteo, modelo meteorológico)
async function clima(lat, lng, ms) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), ms || 6000);
  try {
    const r = await fetch('https://api.open-meteo.com/v1/forecast?latitude=' + lat.toFixed(4) + '&longitude=' + lng.toFixed(4) +
      '&current=temperature_2m,relative_humidity_2m,surface_pressure,pressure_msl&timezone=auto', { signal: ctl.signal });
    if (!r.ok) return null;
    const j = await r.json();
    if (!j || !j.current) return null;
    const c = j.current;
    return { t: c.temperature_2m, h: c.relative_humidity_2m, p: c.surface_pressure, alt: j.elevation, hora: Date.now() };
  } catch (_) { return null; } finally { clearTimeout(t); }
}
const fmtClima = c => `🌡️ ${(Math.round(c.t * 10) / 10).toString().replace('.', ',')} °C · 💧 ${Math.round(c.h)} % · 🧭 ${Math.round(c.p)} hPa · ⛰️ ${Math.round(c.alt)} m`;
function htmlClima(c) {
  const celda = (ic, v, t) => `<div class="rounded-xl bg-slate-50 p-2 text-center"><div class="text-lg">${ic}</div><div class="font-bold text-sm">${v}</div><div class="text-[11px] text-slate-500">${t}</div></div>`;
  return `<div class="grid grid-cols-4 gap-2">${celda('🌡️', (Math.round(c.t * 10) / 10).toString().replace('.', ',') + ' °C', 'Temperatura')}${celda('💧', Math.round(c.h) + ' %', 'Humedad')}${celda('🧭', Math.round(c.p) + ' hPa', 'Presión')}${celda('⛰️', Math.round(c.alt) + ' m', 'Altura')}</div>`;
}

// Cada vez que se obtiene la ubicación, se agregan las condiciones del lugar (si hay internet)
const _obtenerPosicion = obtenerPosicion;
obtenerPosicion = async function () {
  const p = await _obtenerPosicion();
  if (p && navigator.onLine) {
    p.ambiente = await clima(p.lat, p.lng, 4000);
    if (p.ambiente) cachePut('amb:' + p.lat + ',' + p.lng, p.ambiente).catch(() => {});
  }
  return p;
};
// Al enviar una respuesta se adjuntan las condiciones del momento en que se tomó la ubicación
const _api = api;
api = async function (accion, datos, op) {
  if (accion === 'enviarRespuesta' && datos && !datos.ambiente && datos.lat != null) {
    const a = await cacheGet('amb:' + datos.lat + ',' + datos.lng).catch(() => null);
    if (a) datos.ambiente = a;
  }
  return _api(accion, datos, op);
};

/* ---------- Carta de compromiso (vista del estudiante) ---------- */
const _iniciarFirma = iniciarFirma;
iniciarFirma = function () {
  _iniciarFirma();
  const c = S.datos && S.datos.carta;
  if (!c) return;
  const sec = $('#pantalla-carta');
  const h2 = $('h2', sec), p = $('p', sec), ol = $('ol', sec), sp = $('label span', sec);
  if (h2) h2.textContent = c.titulo;
  if (p) p.textContent = c.intro;
  if (ol) ol.innerHTML = (c.items || []).map(t => `<li style="white-space:pre-line">${esc(t)}</li>`).join('');
  if (sp) sp.textContent = c.aceptacion;
};

/* ---------- Ficha de cada lugar (vista del estudiante) ---------- */
function fichaTiene(p) {
  const f = jsonSeguro(p.ficha, null);
  return !!(f && ((f.historia || '').trim() || (f.elementos || []).length));
}
function tarjetaElemento(e) {
  return `<div class="rounded-2xl bg-white border overflow-hidden">
    ${e.imagen_id ? `<img data-archivo="${esc(e.imagen_id)}" data-zoom="1" class="w-full h-36 object-cover bg-slate-100" alt="${esc(e.titulo)}">` : ''}
    <div class="p-2"><div class="font-semibold text-sm">${esc(e.titulo)}</div>
    ${e.texto ? `<div class="text-xs text-slate-600 whitespace-pre-line">${esc(e.texto)}</div>` : ''}</div></div>`;
}
function abrirFicha(id) {
  const p = (S.datos.puntos || []).find(x => x.id === id);
  if (!p) return;
  const f = jsonSeguro(p.ficha, {}) || {};
  const els = f.elementos || [];
  const SEC = [['historia', '🏛️ Historia y patrimonio'], ['flora', '🌿 Flora'], ['fauna', '🦅 Fauna'], ['otro', '📌 Otros elementos']];
  const secciones = SEC.map(([k, t]) => {
    const l = els.filter(e => e.tipo === k);
    return l.length ? `<h4 class="font-bold mt-3">${t}</h4><div class="grid sm:grid-cols-2 gap-2 mt-1">${l.map(tarjetaElemento).join('')}</div>` : '';
  }).join('');
  modal(`<div class="space-y-2 pt-2">
    <div class="flex items-center gap-3 pr-6"><span class="pin shrink-0">${puntoNum(p.id)}</span><h3 class="text-lg font-extrabold leading-tight">${esc(p.nombre)}</h3></div>
    ${f.historia ? `<div class="bg-slate-50 rounded-2xl p-3 text-sm whitespace-pre-line">${esc(f.historia)}</div>` : ''}
    ${secciones}
    <p class="text-xs text-slate-400 pt-2">Use estas fichas para reconocer los elementos cuando esté en el lugar.</p></div>`);
  pintarImagenes($('#modal-cuerpo'));
}

// Encabezado de cada lugar: con el botón «Conocer el lugar»
cabeceraPunto = function (g) {
  const todas = S.datos.actividades.filter(a => a.punto_id === g.punto.id);
  const hechas = todas.filter(a => respuestaDe(a)).length;
  const listo = todas.length > 0 && hechas === todas.length;
  return `<div class="rounded-2xl bg-white shadow px-3 py-2.5 border-l-4 ${listo ? 'border-emerald-500' : 'border-teal-600'}">
    <div class="flex items-center gap-3">
      <div class="pin shrink-0">${g.n}</div>
      <div class="flex-1 min-w-0">
        <div class="font-bold leading-tight">${esc(g.punto.nombre)}${listo ? ' ✅' : ''}</div>
        <div class="text-xs text-slate-500">${hechas} de ${todas.length} resueltas</div>
        ${g.punto.descripcion ? `<div class="text-xs text-slate-500 mt-0.5">${esc(g.punto.descripcion)}</div>` : ''}
      </div>
    </div>
    <div class="flex flex-wrap gap-2 mt-2">
      ${fichaTiene(g.punto) ? `<button data-accion="ver-ficha" data-punto="${esc(g.punto.id)}" class="text-xs bg-emerald-50 text-emerald-700 font-semibold rounded-full px-3 py-1.5">📖 Conocer el lugar</button>` : ''}
      <button data-accion="ver-punto" data-punto="${esc(g.punto.id)}" class="text-xs bg-teal-50 text-teal-700 font-semibold rounded-full px-3 py-1.5">🗺️ Ver en el mapa</button>
    </div></div>`;
};

/* ---------- Presentación del lugar (inicio de la aplicación) ---------- */
const INI_IC = { historia: '🏛️', flora: '🌿', fauna: '🦅', relieve: '⛰️', poblacion: '👥', otra: '📌' };
const INI_DEF = { historia: 'Historia', flora: 'Flora', fauna: 'Fauna', relieve: 'Relieve', poblacion: 'Población', otra: 'Información' };
const INI_MODOS = [
  ['siempre', 'Siempre visible', 'Se abre sola cada vez que ingresan a la aplicación y queda un botón 📖 flotante en todas las pantallas.'],
  ['primera', 'Solo la primera vez', 'Se abre sola la primera vez (y cada vez que usted la modifique). Después queda la tarjeta en el inicio.'],
  ['boton', 'Solo con el botón', 'Nunca se abre sola. Los estudiantes la ven con la tarjeta del inicio.'],
  ['oculta', 'Oculta', 'Los estudiantes no la ven (por ejemplo, mientras la prepara).']
];

function seccionTiene(s) {
  const p = s.poblacion || {};
  return !!((s.texto || '').trim() || (s.imagenes || []).length || p.total || p.actividades);
}
function inicioTiene(i) {
  return !!i && !!(i.portada || (i.intro || '').trim() || (i.secciones || []).some(seccionTiene));
}
function seccionHTML(s) {
  const p = s.poblacion || {};
  return `<section class="rounded-2xl border border-slate-200 p-3 space-y-2">
    <h4 class="font-bold">${INI_IC[s.tipo] || '📌'} ${esc(s.titulo || INI_DEF[s.tipo] || 'Información')}</h4>
    ${s.tipo === 'poblacion' && (p.total || p.actividades) ? `<div class="rounded-xl bg-emerald-50 p-2 text-sm">
      ${p.total ? `<div>👥 <b>Total de habitantes:</b> ${esc(p.total)}</div>` : ''}
      ${p.actividades ? `<div class="mt-1"><b>Actividades:</b> <span class="whitespace-pre-line">${esc(p.actividades)}</span></div>` : ''}</div>` : ''}
    ${s.texto ? `<p class="text-sm whitespace-pre-line">${esc(s.texto)}</p>` : ''}
    ${(s.imagenes || []).length ? `<div class="grid grid-cols-2 gap-2">${s.imagenes.map(im => `<figure>
      <img data-archivo="${esc(im.id)}" data-zoom="1" class="w-full h-32 object-cover rounded-xl bg-slate-100" alt="${esc(im.pie || s.titulo || '')}">
      ${im.pie ? `<figcaption class="text-[11px] text-slate-500 mt-0.5">${esc(im.pie)}</figcaption>` : ''}</figure>`).join('')}</div>` : ''}
  </section>`;
}
function abrirInicio() {
  const ini = S.datos && S.datos.inicio;
  if (!inicioTiene(ini)) return;
  modal(`<div class="space-y-3 pt-2">
    ${ini.portada ? `<img data-archivo="${esc(ini.portada)}" data-zoom="1" class="w-full max-h-72 object-cover rounded-2xl bg-slate-100" alt="Portada">` : ''}
    <h3 class="text-xl font-extrabold pr-6 leading-tight">📖 ${esc(ini.titulo || 'Conozca el lugar de la salida')}</h3>
    ${ini.intro ? `<div class="bg-slate-50 rounded-2xl p-3 text-sm whitespace-pre-line">${esc(ini.intro)}</div>` : ''}
    ${(ini.secciones || []).filter(seccionTiene).map(seccionHTML).join('')}
    <p class="text-xs text-slate-400">Toque una imagen para verla más grande.</p></div>`);
  pintarImagenes($('#modal-cuerpo'));
}
function tarjetaInicio(ini) {
  return `<div class="mt-4 rounded-3xl bg-white shadow overflow-hidden">
    ${ini.portada ? `<img data-archivo="${esc(ini.portada)}" data-zoom="1" class="w-full max-h-64 object-cover bg-slate-100" alt="Portada">` : ''}
    <div class="p-4"><div class="font-extrabold">📖 ${esc(ini.titulo || 'Conozca el lugar de la salida')}</div>
      ${ini.intro ? `<p class="text-sm text-slate-600 whitespace-pre-line mt-1 line-clamp-3">${esc(ini.intro)}</p>` : ''}
      <button data-accion="ver-inicio" class="mt-3 w-full bg-teal-700 hover:bg-teal-800 text-white font-bold py-2.5 rounded-2xl">📖 Ver información del lugar</button></div></div>`;
}
// Según lo que decida el docente: cada vez que ingresan, solo la primera vez, o solo con el botón
function autoAbrirInicio(ini) {
  try {
    const modo = ini.modo || 'primera';
    if (modo === 'boton' || modo === 'oculta') return;
    if (!$('#modal').classList.contains('hidden') || $('#pantalla-estudiante').classList.contains('hidden')) return;
    if (modo === 'siempre') {
      const k = 'inicio_sesion_' + S.usuario.key;
      if (sessionStorage.getItem(k)) return;   // una vez cada vez que abren la aplicación
      sessionStorage.setItem(k, '1');
    } else {
      const k = 'inicio_visto_' + S.usuario.key;
      if (localStorage.getItem(k) === String(ini.act)) return;
      localStorage.setItem(k, String(ini.act));
    }
    abrirInicio();
  } catch (_) { /* si no se puede recordar, simplemente no se abre sola */ }
}
const _renderEstudianteIni = renderEstudiante;
renderEstudiante = function () {
  _renderEstudianteIni();
  const ini = S.datos && S.datos.inicio;
  let fb = $('#btn-inicio-flot');
  if (!inicioTiene(ini)) { if (fb) fb.remove(); return; }
  $('#est-info').insertAdjacentHTML('beforeend', tarjetaInicio(ini));
  pintarImagenes($('#est-info'));
  // Modo «Siempre visible»: botón flotante 📖 en todas las pantallas del estudiante
  if ((ini.modo || 'primera') === 'siempre') {
    if (!fb) {
      fb = document.createElement('button');
      fb.id = 'btn-inicio-flot'; fb.dataset.accion = 'ver-inicio'; fb.textContent = '📖';
      fb.setAttribute('aria-label', 'Información del lugar');
      fb.className = 'fixed bottom-5 left-4 z-30 h-12 w-12 rounded-full bg-teal-700 text-white text-2xl shadow-lg flex items-center justify-center';
      $('#pantalla-estudiante').appendChild(fb);
    }
  } else if (fb) fb.remove();
  autoAbrirInicio(ini);
};

// Ampliar una imagen al tocarla
document.addEventListener('click', e => {
  const im = e.target.closest('img[data-zoom]');
  if (!im || !im.src) return;
  let lb = $('#lightbox');
  if (!lb) {
    lb = document.createElement('div');
    lb.id = 'lightbox';
    lb.className = 'fixed inset-0 z-[70] bg-black/90 flex items-center justify-center p-3';
    lb.innerHTML = '<img class="max-w-full max-h-full rounded-xl" alt="Imagen ampliada">';
    lb.onclick = () => lb.classList.add('hidden');
    document.body.appendChild(lb);
  }
  $('img', lb).src = im.src;
  lb.classList.remove('hidden');
});

// Las imágenes (presentación y fichas) también se guardan en el teléfono para verlas sin internet
const _precargarImagenes = precargarImagenes;
precargarImagenes = function () {
  _precargarImagenes();
  const ids = [];
  (S.datos.puntos || []).forEach(p => ((jsonSeguro(p.ficha, {}) || {}).elementos || []).forEach(e => { if (e.imagen_id) ids.push(e.imagen_id); }));
  const ini = S.datos.inicio;
  if (ini) {
    if (ini.portada) ids.push(ini.portada);
    (ini.secciones || []).forEach(s => (s.imagenes || []).forEach(im => ids.push(im.id)));
  }
  (async () => { for (const id of ids) await dataUrlArchivo(id).catch(() => {}); })();
};

/* ---------- Mapa del estudiante: condiciones y distancias por camino ---------- */
async function actualizarClimaCard() {
  const el = $('#clima-card');
  if (!el) return;
  const boton = '<button data-accion="clima-act" class="text-xs underline text-teal-700 font-semibold">🔄 Actualizar</button>';
  el.innerHTML = '<div class="text-slate-500">Buscando su ubicación y las condiciones del lugar donde está…</div>';
  const p = await obtenerPosicion();
  const el2 = $('#clima-card');
  if (!el2) return;
  if (!p) { el2.innerHTML = `<div class="text-slate-600">No pudimos obtener su ubicación. Active el GPS y permita el acceso. ${boton}</div>`; return; }
  S.pos = [p.lat, p.lng];
  const pts = S.datos.puntos || [];
  const dist = pts.map((q, i) => ({ q, n: i + 1, d: distM(S.pos, [q.lat, q.lng]) })).sort((x, y) => x.d - y.d);
  const chipD = (x, r) => `<span class="text-xs bg-teal-50 text-teal-800 rounded-full px-2 py-1">${x.n}. ${esc(x.q.nombre)}: ` +
    (r && r.m != null ? `<b>${fmtDist(r.m)}</b> 🚶` : `<b>${fmtDist(x.d)}</b> (recta)`) + '</span>';
  el2.innerHTML = `<div class="flex items-center justify-between"><b>Donde usted está ahora</b>${boton}</div>` +
    (p.ambiente ? htmlClima(p.ambiente) + '<p class="text-[11px] text-slate-400">Datos del modelo meteorológico Open-Meteo para su ubicación; no los mide su teléfono. La altura es la del terreno.</p>'
      : '<p class="text-slate-500 text-xs">No se pudieron obtener las condiciones del tiempo (se necesita internet).</p>') +
    (dist.length ? `<div class="pt-1"><div class="text-xs font-semibold text-slate-600">Distancia a cada lugar:</div>
      <div id="dist-chips" class="flex flex-wrap gap-1 mt-1">${dist.map(x => chipD(x, null)).join('')}</div>
      <p id="dist-nota" class="text-[11px] text-slate-400">Calculando el camino real con Google Maps…</p></div>` : '');
  if (!dist.length) return;
  const m = await rutasHasta(S.pos, dist.slice(0, 8).map(x => x.q));
  const cont = $('#dist-chips');
  if (!cont) return;
  cont.innerHTML = dist.map(x => chipD(x, m[x.q.id])).join('');
  const nota = $('#dist-nota');
  if (nota) nota.textContent = Object.keys(m).length
    ? '🚶 = distancia por camino (Google Maps). «recta» = línea recta, cuando no se pudo calcular el camino.'
    : 'No se pudo calcular el camino (se necesita internet); se muestra la distancia en línea recta.';
}

renderMapaEst = function () {
  $('#est-contenido').innerHTML = `<div id="clima-card" class="rounded-2xl bg-white shadow p-3 text-sm space-y-2"></div>
    <div id="mapa" class="h-[56vh] rounded-3xl overflow-hidden border shadow" style="isolation:isolate"></div>
    <button data-accion="centrar" class="w-full bg-white border font-semibold py-2.5 rounded-2xl">📍 Centrar en mi posición</button>
    <p id="gps-estado" class="text-xs text-slate-500 text-center">Buscando su ubicación…</p>`;
  const foco = S.foco; S.foco = null;
  crearMapa('mapa', S.datos.puntos, {
    seguir: true, foco,
    popup: p => {
      const as = S.datos.actividades.filter(x => x.punto_id === p.id).map(x => '• ' + esc(x.titulo)).join('<br>');
      return `<b>${esc(p.nombre)}</b><br>${esc(p.descripcion || '')}<br><span data-dist="${esc(p.id)}" style="color:#0f766e;font-size:12px"></span>` +
        (as ? '<br><br><b>Actividades:</b><br>' + as : '') +
        (fichaTiene(p) ? `<br><button data-accion="ver-ficha" data-punto="${esc(p.id)}" style="margin-top:6px;color:#0f766e;font-weight:600;text-decoration:underline">📖 Conocer el lugar</button>` : '');
    }
  });
  // Al abrir un punto: distancia por camino desde el estudiante y ruta dibujada en el mapa
  let linea = null, abierto = null;
  S.mapa.on('popupopen', async ev => {
    const ll = ev.popup.getLatLng();
    const q = (S.datos.puntos || []).find(x => Math.abs(x.lat - ll.lat) < 1e-6 && Math.abs(x.lng - ll.lng) < 1e-6);
    if (!q || !S.pos) return;
    abierto = q.id;
    const el = ev.popup.getElement();
    const sp = el && el.querySelector('[data-dist]');
    const recta = distM(S.pos, [q.lat, q.lng]);
    if (sp) sp.textContent = '⏳ Calculando el camino…';
    const m = await rutasHasta(S.pos, [q]);
    if (abierto !== q.id || !S.mapa) return;
    const r = m[q.id];
    if (sp) sp.innerHTML = textoRuta(r, recta);
    if (linea) linea.remove();
    linea = (r && r.poli)
      ? L.polyline(decodePoli(r.poli), { color: '#0f766e', weight: 4, opacity: 0.9 }).addTo(S.mapa)
      : L.polyline([S.pos, [q.lat, q.lng]], { color: '#0f766e', weight: 3, dashArray: '6 8' }).addTo(S.mapa);
  });
  S.mapa.on('popupclose', () => { abierto = null; if (linea) { linea.remove(); linea = null; } });
  actualizarClimaCard();
};

/* ---------- Ventana para responder: distancia por camino y condiciones ---------- */
const _abrirResponder = abrirResponder;
abrirResponder = async function (id) {
  await _abrirResponder(id);
  const a = S.datos.actividades.find(x => x.id === id);
  const pt = a && (S.datos.puntos || []).find(p => p.id === a.punto_id);
  const caja = $('#mapa-lugar');
  if (!a || !pt || !caja || a.requiere_gps === 'no') return;
  caja.parentElement.insertAdjacentHTML('beforeend', '<div id="amb-franja" class="text-xs text-slate-600 border-t border-teal-200 pt-2">Calculando su distancia al lugar…</div>');
  const p = await obtenerPosicion();
  let el = $('#amb-franja');
  if (!el) return;
  if (!p) { el.textContent = 'No pudimos obtener su ubicación para calcular la distancia.'; return; }
  const recta = distM([p.lat, p.lng], [pt.lat, pt.lng]);
  const amb = p.ambiente ? `<br>🌍 Donde usted está ahora: ${fmtClima(p.ambiente)}` : '';
  el.innerHTML = `⏳ Calculando el camino… (en línea recta: ${fmtDist(recta)})${amb}`;
  const m = await rutasHasta([p.lat, p.lng], [pt]);
  el = $('#amb-franja');
  if (el) el.innerHTML = textoRuta(m[pt.id], recta) + amb;
};

/* =========================================================
   EDITORES DEL DOCENTE (se definen aquí, a la vista de todo el código)
   ========================================================= */
const CARTA_ITEMS_BASE = [
  'Usted permanecerá siempre con su grupo y bajo la supervisión de los docentes a cargo.',
  'Seguirá las indicaciones de seguridad y no se alejará de las zonas autorizadas.',
  'Cuidará el entorno natural y no dejará residuos.',
  'Respetará a sus compañeros, a los docentes y a las personas del lugar.',
  'Usará el teléfono solo para las actividades de la salida.',
  'Responderá cada actividad dentro del horario indicado, con honestidad y con su propio trabajo.',
  'Autoriza que la aplicación registre su ubicación y las fotografías que usted tome al responder.'
];

/* --- Carta de compromiso --- */
function formCarta() {
  const c = S.panel.carta || {};
  let items = (c.items && c.items.length ? c.items : CARTA_ITEMS_BASE).slice();
  modal(`<form id="f-carta" class="space-y-3 pt-2">
    <h3 class="text-lg font-extrabold pr-6">📜 Carta de compromiso</h3>
    <p class="text-xs text-slate-500">Esto es lo que verán y firmarán los estudiantes. Escriba un compromiso en cada recuadro.</p>
    <label class="block text-sm font-semibold">Título<input name="titulo" class="${INP} mt-1" value="${esc(c.titulo || '')}"></label>
    <label class="block text-sm font-semibold">Texto de presentación<textarea name="intro" rows="2" class="${INP} mt-1">${esc(c.intro || '')}</textarea></label>
    <div class="text-sm font-semibold">Compromisos</div>
    <div id="ca-lista" class="space-y-2"></div>
    <button type="button" id="ca-mas" class="text-sm font-semibold text-indigo-700">+ Agregar compromiso</button>
    <label class="block text-sm font-semibold">Frase para aceptar<input name="acepta" class="${INP} mt-1" value="${esc(c.aceptacion || '')}"></label>
    <label class="flex items-start gap-2 text-sm bg-amber-50 rounded-xl p-2"><input type="checkbox" name="nueva" class="mt-1">
      <span>Exigir que <b>todos</b> los estudiantes firmen de nuevo con este texto (la próxima vez que ingresen).</span></label>
    <div class="flex gap-2"><button type="button" id="ca-reset" class="px-3 py-2 rounded-xl bg-slate-100 text-sm">Restablecer texto original</button>
      <button class="flex-1 bg-teal-700 text-white font-bold py-2.5 rounded-xl">Guardar carta</button></div>
  </form>`);
  const f = $('#f-carta');
  const pintar = () => {
    $('#ca-lista').innerHTML = items.map((t, i) => `<div class="flex items-start gap-1">
      <span class="h-6 w-6 mt-2 shrink-0 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">${i + 1}</span>
      <textarea data-ci="${i}" rows="2" class="${INP} flex-1">${esc(t)}</textarea>
      <div class="flex flex-col text-lg leading-none">
        <button type="button" data-cm="${i}:-1" class="px-1 text-slate-500" aria-label="Subir">↑</button>
        <button type="button" data-cm="${i}:1" class="px-1 text-slate-500" aria-label="Bajar">↓</button>
        <button type="button" data-cd="${i}" class="px-1 text-rose-500" aria-label="Quitar">×</button></div></div>`).join('');
  };
  pintar();
  f.addEventListener('input', ev => { if (ev.target.dataset.ci !== undefined) items[+ev.target.dataset.ci] = ev.target.value; });
  f.addEventListener('click', ev => {
    const T = ev.target;
    if (T.id === 'ca-mas') { if (items.length < 25) { items.push(''); pintar(); } return; }
    if (T.id === 'ca-reset') { items = CARTA_ITEMS_BASE.slice(); pintar(); return; }
    const m = T.closest('[data-cm]');
    if (m) {
      const [i, d] = m.dataset.cm.split(':').map(Number), j = i + d;
      if (j >= 0 && j < items.length) { [items[i], items[j]] = [items[j], items[i]]; pintar(); }
      return;
    }
    const dl = T.closest('[data-cd]');
    if (dl) { items.splice(+dl.dataset.cd, 1); pintar(); }
  });
  f.onsubmit = async ev => {
    ev.preventDefault();
    const lim = items.map(s => s.trim()).filter(Boolean);
    if (!lim.length) return aviso('Escriba al menos un compromiso.', 'error');
    cargando(true, 'Guardando la carta…');
    try {
      const d = await api('guardarCarta', {
        carta: { titulo: f.titulo.value, intro: f.intro.value, items: lim, aceptacion: f.acepta.value },
        exigirNuevaFirma: f.nueva.checked
      });
      S.panel.carta = d.carta;
      cerrarModal(); redibujar();
      aviso(f.nueva.checked ? 'Carta guardada. Todos deberán firmar de nuevo.' : 'Carta guardada.');
    } catch (e) { aviso(e.message, 'error'); } finally { cargando(false); }
  };
}

/* --- Ficha de un lugar --- */
function formFicha(id) {
  const p = S.panel.puntos.find(x => x.id === id);
  if (!p) return;
  const f0 = jsonSeguro(p.ficha, {}) || {};
  const els = (f0.elementos || []).map(e => ({ tipo: e.tipo || 'otro', titulo: e.titulo || '', texto: e.texto || '', imagen_id: e.imagen_id || '', file: null, prev: '' }));
  const TF = [['historia', '🏛️ Historia'], ['flora', '🌿 Flora'], ['fauna', '🦅 Fauna'], ['otro', '📌 Otro']];
  modal(`<form id="f-ficha" class="space-y-3 pt-2">
    <h3 class="text-lg font-extrabold pr-6">📖 Ficha del lugar: ${esc(p.nombre)}</h3>
    <p class="text-xs text-slate-500">Los estudiantes la verán con el botón «Conocer el lugar». Cuente la historia y agregue flora, fauna u otros elementos con su fotografía, para que sea más fácil reconocerlos en terreno.</p>
    <label class="block text-sm font-semibold">Descripción e historia del lugar
      <textarea name="historia" rows="5" class="${INP} mt-1" placeholder="Qué es el lugar, su historia, por qué es importante…">${esc(f0.historia || '')}</textarea></label>
    <div class="text-sm font-semibold">Elementos para reconocer</div>
    <div id="fi-lista" class="space-y-3"></div>
    <div class="flex flex-wrap gap-2">${TF.map(([k, t]) => `<button type="button" data-fadd="${k}" class="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-semibold">+ ${t}</button>`).join('')}</div>
    <button class="w-full bg-teal-700 text-white font-bold py-3 rounded-2xl shadow">Guardar ficha</button>
  </form>`);
  const f = $('#f-ficha');
  const pintar = () => {
    $('#fi-lista').innerHTML = els.length ? els.map((e, i) => {
      const img = e.prev ? `<img src="${e.prev}" class="w-full max-h-40 object-cover rounded-xl">`
        : e.imagen_id ? `<img data-archivo="${esc(e.imagen_id)}" class="w-full max-h-40 object-cover rounded-xl bg-slate-100">` : '';
      return `<div class="rounded-2xl border-2 border-emerald-100 bg-emerald-50/40 p-3 space-y-2">
        <div class="flex gap-2 items-center">
          <select data-fk="tipo" data-fi="${i}" class="${INP} flex-1">${TF.map(([k, t]) => `<option value="${k}" ${e.tipo === k ? 'selected' : ''}>${t}</option>`).join('')}</select>
          <button type="button" data-fdel="${i}" class="text-rose-500 text-xl px-1" aria-label="Quitar">×</button></div>
        <input data-fk="titulo" data-fi="${i}" value="${esc(e.titulo)}" placeholder="Nombre (ej: Peumo, Zorro culpeo, Faro)" class="${INP}">
        <textarea data-fk="texto" data-fi="${i}" rows="3" class="${INP}" placeholder="Cómo reconocerlo, dónde se ve, un dato interesante…">${esc(e.texto)}</textarea>
        ${img}
        <label class="inline-block text-xs bg-white border rounded-full px-3 py-1.5 font-semibold text-emerald-700 cursor-pointer">📷 ${img ? 'Cambiar' : 'Agregar'} fotografía
          <input type="file" accept="image/*" data-ff="${i}" class="hidden"></label></div>`;
    }).join('') : '<p class="text-xs text-slate-500">Aún no hay elementos. Agregue flora, fauna o hechos históricos con su fotografía.</p>';
    pintarImagenes($('#fi-lista'));
  };
  pintar();
  f.addEventListener('input', ev => {
    const t = ev.target;
    if (t.dataset.fk && t.dataset.fk !== 'tipo') els[+t.dataset.fi][t.dataset.fk] = t.value;
  });
  f.addEventListener('change', ev => {
    const t = ev.target;
    if (t.dataset.fk === 'tipo') els[+t.dataset.fi].tipo = t.value;
    if (t.dataset.ff !== undefined && t.files[0]) {
      const e = els[+t.dataset.ff];
      e.file = t.files[0]; e.prev = URL.createObjectURL(t.files[0]);
      pintar();
    }
  });
  f.addEventListener('click', ev => {
    const ad = ev.target.closest('[data-fadd]');
    if (ad) {
      if (els.length >= 20) return aviso('Puede agregar hasta 20 elementos por lugar.', 'error');
      els.push({ tipo: ad.dataset.fadd, titulo: '', texto: '', imagen_id: '', file: null, prev: '' });
      return pintar();
    }
    const dl = ev.target.closest('[data-fdel]');
    if (dl) { els.splice(+dl.dataset.fdel, 1); pintar(); }
  });
  f.onsubmit = async ev => {
    ev.preventDefault();
    cargando(true, 'Guardando la ficha…');
    try {
      const out = [];
      for (const e of els) {
        const o = { tipo: e.tipo, titulo: e.titulo.trim(), texto: e.texto.trim(), imagen_id: e.imagen_id };
        if (e.file) o.imagenB64 = await comprimirImagen(e.file, 300);
        out.push(o);
      }
      const d = await api('guardarFicha', { punto_id: id, ficha: { historia: f.historia.value.trim(), elementos: out } });
      p.ficha = d.ficha;
      cerrarModal(); redibujar();
      aviso('Ficha guardada.');
    } catch (err) { aviso(err.message, 'error'); } finally { cargando(false); }
  };
}

/* --- Presentación del lugar (lo primero que ven los estudiantes) --- */
function formInicio() {
  const ini0 = (S.panel && S.panel.inicio) || {};
  const BASE = ['historia', 'flora', 'fauna', 'relieve', 'poblacion'];
  const mapImgs = l => (l || []).map(im => ({ id: im.id, pie: im.pie || '', file: null, prev: '' }));
  const nueva = (tipo, s) => ({
    tipo, titulo: s.titulo || '', texto: s.texto || '',
    poblacion: { total: (s.poblacion || {}).total || '', actividades: (s.poblacion || {}).actividades || '' },
    imagenes: mapImgs(s.imagenes)
  });
  const secs = BASE.map(t => nueva(t, (ini0.secciones || []).find(x => x.tipo === t) || {}))
    .concat((ini0.secciones || []).filter(s => s.tipo === 'otra').map(s => nueva('otra', s)));
  const portada = { id: ini0.portada || '', file: null, prev: '' };
  const modo0 = ini0.modo || 'primera';

  modal(`<form id="f-inicio" class="space-y-3 pt-2">
    <h3 class="text-lg font-extrabold pr-6">📖 Presentación del lugar</h3>
    <p class="text-xs text-slate-500">Es lo primero que verán los estudiantes. Complete solo lo que quiera; las secciones vacías no se muestran. Puede agregar todas las imágenes que desee.</p>
    <div class="rounded-2xl border-2 border-indigo-100 bg-indigo-50/40 p-3 space-y-2">
      <div class="text-sm font-semibold">👁️ ¿Cómo la ven los estudiantes?</div>
      ${INI_MODOS.map(([k, t, d]) => `<label class="flex items-start gap-2 text-sm cursor-pointer"><input type="radio" name="modo" value="${k}" ${modo0 === k ? 'checked' : ''} class="mt-1"><span><b>${t}.</b> ${d}</span></label>`).join('')}
    </div>
    <label class="block text-sm font-semibold">Título<input name="titulo" class="${INP} mt-1" placeholder="Ej: Conozca Coliumo" value="${esc(ini0.titulo || '')}"></label>
    <label class="block text-sm font-semibold">Texto de bienvenida
      <textarea name="intro" rows="3" class="${INP} mt-1" placeholder="Una breve presentación de la salida y del lugar que visitarán">${esc(ini0.intro || '')}</textarea></label>
    <div class="rounded-2xl border-2 border-emerald-100 bg-emerald-50/40 p-3 space-y-2">
      <div class="text-sm font-semibold">🖼️ Imagen de portada (la que se ve primero)</div>
      <div id="fi-portada"></div>
      <label class="inline-block text-xs bg-white border rounded-full px-3 py-1.5 font-semibold text-emerald-700 cursor-pointer">📷 Elegir imagen
        <input type="file" accept="image/*" id="fi-portada-file" class="hidden"></label>
      <button type="button" id="fi-portada-quitar" class="text-xs text-rose-600 underline ml-2">Quitar</button>
    </div>
    <div id="fi-secs" class="space-y-2"></div>
    <button type="button" id="fi-otra" class="text-sm font-semibold text-indigo-700">+ Agregar otra sección</button>
    <button class="w-full bg-teal-700 text-white font-bold py-3 rounded-2xl shadow">Guardar presentación</button>
  </form>`);

  const f = $('#f-inicio');
  const pintarPortada = () => {
    $('#fi-portada').innerHTML = portada.prev ? `<img src="${portada.prev}" class="w-full max-h-48 object-cover rounded-xl">`
      : portada.id ? `<img data-archivo="${esc(portada.id)}" class="w-full max-h-48 object-cover rounded-xl bg-slate-100">`
      : '<p class="text-xs text-slate-500">Sin imagen de portada.</p>';
    pintarImagenes($('#fi-portada'));
  };
  const pintarImgs = i => {
    $('#sim-' + i).innerHTML = secs[i].imagenes.map((im, j) => `<div class="flex gap-2 items-start rounded-xl border p-2 bg-slate-50">
      ${im.prev ? `<img src="${im.prev}" class="h-20 w-20 object-cover rounded-lg shrink-0">` : `<img data-archivo="${esc(im.id)}" class="h-20 w-20 object-cover rounded-lg bg-slate-100 shrink-0">`}
      <input data-sf="pie" data-si="${i}" data-sj="${j}" value="${esc(im.pie)}" placeholder="Descripción de la imagen (opcional)" class="${INP} flex-1">
      <button type="button" data-sdel="${i}:${j}" class="text-rose-500 text-xl px-1" aria-label="Quitar imagen">×</button></div>`).join('');
    pintarImagenes($('#sim-' + i));
  };
  const htmlSec = (s, i) => {
    const t = s.tipo;
    return `<details class="rounded-2xl border bg-white" data-sec="${i}"><summary class="cursor-pointer px-3 py-2.5 font-bold">${INI_IC[t]} ${esc(s.titulo || INI_DEF[t])}</summary>
      <div class="p-3 space-y-2 border-t">
        <input data-sf="titulo" data-si="${i}" value="${esc(s.titulo)}" placeholder="${t === 'otra' ? 'Título de esta sección' : 'Título (opcional, por defecto «' + INI_DEF[t] + '»)'}" class="${INP}">
        ${t === 'poblacion' ? `<div class="grid grid-cols-1 gap-2">
          <input data-sf="total" data-si="${i}" value="${esc(s.poblacion.total)}" placeholder="Total de habitantes (ej: 3.200 personas, según el Censo)" class="${INP}">
          <textarea data-sf="acts" data-si="${i}" rows="2" class="${INP}" placeholder="Actividades de la población (ej: pesca artesanal, turismo, agricultura)">${esc(s.poblacion.actividades)}</textarea></div>` : ''}
        <textarea data-sf="texto" data-si="${i}" rows="4" class="${INP}" placeholder="Escriba aquí la información de esta sección">${esc(s.texto)}</textarea>
        <div id="sim-${i}" class="space-y-2"></div>
        <div class="flex flex-wrap gap-3 items-center">
          <label class="inline-block text-xs bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1.5 font-semibold text-emerald-700 cursor-pointer">📷 Agregar imágenes
            <input type="file" accept="image/*" multiple data-sadd="${i}" class="hidden"></label>
          ${t === 'otra' ? `<button type="button" data-ssec="${i}" class="text-xs text-rose-600 underline">Quitar esta sección</button>` : ''}</div>
      </div></details>`;
  };
  const pintarSecs = abrirUltima => {
    const abiertos = $$('#fi-secs details').map(d => d.open);
    $('#fi-secs').innerHTML = secs.map(htmlSec).join('');
    $$('#fi-secs details').forEach((d, i) => { d.open = abrirUltima ? i === secs.length - 1 : !!abiertos[i]; });
    secs.forEach((_, i) => pintarImgs(i));
  };
  pintarPortada();
  pintarSecs(false);

  f.addEventListener('input', ev => {
    const t = ev.target, k = t.dataset.sf;
    if (!k) return;
    const s = secs[+t.dataset.si];
    if (k === 'pie') s.imagenes[+t.dataset.sj].pie = t.value;
    else if (k === 'total') s.poblacion.total = t.value;
    else if (k === 'acts') s.poblacion.actividades = t.value;
    else s[k] = t.value;
  });
  f.addEventListener('change', ev => {
    const t = ev.target;
    if (t.id === 'fi-portada-file' && t.files[0]) {
      portada.file = t.files[0]; portada.prev = URL.createObjectURL(t.files[0]);
      pintarPortada();
      t.value = '';
    }
    if (t.dataset.sadd !== undefined && t.files.length) {
      const i = +t.dataset.sadd, s = secs[i];
      Array.from(t.files).forEach(file => {
        if (s.imagenes.length >= 30) return;
        s.imagenes.push({ id: '', pie: '', file, prev: URL.createObjectURL(file) });
      });
      pintarImgs(i);
      t.value = '';
    }
  });
  f.addEventListener('click', ev => {
    const T = ev.target;
    if (T.id === 'fi-portada-quitar') { portada.id = ''; portada.file = null; portada.prev = ''; return pintarPortada(); }
    if (T.id === 'fi-otra') {
      if (secs.length >= 12) return aviso('Puede tener hasta 12 secciones.', 'error');
      secs.push(nueva('otra', {})); return pintarSecs(true);
    }
    const di = T.closest('[data-sdel]');
    if (di) { const [i, j] = di.dataset.sdel.split(':').map(Number); secs[i].imagenes.splice(j, 1); return pintarImgs(i); }
    const ds = T.closest('[data-ssec]');
    if (ds) { secs.splice(+ds.dataset.ssec, 1); pintarSecs(false); }
  });
  f.onsubmit = async ev => {
    ev.preventDefault();
    cargando(true, 'Guardando…');
    try {
      const pend = [];
      if (portada.file) pend.push(portada);
      secs.forEach(s => s.imagenes.forEach(im => { if (im.file) pend.push(im); }));
      let n = 0;
      for (const im of pend) {
        cargando(true, `Subiendo imágenes (${++n}/${pend.length})…`);
        const d = await api('subirImagen', { imagenB64: await comprimirImagen(im.file, 400) });
        im.id = d.id; im.file = null;   // si falla algo después, no se vuelve a subir
      }
      cargando(true, 'Guardando la presentación…');
      const modo = (f.querySelector('input[name=modo]:checked') || {}).value || 'primera';
      const d = await api('guardarPresentacion', {
        inicio: {
          titulo: f.titulo.value, intro: f.intro.value, portada: portada.id, modo,
          secciones: secs.map(s => ({ tipo: s.tipo, titulo: s.titulo, texto: s.texto, poblacion: s.poblacion,
            imagenes: s.imagenes.filter(im => im.id).map(im => ({ id: im.id, pie: im.pie })) }))
        }
      });
      S.panel.inicio = d.inicio;
      cerrarModal(); redibujar();
      aviso('Presentación guardada.');
    } catch (e) { aviso(e.message, 'error'); } finally { cargando(false); }
  };
}

/* --- Nota final: escala 1,0 a 7,0 (60 % de exigencia), modificable por el docente --- */
function formNota(key) {
  const e = calcularEstudiantes().find(x => x.key === key);
  if (!e) return;
  modal(`<form id="f-nota" class="space-y-3 pt-2">
    <h3 class="text-lg font-extrabold pr-6">✏️ Nota de ${esc(e.est.nombre)}</h3>
    <div class="rounded-xl bg-slate-50 p-3 text-sm space-y-1">
      <div>Logro: <b>${Math.round(e.pct)} %</b> (${esc(e.pts)} pt)</div>
      <div>Nota calculada (escala 1,0 a 7,0; ${EXIGENCIA} % de exigencia = 4,0): <b>${e.notaCalc.toFixed(1)}</b></div></div>
    <label class="block text-sm font-semibold">Nota final (de 1,0 a 7,0)
      <input name="nota" type="number" step="0.1" min="1" max="7" value="${e.ajustada ? e.nota.toFixed(1) : ''}" placeholder="${e.notaCalc.toFixed(1)}" class="${INP} mt-1"></label>
    <label class="block text-sm font-semibold">Motivo del ajuste (opcional; solo lo ve usted)
      <textarea name="obs" rows="2" class="${INP} mt-1">${esc(e.est.nota_obs || '')}</textarea></label>
    <p class="text-xs text-slate-500">Si deja la nota vacía, se usa la nota calculada. Los estudiantes no ven sus notas en la aplicación.</p>
    <div class="flex gap-2"><button type="button" id="fn-quitar" class="px-3 py-2 rounded-xl bg-slate-100 text-sm">Volver a la nota calculada</button>
      <button class="flex-1 bg-teal-700 text-white font-bold py-2.5 rounded-xl">Guardar nota</button></div>
  </form>`);
  const f = $('#f-nota');
  const guardar = async (nota, obs) => {
    cargando(true, 'Guardando la nota…');
    try {
      const d = await api('guardarNota', { rut: e.est.rut, nota, obs });
      e.est.nota_doc = d.nota_doc; e.est.nota_obs = d.nota_obs;
      cerrarModal(); redibujar();
      aviso(nota === '' ? 'Se usa la nota calculada.' : 'Nota guardada.');
    } catch (err) { aviso(err.message, 'error'); } finally { cargando(false); }
  };
  $('#fn-quitar').onclick = () => guardar('', f.obs.value);
  f.onsubmit = ev => {
    ev.preventDefault();
    const v = f.nota.value.trim();
    if (v !== '' && (!isFinite(+v) || +v < 1 || +v > 7)) return aviso('La nota debe estar entre 1,0 y 7,0.', 'error');
    guardar(v, f.obs.value);
  };
}

/* =========================================================
   PANEL DOCENTE: ajustes a las pantallas existentes
   ========================================================= */
if (typeof accionDocente === 'function') {
  // Una firma vale solo si corresponde a la versión actual de la carta.
  // La nota final es la que fijó el docente (si la modificó) o la calculada.
  const _calcularEstudiantes = calcularEstudiantes;
  calcularEstudiantes = function () {
    const r = _calcularEstudiantes(), v = (S.panel.carta && S.panel.carta.version) || '';
    r.forEach(e => {
      e.firma = S.panel.firmas.some(f => rutKey(f.rut) === e.key && String(f.carta_version || '') === v);
      e.notaCalc = e.nota;
      const d = Number(e.est.nota_doc);
      if (e.est.nota_doc !== '' && e.est.nota_doc != null && isFinite(d) && d >= 1 && d <= 7) { e.nota = d; e.ajustada = true; }
    });
    return r;
  };

  // En el Resumen: cada nota se puede modificar con ✏️
  const _renderResumenNota = renderResumen;
  renderResumen = function () {
    _renderResumenNota();
    const est = calcularEstudiantes();
    $$('#doc-contenido table tbody tr').forEach((tr, i) => {
      const e = est[i], td = tr.children[4];
      if (!e || !td) return;
      td.innerHTML = `<b>${e.nota.toFixed(1)}</b>${e.ajustada ? ' <span class="text-[10px] text-amber-700" title="Nota modificada por el docente">(ajustada)</span>' : ''} <button data-accion="editar-nota" data-rut="${esc(e.key)}" class="text-xs" aria-label="Modificar la nota">✏️</button>`;
    });
    const tb = $('#doc-contenido table');
    if (tb) tb.parentElement.insertAdjacentHTML('beforeend', `<p class="text-xs text-slate-500 mt-1">Escala de notas de 1,0 a 7,0: con ${EXIGENCIA} % de exigencia, el ${EXIGENCIA} % de logro equivale a la nota 4,0. Con ✏️ puede modificar la nota de cada estudiante.</p>`);
  };

  const bloqueInicio = () => {
    const i = S.panel.inicio;
    const n = i ? (i.secciones || []).filter(seccionTiene).length : 0;
    const modo = (INI_MODOS.find(m => m[0] === ((i && i.modo) || 'primera')) || INI_MODOS[1])[1];
    return `<div class="bg-white/95 rounded-2xl shadow p-4 space-y-2 mb-4">
      <h3 class="font-bold">📖 Presentación del lugar (inicio de la aplicación)</h3>
      <p class="text-sm text-slate-500">Lo primero que ven los estudiantes: imagen de portada, historia, flora, fauna, relieve, población y las secciones que usted agregue, con todas las imágenes que quiera.</p>
      <p class="text-xs text-slate-500">${i && inicioTiene(i) ? 'Actualmente: ' + n + ' sección(es) con contenido' + (i.portada ? ' y portada' : '') + ' · Visibilidad: <b>' + modo + '</b>.' : 'Aún no ha creado la presentación.'}</p>
      <button data-accion="editar-inicio" class="bg-teal-700 text-white font-semibold px-4 py-2 rounded-xl">✏️ ${i && inicioTiene(i) ? 'Editar' : 'Crear'} la presentación</button></div>`;
  };

  const _renderAjustes = renderAjustes;
  renderAjustes = function () {
    _renderAjustes();
    const c = S.panel.carta || {};
    $('#doc-contenido').insertAdjacentHTML('afterbegin', bloqueInicio() + `<div class="bg-white/95 rounded-2xl shadow p-4 space-y-2 mb-4">
      <h3 class="font-bold">📜 Carta de compromiso</h3>
      <p class="text-sm text-slate-500">Es el texto que los estudiantes leen y firman al ingresar. Puede cambiarlo y agregar compromisos.</p>
      <p class="text-xs text-slate-500">Actualmente: «${esc(c.titulo || '')}» · ${(c.items || []).length} compromisos</p>
      <button data-accion="editar-carta" class="bg-teal-700 text-white font-semibold px-4 py-2 rounded-xl">✏️ Editar la carta</button></div>`);
  };

  const _renderPuntos = renderPuntos;
  renderPuntos = function () {
    _renderPuntos();
    $$('#doc-contenido [data-accion="editar-punto"]').forEach(b => {
      const pt = S.panel.puntos.find(x => x.id === b.dataset.id);
      b.insertAdjacentHTML('beforebegin', `<button data-accion="editar-ficha" data-id="${esc(b.dataset.id)}" class="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-semibold">📖 Ficha${pt && fichaTiene(pt) ? ' ✔' : ''}</button>`);
    });
    $('#doc-contenido').insertAdjacentHTML('afterbegin', bloqueInicio());
  };

  /* --- Respuestas: condiciones del momento --- */
  const _tarjetaResp = tarjetaResp;
  tarjetaResp = function (r, a) {
    let h = _tarjetaResp(r, a);
    const amb = jsonSeguro(r.ambiente, null);
    if (amb && amb.t !== undefined) {
      h = h.replace('<div class="flex flex-wrap gap-2 items-start">', `<p class="text-xs text-slate-600">🌍 Condiciones al responder: ${fmtClima(amb)}</p><div class="flex flex-wrap gap-2 items-start">`);
    }
    return h;
  };
}

/* --- Puntaje completo a recorridos (lo usan los botones de recorrido) --- */
async function aprobarRec(id, silencioso) {
  const r = S.panel.respuestas.find(x => x.id === id), a = actPor(r.actividad_id);
  const d = await api('guardarEvaluacion', { respuesta_id: id, puntaje_final: Number(a.puntaje_max), retro: r.retro_docente || '', evaluacion: {} });
  r.puntaje_final = d.puntaje_final; r.estado = 'evaluada';
  if (!silencioso) { redibujar(); aviso('Puntaje guardado. El estudiante ya puede verlo.'); }
}
async function aprobarTodosRec() {
  const f = S.filtroR;
  const rs = S.panel.respuestas.filter(r => {
    const a = actPor(r.actividad_id);
    if (!esRec(a) || r.estado === 'evaluada' || (f.act && r.actividad_id !== f.act)) return false;
    const fot = jsonSeguro(r.fotos, {});
    return recDe(r) && hitosDe(a).every(h => fot[h.id]);
  });
  if (!rs.length) return aviso('No hay recorridos completos pendientes de evaluar.');
  if (!confirm('Se dará el puntaje completo a ' + rs.length + ' recorrido(s) que tienen todas las fotografías. ¿Continuar?')) return;
  let n = 0;
  try { for (const r of rs) { cargando(true, `Evaluando (${++n}/${rs.length})…`); await aprobarRec(r.id, true); } }
  finally { cargando(false); }
  redibujar(); aviso(rs.length + ' recorrido(s) evaluados.');
}

/* =========================================================
   Recorrido en curso: contador de calorías bien visible
   (se aplica cuando ya cargaron todos los archivos)
   ========================================================= */
window.addEventListener('load', () => {
  if (typeof vistaActivo !== 'function' || typeof hitosDe !== 'function' || typeof celdaRec === 'undefined') return;
  vistaActivo = function () {
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
  };
});

/* =========================================================
   EVENTOS DE ESTE ARCHIVO
   ========================================================= */
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-accion]');
  if (!b) return;
  const a = b.dataset.accion, id = b.dataset.id;
  try {
    if (a === 'ver-ficha') return abrirFicha(b.dataset.punto);
    if (a === 'ver-inicio') return abrirInicio();
    if (a === 'clima-act') return await actualizarClimaCard();
    if (a === 'editar-ficha') return formFicha(id);
    if (a === 'editar-carta') return formCarta();
    if (a === 'editar-inicio') return formInicio();
    if (a === 'editar-nota') return formNota(b.dataset.rut);
  } catch (err) { cargando(false); aviso(err.message, 'error'); }
});
