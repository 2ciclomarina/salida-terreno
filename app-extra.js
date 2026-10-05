'use strict';
/* =========================================================
   SALIDA A TERRENO – Complementos (Parte 1)
   Carta editable · Ficha del lugar · Condiciones del lugar · Distancia por camino
   Se carga después de app.js (y de app-docente.js en el panel docente)
   ========================================================= */

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

/* ---------- Ficha del lugar (vista del estudiante) ---------- */
function fichaTiene(p) {
  const f = jsonSeguro(p.ficha, null);
  return !!(f && ((f.historia || '').trim() || (f.elementos || []).length));
}
function tarjetaElemento(e) {
  return `<div class="rounded-2xl bg-white border overflow-hidden">
    ${e.imagen_id ? `<img data-archivo="${esc(e.imagen_id)}" class="w-full h-36 object-cover bg-slate-100" alt="${esc(e.titulo)}">` : ''}
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

// Encabezado de cada lugar: ahora con el botón «Conocer el lugar»
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

// Las imágenes de las fichas también se guardan en el teléfono para verlas sin internet
const _precargarImagenes = precargarImagenes;
precargarImagenes = function () {
  _precargarImagenes();
  (S.datos.puntos || []).forEach(p => ((jsonSeguro(p.ficha, {}) || {}).elementos || []).forEach(e => { if (e.imagen_id) dataUrlArchivo(e.imagen_id).catch(() => {}); }));
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
   PANEL DOCENTE
   ========================================================= */
if (typeof accionDocente === 'function') {
  const CARTA_ITEMS_BASE = [
    'Usted permanecerá siempre con su grupo y bajo la supervisión de los docentes a cargo.',
    'Seguirá las indicaciones de seguridad y no se alejará de las zonas autorizadas.',
    'Cuidará el entorno natural y no dejará residuos.',
    'Respetará a sus compañeros, a los docentes y a las personas del lugar.',
    'Usará el teléfono solo para las actividades de la salida.',
    'Responderá cada actividad dentro del horario indicado, con honestidad y con su propio trabajo.',
    'Autoriza que la aplicación registre su ubicación y las fotografías que usted tome al responder.'
  ];
  const INP = 'w-full border rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300';

  // Una firma vale solo si corresponde a la versión actual de la carta
  const _calcularEstudiantes = calcularEstudiantes;
  calcularEstudiantes = function () {
    const r = _calcularEstudiantes(), v = (S.panel.carta && S.panel.carta.version) || '';
    r.forEach(e => { e.firma = S.panel.firmas.some(f => rutKey(f.rut) === e.key && String(f.carta_version || '') === v); });
    return r;
  };

  /* --- Carta de compromiso: editor --- */
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

  const _renderAjustes = renderAjustes;
  renderAjustes = function () {
    _renderAjustes();
    const c = S.panel.carta || {};
    $('#doc-contenido').insertAdjacentHTML('afterbegin', `<div class="bg-white/95 rounded-2xl shadow p-4 space-y-2 mb-4">
      <h3 class="font-bold">📜 Carta de compromiso</h3>
      <p class="text-sm text-slate-500">Es el texto que los estudiantes leen y firman al ingresar. Puede cambiarlo y agregar compromisos.</p>
      <p class="text-xs text-slate-500">Actualmente: «${esc(c.titulo || '')}» · ${(c.items || []).length} compromisos</p>
      <button data-accion="editar-carta" class="bg-teal-700 text-white font-semibold px-4 py-2 rounded-xl">✏️ Editar la carta</button></div>`);
  };

  /* --- Ficha del lugar: editor --- */
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

  const _renderPuntos = renderPuntos;
  renderPuntos = function () {
    _renderPuntos();
    $$('#doc-contenido [data-accion="editar-punto"]').forEach(b => {
      const pt = S.panel.puntos.find(x => x.id === b.dataset.id);
      b.insertAdjacentHTML('beforebegin', `<button data-accion="editar-ficha" data-id="${esc(b.dataset.id)}" class="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-semibold">📖 Ficha${pt && fichaTiene(pt) ? ' ✔' : ''}</button>`);
    });
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

/* =========================================================
   EVENTOS DE ESTE ARCHIVO
   ========================================================= */
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-accion]');
  if (!b) return;
  const a = b.dataset.accion, id = b.dataset.id;
  try {
    if (a === 'ver-ficha') return abrirFicha(b.dataset.punto);
    if (a === 'clima-act') return await actualizarClimaCard();
    if (typeof formFicha === 'function' && a === 'editar-ficha') return formFicha(id);
    if (typeof formCarta === 'function' && a === 'editar-carta') return formCarta();
  } catch (err) { cargando(false); aviso(err.message, 'error'); }
});
