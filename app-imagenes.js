'use strict';
/* =========================================================
   SALIDA A TERRENO – Complementos finales (archivo app-imagenes.js)
   1) Imágenes: miniaturas, visor y carga rápida
   2) Texto enriquecido: negrita y colores (con barra de formato)
   3) Videos de YouTube
   4) «Conozca el lugar» con partes desplegables
   Se carga al final, después de app-recorrido.js
   ========================================================= */
(function () {
  if (typeof pintarImagenes !== 'function' || typeof dataUrlArchivo !== 'function') return;

  const pausa = ms => new Promise(r => setTimeout(r, ms));

  /* ---------- Colores del texto destacado ---------- */
  const FONDO = { amarillo: ['#fef08a', '#713f12'], verde: ['#bbf7d0', '#14532d'], azul: ['#bfdbfe', '#1e3a8a'], rojo: ['#fecaca', '#7f1d1d'], naranja: ['#fed7aa', '#7c2d12'], morado: ['#e9d5ff', '#581c87'] };
  const LETRA = { rojo: '#dc2626', azul: '#2563eb', verde: '#16a34a', morado: '#7c3aed', naranja: '#ea580c', amarillo: '#ca8a04' };

  /* ---------- Estilos ---------- */
  let css = [
    // imágenes completas, pequeñas y con visor
    'img[data-archivo],img[data-zoom]{object-fit:contain!important;background-color:#f1f5f9;cursor:zoom-in}',
    'img[data-archivo]{max-height:12rem}',
    'img[data-archivo]:not([data-ok]){min-height:5rem;min-width:5rem;animation:imgPulso 1.4s ease-in-out infinite}',
    'img[data-archivo][data-error]{animation:none;cursor:pointer;outline:2px dashed #cbd5e1}',
    '@keyframes imgPulso{0%,100%{opacity:1}50%{opacity:.5}}',
    '#visor-img{position:fixed;inset:0;z-index:90;display:none;align-items:center;justify-content:center;padding:12px;background:rgba(2,6,23,.95);cursor:zoom-out}',
    '#visor-img.abierto{display:flex}',
    '#visor-img img{max-width:100%;max-height:100%;object-fit:contain;border-radius:8px;background:#0f172a}',
    '#visor-cerrar{position:absolute;top:10px;right:12px;width:44px;height:44px;border-radius:9999px;background:rgba(255,255,255,.18);color:#fff;font-size:28px;line-height:1;border:0}',
    '#visor-estado{position:absolute;left:0;right:0;bottom:14px;text-align:center;color:#e2e8f0;font-size:12px;padding:0 16px}',
    // barra de formato
    '.rc-barra{display:flex;flex-wrap:wrap;align-items:center;gap:.25rem;margin:.25rem 0;padding:.25rem;background:#f8fafc;border:1px solid #e2e8f0;border-radius:.75rem}',
    '.rc-lbl{font-size:.7rem;color:#64748b;margin:0 .1rem 0 .3rem}',
    '.rc-btn{padding:.2rem .5rem;border:1px solid #cbd5e1;border-radius:.5rem;background:#fff;font-size:.8rem;line-height:1.2;cursor:pointer}',
    '.rc-prev.rc-oculto{display:none}',
    // videos
    '.rc-videow{max-width:34rem;margin:.5rem auto}',
    '.rc-video{position:relative;aspect-ratio:16/9;border-radius:1rem;overflow:hidden;background:#0f172a;cursor:pointer}',
    '.rc-video img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}',
    '.rc-play{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:64px;height:64px;border-radius:9999px;background:rgba(220,38,38,.92);color:#fff;font-size:28px;display:flex;align-items:center;justify-content:center;padding-left:4px;box-shadow:0 2px 10px rgba(0,0,0,.4)}',
    '.rc-vtit{position:absolute;left:0;right:0;bottom:0;padding:.4rem .7rem;background:linear-gradient(transparent,rgba(0,0,0,.75));color:#fff;font-size:.8rem}',
    '.rc-video iframe{position:absolute;inset:0;width:100%;height:100%;border:0}',
    '.rc-ylink{display:block;text-align:center;font-size:.75rem;color:#0f766e;text-decoration:underline;margin-top:.25rem}',
    // partes desplegables
    'details.acordeon>summary{list-style:none}',
    'details.acordeon>summary::-webkit-details-marker{display:none}',
    'details.acordeon[open]>summary{background:#f0fdfa;border-bottom:1px solid #e2e8f0}',
    'details.acordeon .chev{transition:transform .2s}',
    'details.acordeon[open] .chev{transform:rotate(180deg)}'
  ].join('\n');
  Object.keys(FONDO).forEach(c => {
    css += '\n.rc-' + c + '{background:' + FONDO[c][0] + ';color:' + FONDO[c][1] + ';padding:0 .25em;border-radius:.3em;-webkit-box-decoration-break:clone;box-decoration-break:clone}';
    css += '\n.rc-t-' + c + '{color:' + LETRA[c] + ';font-weight:600}';
  });
  const st = document.createElement('style');
  st.id = 'estilo-imagenes';
  st.textContent = css;
  document.head.appendChild(st);

  /* =========================================================
     1) IMÁGENES
     ========================================================= */
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

  // Solo se cargan las imágenes visibles (o por aparecer), varias a la vez
  pintarImagenes = function (root) {
    Array.from((root || document).querySelectorAll('img[data-archivo]'))
      .filter(i => !i.dataset.ok && !i.dataset.cargando)
      .forEach(i => { if (IO) IO.observe(i); else cargarImagen(i); });
    return Promise.resolve();
  };
  window.addEventListener('online', () => { document.querySelectorAll('img[data-error]').forEach(cargarImagen); });
  if (typeof SEM_IMG !== 'undefined' && SEM_IMG && typeof SEM_IMG.n === 'number') SEM_IMG.n += 1;

  // Descarga de fondo: de a una, con pausa
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

  // Visor: la imagen pequeña se amplía al tocarla
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

  // Fotos nuevas más livianas (máximo ~260 KB en vez de 500 KB)
  if (typeof comprimirImagen === 'function') {
    const _comprimir = comprimirImagen;
    comprimirImagen = function (file, maxKB) { return _comprimir(file, Math.min(maxKB || 500, 260)); };
  }

  /* =========================================================
     2) TEXTO ENRIQUECIDO (negrita y colores) y 3) VIDEOS DE YOUTUBE
     Formato guardado en el texto:
        **negrita**    {{amarillo:texto}} (resaltado)    {{t-rojo:texto}} (letra de color)
        {{video:ENLACE}}  o  {{video:ENLACE|Título}}  o un enlace de YouTube pegado
     Se convierte al mostrarlo, siempre con textContent (no hay riesgo de código ajeno).
     ========================================================= */
  const R_VID = /\{\{video:([^}]*)\}\}/;
  const R_COL = new RegExp('\\{\\{(t-)?(' + Object.keys(FONDO).join('|') + '):([\\s\\S]*?)\\}\\}');
  const R_NEG = /\*\*([\s\S]+?)\*\*/;
  const R_YT = /https?:\/\/(?:www\.|m\.|music\.)?(?:youtube\.com\/(?:watch\?(?:[^\s<>]*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})[^\s<>{}]*/;
  const R_TODO = new RegExp([R_VID, R_COL, R_NEG, R_YT].map(r => '(?:' + r.source + ')').join('|'), 'g');
  const RAPIDO = /\*\*|\{\{|youtu/;
  const PROHIBIDOS = new Set(['TEXTAREA', 'INPUT', 'SCRIPT', 'STYLE', 'OPTION', 'SELECT', 'TITLE', 'NOSCRIPT', 'A', 'BUTTON']);

  function tarjetaVideo(id, titulo) {
    const w = document.createElement('div');
    w.className = 'rc-videow';
    w.setAttribute('data-rico', 'no');
    const box = document.createElement('div');
    box.className = 'rc-video';
    box.dataset.yt = id;
    box.setAttribute('role', 'button');
    box.tabIndex = 0;
    const img = document.createElement('img');
    img.src = 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg';
    img.alt = '';
    img.loading = 'lazy';
    img.referrerPolicy = 'no-referrer';
    img.onerror = () => img.remove();
    const play = document.createElement('span');
    play.className = 'rc-play'; play.textContent = '▶';
    const t = document.createElement('div');
    t.className = 'rc-vtit'; t.textContent = titulo || 'Video de YouTube · toque para reproducir';
    box.append(img, play, t);
    const a = document.createElement('a');
    a.className = 'rc-ylink'; a.target = '_blank'; a.rel = 'noopener';
    a.href = 'https://www.youtube.com/watch?v=' + id; a.textContent = 'Abrir en YouTube ↗';
    w.append(box, a);
    return w;
  }
  function reproducir(box) {
    if (box.dataset.activo) return;
    if (!navigator.onLine) return aviso('Necesita internet para ver el video.', 'error');
    box.dataset.activo = '1';
    const f = document.createElement('iframe');
    f.src = 'https://www.youtube-nocookie.com/embed/' + box.dataset.yt + '?autoplay=1&rel=0&playsinline=1';
    f.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen';
    f.allowFullscreen = true;
    f.referrerPolicy = 'strict-origin-when-cross-origin';
    f.title = 'Video de YouTube';
    box.innerHTML = '';
    box.appendChild(f);
  }
  document.addEventListener('click', e => {
    const v = e.target && e.target.closest ? e.target.closest('.rc-video') : null;
    if (v) reproducir(v);
  });
  document.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.classList && e.target.classList.contains('rc-video')) { e.preventDefault(); reproducir(e.target); }
  });

  // Convierte un texto con marcas en nodos del documento
  function construir(texto, padre) {
    const re = new RegExp(R_TODO.source, 'g');
    let pos = 0, m;
    const t = s => { if (s) padre.appendChild(document.createTextNode(s)); };
    while ((m = re.exec(texto)) !== null) {
      const antes = texto.slice(pos, m.index);
      pos = re.lastIndex;
      if (m[1] !== undefined || m[6] !== undefined) {            // video
        let id = m[6] || null, titulo = '';
        if (m[1] !== undefined) {
          const partes = m[1].split('|');
          let u = (partes[0] || '').trim();
          if (u && !/^https?:\/\//i.test(u)) u = 'https://' + u;
          const mm = R_YT.exec(u);
          id = mm ? mm[1] : null;
          titulo = partes.slice(1).join('|').trim();
        }
        if (!id) { t(antes + m[0]); continue; }
        t(antes.replace(/\n$/, ''));
        padre.appendChild(tarjetaVideo(id, titulo));
        if (texto.charAt(pos) === '\n') { pos++; re.lastIndex = pos; }
        continue;
      }
      t(antes);
      if (m[3]) {                                                   // color
        const sp = document.createElement('span');
        sp.className = (m[2] ? 'rc-t-' : 'rc-') + m[3];
        construir(m[4], sp);
        padre.appendChild(sp);
      } else if (m[5] !== undefined) {                              // negrita
        const b = document.createElement('strong');
        construir(m[5], b);
        padre.appendChild(b);
      }
    }
    t(texto.slice(pos));
  }

  function aceptable(n) {
    const p = n.parentElement;
    if (!p || PROHIBIDOS.has(p.tagName)) return false;
    return !p.closest('[data-rico="no"],#visor-img,.leaflet-control');
  }
  function procesarTexto(n) {
    const padre = n.parentNode;
    if (!padre) return;
    const frag = document.createDocumentFragment();
    construir(n.nodeValue, frag);
    if (frag.childNodes.length === 1 && frag.firstChild.nodeType === 3) return;   // no había nada que convertir
    padre.replaceChild(frag, n);
  }

  /* ---------- Barra de formato para los cuadros de texto del docente ---------- */
  const SEL_EDIT = 'textarea[name="enunciado"],textarea[name="historia"],textarea[name="intro"],textarea[data-sf="texto"],textarea[data-fk="texto"],textarea[data-pk="enunciado"]';
  const bot = (attr, cls, txt, tit) => '<button type="button" data-rc="' + attr + '" class="' + cls + '" title="' + tit + '">' + txt + '</button>';

  function agregarBarra(ta) {
    if (ta.dataset.rcBarra) return;
    ta.dataset.rcBarra = '1';
    const barra = document.createElement('div');
    barra.className = 'rc-barra';
    barra.setAttribute('data-rico', 'no');
    barra.innerHTML =
      bot('b', 'rc-btn', '<b>B</b>', 'Negrita (seleccione el texto primero)') +
      '<span class="rc-lbl">Resaltar</span>' +
      Object.keys(FONDO).map(c => bot('f:' + c, 'rc-btn rc-' + c, 'ab', 'Resaltar en ' + c)).join('') +
      '<span class="rc-lbl">Letra</span>' +
      ['rojo', 'azul', 'verde', 'morado'].map(c => bot('t:' + c, 'rc-btn rc-t-' + c, 'A', 'Letra de color ' + c)).join('') +
      bot('quitar', 'rc-btn', '✖', 'Quitar el formato del texto seleccionado') +
      bot('video', 'rc-btn', '🎬 Video', 'Insertar un video de YouTube') +
      bot('prev', 'rc-btn', '👁 Vista previa', 'Ver cómo se verá');
    const prev = document.createElement('div');
    prev.className = 'rc-prev rc-oculto whitespace-pre-line text-sm bg-white border rounded-xl p-3 mt-1';
    ta.insertAdjacentElement('beforebegin', barra);
    ta.insertAdjacentElement('afterend', prev);
  }
  function envolver(ta, abre, cierra, relleno) {
    const a = ta.selectionStart, b = ta.selectionEnd, v = ta.value;
    const sel = v.slice(a, b) || relleno;
    ta.value = v.slice(0, a) + abre + sel + cierra + v.slice(b);
    const ini = a + abre.length;
    ta.focus(); ta.setSelectionRange(ini, ini + sel.length);
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  }
  function quitarFormato(ta) {
    const a = ta.selectionStart, b = ta.selectionEnd, v = ta.value;
    if (a === b) return aviso('Seleccione primero el texto al que quiere quitar el formato.', 'error');
    let s = v.slice(a, b), ant;
    const rc = new RegExp('\\{\\{(?:t-)?(?:' + Object.keys(FONDO).join('|') + '):([\\s\\S]*?)\\}\\}', 'g');
    do { ant = s; s = s.replace(rc, '$1').replace(/\*\*([\s\S]+?)\*\*/g, '$1'); } while (s !== ant);
    ta.value = v.slice(0, a) + s + v.slice(b);
    ta.focus(); ta.setSelectionRange(a, a + s.length);
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  }
  function insertarVideo(ta) {
    const u = prompt('Pegue aquí el enlace del video de YouTube\n(por ejemplo: https://youtu.be/XXXXXXXXXXX)');
    if (!u) return;
    let s = u.trim();
    if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
    const m = R_YT.exec(s);
    if (!m) return aviso('Ese enlace no parece de YouTube. Copie la dirección del video desde YouTube e intente de nuevo.', 'error');
    const a = ta.selectionStart, b = ta.selectionEnd, v = ta.value;
    const ins = (a > 0 && v[a - 1] !== '\n' ? '\n' : '') + '{{video:' + m[0] + '}}\n';
    ta.value = v.slice(0, a) + ins + v.slice(b);
    const pos = a + ins.length;
    ta.focus(); ta.setSelectionRange(pos, pos);
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  }
  function actualizarPrev(ta) {
    const p = ta.nextElementSibling;
    if (p && p.classList.contains('rc-prev') && !p.classList.contains('rc-oculto')) p.textContent = ta.value || '(escriba algo para ver la vista previa)';
  }
  function alternarPrev(ta, btn) {
    const p = ta.nextElementSibling;
    if (!p || !p.classList.contains('rc-prev')) return;
    const oculto = p.classList.toggle('rc-oculto');
    btn.textContent = oculto ? '👁 Vista previa' : '✏️ Ocultar vista previa';
    if (!oculto) actualizarPrev(ta);
  }
  document.addEventListener('mousedown', e => { if (e.target.closest && e.target.closest('.rc-barra button')) e.preventDefault(); });
  document.addEventListener('input', e => { if (e.target && e.target.dataset && e.target.dataset.rcBarra) actualizarPrev(e.target); });
  document.addEventListener('click', e => {
    const b = e.target && e.target.closest ? e.target.closest('.rc-barra [data-rc]') : null;
    if (!b) return;
    e.preventDefault(); e.stopPropagation();
    const ta = b.closest('.rc-barra').nextElementSibling;
    if (!ta || ta.tagName !== 'TEXTAREA') return;
    const a = b.dataset.rc;
    if (a === 'b') return envolver(ta, '**', '**', 'texto');
    if (a.indexOf('f:') === 0) return envolver(ta, '{{' + a.slice(2) + ':', '}}', 'texto');
    if (a.indexOf('t:') === 0) return envolver(ta, '{{t-' + a.slice(2) + ':', '}}', 'texto');
    if (a === 'quitar') return quitarFormato(ta);
    if (a === 'video') return insertarVideo(ta);
    if (a === 'prev') return alternarPrev(ta, b);
  });

  /* ---------- Revisión del documento: convierte las marcas y agrega las barras ---------- */
  function revisar(raiz) {
    if (!raiz) return;
    if (raiz.nodeType === 3) { if (RAPIDO.test(raiz.nodeValue) && aceptable(raiz)) procesarTexto(raiz); return; }
    if (raiz.nodeType !== 1) return;
    const tag = raiz.tagName;
    if (tag === 'IMG' || tag === 'CANVAS' || tag === 'SCRIPT' || tag === 'STYLE') return;
    const w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT, {
      acceptNode: n => (RAPIDO.test(n.nodeValue) && aceptable(n)) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
    });
    const lista = [];
    while (w.nextNode()) lista.push(w.currentNode);
    lista.forEach(procesarTexto);
    if (raiz.matches && raiz.matches(SEL_EDIT)) agregarBarra(raiz);
    if (raiz.querySelectorAll) raiz.querySelectorAll(SEL_EDIT).forEach(agregarBarra);
  }
  const cola = new Set();
  let prog = false;
  const vaciar = () => {
    prog = false;
    const l = Array.from(cola); cola.clear();
    l.forEach(n => { try { if (n.isConnected) revisar(n); } catch (_) { /* un texto raro no debe detener la aplicación */ } });
  };
  new MutationObserver(ms => {
    ms.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 3 || n.nodeType === 1) cola.add(n); }));
    if (cola.size && !prog) { prog = true; requestAnimationFrame(vaciar); }
  }).observe(document.body, { childList: true, subtree: true });
  revisar(document.body);

  /* ---------- Informes en PDF: negrita, colores y videos ---------- */
  function marcasAHTML(s) {
    return s
      .replace(/\*\*([^<>*]+?)\*\*/g, '<b>$1</b>')
      .replace(/\{\{video:([^<>}|]*)(?:\|([^<>}]*))?\}\}/g, (m, u, t) => '🎬 Video: ' + (t ? t.trim() + ' – ' : '') + u.trim())
      .replace(new RegExp('\\{\\{(t-)?(' + Object.keys(FONDO).join('|') + '):([^{}]*?)\\}\\}', 'g'), (m, tl, c, x) => tl
        ? '<span style="color:' + LETRA[c] + ';font-weight:bold">' + x + '</span>'
        : '<span style="background:' + FONDO[c][0] + ';color:' + FONDO[c][1] + ';padding:0 2px;border-radius:3px">' + x + '</span>');
  }
  if (window.html2pdf && window.html2pdf.Worker && window.html2pdf.Worker.prototype && window.html2pdf.Worker.prototype.from) {
    const desde = window.html2pdf.Worker.prototype.from;
    window.html2pdf.Worker.prototype.from = function (src, tipo) {
      if (typeof src === 'string' && (!tipo || tipo === 'string')) src = marcasAHTML(src);
      return desde.call(this, src, tipo);
    };
  }

  /* =========================================================
     4) «CONOZCA EL LUGAR» CON PARTES DESPLEGABLES
        La historia aparece abierta; las demás partes se abren al pincharlas (una a la vez).
     ========================================================= */
  function acordeon(grupo, icono, titulo, cuerpo, abierto, nota) {
    return '<details class="acordeon rounded-2xl border border-slate-200 bg-white overflow-hidden" data-grupo="' + grupo + '"' + (abierto ? ' open' : '') + '>' +
      '<summary class="flex items-center gap-2 px-3 py-3 cursor-pointer select-none font-bold">' +
      '<span class="text-xl">' + icono + '</span><span class="flex-1">' + titulo + '</span>' +
      (nota ? '<span class="text-[11px] font-normal text-slate-500">' + nota + '</span>' : '') +
      '<span class="chev text-slate-400">▾</span></summary>' +
      '<div class="px-3 pb-3 pt-2 space-y-2">' + cuerpo + '</div></details>';
  }
  document.addEventListener('toggle', e => {
    const d = e.target;
    if (!d || !d.matches || !d.matches('details.acordeon') || !d.open) return;
    document.querySelectorAll('details.acordeon[data-grupo="' + d.dataset.grupo + '"][open]').forEach(o => { if (o !== d) o.open = false; });
    setTimeout(() => { try { d.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (_) {} }, 60);
  }, true);

  const nImg = n => n ? n + (n === 1 ? ' imagen' : ' imágenes') : '';
  function cuerpoSeccion(s) {
    const p = s.poblacion || {};
    return (s.tipo === 'poblacion' && (p.total || p.actividades)
      ? '<div class="rounded-xl bg-emerald-50 p-2 text-sm">' +
        (p.total ? '<div>👥 <b>Total de habitantes:</b> ' + esc(p.total) + '</div>' : '') +
        (p.actividades ? '<div class="mt-1"><b>Actividades:</b> <span class="whitespace-pre-line">' + esc(p.actividades) + '</span></div>' : '') + '</div>'
      : '') +
      (s.texto ? '<p class="text-sm whitespace-pre-line">' + esc(s.texto) + '</p>' : '') +
      ((s.imagenes || []).length
        ? '<div class="grid grid-cols-2 gap-2">' + s.imagenes.map(im =>
          '<figure><img data-archivo="' + esc(im.id) + '" data-zoom="1" class="w-full h-32 object-cover rounded-xl bg-slate-100" alt="' + esc(im.pie || s.titulo || '') + '">' +
          (im.pie ? '<figcaption class="text-[11px] text-slate-500 mt-0.5">' + esc(im.pie) + '</figcaption>' : '') + '</figure>').join('') + '</div>'
        : '');
  }

  // Presentación del lugar (inicio de la aplicación)
  abrirInicio = function () {
    const ini = S.datos && S.datos.inicio;
    if (!inicioTiene(ini)) return;
    const secs = (ini.secciones || []).filter(seccionTiene);
    let abierta = secs.findIndex(s => s.tipo === 'historia');
    if (abierta < 0) abierta = 0;
    modal('<div class="space-y-3 pt-2">' +
      (ini.portada ? '<img data-archivo="' + esc(ini.portada) + '" data-zoom="1" class="w-full max-h-72 object-cover rounded-2xl bg-slate-100" alt="Portada">' : '') +
      '<h3 class="text-xl font-extrabold pr-6 leading-tight">📖 ' + esc(ini.titulo || 'Conozca el lugar de la salida') + '</h3>' +
      (ini.intro ? '<div class="bg-slate-50 rounded-2xl p-3 text-sm whitespace-pre-line">' + esc(ini.intro) + '</div>' : '') +
      (secs.length > 1 ? '<p class="text-xs text-slate-500">Pinche cada parte para ver más.</p>' : '') +
      '<div class="space-y-2">' + secs.map((s, i) => acordeon('ini',
        (typeof INI_IC !== 'undefined' && INI_IC[s.tipo]) || '📌',
        esc(s.titulo || (typeof INI_DEF !== 'undefined' && INI_DEF[s.tipo]) || 'Información'),
        cuerpoSeccion(s), i === abierta, nImg((s.imagenes || []).length))).join('') + '</div>' +
      '<p class="text-xs text-slate-400">Toque una imagen para verla más grande.</p></div>');
    pintarImagenes($('#modal-cuerpo'));
  };

  // Ficha de cada lugar («Conocer el lugar»)
  abrirFicha = function (id) {
    const p = (S.datos.puntos || []).find(x => x.id === id);
    if (!p) return;
    const f = jsonSeguro(p.ficha, {}) || {}, els = f.elementos || [];
    const grilla = l => '<div class="grid sm:grid-cols-2 gap-2">' + l.map(tarjetaElemento).join('') + '</div>';
    const bloques = [];
    const hist = els.filter(e => e.tipo === 'historia');
    if ((f.historia || '').trim() || hist.length) {
      bloques.push(['🏛️', 'Historia y patrimonio',
        ((f.historia || '').trim() ? '<div class="rounded-xl bg-slate-50 p-3 text-sm whitespace-pre-line">' + esc(f.historia) + '</div>' : '') + (hist.length ? grilla(hist) : ''),
        hist.length]);
    }
    [['flora', '🌿', 'Flora'], ['fauna', '🦅', 'Fauna'], ['otro', '📌', 'Otros elementos']].forEach(([k, ic, t]) => {
      const l = els.filter(e => e.tipo === k);
      if (l.length) bloques.push([ic, t, grilla(l), l.length]);
    });
    modal('<div class="space-y-3 pt-2">' +
      '<div class="flex items-center gap-3 pr-6"><span class="pin shrink-0">' + (typeof puntoNum === 'function' ? puntoNum(p.id) : '') + '</span><h3 class="text-lg font-extrabold leading-tight">' + esc(p.nombre) + '</h3></div>' +
      (bloques.length > 1 ? '<p class="text-xs text-slate-500">Pinche cada parte para ver más.</p>' : '') +
      '<div class="space-y-2">' + bloques.map((b, i) => acordeon('ficha', b[0], b[1], b[2], i === 0, b[3] ? b[3] + (b[3] === 1 ? ' elemento' : ' elementos') : '')).join('') + '</div>' +
      '<p class="text-xs text-slate-400 pt-1">Use estas fichas para reconocer los elementos cuando esté en el lugar. Toque una imagen para verla más grande.</p></div>');
    pintarImagenes($('#modal-cuerpo'));
  };
})();
