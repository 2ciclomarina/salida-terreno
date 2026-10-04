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
const TABS_DOC = [['resumen', '📊 Resumen'], ['actividades', '📝 Actividades'], ['puntos', '📍 Puntos'], ['respuestas', '💬 Respuestas'], ['ubicaciones', '🧭 Ubicaciones'], ['reportes', '📄 Reportes'], ['ajustes', '⚙️ Ajustes']];
function renderDocente() {
  const porEvaluar = S.panel.respuestas.filter(r => r.estado !== 'evaluada').length;
  $('#doc-tabs').innerHTML = TABS_DOC.map(([k, t]) =>
    `<button data-accion="tab-doc" data-tab="${k}" class="px-3 py-2 rounded-xl whitespace-nowrap ${S.tabDoc === k ? 'tab-activa' : ''}">${t}${k === 'respuestas' && porEvaluar ? ` <span class="ml-1 text-xs bg-amber-400 text-slate-900 rounded-full px-1.5">${porEvaluar}</span>` : ''}</button>`).join('');
  detenerMapa();
  const f = { resumen: renderResumen, actividades: renderActividades, puntos: renderPuntos, respuestas: renderRespuestas, ubicaciones: renderUbicaciones, reportes: renderReportes, ajustes: renderAjustes }[S.tabDoc];
  f();
}
function redibujar() { const y = window.scrollY; renderDocente(); window.scrollTo(0, y); }
const actPor = id => S.panel.actividades.find(a => a.id === id);
const nombreDe = rut => { const e = S.panel.estudiantes.find(x => rutKey(x.rut) === rutKey(rut)); return e ? e.nombre : rut; };
const estActivos = () => S.panel.estudiantes.filter(e => String(e.activo).toLowerCase() !== 'no');
const tieneIA = r => r.puntaje_ia !== '' && r.puntaje_ia != null;
const hayParteManual = a => a.tipo !== 'alternativas' && (a.tipo !== 'grupo' || (a.partes || []).some(p => p.tipo !== 'alternativas'));

/* ---------- Rúbrica: cálculo y datos ---------- */
const FACTOR_NIVEL = { L: 1, M: 0.5, N: 0 };
function puntajeRubrica(rubrica, niveles, max) {
  let tot = 0, ganado = 0;
  rubrica.forEach((c, i) => {
    const w = Number(c.peso) > 0 ? Number(c.peso) : 1;
    tot += w;
    ganado += w * (FACTOR_NIVEL[niveles[i]] || 0);
  });
  return tot ? Math.round(max * ganado / tot * 10) / 10 : 0;
}
// Ítems con rúbrica de una actividad (la actividad completa o cada parte con rúbrica)
function itemsRub(a) {
  if (a.tipo === 'grupo') {
    return (a.partes || []).map((p, i) => ({
      id: p.id, etiqueta: 'Parte ' + (i + 1) + ' · ' + TIPOS[p.tipo].nom,
      rubrica: p.tipo === 'alternativas' ? [] : (p.rubrica || []), max: Number(p.puntaje) || 1
    })).filter(x => x.rubrica.length);
  }
  if ((a.tipo === 'desarrollo' || a.tipo === 'foto') && (a.rubrica || []).length) {
    return [{ id: 'main', etiqueta: 'Rúbrica', rubrica: a.rubrica, max: Number(a.puntaje_max) || 1 }];
  }
  return [];
}
// ¿Hay algo para corregir a mano que no tenga rúbrica?
function sinRubrica(a) {
  if (a.tipo === 'grupo') return (a.partes || []).some(p => p.tipo !== 'alternativas' && !(p.rubrica || []).length);
  if (a.tipo === 'desarrollo' || a.tipo === 'foto') return !(a.rubrica || []).length;
  return false;
}
function autoPuntos(a, r) {
  if (a.tipo !== 'grupo') return 0;
  const resp = jsonSeguro(r.respuesta, {});
  return (a.partes || []).reduce((s, p) => s + (p.tipo === 'alternativas' && String(resp[p.id] || '').trim() === String(p.correcta).trim() ? (Number(p.puntaje) || 1) : 0), 0);
}
function textoRubrica(rub) {
  if (!rub || !rub.length) return '';
  return '<div class="mt-1"><b>Rúbrica:</b>' + rub.map(c => `<div class="ml-2 mt-1"><b>${esc(c.criterio)}</b> (peso ${esc(c.peso || 1)})<br>
    ✅ ${esc(c.logrado || '—')}<br>🟡 ${esc(c.medio || '—')}<br>⚪ ${esc(c.no || '—')}</div>`).join('') + '</div>';
}

function calcularEstudiantes() {
  const P = S.panel;
  const maxTotal = P.actividades.reduce((s, a) => s + Number(a.puntaje_max || 0), 0);
  return estActivos().map(e => {
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

/* ---------- Resumen ---------- */
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

/* ---------- Actividades ---------- */
function estadoActividad(a) {
  const t = Date.now();
  if (t < Date.parse(a.fecha_inicio)) return chip('Programada', 'slate');
  if (t > Date.parse(a.fecha_fin)) return chip('Cerrada', 'rose');
  return chip('Abierta', 'emerald');
}
function renderActividades() {
  const P = S.panel, nEst = estActivos().length;
  const tarjetas = P.actividades.map((a, i) => {
    const T = TIPOS[a.tipo] || TIPOS.desarrollo;
    const n = P.respuestas.filter(r => r.actividad_id === a.id).length;
    const pt = P.puntos.find(p => p.id === a.punto_id);
    const pct = nEst ? Math.round(n / nEst * 100) : 0;
    const nPartes = a.tipo === 'grupo' ? ` · ${(a.partes || []).length} partes` : '';
    const nRub = itemsRub(a).reduce((s, x) => s + x.rubrica.length, 0);
    return `<div class="bg-white/95 rounded-3xl shadow overflow-hidden flex">
      <div class="w-2 bg-${T.c}-500"></div>
      <div class="p-4 flex-1 min-w-0">
        <div class="flex items-start gap-3">
          <div class="h-11 w-11 shrink-0 rounded-2xl bg-${T.c}-100 flex items-center justify-center text-2xl">${T.ic}</div>
          <div class="flex-1 min-w-0"><div class="font-bold leading-tight">${i + 1}. ${esc(a.titulo)}</div>
            <div class="text-xs text-slate-500">${T.nom}${nPartes} · ${esc(a.puntaje_max)} pt</div></div>
          ${estadoActividad(a)}
        </div>
        <div class="mt-2 text-xs text-slate-600 space-y-0.5">
          <div>🕒 ${fechaCorta(a.fecha_inicio)} → ${fechaCorta(a.fecha_fin)}</div>
          ${pt ? `<div>📍 ${esc(pt.nombre)}</div>` : ''}
          ${nRub ? `<div>📋 Rúbrica con ${nRub} criterio(s)</div>` : ''}
          <div>${a.requiere_gps === 'no' ? '🚫 Sin GPS' : '📡 Registra ubicación'}</div>
        </div>
        <div class="mt-3"><div class="flex justify-between text-xs text-slate-600 mb-1"><span>Respondieron</span><span>${n} de ${nEst}</span></div>
          <div class="h-2 bg-slate-100 rounded-full overflow-hidden"><div class="h-2 bg-emerald-500" style="width:${pct}%"></div></div></div>
        <div class="flex gap-2 mt-3 flex-wrap">
          <button data-accion="ver-resp" data-id="${esc(a.id)}" class="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 text-sm font-semibold">💬 Ver respuestas</button>
          <button data-accion="editar-act" data-id="${esc(a.id)}" class="px-3 py-1.5 rounded-xl bg-slate-100 text-sm">✏️ Editar</button>
          <button data-accion="borrar-act" data-id="${esc(a.id)}" class="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 text-sm">Eliminar</button>
        </div>
      </div></div>`;
  }).join('');
  $('#doc-contenido').innerHTML = `
    <div class="flex justify-between items-center mb-3"><h3 class="font-bold text-lg">Actividades</h3>
      <button data-accion="nueva-act" class="bg-teal-700 text-white font-semibold px-4 py-2 rounded-xl shadow">+ Nueva actividad</button></div>
    <div class="space-y-3">${tarjetas || '<div class="bg-white/90 rounded-2xl p-8 text-center text-slate-500">Aún no hay actividades. Pinche «Nueva actividad» para crear la primera.</div>'}</div>`;
}

function parteNueva(t) {
  t = t || 'alternativas';
  return { tipo: t, enunciado: '', opciones: t === 'alternativas' ? ['', '', '', ''] : [], corrIdx: 0, pauta: '', puntaje: 1, rubrica: [] };
}
const critNuevo = () => ({ criterio: '', logrado: '', medio: '', no: '', peso: 1 });

function formActividad(id) {
  const ahora = new Date(), fin = new Date(Date.now() + 2 * 3600e3);
  const a = id ? actPor(id) : { tipo: 'alternativas', opciones: [], partes: [], rubrica: [], puntaje_max: 1, fecha_inicio: ahora.toISOString(), fecha_fin: fin.toISOString() };
  let ops = (a.opciones && a.opciones.length) ? a.opciones.slice() : ['', '', '', ''];
  let corr = a.correcta ? Math.max(0, ops.indexOf(a.correcta)) : 0;
  let rubM = (a.rubrica || []).map(c => Object.assign({ peso: 1 }, c));
  let partes = (a.tipo === 'grupo' && a.partes && a.partes.length)
    ? a.partes.map(p => ({
      tipo: p.tipo, enunciado: p.enunciado || '',
      opciones: (p.opciones && p.opciones.length) ? p.opciones.slice() : (p.tipo === 'alternativas' ? ['', '', '', ''] : []),
      corrIdx: p.correcta ? Math.max(0, (p.opciones || []).indexOf(p.correcta)) : 0,
      pauta: p.pauta || '', puntaje: p.puntaje || 1,
      rubrica: (p.rubrica || []).map(c => Object.assign({ peso: 1 }, c))
    }))
    : [parteNueva('alternativas')];
  const inp = 'w-full border rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300';
  const sec = (n, t) => `<div class="flex items-center gap-2 pt-2"><span class="h-6 w-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">${n}</span><span class="font-bold text-sm">${t}</span></div>`;
  const tiles = [['alternativas', '✅', 'Alternativas', 'Una respuesta correcta'], ['desarrollo', '✍️', 'Desarrollo', 'Respuesta escrita'], ['foto', '📷', 'Fotografía', 'El alumno sube una foto'], ['grupo', '🧩', 'Ejercicio con partes', 'Mezcla alternativas, desarrollo y foto']]
    .map(([v, ic, t, d]) => `<label class="cursor-pointer"><input type="radio" name="tipo" value="${v}" class="peer sr-only" ${a.tipo === v ? 'checked' : ''}>
      <div class="rounded-2xl border-2 border-slate-200 p-3 text-center peer-checked:border-indigo-600 peer-checked:bg-indigo-50 transition h-full">
      <div class="text-3xl">${ic}</div><div class="font-bold text-sm">${t}</div><div class="text-[11px] text-slate-500">${d}</div></div></label>`).join('');
  const optTipo = t => ['alternativas', 'desarrollo', 'foto'].map(v => `<option value="${v}" ${t === v ? 'selected' : ''}>${TIPOS[v].ic} ${TIPOS[v].nom}</option>`).join('');
  // Editor de rúbrica (k = 'm' para la actividad, 'p0', 'p1'... para cada parte)
  const htmlRub = (arr, k) => `<div class="rounded-2xl border border-indigo-200 bg-white p-3 space-y-2">
    <div class="flex flex-wrap items-center gap-2"><span class="text-sm font-bold">📋 Rúbrica</span>
      <button type="button" data-rubia="${k}" class="ml-auto px-3 py-1 rounded-xl bg-indigo-600 text-white text-xs font-semibold">✨ Sugerir con IA</button></div>
    <p class="text-[11px] text-slate-500">Niveles: Logrado, Medianamente logrado y No observado. Escriba sus criterios o pida sugerencias a la IA y corríjalas. El peso (1 a 5) indica cuánto vale cada criterio.</p>
    ${arr.map((c, i) => `<div class="rounded-xl border bg-slate-50 p-2 space-y-1">
      <div class="flex gap-2 items-center">
        <input data-rk="${k}" data-ri="${i}" data-rf="criterio" value="${esc(c.criterio)}" placeholder="Criterio (ej: Describe lo que observa)" class="${inp} flex-1">
        <label class="text-[11px] flex items-center gap-1 shrink-0">Peso<input data-rk="${k}" data-ri="${i}" data-rf="peso" type="number" min="1" max="5" step="1" value="${esc(c.peso || 1)}" class="w-12 border rounded-lg px-1 py-1 bg-white"></label>
        <button type="button" data-rubdel="${k}:${i}" class="text-rose-500 text-xl px-1" aria-label="Quitar criterio">×</button></div>
      <input data-rk="${k}" data-ri="${i}" data-rf="logrado" value="${esc(c.logrado)}" placeholder="✅ Logrado: qué se observa" class="${inp}">
      <input data-rk="${k}" data-ri="${i}" data-rf="medio" value="${esc(c.medio)}" placeholder="🟡 Medianamente logrado: qué se observa" class="${inp}">
      <input data-rk="${k}" data-ri="${i}" data-rf="no" value="${esc(c.no)}" placeholder="⚪ No observado: qué se observa" class="${inp}">
    </div>`).join('')}
    <button type="button" data-rubadd="${k}" class="text-sm font-semibold text-indigo-700">+ Agregar criterio</button></div>`;

  modal(`<form id="f-act" class="space-y-3 pt-2">
    <h3 class="text-lg font-extrabold pr-6">${id ? 'Editar' : 'Nueva'} actividad</h3>
    ${sec(1, 'Tipo de pregunta')}
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">${tiles}</div>

    ${sec(2, 'Pregunta')}
    <input name="titulo" required class="${inp}" placeholder="Título corto (ej: Observe el río)" value="${esc(a.titulo || '')}">
    <textarea name="enunciado" rows="4" required class="${inp}" placeholder="Escriba aquí la pregunta o la instrucción para los estudiantes">${esc(a.enunciado || '')}</textarea>
    <p id="nota-enun" class="hidden text-xs text-slate-500 -mt-2">En un ejercicio con partes, este texto es opcional: úselo para el contexto general (por ejemplo, «Observe la imagen y responda»).</p>
    <label class="block text-sm">🖼️ Imagen de apoyo (opcional)<input name="imagen" type="file" accept="image/*" class="${inp} mt-1"></label>

    <div id="bloque-alt" class="space-y-2">
      ${sec(3, 'Alternativas')}
      <p class="text-xs text-slate-500">Marque con el círculo verde la alternativa correcta. Se corrige sola al enviar el estudiante.</p>
      <div id="ops-lista" class="space-y-2"></div>
      <button type="button" id="ops-mas" class="text-sm font-semibold text-indigo-700">+ Agregar alternativa</button>
    </div>
    <div id="bloque-pauta" class="space-y-2">
      ${sec(3, 'Rúbrica de evaluación')}
      <div id="rub-main"></div>
      <textarea name="pauta" rows="2" class="${inp}" placeholder="Respuesta esperada o indicaciones para la IA (opcional si usa rúbrica)">${esc(a.pauta || '')}</textarea>
    </div>
    <div id="bloque-grupo" class="space-y-2">
      ${sec(3, 'Partes del ejercicio')}
      <p class="text-xs text-slate-500">Cada parte puede ser de un tipo distinto y tiene su propio puntaje. El estudiante las responde todas en una misma ventana.</p>
      <div id="partes-lista" class="space-y-3"></div>
      <div class="flex flex-wrap gap-2">
        <button type="button" data-addparte="alternativas" class="px-3 py-1.5 rounded-xl bg-sky-50 text-sky-700 text-sm font-semibold">+ ✅ Alternativas</button>
        <button type="button" data-addparte="desarrollo" class="px-3 py-1.5 rounded-xl bg-violet-50 text-violet-700 text-sm font-semibold">+ ✍️ Desarrollo</button>
        <button type="button" data-addparte="foto" class="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 text-sm font-semibold">+ 📷 Fotografía</button>
      </div>
      <p id="partes-total" class="text-sm font-semibold text-indigo-700"></p>
    </div>

    ${sec(4, 'Puntaje y lugar')}
    <div class="grid grid-cols-2 gap-3">
      <label id="bloque-puntaje" class="block text-sm">Puntaje máximo<input name="puntaje_max" type="number" step="0.5" min="0.5" value="${esc(a.puntaje_max)}" class="${inp} mt-1"></label>
      <label class="block text-sm">📍 Punto de visita
        <select name="punto_id" class="${inp} mt-1"><option value="">(ninguno)</option>
        ${S.panel.puntos.map(p => `<option value="${esc(p.id)}" ${a.punto_id === p.id ? 'selected' : ''}>${esc(p.nombre)}</option>`).join('')}</select></label>
    </div>

    ${sec(5, 'Horario')}
    <div class="flex flex-wrap gap-2">
      <button type="button" data-rapido="1" class="px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold">Abrir ahora · 1 h</button>
      <button type="button" data-rapido="2" class="px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold">2 h</button>
      <button type="button" data-rapido="3" class="px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold">3 h</button>
      <button type="button" data-rapido="dia" class="px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold">Hasta el fin del día</button>
    </div>
    <div class="grid grid-cols-2 gap-3">
      <label class="block text-sm">Abre<input name="fecha_inicio" type="datetime-local" required value="${aLocalInput(a.fecha_inicio)}" class="${inp} mt-1"></label>
      <label class="block text-sm">Cierra<input name="fecha_fin" type="datetime-local" required value="${aLocalInput(a.fecha_fin)}" class="${inp} mt-1"></label>
    </div>

    <label class="flex items-center justify-between gap-3 bg-indigo-50 rounded-2xl p-3 cursor-pointer">
      <span class="text-sm font-medium">📡 Registrar la ubicación (GPS) del estudiante al responder</span>
      <span class="relative shrink-0">
        <input type="checkbox" name="requiere_gps" class="peer sr-only" ${a.requiere_gps !== 'no' ? 'checked' : ''}>
        <span class="block h-6 w-11 rounded-full bg-slate-300 peer-checked:bg-emerald-500 transition"></span>
        <span class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5"></span>
      </span>
    </label>
    <button class="w-full bg-teal-700 text-white font-bold py-3 rounded-2xl shadow">Guardar actividad</button>
  </form>`);

  const f = $('#f-act');
  const getRub = k => k === 'm' ? rubM : (partes[+k.slice(1)] || {}).rubrica;

  const pintarOps = () => {
    $('#ops-lista').innerHTML = ops.map((o, i) => `<div class="flex items-center gap-2">
      <input type="radio" name="corr" value="${i}" ${i === corr ? 'checked' : ''} class="h-5 w-5 accent-emerald-600 shrink-0" title="Marcar como correcta">
      <span class="h-8 w-8 shrink-0 rounded-full bg-slate-100 flex items-center justify-center font-bold text-sm">${String.fromCharCode(65 + i)}</span>
      <input data-op="${i}" value="${esc(o)}" placeholder="Alternativa ${String.fromCharCode(65 + i)}" class="${inp} flex-1">
      ${ops.length > 2 ? `<button type="button" data-borrar-op="${i}" class="text-rose-500 text-xl px-1" aria-label="Quitar">×</button>` : ''}</div>`).join('');
  };
  const pintarRubMain = () => { $('#rub-main').innerHTML = htmlRub(rubM, 'm'); };
  const totalPts = () => {
    const t = partes.reduce((s, p) => s + (Number(p.puntaje) || 0), 0);
    const el = $('#partes-total');
    if (el) el.textContent = 'Puntaje total del ejercicio: ' + t + ' pt';
  };
  const pintarPartes = () => {
    $('#partes-lista').innerHTML = partes.map((p, i) => {
      let cuerpo = '';
      if (p.tipo === 'alternativas') {
        cuerpo = '<p class="text-xs text-slate-500">Marque con el círculo verde la correcta.</p>' +
          p.opciones.map((o, j) => `<div class="flex items-center gap-2">
            <input type="radio" name="pc_${i}" data-pi="${i}" value="${j}" ${j === p.corrIdx ? 'checked' : ''} class="h-5 w-5 accent-emerald-600 shrink-0">
            <span class="h-7 w-7 shrink-0 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs">${String.fromCharCode(65 + j)}</span>
            <input data-pk="op" data-pi="${i}" data-oj="${j}" value="${esc(o)}" placeholder="Alternativa ${String.fromCharCode(65 + j)}" class="${inp} flex-1">
            ${p.opciones.length > 2 ? `<button type="button" data-delop="${i}:${j}" class="text-rose-500 text-xl px-1" aria-label="Quitar">×</button>` : ''}</div>`).join('') +
          `<button type="button" data-addop="${i}" class="text-xs font-semibold text-indigo-700">+ Agregar alternativa</button>`;
      } else {
        cuerpo = (p.tipo === 'foto' ? '<p class="text-xs text-slate-500">📷 El estudiante subirá una fotografía en esta parte.</p>' : '') +
          htmlRub(p.rubrica, 'p' + i) +
          `<textarea data-pk="pauta" data-pi="${i}" rows="2" class="${inp}" placeholder="Respuesta esperada o indicaciones para la IA (opcional si usa rúbrica)">${esc(p.pauta)}</textarea>`;
      }
      return `<div class="rounded-2xl border-2 border-indigo-100 bg-indigo-50/40 p-3 space-y-2">
        <div class="flex items-center gap-2">
          <span class="h-7 w-7 shrink-0 rounded-full bg-indigo-600 text-white text-sm font-bold flex items-center justify-center">${i + 1}</span>
          <select data-pk="tipo" data-pi="${i}" class="${inp} flex-1">${optTipo(p.tipo)}</select>
          <label class="text-xs flex items-center gap-1 shrink-0">Pts
            <input data-pk="puntaje" data-pi="${i}" type="number" step="0.5" min="0.5" value="${esc(p.puntaje)}" class="w-16 border rounded-lg px-2 py-1 bg-white"></label>
          <button type="button" data-delparte="${i}" class="text-rose-500 text-xl px-1" aria-label="Quitar parte">×</button>
        </div>
        <textarea data-pk="enunciado" data-pi="${i}" rows="2" class="${inp}" placeholder="Pregunta o instrucción de esta parte">${esc(p.enunciado)}</textarea>
        ${cuerpo}
      </div>`;
    }).join('');
    totalPts();
  };
  const repintarRub = k => (k === 'm' ? pintarRubMain() : pintarPartes());
  pintarOps();
  pintarRubMain();
  pintarPartes();

  const alternar = () => {
    const t = f.tipo.value;
    $('#bloque-alt').classList.toggle('hidden', t !== 'alternativas');
    $('#bloque-pauta').classList.toggle('hidden', t !== 'desarrollo' && t !== 'foto');
    $('#bloque-grupo').classList.toggle('hidden', t !== 'grupo');
    $('#bloque-puntaje').classList.toggle('hidden', t === 'grupo');
    $('#nota-enun').classList.toggle('hidden', t !== 'grupo');
    f.enunciado.required = t !== 'grupo';
  };
  alternar();

  // La IA propone criterios y niveles; el docente los puede editar
  const sugerirRub = async k => {
    const esM = k === 'm', p = esM ? null : partes[+k.slice(1)];
    const enun = (esM ? f.enunciado.value : p.enunciado).trim();
    const tipo = esM ? f.tipo.value : p.tipo;
    if (enun.length < 5) return aviso('Escriba primero la pregunta para que la IA pueda sugerir los criterios.', 'error');
    const arr = getRub(k);
    if (arr.some(c => c.criterio.trim()) && !confirm('¿Reemplazar los criterios actuales por la sugerencia de la IA?')) return;
    cargando(true, 'La IA está preparando la rúbrica…');
    try {
      const d = await api('sugerirRubrica', { enunciado: enun, tipo, contexto: esM ? '' : f.enunciado.value.trim() });
      arr.splice(0, arr.length, ...d.criterios);
      repintarRub(k);
      aviso('Rúbrica sugerida. Revísela y ajústela si lo desea.');
    } catch (e) { aviso(e.message, 'error'); } finally { cargando(false); }
  };

  f.addEventListener('change', ev => {
    const t = ev.target;
    if (t.name === 'tipo') return alternar();
    if (t.name === 'corr') { corr = +t.value; return; }
    if (t.type === 'radio' && t.dataset.pi !== undefined) { partes[+t.dataset.pi].corrIdx = +t.value; return; }
    if (t.dataset.pk === 'tipo') {
      const p = partes[+t.dataset.pi];
      p.tipo = t.value;
      if (p.tipo === 'alternativas' && (!p.opciones || p.opciones.length < 2)) p.opciones = ['', '', '', ''];
      pintarPartes();
    }
  });
  f.addEventListener('input', ev => {
    const t = ev.target;
    if (t.dataset.rf !== undefined) {
      const c = (getRub(t.dataset.rk) || [])[+t.dataset.ri];
      if (c) c[t.dataset.rf] = t.dataset.rf === 'peso' ? (Number(t.value) || 1) : t.value;
      return;
    }
    if (t.dataset.op !== undefined) { ops[+t.dataset.op] = t.value; return; }
    if (!t.dataset.pk || t.dataset.pk === 'tipo') return;
    const p = partes[+t.dataset.pi];
    if (!p) return;
    if (t.dataset.pk === 'op') p.opciones[+t.dataset.oj] = t.value;
    else p[t.dataset.pk] = t.value;
    if (t.dataset.pk === 'puntaje') totalPts();
  });
  f.addEventListener('click', ev => {
    const T = ev.target;
    const bo = T.closest('[data-borrar-op]');
    if (bo) {
      const i = +bo.dataset.borrarOp;
      ops.splice(i, 1);
      if (corr === i) corr = 0; else if (corr > i) corr--;
      return pintarOps();
    }
    if (T.id === 'ops-mas') { if (ops.length < 8) { ops.push(''); pintarOps(); } return; }
    const ra = T.closest('[data-rubadd]');
    if (ra) { const arr = getRub(ra.dataset.rubadd); if (arr && arr.length < 8) { arr.push(critNuevo()); repintarRub(ra.dataset.rubadd); } return; }
    const rd = T.closest('[data-rubdel]');
    if (rd) { const [k, i] = rd.dataset.rubdel.split(':'); getRub(k).splice(+i, 1); return repintarRub(k); }
    const ria = T.closest('[data-rubia]');
    if (ria) return sugerirRub(ria.dataset.rubia);
    const ap = T.closest('[data-addparte]');
    if (ap) { partes.push(parteNueva(ap.dataset.addparte)); return pintarPartes(); }
    const dp = T.closest('[data-delparte]');
    if (dp) {
      if (partes.length <= 1) return aviso('El ejercicio debe tener al menos una parte.', 'error');
      partes.splice(+dp.dataset.delparte, 1);
      return pintarPartes();
    }
    const ao = T.closest('[data-addop]');
    if (ao) { const p = partes[+ao.dataset.addop]; if (p.opciones.length < 8) { p.opciones.push(''); pintarPartes(); } return; }
    const dop = T.closest('[data-delop]');
    if (dop) {
      const [i, j] = dop.dataset.delop.split(':').map(Number);
      const p = partes[i];
      p.opciones.splice(j, 1);
      if (p.corrIdx === j) p.corrIdx = 0; else if (p.corrIdx > j) p.corrIdx--;
      return pintarPartes();
    }
    const q = T.closest('[data-rapido]');
    if (q) {
      const ini = new Date(), fn = new Date();
      if (q.dataset.rapido === 'dia') fn.setHours(23, 59, 0, 0); else fn.setTime(ini.getTime() + Number(q.dataset.rapido) * 3600e3);
      f.fecha_inicio.value = aLocalInput(ini.toISOString());
      f.fecha_fin.value = aLocalInput(fn.toISOString());
    }
  });

  const limpiaR = arr => (arr || []).map(c => ({
    criterio: String(c.criterio || '').trim(), logrado: String(c.logrado || '').trim(),
    medio: String(c.medio || '').trim(), no: String(c.no || '').trim(),
    peso: Number(c.peso) > 0 ? Number(c.peso) : 1
  })).filter(c => c.criterio);

  f.onsubmit = async ev => {
    ev.preventDefault();
    const d = new FormData(f), tipo = d.get('tipo');
    let correcta = '', opciones = [], partesOut = [], pmax = +d.get('puntaje_max');
    if (tipo === 'alternativas') {
      const limpias = ops.map(s => s.trim());
      opciones = limpias.filter(Boolean);
      correcta = limpias[corr] || '';
      if (opciones.length < 2) return aviso('Escriba al menos 2 alternativas.', 'error');
      if (!correcta) return aviso('Marque como correcta una alternativa que tenga texto.', 'error');
    }
    if (tipo === 'grupo') {
      if (!partes.length) return aviso('Agregue al menos una parte.', 'error');
      for (let i = 0; i < partes.length; i++) {
        const p = partes[i];
        if (!p.enunciado.trim()) return aviso('Escriba la pregunta de la parte ' + (i + 1) + '.', 'error');
        if (p.tipo === 'alternativas') {
          const o = p.opciones.map(s => s.trim());
          if (o.filter(Boolean).length < 2) return aviso('La parte ' + (i + 1) + ' necesita al menos 2 alternativas.', 'error');
          if (!o[p.corrIdx]) return aviso('En la parte ' + (i + 1) + ', marque como correcta una alternativa que tenga texto.', 'error');
        }
      }
      partesOut = partes.map((p, i) => {
        const o = p.opciones.map(s => s.trim());
        return {
          id: 'p' + (i + 1), tipo: p.tipo, enunciado: p.enunciado.trim(),
          opciones: p.tipo === 'alternativas' ? o.filter(Boolean) : [],
          correcta: p.tipo === 'alternativas' ? o[p.corrIdx] : '',
          pauta: p.tipo === 'alternativas' ? '' : (p.pauta || '').trim(),
          rubrica: p.tipo === 'alternativas' ? [] : limpiaR(p.rubrica),
          puntaje: Number(p.puntaje) || 1
        };
      });
      pmax = partesOut.reduce((s, p) => s + p.puntaje, 0);
    }
    const ini = new Date(d.get('fecha_inicio')), fin2 = new Date(d.get('fecha_fin'));
    if (!(fin2 > ini)) return aviso('La hora de cierre debe ser posterior a la de apertura.', 'error');
    cargando(true, 'Guardando…');
    try {
      const file = d.get('imagen');
      const imagenB64 = file && file.size ? await comprimirImagen(file) : null;
      await api('guardarActividad', {
        imagenB64,
        actividad: {
          id: id || '', titulo: d.get('titulo').trim(), tipo, enunciado: String(d.get('enunciado') || '').trim(),
          opciones, correcta, partes: partesOut,
          pauta: (tipo === 'desarrollo' || tipo === 'foto') ? String(d.get('pauta') || '').trim() : '',
          rubrica: (tipo === 'desarrollo' || tipo === 'foto') ? limpiaR(rubM) : [],
          puntaje_max: pmax, fecha_inicio: ini.toISOString(), fecha_fin: fin2.toISOString(),
          punto_id: d.get('punto_id'), imagen_id: a.imagen_id || '', orden: a.orden || '',
          requiere_gps: d.get('requiere_gps') ? 'si' : 'no'
        }
      });
      cerrarModal(); await cargarPanel(); renderDocente(); aviso('Actividad guardada.');
    } catch (e) { cargando(false); aviso(e.message, 'error'); }
  };
}

/* ---------- Puntos (se marcan tocando el mapa) ---------- */
function renderPuntos() {
  const P = S.panel;
  $('#doc-contenido').innerHTML = `
    <div class="grid md:grid-cols-2 gap-4">
      <div class="space-y-3">
        <div class="flex justify-between items-center"><h3 class="font-bold text-lg">Puntos de visita</h3>
          <button data-accion="nuevo-punto" class="bg-teal-700 text-white font-semibold px-4 py-2 rounded-xl shadow">+ Nuevo punto</button></div>
        ${P.puntos.map((p, i) => `<div class="bg-white/95 rounded-2xl shadow p-4">
          <b>${i + 1}. ${esc(p.nombre)}</b><p class="text-sm text-slate-500">${esc(p.descripcion || '')}</p>
          <p class="text-xs text-slate-400">${Number(p.lat).toFixed(5)}, ${Number(p.lng).toFixed(5)}</p>
          <div class="flex gap-2 mt-2"><button data-accion="editar-punto" data-id="${esc(p.id)}" class="px-3 py-1.5 rounded-xl bg-slate-100 text-sm">✏️ Editar</button>
          <button data-accion="borrar-punto" data-id="${esc(p.id)}" class="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 text-sm">Eliminar</button></div></div>`).join('') || '<div class="bg-white/90 rounded-2xl p-6 text-center text-slate-500">Aún no hay puntos. Pinche «Nuevo punto» y toque el mapa.</div>'}
      </div>
      <div id="mapa-docente" class="h-80 md:h-[28rem] rounded-2xl overflow-hidden border shadow" style="isolation:isolate"></div>
    </div>`;
  crearMapa('mapa-docente', P.puntos, {});
}
function formPunto(id) {
  const p = id ? S.panel.puntos.find(x => x.id === id) : { nombre: '', descripcion: '', lat: '', lng: '' };
  const inp = 'w-full border rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300';
  modal(`<form id="f-punto" class="space-y-3 pt-2">
    <h3 class="text-lg font-extrabold pr-6">${id ? 'Editar' : 'Nuevo'} punto de visita</h3>
    <input name="nombre" required class="${inp}" placeholder="Nombre del lugar" value="${esc(p.nombre)}">
    <textarea name="descripcion" rows="2" class="${inp}" placeholder="Descripción (opcional)">${esc(p.descripcion || '')}</textarea>
    <div class="bg-indigo-50 rounded-2xl p-3 space-y-2">
      <div class="text-sm font-semibold">📍 Marque el lugar en el mapa</div>
      <div class="flex gap-2">
        <input id="p-buscar" class="${inp} flex-1" placeholder="Buscar lugar o dirección (ej: Cerro Caracol, Concepción)">
        <button type="button" id="p-ir" class="bg-teal-700 text-white font-semibold px-4 rounded-xl">Buscar</button>
      </div>
      <div id="mapa-punto" class="h-64 rounded-2xl overflow-hidden border" style="isolation:isolate"></div>
      <p id="p-coord" class="text-xs text-slate-600">Toque el mapa para marcar el punto. Puede arrastrar el marcador para ajustarlo.</p>
      <button type="button" id="btn-mi-pos" class="text-sm underline text-teal-700 font-semibold">📡 Usar mi ubicación actual</button>
    </div>
    <input type="hidden" name="lat" value="${esc(p.lat)}"><input type="hidden" name="lng" value="${esc(p.lng)}">
    <button class="w-full bg-teal-700 text-white font-bold py-3 rounded-2xl shadow">Guardar punto</button>
  </form>`);
  const f = $('#f-punto');
  const c = capasBase();
  const m = L.map('mapa-punto', { layers: [c.osm] });
  L.control.layers({ 'Calles': c.osm, 'Topográfico (relieve)': c.topo, 'Topográfico Esri': c.esri }).addTo(m);
  S.mapaModal = m;
  const otros = S.panel.puntos.filter(q => q.id !== id && isFinite(q.lat) && isFinite(q.lng));
  otros.forEach(q => L.circleMarker([q.lat, q.lng], { radius: 6, color: '#64748b', fillColor: '#94a3b8', fillOpacity: 0.9 }).addTo(m).bindTooltip(q.nombre));
  let mk = null;
  const poner = (la, lo, zoom) => {
    if (mk) mk.setLatLng([la, lo]);
    else {
      mk = L.marker([la, lo], { draggable: true }).addTo(m);
      mk.on('dragend', () => { const q = mk.getLatLng(); poner(q.lat, q.lng); });
    }
    f.lat.value = la.toFixed(6); f.lng.value = lo.toFixed(6);
    $('#p-coord').textContent = `✔ Punto marcado: ${la.toFixed(5)}, ${lo.toFixed(5)}`;
    if (zoom) m.setView([la, lo], zoom);
  };
  const la0 = parseFloat(p.lat), lo0 = parseFloat(p.lng);
  if (isFinite(la0) && isFinite(lo0)) { m.setView([la0, lo0], 15); poner(la0, lo0); }
  else if (otros.length) m.fitBounds(otros.map(q => [q.lat, q.lng]), { padding: [30, 30], maxZoom: 14 });
  else m.setView([-36.83, -73.05], 12);
  m.on('click', ev => poner(ev.latlng.lat, ev.latlng.lng));
  setTimeout(() => m.invalidateSize(), 250);

  const buscar = async () => {
    const q = $('#p-buscar').value.trim();
    if (!q) return aviso('Escriba el nombre de un lugar.', 'error');
    try {
      const r = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=es&q=' + encodeURIComponent(q));
      const j = await r.json();
      if (!j.length) return aviso('No se encontró ese lugar. Pruebe con otro nombre o toque el mapa.', 'error');
      poner(parseFloat(j[0].lat), parseFloat(j[0].lon), 16);
    } catch (_) { aviso('No se pudo buscar. Revise su conexión o toque el mapa.', 'error'); }
  };
  $('#p-ir').onclick = buscar;
  $('#p-buscar').addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); buscar(); } });
  $('#btn-mi-pos').onclick = async () => {
    const pos = await obtenerPosicion();
    if (!pos) return aviso('No se pudo obtener la ubicación.', 'error');
    poner(pos.lat, pos.lng, 16);
  };
  f.onsubmit = async ev => {
    ev.preventDefault();
    const d = new FormData(f);
    const lat = parseFloat(d.get('lat')), lng = parseFloat(d.get('lng'));
    if (!isFinite(lat) || !isFinite(lng)) return aviso('Toque el mapa para marcar el punto.', 'error');
    cargando(true, 'Guardando…');
    try {
      await api('guardarPunto', { punto: { id: id || '', nombre: d.get('nombre').trim(), descripcion: d.get('descripcion').trim(), lat, lng } });
      cerrarModal(); await cargarPanel(); renderDocente();
    } catch (e) { cargando(false); aviso(e.message, 'error'); }
  };
}

/* ---------- Respuestas (el docente ve todo; evalúa con IA o a mano) ---------- */
function renderRespuestas() {
  const P = S.panel, f = S.filtroR, est = estActivos();
  const pills = [['', 'Todas']].concat(P.actividades.map((a, i) => [a.id, (i + 1) + '. ' + a.titulo]));
  const lista = P.actividades.filter(a => !f.act || a.id === f.act);
  $('#doc-contenido').innerHTML = `
    <div class="bg-white/95 rounded-2xl shadow p-4 space-y-3">
      <div class="flex gap-2 overflow-x-auto pb-1">${pills.map(([k, t]) =>
        `<button data-accion="filtro-act" data-id="${esc(k)}" class="whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-semibold ${f.act === k ? 'bg-indigo-700 text-white' : 'bg-slate-100'}">${esc(t)}</button>`).join('')}</div>
      <div class="flex flex-wrap gap-3 items-center">
        <select id="filtro-estado" class="border rounded-xl px-3 py-2 text-sm">
          <option value="todas" ${f.estado === 'todas' ? 'selected' : ''}>Todas las respuestas</option>
          <option value="pendientes" ${f.estado === 'pendientes' ? 'selected' : ''}>Por evaluar</option>
          <option value="evaluadas" ${f.estado === 'evaluadas' ? 'selected' : ''}>Ya evaluadas</option>
        </select>
        <button data-accion="recargar" class="px-3 py-2 rounded-xl bg-slate-100 text-sm font-semibold">🔄 Actualizar</button>
        <button data-accion="ia-todas" class="ml-auto bg-slate-800 text-white text-sm font-semibold px-3 py-2 rounded-xl">🤖 Sugerir con IA las pendientes</button>
      </div>
    </div>
    <div class="space-y-5 mt-4">${lista.map(a => bloqueActividad(a, est)).join('') || '<p class="text-slate-500 text-center py-8">Aún no hay actividades.</p>'}</div>`;
  $('#filtro-estado').onchange = e => { S.filtroR.estado = e.target.value; redibujar(); };
}
function bloqueActividad(a, est) {
  const P = S.panel, f = S.filtroR, T = TIPOS[a.tipo] || TIPOS.desarrollo;
  const todas = P.respuestas.filter(r => r.actividad_id === a.id);
  const rs = todas.filter(r => f.estado === 'todas' || (f.estado === 'pendientes' ? r.estado !== 'evaluada' : r.estado === 'evaluada'))
    .sort((x, y) => nombreDe(x.rut).localeCompare(nombreDe(y.rut), 'es'));
  const resp = new Set(todas.map(r => rutKey(r.rut)));
  const sin = est.filter(e => !resp.has(rutKey(e.rut)));
  let detalle;
  if (a.tipo === 'grupo') {
    detalle = (a.enunciado ? `<p class="mt-2 whitespace-pre-line">${esc(a.enunciado)}</p>` : '') +
      (a.partes || []).map((p, i) => `<div class="mt-2 border-t pt-2"><b>Parte ${i + 1} (${TIPOS[p.tipo].nom}, ${esc(p.puntaje)} pt)</b>
        <p class="whitespace-pre-line">${esc(p.enunciado)}</p>
        ${p.tipo === 'alternativas' ? `<p class="text-emerald-700 font-semibold">✔ Correcta: ${esc(p.correcta)}</p>` : (textoRubrica(p.rubrica) + (p.pauta ? `<p><b>Indicaciones:</b> ${esc(p.pauta)}</p>` : ''))}</div>`).join('');
  } else {
    detalle = `<p class="mt-2 whitespace-pre-line">${esc(a.enunciado)}</p>` +
      (a.tipo === 'alternativas' ? `<p class="mt-2 text-emerald-700 font-semibold">✔ Correcta: ${esc(a.correcta)}</p>` : (textoRubrica(a.rubrica) + (a.pauta ? `<p class="mt-2"><b>Indicaciones:</b> ${esc(a.pauta)}</p>` : '')));
  }
  return `<section>
    <div class="flex items-center gap-2 mb-2">
      <span class="h-9 w-9 rounded-xl bg-${T.c}-100 flex items-center justify-center text-xl">${T.ic}</span>
      <h3 class="font-bold flex-1">${esc(a.titulo)}</h3>
      <span class="text-xs bg-white/90 rounded-full px-2 py-1 shadow">${todas.length}/${est.length} respondieron</span>
    </div>
    <details class="text-sm bg-white/80 rounded-xl p-3 mb-2"><summary class="cursor-pointer text-slate-600">Ver enunciado${a.tipo === 'alternativas' ? ' y alternativa correcta' : ' y rúbrica'}</summary>${detalle}</details>
    <div class="space-y-3">${rs.map(r => tarjetaResp(r, a)).join('') || '<div class="bg-white/80 rounded-2xl p-4 text-center text-slate-500 text-sm">No hay respuestas con este filtro.</div>'}</div>
    ${sin.length ? `<details class="mt-2 text-sm bg-amber-50 rounded-xl p-3"><summary class="cursor-pointer font-semibold text-amber-800">Sin responder (${sin.length})</summary>
      <ul class="mt-2 list-disc pl-5 text-slate-700">${sin.map(e => `<li>${esc(e.nombre)} <span class="text-xs text-slate-400">${esc(e.curso)}</span></li>`).join('')}</ul></details>` : ''}
  </section>`;
}
function enlacesUbicacion(r) {
  const la = parseFloat(r.lat), lo = parseFloat(r.lng);
  if (!isFinite(la) || !isFinite(lo)) return '<p class="text-xs text-slate-400">Sin ubicación registrada.</p>';
  return `<p class="text-xs text-slate-600">📍 ${la.toFixed(5)}, ${lo.toFixed(5)} (±${esc(r.precision_m)} m) ·
    <a class="underline text-teal-700" target="_blank" rel="noopener" href="https://www.google.com/maps?q=${la},${lo}">Google Maps</a> ·
    <a class="underline text-teal-700" target="_blank" rel="noopener" href="https://earth.google.com/web/search/${la},${lo}">Google Earth</a></p>`;
}
function detalleGrupo(a, r) {
  const resp = jsonSeguro(r.respuesta, {}), fotos = jsonSeguro(r.fotos, {});
  return (a.partes || []).map((p, i) => {
    const v = resp[p.id];
    let cuerpo;
    if (p.tipo === 'alternativas') {
      const ok = String(v || '').trim() === String(p.correcta).trim();
      cuerpo = `<p>${v ? esc(v) : '<i>(sin respuesta)</i>'}</p>
        <div class="mt-1">${ok ? chip('Correcta', 'emerald') : chip('Incorrecta', 'rose')} <span class="text-xs text-slate-500">${esc(p.puntaje)} pt</span></div>`;
    } else {
      cuerpo = `<p class="whitespace-pre-line">${v ? esc(v) : '<i>(sin texto)</i>'}</p>` +
        (p.tipo === 'foto' && fotos[p.id] ? `<button data-accion="ver-foto" data-id="${esc(fotos[p.id])}" class="text-sm underline text-teal-700 mt-1">📷 Ver fotografía</button> ` : '') +
        `<span class="text-xs text-slate-500">${esc(p.puntaje)} pt</span>`;
    }
    return `<div class="rounded-xl bg-white border p-2">
      <div class="text-xs font-semibold text-slate-500">Parte ${i + 1} · ${TIPOS[p.tipo].nom}</div>
      <div class="text-xs text-slate-500 mb-1 whitespace-pre-line">${esc(p.enunciado)}</div>${cuerpo}</div>`;
  }).join('');
}
// Selectores de nivel (Logrado / Medianamente logrado / No observado) por criterio
function bloqueRubricaEval(r, a) {
  const its = itemsRub(a);
  if (!its.length) return '';
  const ev = jsonSeguro(r.evaluacion, {});
  const html = its.map(it => `<div class="rounded-xl bg-indigo-50/60 border border-indigo-100 p-2 space-y-1">
    <div class="text-xs font-bold text-indigo-800">📋 ${esc(it.etiqueta)} · ${esc(it.max)} pt</div>
    ${it.rubrica.map((c, i) => `<div class="flex items-center gap-2 text-sm"><span class="flex-1">${esc(c.criterio)}</span>
      <select data-niv="${esc(it.id)}" data-ci="${i}" class="border rounded-lg px-2 py-1 text-xs bg-white">
        <option value="">Elegir nivel…</option>
        ${[['L', 'Logrado'], ['M', 'Medianamente logrado'], ['N', 'No observado']].map(([v, t]) => `<option value="${v}" ${((ev[it.id] || [])[i] || '') === v ? 'selected' : ''}>${t}</option>`).join('')}
      </select></div>`).join('')}</div>`).join('');
  return html + (sinRubrica(a) ? '<p class="text-xs text-slate-500">Hay partes sin rúbrica: complete a mano el puntaje total.</p>' : '');
}
function tarjetaResp(r, a) {
  const alt = a.tipo === 'alternativas', grupo = a.tipo === 'grupo';
  const ok = alt && String(r.respuesta).trim() === String(a.correcta).trim();
  const manual = hayParteManual(a);
  const p0 = r.estado === 'evaluada' ? r.puntaje_final
    : (tieneIA(r) ? r.puntaje_ia : (r.puntaje_final !== '' && r.puntaje_final != null ? r.puntaje_final : ''));
  const c0 = r.retro_docente || r.comentario_ia || '';
  const inp = 'border rounded-xl px-3 py-2';
  const caja = grupo
    ? `<div class="space-y-2">${detalleGrupo(a, r)}</div>`
    : `<div class="text-sm bg-slate-50 rounded-xl p-3">
        <div class="text-xs font-semibold text-slate-500 mb-1">Respuesta del estudiante</div>
        <p class="whitespace-pre-line">${r.respuesta ? esc(r.respuesta) : '<i>(solo fotografía)</i>'}</p>
        ${alt ? `<div class="mt-2">${ok ? chip('Correcta', 'emerald') : chip('Incorrecta', 'rose')}</div>` : ''}
      </div>`;
  return `<article id="ev-${esc(r.id)}" class="bg-white/95 rounded-2xl shadow p-4 space-y-2">
    <div class="flex justify-between gap-2 items-start">
      <div><b>${esc(nombreDe(r.rut))}</b><div class="text-xs text-slate-400">${fechaCorta(r.timestamp_cliente || r.timestamp_servidor)}</div></div>
      ${r.estado === 'evaluada' ? chip('Evaluada', 'emerald') : chip('Por evaluar', 'amber')}
    </div>
    ${caja}
    ${!grupo && r.foto_id ? `<button data-accion="ver-foto" data-id="${esc(r.foto_id)}" class="text-sm underline text-teal-700">📷 Ver fotografía</button>` : ''}
    ${enlacesUbicacion(r)}
    ${bloqueRubricaEval(r, a)}
    <div class="flex flex-wrap gap-2 items-start">
      <input data-campo="puntaje" type="number" step="0.1" min="0" max="${esc(a.puntaje_max)}" value="${esc(p0)}" placeholder="Pts" class="${inp} w-24">
      <textarea data-campo="retro" rows="2" placeholder="Comentario breve para el estudiante" class="${inp} flex-1 min-w-[12rem]">${esc(c0)}</textarea>
    </div>
    ${grupo && r.estado !== 'evaluada' ? '<p class="text-xs text-slate-500">El puntaje de las alternativas ya está sumado. Complete el de las partes de desarrollo y fotografía, o use la IA.</p>' : ''}
    ${tieneIA(r) ? `<p class="text-xs text-indigo-600">🤖 Sugerencia de la IA: ${esc(r.puntaje_ia)} de ${esc(a.puntaje_max)} pt. Revísela antes de aprobar.</p>` : ''}
    <p class="text-xs text-slate-500">Al guardar, el estudiante verá su puntaje, los niveles de la rúbrica y su comentario.</p>
    <div class="flex flex-wrap gap-2">
      ${manual ? `<button data-accion="ia-uno" data-id="${esc(r.id)}" class="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 text-sm font-semibold">🤖 Sugerir con IA</button>` : ''}
      ${manual && tieneIA(r) ? `<button data-accion="aprobar-ia" data-id="${esc(r.id)}" class="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold">✔ Aprobar sugerencia</button>` : ''}
      <button data-accion="guardar-eval" data-id="${esc(r.id)}" class="px-3 py-1.5 rounded-xl bg-slate-800 text-white text-sm font-semibold">Guardar mi evaluación</button>
    </div></article>`;
}
// Al cambiar un nivel de la rúbrica, el puntaje se recalcula solo (si todos los criterios tienen nivel)
function recalcularCard(sel) {
  const card = sel.closest('article');
  if (!card) return;
  const r = S.panel.respuestas.find(x => x.id === card.id.replace(/^ev-/, ''));
  if (!r) return;
  const a = actPor(r.actividad_id);
  const its = itemsRub(a);
  if (!its.length || sinRubrica(a)) return;
  const niv = {};
  $$('[data-niv]', card).forEach(s => { (niv[s.dataset.niv] = niv[s.dataset.niv] || [])[+s.dataset.ci] = s.value; });
  let total = autoPuntos(a, r);
  for (const x of its) {
    const arr = Array.from(niv[x.id] || [], v => v || '');
    if (arr.length < x.rubrica.length || arr.some(v => !v)) return;
    total += puntajeRubrica(x.rubrica, arr, x.max);
  }
  const campo = $('[data-campo=puntaje]', card);
  if (campo) campo.value = Math.round(total * 10) / 10;
}
document.addEventListener('change', e => {
  if (e.target && e.target.dataset && e.target.dataset.niv !== undefined) recalcularCard(e.target);
});

async function iaUna(id, silencioso) {
  const r = S.panel.respuestas.find(x => x.id === id);
  if (!silencioso) cargando(true, 'Consultando a la IA…');
  try {
    const d = await api('evaluarIA', { respuesta_id: id });
    r.puntaje_ia = d.puntaje; r.comentario_ia = d.comentario;
    r.evaluacion = JSON.stringify(d.evaluacion || {});
    if (!silencioso) redibujar();
  } finally { if (!silencioso) cargando(false); }
}
async function guardarEval(id, usarIA) {
  const r = S.panel.respuestas.find(x => x.id === id);
  const ev = Object.assign({}, jsonSeguro(r.evaluacion, {}));
  let puntaje, retro;
  if (usarIA) {
    if (!tieneIA(r)) return aviso('Primero pida la sugerencia de la IA.', 'error');
    puntaje = r.puntaje_ia; retro = r.comentario_ia;
  } else {
    const card = $('#ev-' + id);
    puntaje = $('[data-campo=puntaje]', card).value;
    retro = $('[data-campo=retro]', card).value.trim();
    if (puntaje === '') return aviso('Indique el puntaje.', 'error');
    const grupos = {};
    $$('[data-niv]', card).forEach(s => { (grupos[s.dataset.niv] = grupos[s.dataset.niv] || [])[+s.dataset.ci] = s.value; });
    Object.keys(grupos).forEach(k => {
      const arr = Array.from(grupos[k], v => v || '');
      if (arr.some(v => v)) ev[k] = arr.map(v => v || 'N');
    });
  }
  cargando(true, 'Guardando…');
  try {
    const d = await api('guardarEvaluacion', { respuesta_id: id, puntaje_final: Number(puntaje), retro, evaluacion: ev });
    r.puntaje_final = d.puntaje_final; r.retro_docente = retro; r.estado = 'evaluada'; r.evaluacion = JSON.stringify(ev);
    redibujar(); aviso('Evaluación guardada. El estudiante ya puede verla.');
  } catch (e) { aviso(e.message, 'error'); } finally { cargando(false); }
}
async function iaTodas() {
  const f = S.filtroR;
  const rs = S.panel.respuestas.filter(r => {
    const a = actPor(r.actividad_id);
    return a && hayParteManual(a) && (!f.act || r.actividad_id === f.act) && r.estado !== 'evaluada' && !tieneIA(r);
  });
  if (!rs.length) return aviso('No hay respuestas pendientes sin sugerencia.');
  let n = 0;
  for (const r of rs) {
    n++;
    if (n > 1) await new Promise(res => setTimeout(res, 2500)); // pausa para no pasar el límite por minuto de la IA
    cargando(true, `Consultando a la IA (${n}/${rs.length})…`);
    try { await iaUna(r.id, true); } catch (e) { aviso(e.message, 'error'); break; }
  }
  cargando(false); redibujar();
}

/* ---------- Ubicaciones ---------- */
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

/* ---------- Reportes ---------- */
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
    for (const r of d.rs) for (const fid of fotosDe(r)) fotos[fid] = await dataUrlArchivo(fid).catch(() => null);
    const resp = d.rs.map(r => ({ lat: r.lat, lng: r.lng, n: acts.findIndex(a => a.id === r.actividad_id) + 1 }));
    const detalle = acts.map((a, i) => {
      const r = d.rs.find(x => x.actividad_id === a.id);
      const hayGPS = r && isFinite(parseFloat(r.lat)) && isFinite(parseFloat(r.lng));
      const imgs = r ? fotosDe(r).filter(fid => fotos[fid]).map(fid => `<img src="${fotos[fid]}" style="max-height:200px;max-width:48%;border-radius:6px;margin-right:6px">`).join('') : '';
      return `<div class="avoid" style="border:1px solid #cbd5e1;border-radius:8px;padding:10px;margin-bottom:10px">
        <b>${i + 1}. ${esc(a.titulo)}</b> <span style="color:#64748b">(${esc(a.puntaje_max)} pt)</span>
        ${r ? `<p style="margin:6px 0;white-space:pre-line">${esc(respuestaTexto(a, r)) || '<i>(solo fotografía)</i>'}</p>
          ${imgs}
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

/* ---------- Ajustes ---------- */
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

/* ---------- Acciones del panel docente (las llama app.js) ---------- */
async function accionDocente(a, b, id) {
  switch (a) {
    case 'tab-doc': S.tabDoc = b.dataset.tab; return renderDocente();
    case 'nueva-act': return formActividad();
    case 'editar-act': return formActividad(id);
    case 'borrar-act':
      if (!confirm('¿Eliminar esta actividad? Las respuestas ya enviadas se conservan en la planilla.')) return;
      cargando(true); await api('eliminarActividad', { id }); await cargarPanel(); return renderDocente();
    case 'ver-resp': S.filtroR.act = id; S.tabDoc = 'respuestas'; renderDocente(); window.scrollTo(0, 0); return;
    case 'nuevo-punto': return formPunto();
    case 'editar-punto': return formPunto(id);
    case 'borrar-punto':
      if (!confirm('¿Eliminar este punto?')) return;
      cargando(true); await api('eliminarPunto', { id }); await cargarPanel(); return renderDocente();
    case 'filtro-act': S.filtroR.act = id || ''; return redibujar();
    case 'recargar': await cargarPanel(); return redibujar();
    case 'ia-uno': return iaUna(id, false);
    case 'aprobar-ia': return guardarEval(id, true);
    case 'guardar-eval': return guardarEval(id, false);
    case 'ia-todas': return iaTodas();
    case 'ver-foto': {
      cargando(true, 'Cargando fotografía…');
      let u = null;
      try { u = await dataUrlArchivo(id); } catch (_) { u = null; }
      cargando(false);
      return modal(`<div class="pt-4">${u
        ? `<img src="${u}" class="w-full rounded-xl" alt="Fotografía">`
        : '<p class="text-rose-600 text-sm">No se pudo mostrar la imagen aquí.</p>'}
        <a class="block mt-2 text-sm underline text-teal-700" target="_blank" rel="noopener" href="https://drive.google.com/file/d/${esc(id)}/view">Abrir en Google Drive</a></div>`);
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
}
