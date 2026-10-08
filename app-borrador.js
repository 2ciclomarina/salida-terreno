'use strict';
/* =========================================================
   SALIDA A TERRENO – app-borrador.js  (ARCHIVO NUEVO, solo estudiantes)
   Guarda automáticamente lo que el estudiante va escribiendo en una actividad
   (en su teléfono y en la plataforma) para que no se pierda si la aplicación se
   cierra, se recarga o falla el envío. Al volver a abrir la actividad, lo recupera.
   Cuando la respuesta se envía, el borrador se elimina.
   No guarda fotografías: esas se deben tomar de nuevo si se pierden.
   Se carga DESPUÉS de app-guias.js, solo en index.html.
   ========================================================= */
(function () {
  if (document.body.dataset.modo !== 'alumno') return;

  const SEL = 'textarea, input:not([type=file]):not([type=hidden]):not([type=password]):not([type=button]):not([type=submit]), select';
  const EXCL = '#guias-est, #pantalla-login, #bor-chip';
  let ACT = null, RESTAURANDO = false, DR = {}, tLocal = null, tServ = null, tChip = null, traido = false;

  const rut = () => (typeof S !== 'undefined' && S && S.usuario && S.usuario.key) || '';
  const lsK = () => 'bor:' + rut();
  const leerLS = () => { try { return JSON.parse(localStorage.getItem(lsK())) || {}; } catch (_) { return {}; } };
  const escLS = o => { try { localStorage.setItem(lsK(), JSON.stringify(o)); } catch (_) {} };
  const valido = el => el && el.matches && el.matches(SEL) && !el.closest(EXCL) && !/^rec-/.test(el.id || '') && !el.dataset.noBorrador;
  const contDe = el => el.closest('form') || el.closest('#modal-cuerpo') || el.closest('[id*="overlay"]') || el.parentElement;
  const campos = c => [].slice.call(c.querySelectorAll(SEL)).filter(valido);
  const clave = (el, i) => {
    const t = (el.type || '').toLowerCase();
    if (t === 'radio' || t === 'checkbox') return 'c' + i;
    return el.name || el.id || ('i' + i);
  };
  const valor = el => {
    const t = (el.type || '').toLowerCase();
    return (t === 'radio' || t === 'checkbox') ? (el.checked ? '1' : '') : String(el.value || '');
  };
  const hhmm = () => { const d = new Date(); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); };

  function chip(txt) {
    let c = document.getElementById('bor-chip');
    if (!c) {
      c = document.createElement('div'); c.id = 'bor-chip';
      c.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:60;background:#0f766e;color:#fff;font-size:12px;font-weight:600;padding:6px 12px;border-radius:999px;box-shadow:0 2px 8px rgba(0,0,0,.3);pointer-events:none;transition:opacity .3s';
      document.body.appendChild(c);
    }
    c.textContent = txt; c.style.opacity = '1';
    clearTimeout(tChip); tChip = setTimeout(() => { c.style.opacity = '0'; }, 3500);
  }

  /* ---------- Guardar ---------- */
  function capturar(el) {
    if (RESTAURANDO || !ACT || !rut() || !valido(el)) return;
    const c = contDe(el), lista = campos(c), m = {};
    lista.forEach((f, i) => { const v = valor(f); if (v !== '') m[clave(f, i)] = v; });
    DR[ACT] = { c: m, t: Date.now() };
    if (!Object.keys(m).length) delete DR[ACT];
    clearTimeout(tLocal); tLocal = setTimeout(guardarLocal, 700);
    clearTimeout(tServ); tServ = setTimeout(() => guardarServidor(ACT), 4000);
  }
  function guardarLocal() {
    const o = leerLS(); Object.keys(DR).forEach(k => { o[k] = DR[k]; });
    Object.keys(o).forEach(k => { if (!DR[k]) delete o[k]; });
    escLS(o); chip('💾 Borrador guardado ' + hhmm());
  }
  async function guardarServidor(act) {
    if (!act || !navigator.onLine || typeof api !== 'function') return;
    try {
      const d = DR[act];
      await api('guardarBorrador', { actividad_id: act, campos: d ? d.c : {}, borrar: !d });
      chip('☁️ Borrador guardado en la plataforma ' + hhmm());
    } catch (_) { /* queda en el teléfono; se reintenta al seguir escribiendo */ }
  }
  function limpiar(act) {
    if (!act) return;
    delete DR[act];
    const o = leerLS(); delete o[act]; escLS(o);
    if (navigator.onLine && typeof api === 'function') api('guardarBorrador', { actividad_id: act, borrar: true }).catch(() => {});
  }

  /* ---------- Recuperar ---------- */
  function yaRespondida(id) {
    try {
      const a = ((S.datos && S.datos.actividades) || []).find(x => x.id === id);
      return !!(a && typeof respuestaDe === 'function' && respuestaDe(a));
    } catch (_) { return false; }
  }
  function restaurar() {
    if (!ACT || !rut()) return;
    const d = DR[ACT];
    if (!d || !d.c) return;
    if (yaRespondida(ACT)) { limpiar(ACT); return; }
    const nuevos = campos(document.body).filter(f => !f.dataset.bor);
    if (!nuevos.length) return;
    const conts = [];
    nuevos.forEach(f => { const c = contDe(f); if (conts.indexOf(c) < 0) conts.push(c); });
    let n = 0;
    RESTAURANDO = true;
    try {
    conts.forEach(c => {
      campos(c).forEach((f, i) => {
        if (f.dataset.bor) return;
        f.dataset.bor = '1';
        const v = d.c[clave(f, i)];
        if (v === undefined || v === '') return;
        const t = (f.type || '').toLowerCase();
        if (t === 'radio' || t === 'checkbox') { if (!f.checked) { f.click(); n++; } }
        else if (!String(f.value || '').trim()) {
          f.value = v;
          f.dispatchEvent(new Event('input', { bubbles: true }));
          f.dispatchEvent(new Event('change', { bubbles: true }));
          n++;
        }
      });
    });
    } finally { RESTAURANDO = false; }
    if (n && typeof aviso === 'function') aviso('Recuperamos lo que había escrito. Revise y envíe.');
  }

  /* ---------- Traer los borradores guardados en la plataforma ---------- */
  async function traer() {
    if (traido || !rut() || !navigator.onLine || typeof api !== 'function') return;
    traido = true;
    const loc = leerLS();
    Object.keys(loc).forEach(k => { if (!DR[k] || (loc[k].t || 0) > (DR[k].t || 0)) DR[k] = loc[k]; });
    try {
      const r = await api('getBorradores', {});
      const b = (r && r.b) || {};
      Object.keys(b).forEach(k => { if (!DR[k] || (b[k].t || 0) > (DR[k].t || 0)) DR[k] = b[k]; });
      escLS(DR);
    } catch (_) { traido = false; }
    restaurar();
  }

  /* ---------- Eventos ---------- */
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-accion]');
    if (!b) return;
    if (b.dataset.accion === 'responder') {
      ACT = b.dataset.id || null;
      const loc = leerLS(); if (ACT && loc[ACT] && (!DR[ACT] || (loc[ACT].t || 0) > (DR[ACT].t || 0))) DR[ACT] = loc[ACT];
      setTimeout(restaurar, 250); setTimeout(restaurar, 900);
    } else if (b.dataset.accion === 'tab-est' || b.dataset.accion === 'cerrar-modal') { clearTimeout(tLocal); if (ACT && DR[ACT]) guardarLocal(); ACT = null; }
  }, true);
  document.addEventListener('input', e => capturar(e.target), true);
  document.addEventListener('change', e => capturar(e.target), true);
  let obs = null;
  try { obs = new MutationObserver(() => { if (ACT) { clearTimeout(obs.t); obs.t = setTimeout(restaurar, 150); } }); obs.observe(document.body, { childList: true, subtree: true }); } catch (_) {}
  const vaciar = () => { if (tLocal) { clearTimeout(tLocal); guardarLocal(); } if (tServ && ACT) { clearTimeout(tServ); guardarServidor(ACT); } };
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') vaciar(); else traer(); });
  window.addEventListener('pagehide', vaciar);

  // El borrador se elimina cuando la respuesta se envía de verdad
  try {
    const _api = api;
    api = async function (acc, datos) {
      const r = await _api.apply(this, arguments);
      if (acc === 'enviarRespuesta' && datos && datos.actividad_id) limpiar(datos.actividad_id);
      return r;
    };
  } catch (_) { /* sin esto el borrador se elimina al detectar que la actividad ya fue respondida */ }

  // Esperar a que el estudiante haya ingresado
  let n = 0;
  const espera = setInterval(() => { if (rut() && typeof S !== 'undefined' && S.token) { clearInterval(espera); traer(); } else if (++n > 120) clearInterval(espera); }, 1000);
})();
