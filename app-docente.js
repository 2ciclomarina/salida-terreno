'use strict';
/* =========================================================
   SALIDA A TERRENO – Panel docente
   (Se carga junto con app.js, solo en docente.html)
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
