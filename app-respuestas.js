'use strict';
/* =========================================================
   SALIDA A TERRENO – app-respuestas.js  (ARCHIVO NUEVO)
   Pestaña «📥 Respuestas» para docentes: todas las respuestas de todas las actividades
   en un solo lugar, con filtros, corrección (rúbrica o puntaje), ayuda de IA opcional
   y avance al siguiente estudiante.
   Se carga DESPUÉS de app-guias.js, solo en docente.html.
   ========================================================= */
(function () {
  if (document.body.dataset.modo !== 'docente') return;

  const rutK = r => String(r || '').replace(/[^0-9kK]/g, '').toUpperCase();
  const js = (t, d) => { try { return t && typeof t === 'string' ? JSON.parse(t) : (t || d); } catch (_) { return d; } };
  const F = { est: 'todas', open: {}, act: '', curso: '', q: '' };
  const FACT = { L: 1, M: 0.5, N: 0 };
  const fotoCache = {};
  let listaNav = [], cargadoVez = false, cur = null;

  const acts = () => (S.panel && S.panel.actividades) || [];
  const ests = () => (S.panel && S.panel.estudiantes) || [];
  const resps = () => (S.panel && S.panel.respuestas) || [];
  const actDe = id => acts().find(a => a.id === id);
  const estDe = rut => { const k = rutK(rut); return ests().find(e => rutK(e.rut) === k) || { nombre: String(rut), curso: '' }; };
  const fmt = n => String(Math.round(Number(n) * 10) / 10).replace('.', ',');
  const chip = (t, c) => '<span class="text-[11px] font-bold px-2 py-1 rounded-lg ' + c + '">' + t + '</span>';

  if (typeof ACC_ESCRITURA !== 'undefined') ['guardarEvaluacion'].forEach(a => { try { ACC_ESCRITURA.add(a); } catch (_) {} });
  if (!TABS_DOC.some(t => t[0] === 'respuestas')) {
    const i = TABS_DOC.findIndex(t => t[0] === 'resumen');
    TABS_DOC.splice(i < 0 ? 0 : i + 1, 0, ['respuestas', '📥 Respuestas']);
  }

  /* ---------- Sin responder ---------- */
  const activos = () => ests().filter(e => String(e.activo).toLowerCase() !== 'no');
  function sinResp() {
    const hechas = {}; resps().forEach(r => { hechas[rutK(r.rut) + '|' + r.actividad_id] = 1; });
    const q = F.q.trim().toLowerCase(), out = [];
    acts().forEach(a => {
      if (F.act && a.id !== F.act) return;
      activos().forEach(e => {
        if (hechas[rutK(e.rut) + '|' + a.id]) return;
        if ((F.curso && e.curso !== F.curso) || (q && String(e.nombre).toLowerCase().indexOf(q) < 0)) return;
        out.push({ a: a, e: e });
      });
    });
    return out.sort((p, s2) => String(p.e.curso).localeCompare(String(s2.e.curso), 'es') || String(p.e.nombre).localeCompare(String(s2.e.nombre), 'es') || String(p.a.titulo).localeCompare(String(s2.a.titulo), 'es'));
  }
  const totalSin = () => { const h = {}; resps().forEach(r => { h[rutK(r.rut) + '|' + r.actividad_id] = 1; }); let n = 0; acts().forEach(a => activos().forEach(e => { if (!h[rutK(e.rut) + '|' + a.id]) n++; })); return n; };
  function abrirSin(rut, actId) {
    const a = actDe(actId), e = estDe(rut); if (!a) return;
    modal('<div class="space-y-3 pt-2"><div><div class="font-extrabold text-lg">' + esc(e.nombre) + '</div><div class="text-xs text-slate-500">' + esc(e.curso) + ' · ' + esc(a.titulo || '') + '</div></div>' +
      '<div class="rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-sm p-3">🚫 Este estudiante <b>no ha respondido</b> esta actividad.</div>' +
      '<p class="text-xs text-slate-600">Si lo desea, puede evaluarlo igual (por ejemplo, con nota mínima).</p>' +
      '<label class="text-sm font-bold flex items-center gap-2">Puntaje (0 a ' + fmt(a.puntaje_max) + '): <input id="rcs-p" inputmode="decimal" value="0" class="border rounded-lg px-2 py-1 w-20"></label>' +
      '<textarea id="rcs-r" rows="2" placeholder="Comentario breve (opcional)" class="w-full border rounded-xl px-3 py-2 text-sm"></textarea>' +
      '<button data-accion="rc-sin-guardar" data-rut="' + esc(rut) + '" data-id="' + esc(actId) + '" class="px-4 py-2 rounded-xl bg-teal-700 text-white font-bold text-sm">💾 Evaluar sin respuesta</button></div>');
  }

  /* ---------- Lista ---------- */
  function filas() {
    const q = F.q.trim().toLowerCase();
    return resps().map(r => ({ r: r, a: actDe(r.actividad_id), e: estDe(r.rut) })).filter(x => x.a)
      .filter(x => (F.est === 'todas' || (F.est === 'pend' ? x.r.estado !== 'evaluada' : x.r.estado === 'evaluada')) &&
        (!F.act || x.a.id === F.act) && (!F.curso || x.e.curso === F.curso) && (!q || String(x.e.nombre).toLowerCase().indexOf(q) >= 0))
      .sort((p, s) => (p.r.estado === 'evaluada') - (s.r.estado === 'evaluada') ||
        String(p.e.curso).localeCompare(String(s.e.curso), 'es') || String(p.e.nombre).localeCompare(String(s.e.nombre), 'es') ||
        String(p.r.timestamp_servidor).localeCompare(String(s.r.timestamp_servidor)));
  }
  // Cada actividad en su propio bloque, para corregir sin confundirse
  function grupos(sinMode, fl, sn) {
    const todas = acts();
    const lista = todas.filter(a => !F.act || a.id === F.act);
    if (!lista.length) return '<div class="text-sm text-slate-500 text-center p-6">Aún no hay actividades.</div>';
    return lista.map((a, n) => {
      const rs = resps().filter(r => r.actividad_id === a.id);
      const pend = rs.filter(r => r.estado !== 'evaluada').length, ev = rs.length - pend;
      const sinN = activos().filter(e => !rs.some(r => rutK(r.rut) === rutK(e.rut))).length;
      const filasA = sinMode ? sn.filter(x => x.a.id === a.id) : fl.filter(x => x.a.id === a.id);
      const abierto = F.open[a.id] !== undefined ? F.open[a.id] : (sinMode ? filasA.length > 0 : (pend > 0 || !!F.act));
      const cuerpo = filasA.length ? filasA.map(x => {
        if (sinMode) return '<button data-accion="rc-sin" data-rut="' + esc(x.e.rut) + '" data-id="' + esc(a.id) + '" class="text-left flex items-center gap-2 p-3 rounded-xl border bg-rose-50 border-rose-200">' +
          '<div class="flex-1 min-w-0"><div class="font-bold text-sm truncate">' + esc(x.e.nombre) + ' <span class="font-normal text-slate-500">· ' + esc(x.e.curso) + '</span></div></div>' + chip('🚫 Sin responder', 'bg-rose-200 text-rose-900') + '</button>';
        const ok = x.r.estado === 'evaluada';
        return '<button data-accion="rc-abrir" data-id="' + esc(x.r.id) + '" class="text-left flex items-center gap-2 p-3 rounded-xl border ' + (ok ? 'bg-white' : 'bg-amber-50 border-amber-300') + '">' +
          '<div class="flex-1 min-w-0"><div class="font-bold text-sm truncate">' + esc(x.e.nombre) + ' <span class="font-normal text-slate-500">· ' + esc(x.e.curso) + '</span></div></div>' +
          (ok ? chip('✅ ' + fmt(x.r.puntaje_final) + '/' + fmt(a.puntaje_max), 'bg-emerald-100 text-emerald-800') : chip('⏳ Por corregir', 'bg-amber-200 text-amber-900')) + '</button>';
      }).join('') : '<div class="text-sm text-slate-500 text-center p-3">' + (sinMode ? 'Todos respondieron. 🎉' : rs.length ? 'No hay respuestas con estos filtros.' : 'Aún no hay respuestas.') + '</div>';
      return '<details data-rcact="' + esc(a.id) + '" class="rounded-2xl border-2 ' + (pend ? 'border-amber-300' : 'border-slate-200') + ' bg-white overflow-hidden"' + (abierto ? ' open' : '') + '>' +
        '<summary class="cursor-pointer p-3 flex items-center gap-2 flex-wrap" style="background:#f8fafc">' +
        '<span class="shrink-0 w-7 h-7 rounded-full bg-indigo-700 text-white text-xs font-extrabold flex items-center justify-center">' + (n + 1) + '</span>' +
        '<span class="flex-1 min-w-0 font-extrabold text-sm">' + esc(a.titulo || 'Sin título') + (a.formativa ? ' 🧪' : '') + ' <span class="font-normal text-xs text-slate-500">· ' + esc(a.tipo || '') + ' · ' + fmt(a.puntaje_max) + ' pts</span></span>' +
        chip('⏳ ' + pend, 'bg-amber-100 text-amber-900') + chip('✅ ' + ev, 'bg-emerald-100 text-emerald-800') + chip('🚫 ' + sinN, 'bg-rose-100 text-rose-800') + '</summary>' +
        '<div class="p-2 grid gap-2">' + cuerpo + '</div></details>';
    }).join('');
  }
  function vista() {
    const box = document.getElementById('doc-contenido');
    if (!box || S.tabDoc !== 'respuestas') return;
    const all = resps().filter(r => actDe(r.actividad_id));
    const pend = all.filter(r => r.estado !== 'evaluada').length;
    const cursos = Array.from(new Set(ests().map(e => e.curso).filter(Boolean))).sort();
    const sinMode = F.est === 'sin';
    const fl = sinMode ? [] : filas();
    const sn = sinMode ? sinResp() : [], nSin = totalSin();
    const op = (v, t, s) => '<option value="' + esc(v) + '"' + (s === v ? ' selected' : '') + '>' + esc(t) + '</option>';
    const y = window.scrollY;
    box.innerHTML = '<div class="bg-white/95 rounded-2xl shadow p-4 space-y-3">' +
      '<div class="flex items-center gap-2"><h3 class="font-extrabold text-lg flex-1">📥 Respuestas de los estudiantes</h3>' +
      '<button data-accion="rc-refrescar" class="px-3 py-2 rounded-xl bg-slate-100 text-sm font-semibold">🔄 Actualizar</button></div>' +
      '<div class="flex gap-2 text-center text-sm"><div class="flex-1 rounded-xl bg-amber-50 border border-amber-200 p-2"><div class="text-2xl font-extrabold text-amber-700">' + pend + '</div>por corregir</div>' +
      '<div class="flex-1 rounded-xl bg-emerald-50 border border-emerald-200 p-2"><div class="text-2xl font-extrabold text-emerald-700">' + (all.length - pend) + '</div>corregidas</div>' +
      '<button data-accion="rc-ver-sin" class="flex-1 rounded-xl bg-rose-50 border border-rose-200 p-2"><div class="text-2xl font-extrabold text-rose-700">' + nSin + '</div>sin responder 👁</button></div>' +
      '<div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">' +
      '<select data-rcf="est" class="border rounded-xl px-2 py-2">' + op('pend', 'Por corregir', F.est) + op('ev', 'Corregidas', F.est) + op('todas', 'Todas', F.est) + op('sin', 'Sin responder', F.est) + '</select>' +
      '<select data-rcf="act" class="border rounded-xl px-2 py-2">' + op('', 'Todas las actividades', F.act) + acts().map(a => op(a.id, a.titulo || a.id, F.act)).join('') + '</select>' +
      '<select data-rcf="curso" class="border rounded-xl px-2 py-2">' + op('', 'Todos los cursos', F.curso) + cursos.map(c => op(c, c, F.curso)).join('') + '</select>' +
      '<input data-rcf="q" value="' + esc(F.q) + '" placeholder="Buscar estudiante" class="border rounded-xl px-3 py-2"></div>' +
      '<div class="space-y-3">' + grupos(sinMode, fl, sn) + '</div></div>';
    window.scrollTo(0, y);
  }

  /* ---------- Corrección ---------- */
  function items(a, r) {
    if (a.tipo === 'grupo') {
      const resp = js(r.respuesta, {}), fotos = js(r.fotos, {});
      const out = []; let auto = 0, nAlt = 0;
      (a.partes || []).forEach((p, i) => {
        const pun = Number(p.puntaje) || 1;
        if (p.tipo === 'alternativas') {
          const ok = String(resp[p.id] || '').trim() === String(p.correcta).trim();
          if (ok) auto += pun; nAlt++;
          out.push({ id: p.id, et: 'Parte ' + (i + 1), alt: true, ok: ok, enun: p.enunciado, texto: resp[p.id] || '', max: pun, op: p.opciones, correcta: p.correcta });
        } else out.push({ id: p.id, et: 'Parte ' + (i + 1), enun: p.enunciado, texto: resp[p.id] || '', foto: fotos[p.id] || '', pauta: p.pauta || '', rub: rubrica(p.rubrica), max: pun });
      });
      return { it: out, auto: auto };
    }
    if (a.tipo === 'alternativas') return { it: [{ id: 'main', et: 'Pregunta', alt: true, ok: Number(r.puntaje_final) > 0, enun: a.enunciado, texto: r.respuesta || '', max: Number(a.puntaje_max) || 1, correcta: a.correcta }], auto: 0, soloAlt: true };
    return { it: [{ id: 'main', et: 'Pregunta', enun: a.enunciado, texto: r.respuesta || '', foto: r.foto_id || '', pauta: a.pauta || '', rub: rubrica(a.rubrica), max: Number(a.puntaje_max) || 1 }], auto: 0 };
  }
  function rubrica(r) {
    return (Array.isArray(r) ? r : []).map(c => ({ criterio: c.criterio || c.nombre || '', logrado: c.logrado || '', medio: c.medio || '', no: c.no || '', peso: Number(c.peso) > 0 ? Number(c.peso) : 1 })).filter(c => c.criterio);
  }
  function ptsItem(x, st) {
    if (x.alt) return 0;
    if (x.rub && x.rub.length) {
      const niv = st.niv[x.id] || [];
      let tot = 0, g = 0;
      x.rub.forEach((c, i) => { tot += c.peso; g += c.peso * (FACT[niv[i]] || 0); });
      return tot ? Math.round(x.max * g / tot * 10) / 10 : 0;
    }
    return Math.min(x.max, Math.max(0, Number(st.num[x.id]) || 0));
  }
  function total() {
    const st = cur; if (!st) return 0;
    const s = st.dato.auto + st.dato.it.reduce((t, x) => t + ptsItem(x, st), 0);
    return Math.min(Number(st.a.puntaje_max) || 1, Math.round(s * 10) / 10);
  }
  function pintarTotal(sobre) {
    const t = cur.dato.soloAlt ? Number(cur.r.puntaje_final) || 0 : total();
    const inp = document.getElementById('rc-total');
    if (inp && sobre !== false) inp.value = String(t).replace('.', ',');
  }
  function tablaRub(x, st) {
    const niv = st.niv[x.id] || [];
    return '<div class="overflow-x-auto"><table class="w-full text-xs border-collapse"><tbody>' + x.rub.map((c, i) => {
      const cel = (n, tx, lbl) => '<td class="border p-2 align-top cursor-pointer ' + (niv[i] === n ? 'bg-indigo-600 text-white font-semibold' : 'bg-white') + '" data-accion="rc-niv" data-it="' + esc(x.id) + '" data-i="' + i + '" data-n="' + n + '"><div class="font-bold">' + lbl + '</div>' + esc(tx) + '</td>';
      return '<tr><td class="border p-2 bg-slate-50 font-semibold w-1/4">' + esc(c.criterio) + '</td>' + cel('L', c.logrado || 'Cumple plenamente', 'Logrado') + cel('M', c.medio || 'Cumple en parte', 'Medianamente') + cel('N', c.no || 'No se observa', 'No observado') + '</tr>';
    }).join('') + '</tbody></table></div>';
  }
  function htmlItem(x, st) {
    let h = '<div class="rounded-xl border p-3 space-y-2"><div class="text-xs font-bold text-indigo-700">' + esc(x.et) + (x.max ? ' · ' + fmt(x.max) + ' pto' + (x.max === 1 ? '' : 's') : '') + '</div>' +
      (x.enun ? '<div class="text-sm whitespace-pre-line">' + esc(x.enun) + '</div>' : '');
    if (x.alt) {
      h += '<div class="text-sm">Respondió: <b>' + esc(x.texto || '—') + '</b> ' + (x.ok ? chip('✅ Correcta', 'bg-emerald-100 text-emerald-800') : chip('❌ Incorrecta', 'bg-rose-100 text-rose-800')) + '</div>';
      return h + '</div>';
    }
    h += '<div class="rounded-lg bg-slate-50 border p-2 text-sm whitespace-pre-line"><div class="text-[11px] font-bold text-slate-500">Respuesta del estudiante</div>' + esc(x.texto || '(sin texto)') + '</div>';
    if (x.foto) h += '<img data-fid="' + esc(x.foto) + '" alt="Fotografía" class="rounded-lg border max-h-72 hidden"><div data-fcarga="' + esc(x.foto) + '" class="text-xs text-slate-500">Cargando fotografía…</div>';
    if (x.pauta) h += '<details class="text-xs"><summary class="cursor-pointer font-semibold text-slate-600">Pauta / indicaciones</summary><div class="whitespace-pre-line p-2">' + esc(x.pauta) + '</div></details>';
    if (x.rub.length) h += tablaRub(x, st);
    else h += '<label class="text-sm flex items-center gap-2">Puntaje (0 a ' + fmt(x.max) + '): <input data-rcnum="' + esc(x.id) + '" inputmode="decimal" value="' + esc(st.num[x.id] !== undefined ? String(st.num[x.id]).replace('.', ',') : '') + '" class="border rounded-lg px-2 py-1 w-20"></label>';
    return h + '</div>';
  }
  async function cargarFotos() {
    const imgs = [].slice.call(document.querySelectorAll('#modal-cuerpo img[data-fid]'));
    for (const im of imgs) {
      const id = im.dataset.fid;
      try {
        if (!fotoCache[id]) fotoCache[id] = (await api('getArchivo', { id: id })).dataUrl;
        im.src = fotoCache[id]; im.classList.remove('hidden');
        const c = document.querySelector('[data-fcarga="' + id + '"]'); if (c) c.remove();
      } catch (_) { const c = document.querySelector('[data-fcarga="' + id + '"]'); if (c) c.textContent = 'No se pudo cargar la fotografía.'; }
    }
  }
  function abrir(id) {
    const r = resps().find(x => x.id === id); if (!r) return;
    const a = actDe(r.actividad_id); if (!a) return;
    const e = estDe(r.rut), dato = items(a, r), ev0 = js(r.evaluacion, {});
    const niv = {}; dato.it.forEach(x => { if (Array.isArray(ev0[x.id])) niv[x.id] = ev0[x.id].slice(); });
    cur = { r: r, a: a, dato: dato, niv: niv, num: {}, ev0: ev0, ia: null };
    listaNav = filas().filter(x => x.a.id === a.id).map(x => x.r.id);
    if (listaNav.indexOf(id) < 0) listaNav.push(id);
    const i = listaNav.indexOf(id);
    const nav = '<div class="flex items-center gap-2 text-xs">' +
      (i > 0 ? '<button data-accion="rc-abrir" data-id="' + esc(listaNav[i - 1]) + '" class="px-3 py-2 rounded-xl bg-slate-100 font-semibold">◀ Anterior</button>' : '<span></span>') +
      '<span class="flex-1 text-center text-slate-500">' + (i >= 0 ? (i + 1) + ' de ' + listaNav.length : '') + '</span>' +
      (i >= 0 && i < listaNav.length - 1 ? '<button data-accion="rc-abrir" data-id="' + esc(listaNav[i + 1]) + '" class="px-3 py-2 rounded-xl bg-slate-100 font-semibold">Siguiente ▶</button>' : '<span></span>') + '</div>';
    const manual = !dato.soloAlt && dato.it.some(x => !x.alt);
    modal('<div class="space-y-3 pt-2">' + nav +
      '<div><div class="font-extrabold text-lg">' + esc(e.nombre) + '</div><div class="text-xs text-slate-500">' + esc(e.curso) + ' · ' + esc(a.titulo || '') + (r.estado === 'evaluada' ? ' · corregida por ' + esc(r.evaluador || 'docente') : '') + '</div></div>' +
      (a.tipo === 'grupo' && a.enunciado ? '<div class="text-sm text-slate-600 whitespace-pre-line">' + esc(a.enunciado) + '</div>' : '') +
      dato.it.map(x => htmlItem(x, cur)).join('') +
      (manual ? '<div class="flex flex-wrap items-center gap-2"><button data-accion="rc-ia" class="px-3 py-2 rounded-xl bg-violet-600 text-white text-sm font-bold">🤖 Sugerir con IA</button><span class="text-xs text-slate-500">La IA solo propone: usted decide.</span></div><div id="rc-ia-box"></div>' : '') +
      '<div class="rounded-xl border-2 border-indigo-200 p-3 space-y-2">' +
      '<label class="text-sm font-bold flex items-center gap-2">Puntaje final (0 a ' + fmt(a.puntaje_max) + '): <input id="rc-total" inputmode="decimal" class="border rounded-lg px-2 py-1 w-20 font-bold"></label>' +
      '<textarea id="rc-retro" rows="2" placeholder="Retroalimentación breve (solo sobre su trabajo)" class="w-full border rounded-xl px-3 py-2 text-sm">' + esc(r.retro_docente || (r.estado === 'evaluada' ? '' : '')) + '</textarea>' +
      '<div class="flex gap-2"><button data-accion="rc-guardar" data-sig="0" class="px-4 py-2 rounded-xl bg-teal-700 text-white font-bold text-sm">💾 Guardar</button>' +
      (i >= 0 && i < listaNav.length - 1 ? '<button data-accion="rc-guardar" data-sig="1" class="px-4 py-2 rounded-xl bg-indigo-700 text-white font-bold text-sm">Guardar y siguiente ▶</button>' : '') + '</div></div></div>');
    const inp = document.getElementById('rc-total');
    if (r.estado === 'evaluada') inp.value = String(r.puntaje_final).replace('.', ','); else pintarTotal();
    cargarFotos();
  }
  async function ia() {
    const bx = document.getElementById('rc-ia-box');
    cargando(true, 'La IA está revisando la respuesta…');
    let r;
    try { r = await api('evaluarIA', { respuesta_id: cur.r.id }); } finally { cargando(false); }
    cur.ia = r;
    bx.innerHTML = '<div class="rounded-xl bg-violet-50 border border-violet-300 p-3 text-sm space-y-2"><b>Sugerencia de la IA: ' + fmt(r.puntaje) + ' de ' + fmt(cur.a.puntaje_max) + '</b><div>' + esc(r.comentario || '') + '</div>' +
      '<div class="flex gap-2"><button data-accion="rc-ia-usar" class="px-3 py-2 rounded-xl bg-violet-700 text-white text-xs font-bold">Usar la sugerencia</button><button data-accion="rc-ia-cerrar" class="px-3 py-2 rounded-xl bg-slate-200 text-xs font-bold">Descartar</button></div></div>';
  }
  function usarIA() {
    const r = cur.ia; if (!r) return;
    const ev = r.evaluacion || {};
    cur.dato.it.forEach(x => { if (!x.alt && x.rub.length && Array.isArray(ev[x.id])) cur.niv[x.id] = ev[x.id].slice(); });
    document.querySelectorAll('#modal-cuerpo [data-accion="rc-niv"]').forEach(td => {
      const on = (cur.niv[td.dataset.it] || [])[Number(td.dataset.i)] === td.dataset.n;
      td.classList.toggle('bg-indigo-600', on); td.classList.toggle('text-white', on); td.classList.toggle('font-semibold', on); td.classList.toggle('bg-white', !on);
    });
    document.getElementById('rc-total').value = String(r.puntaje).replace('.', ',');
    const rt = document.getElementById('rc-retro'); if (rt && !rt.value.trim()) rt.value = r.comentario || '';
    document.getElementById('rc-ia-box').innerHTML = '';
    aviso('Sugerencia aplicada. Revise y guarde.');
  }
  async function guardar(sig) {
    const t = Number(String(document.getElementById('rc-total').value).replace(',', '.'));
    if (!isFinite(t) || t < 0) throw new Error('Escriba un puntaje válido.');
    const retro = document.getElementById('rc-retro').value.trim();
    const evObj = Object.assign({}, cur.ev0);
    Object.keys(cur.niv).forEach(k => { evObj[k] = cur.niv[k]; });
    const i = listaNav.indexOf(cur.r.id), prox = i >= 0 ? listaNav[i + 1] : null;
    cargando(true, 'Guardando…');
    let res;
    try { res = await api('guardarEvaluacion', { respuesta_id: cur.r.id, puntaje_final: t, retro: retro, evaluacion: evObj }); } finally { cargando(false); }
    Object.assign(cur.r, { estado: 'evaluada', puntaje_final: res && res.puntaje_final !== undefined ? res.puntaje_final : t, retro_docente: retro, evaluacion: JSON.stringify(evObj), evaluador: (res && res.evaluador) || cur.r.evaluador });
    aviso('Corrección guardada.');
    if (sig && prox) { vista(); abrir(prox); }
    else { cerrarModal(); vista(); }
  }
  async function traer(silencioso) {
    if (!silencioso) cargando(true, 'Actualizando…');
    try {
      const p = await api('getPanel', {});
      if (p && Array.isArray(p.respuestas)) { S.panel.respuestas = p.respuestas; if (Array.isArray(p.actividades)) S.panel.actividades = p.actividades; }
    } finally { if (!silencioso) cargando(false); }
    vista();
  }

  /* ---------- Integración con la pantalla del docente ---------- */
  const _rd = renderDocente;
  renderDocente = function () {
    if (S.tabDoc !== 'respuestas') { cargadoVez = false; return _rd.apply(this, arguments); }
    const titular = typeof esTitular === 'function' ? esTitular() : true;
    const ocultas = titular ? [] : ['estudiantes', 'ayudantes', 'ajustes'];
    const tabs = document.getElementById('doc-tabs');
    if (tabs) tabs.innerHTML = TABS_DOC.filter(t => ocultas.indexOf(t[0]) < 0).map(([k, t]) =>
      '<button data-accion="tab-doc" data-tab="' + k + '" class="px-3 py-2 rounded-xl whitespace-nowrap ' + (S.tabDoc === k ? 'tab-activa' : '') + '">' + t + '</button>').join('');
    if (typeof detenerMapa === 'function') detenerMapa();
    vista();
    if (!cargadoVez) { cargadoVez = true; traer(true).catch(() => {}); }
  };

  document.addEventListener('click', async e => {
    const b = e.target.closest('[data-accion]');
    if (!b || b.dataset.accion.indexOf('rc-') !== 0) return;
    const a = b.dataset.accion;
    try {
      if (a === 'rc-abrir') abrir(b.dataset.id);
      else if (a === 'rc-refrescar') await traer(false);
      else if (a === 'rc-ver-sin') { F.est = 'sin'; vista(); }
      else if (a === 'rc-sin') abrirSin(b.dataset.rut, b.dataset.id);
      else if (a === 'rc-sin-guardar') {
        const p = Number(String(document.getElementById('rcs-p').value).replace(',', '.'));
        if (!isFinite(p) || p < 0) throw new Error('Escriba un puntaje válido.');
        const retro = document.getElementById('rcs-r').value.trim();
        cargando(true, 'Guardando…');
        try { await api('evaluarSinRespuesta', { rut: b.dataset.rut, actividad_id: b.dataset.id, puntaje_final: p, retro: retro }); } finally { cargando(false); }
        cerrarModal(); aviso('Evaluación guardada.'); await traer(true);
      }
      else if (a === 'rc-niv') {
        const it = b.dataset.it, i = Number(b.dataset.i), n = b.dataset.n;
        const x = cur.dato.it.find(y => y.id === it), arr = (cur.niv[it] || []).slice();
        while (arr.length < x.rub.length) arr.push('');
        arr[i] = n; cur.niv[it] = arr;
        b.parentElement.querySelectorAll('td[data-accion="rc-niv"]').forEach(td => {
          const on = td === b;
          td.classList.toggle('bg-indigo-600', on); td.classList.toggle('text-white', on); td.classList.toggle('font-semibold', on); td.classList.toggle('bg-white', !on);
        });
        pintarTotal();
      }
      else if (a === 'rc-ia') await ia();
      else if (a === 'rc-ia-usar') usarIA();
      else if (a === 'rc-ia-cerrar') { const bx = document.getElementById('rc-ia-box'); if (bx) bx.innerHTML = ''; }
      else if (a === 'rc-guardar') await guardar(b.dataset.sig === '1');
    } catch (err) { aviso(err.message, 'error'); }
  });
  document.addEventListener('input', e => {
    const t = e.target;
    if (!t || !t.dataset) return;
    if (t.dataset.rcnum !== undefined && cur) {
      cur.num[t.dataset.rcnum] = Number(String(t.value).replace(',', '.')) || 0;
      pintarTotal();
    } else if (t.dataset.rcf === 'q') {
      F.q = t.value; const pos = t.selectionStart; vista();
      const n = document.querySelector('[data-rcf="q"]'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (_) {} }
    }
  });
  document.addEventListener('toggle', e => {
    const d = e.target;
    if (d && d.dataset && d.dataset.rcact) F.open[d.dataset.rcact] = d.open;
  }, true);
  document.addEventListener('change', e => {
    const t = e.target;
    if (t && t.dataset && t.dataset.rcf && t.dataset.rcf !== 'q') { F[t.dataset.rcf] = t.value; vista(); }
  });
})();
