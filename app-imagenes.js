'use strict';
/* =========================================================
   SALIDA A TERRENO – Imágenes: miniaturas, visor y carga rápida
   Archivo NUEVO. Se carga al final, después de app-recorrido.js
   ========================================================= */
(function () {
  if (typeof pintarImagenes !== 'function' || typeof dataUrlArchivo !== 'function') return;

  const pausa = ms => new Promise(r => setTimeout(r, ms));

  /* ---------- Estilos: imágenes completas, pequeñas y con visor ---------- */
  const st = document.createElement('style');
  st.id = 'estilo-imagenes';
  st.textContent = [
    'img[data-archivo],img[data-zoom]{object-fit:contain!important;background-color:#f1f5f9;cursor:zoom-in}',
    'img[data-archivo]{max-height:12rem}',
    'img[data-archivo]:not([data-ok]){min-height:5rem;min-width:5rem;animation:imgPulso 1.4s ease-in-out infinite}',
    'img[data-archivo][data-error]{animation:none;cursor:pointer;outline:2px dashed #cbd5e1}',
    '@keyframes imgPulso{0%,100%{opacity:1}50%{opacity:.5}}',
    '#visor-img{position:fixed;inset:0;z-index:90;display:none;align-items:center;justify-content:center;padding:12px;background:rgba(2,6,23,.95);cursor:zoom-out}',
    '#visor-img.abierto{display:flex}',
    '#visor-img img{max-width:100%;max-height:100%;object-fit:contain;border-radius:8px;background:#0f172a}',
    '#visor-cerrar{position:absolute;top:10px;right:12px;width:44px;height:44px;border-radius:9999px;background:rgba(255,255,255,.18);color:#fff;font-size:28px;line-height:1;border:0}',
    '#visor-estado{position:absolute;left:0;right:0;bottom:14px;text-align:center;color:#e2e8f0;font-size:12px;padding:0 16px}'
  ].join('\n');
  document.head.appendChild(st);

  /* ---------- Miniaturas (se guardan en el teléfono) ---------- */
  // Reduce una imagen a 640 px: pesa poco y se dibuja rápido, incluso con muchas en pantalla
  function crearMini(url, lado, calidad) {
    lado = lado || 640; calidad = calidad || 0.72;
    return new Promise(res => {
      const img = new Image();
      img.onload = () => {
        try {
          const mayor = Math.max(img.naturalWidth, img.naturalHeight), k = Math.min(1, lado / mayor);
          if (k >= 1 && url.length < 120000) return res(url);   // ya es liviana
          const c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(img.naturalWidth * k));
          c.height = Math.max(1, Math.round(img.naturalHeight * k));
          const g = c.getContext('2d');
          g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
          g.drawImage(img, 0, 0, c.width, c.height);
          res(c.toDataURL('image/jpeg', calidad));
        } catch (_) { res(null); }
      };
      img.onerror = () => res(null);
      img.src = url;
    });
  }

  const MINI_EN_CURSO = new Map();
  function dataUrlMini(id) {
    if (MINI_EN_CURSO.has(id)) return MINI_EN_CURSO.get(id);
    const p = (async () => {
      const m = await cacheGet('arch2m:' + id).catch(() => null);
      if (m && String(m).indexOf('data:image/') === 0) return m;
      const full = await dataUrlArchivo(id);       // del teléfono o, la primera vez, del servidor
      if (!full) return null;
      const mini = await crearMini(full);
      if (mini) cachePut('arch2m:' + id, mini).catch(() => {});
      return mini || full;
    })();
    MINI_EN_CURSO.set(id, p);
    p.then(() => MINI_EN_CURSO.delete(id), () => MINI_EN_CURSO.delete(id));
    return p;
  }

  /* ---------- Carga de las imágenes de la pantalla (solo las visibles, varias a la vez) ---------- */
  async function cargarImagen(img) {
    const id = img.dataset.archivo;
    if (!id || img.dataset.ok || img.dataset.cargando) return;
    img.dataset.cargando = '1';
    img.removeAttribute('data-error');
    try {
      const u = await dataUrlMini(id);
      if (!u) throw new Error('sin imagen');
      if (img.dataset.archivo === id) { img.src = u; img.dataset.ok = '1'; }
    } catch (_) { img.dataset.error = '1'; }
    finally { delete img.dataset.cargando; }
  }
  const IO = ('IntersectionObserver' in window)
    ? new IntersectionObserver(es => {
      es.forEach(en => { if (en.isIntersecting) { IO.unobserve(en.target); cargarImagen(en.target); } });
    }, { rootMargin: '300px' })
    : null;

  pintarImagenes = function (root) {
    Array.from((root || document).querySelectorAll('img[data-archivo]'))
      .filter(i => !i.dataset.ok && !i.dataset.cargando)
      .forEach(i => { if (IO) IO.observe(i); else cargarImagen(i); });
    return Promise.resolve();
  };
  // Cuando vuelve la conexión, se reintentan las imágenes que no pudieron cargar
  window.addEventListener('online', () => { document.querySelectorAll('img[data-error]').forEach(cargarImagen); });

  // Un poco más de capacidad para imágenes en la cola de consultas (si existe)
  if (typeof SEM_IMG !== 'undefined' && SEM_IMG && typeof SEM_IMG.n === 'number') SEM_IMG.n += 1;

  /* ---------- Descarga de fondo: solo miniaturas, de a una y con pausa ---------- */
  let PRE = 0;
  precargarImagenes = function () {
    if (!S.datos) return;
    const ids = [];
    const add = id => { if (id && ids.indexOf(id) < 0) ids.push(id); };
    (S.datos.actividades || []).forEach(a => add(a.imagen_id));
    const ini = S.datos.inicio;
    if (ini) { add(ini.portada); (ini.secciones || []).forEach(s => (s.imagenes || []).forEach(im => add(im.id))); }
    (S.datos.puntos || []).forEach(p => ((jsonSeguro(p.ficha, {}) || {}).elementos || []).forEach(e => add(e.imagen_id)));
    const mi = ++PRE;
    setTimeout(async () => {
      for (const id of ids) {
        if (mi !== PRE || !navigator.onLine || !S.token) return;
        try {
          if (await cacheGet('arch2m:' + id)) continue;
          await dataUrlMini(id);
          await pausa(900);
        } catch (_) { await pausa(3000); }
      }
    }, 1500 + Math.random() * 5000);
  };

  /* ---------- Visor: la imagen pequeña se amplía al tocarla ---------- */
  let visorId = null, overflowPrev = '';
  function visor() {
    let v = document.getElementById('visor-img');
    if (v) return v;
    v = document.createElement('div');
    v.id = 'visor-img';
    v.innerHTML = '<button type="button" id="visor-cerrar" aria-label="Cerrar">×</button><img alt="Imagen ampliada"><div id="visor-estado"></div>';
    v.addEventListener('click', cerrarVisor);
    document.body.appendChild(v);
    return v;
  }
  function cerrarVisor() {
    const v = document.getElementById('visor-img');
    if (!v || !v.classList.contains('abierto')) return;
    v.classList.remove('abierto');
    visorId = null;
    document.body.style.overflow = overflowPrev;
    v.querySelector('img').removeAttribute('src');
  }
  function abrirVisor(src, id) {
    const v = visor(), im = v.querySelector('img'), est = v.querySelector('#visor-estado');
    visorId = id || null;
    im.src = src;                                   // primero se ve la versión liviana
    est.textContent = id ? 'Cargando la imagen completa…' : 'Toque para cerrar';
    if (!v.classList.contains('abierto')) { overflowPrev = document.body.style.overflow; document.body.style.overflow = 'hidden'; }
    v.classList.add('abierto');
    if (id) {
      dataUrlArchivo(id).then(full => {
        if (visorId !== id) return;
        if (full) { im.src = full; est.textContent = 'Toque para cerrar'; }
        else est.textContent = 'Sin conexión: se muestra una versión reducida. Toque para cerrar.';
      }).catch(() => {
        if (visorId === id) est.textContent = 'No se pudo cargar la imagen completa; se muestra una versión reducida. Toque para cerrar.';
      });
    }
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrarVisor(); });

  // Al tocar una imagen (en fase de captura, para que ninguna otra pantalla lo impida)
  document.addEventListener('click', e => {
    const im = e.target && e.target.closest ? e.target.closest('img') : null;
    if (!im || im.closest('#visor-img') || im.id === 'logo') return;
    if (im.dataset.error) { e.preventDefault(); e.stopPropagation(); cargarImagen(im); return; }   // reintento
    const src = im.getAttribute('src') || '';
    const local = /^(data:image|blob:)/.test(src) && im.closest('#modal-cuerpo, #rec-overlay, #est-contenido, #est-info, #doc-contenido');
    if (!src || !(im.dataset.archivo || im.dataset.zoom !== undefined || local)) return;
    if (im.closest('button, a, [data-accion]')) return;
    e.preventDefault(); e.stopPropagation();
    abrirVisor(im.currentSrc || im.src, im.dataset.archivo || null);
  }, true);

  /* ---------- Fotos nuevas más livianas (máximo ~260 KB en vez de 500 KB) ---------- */
  if (typeof comprimirImagen === 'function') {
    const _comprimir = comprimirImagen;
    comprimirImagen = function (file, maxKB) { return _comprimir(file, Math.min(maxKB || 500, 260)); };
  }
})();
