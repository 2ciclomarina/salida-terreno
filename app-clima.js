'use strict';
/* =========================================================
   SALIDA A TERRENO – app-clima.js  (ARCHIVO NUEVO, solo estudiantes)
   Agrega al recorrido el tiempo actual y el pronóstico de las próximas 24 horas
   (temperatura, sensación térmica, lluvia, viento, rayos UV, humedad y altura del lugar),
   junto a las condiciones que la aplicación ya muestra.
   Datos del modelo Open-Meteo. Se carga DESPUÉS de app-borrador.js, solo en index.html.
   ========================================================= */
(function () {
  if (document.body.dataset.modo !== 'alumno') return;

  const CACHE = {};
  const ICONO = c => c === 0 ? '☀️' : c <= 2 ? '🌤️' : c === 3 ? '☁️' : (c === 45 || c === 48) ? '🌫️' : (c >= 51 && c <= 57) ? '🌦️' :
    (c >= 61 && c <= 67) ? '🌧️' : (c >= 71 && c <= 77) ? '🌨️' : (c >= 80 && c <= 82) ? '🌦️' : (c >= 85 && c <= 86) ? '🌨️' : c >= 95 ? '⛈️' : '🌡️';
  const TEXTO = c => c === 0 ? 'Despejado' : c <= 2 ? 'Poco nublado' : c === 3 ? 'Nublado' : (c === 45 || c === 48) ? 'Neblina' : (c >= 51 && c <= 57) ? 'Llovizna' :
    (c >= 61 && c <= 67) ? 'Lluvia' : (c >= 71 && c <= 77) ? 'Nieve' : (c >= 80 && c <= 82) ? 'Chubascos' : (c >= 85 && c <= 86) ? 'Nevazón' : c >= 95 ? 'Tormenta' : '';
  const n0 = v => (v == null || !isFinite(v)) ? '–' : String(Math.round(v));
  const n1 = v => (v == null || !isFinite(v)) ? '–' : String(Math.round(v * 10) / 10).replace('.', ',');
  const esc2 = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function lugar() {
    try {
      if (typeof REC !== 'undefined' && REC) {
        const u = REC.fix || (REC.pts && REC.pts[REC.pts.length - 1]);
        if (u && u.la != null) return Promise.resolve([u.la, u.lo]);
        const pt = ((S.datos && S.datos.puntos) || []).find(p => REC.act && p.id === REC.act.punto_id);
        if (pt && isFinite(pt.lat)) return Promise.resolve([pt.lat, pt.lng]);
      }
    } catch (_) {}
    return new Promise(res => {
      if (!navigator.geolocation) return res(null);
      navigator.geolocation.getCurrentPosition(p => res([p.coords.latitude, p.coords.longitude]), () => res(null), { timeout: 8000, maximumAge: 120000 });
    });
  }

  async function traer(la, lo) {
    const k = la.toFixed(2) + ',' + lo.toFixed(2), c = CACHE[k];
    if (c && Date.now() - c.t < 15 * 60000) return c.d;
    const u = 'https://api.open-meteo.com/v1/forecast?latitude=' + la.toFixed(4) + '&longitude=' + lo.toFixed(4) +
      '&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,surface_pressure' +
      '&hourly=temperature_2m,precipitation_probability,weather_code,wind_speed_10m,uv_index&forecast_hours=24&wind_speed_unit=kmh&timezone=auto';
    const r = await fetch(u);
    if (!r.ok) throw new Error('clima');
    const d = await r.json();
    CACHE[k] = { t: Date.now(), d: d };
    return d;
  }

  function consejos(h, cur) {
    const t = h.temperature_2m || [], pp = h.precipitation_probability || [], uv = h.uv_index || [], vv = h.wind_speed_10m || [];
    const mx = a => Math.max.apply(null, a.filter(x => x != null && isFinite(x)).concat([-Infinity]));
    const mn = a => Math.min.apply(null, a.filter(x => x != null && isFinite(x)).concat([Infinity]));
    const out = [];
    if (mx(pp) >= 50) out.push('☂️ Hay probabilidad de lluvia: lleve impermeable.');
    if (mx(uv) >= 6) out.push('🧴 Rayos UV altos: use protector solar y gorro.');
    if (mn(t) <= 10) out.push('🧥 Habrá frío: lleve abrigo.');
    if (mx(t) >= 27) out.push('💧 Habrá calor: lleve agua.');
    if (mx(vv) >= 35 || (cur && cur.wind_gusts_10m >= 50)) out.push('💨 Viento fuerte: cuide su equilibrio cerca de acantilados y playas.');
    return out;
  }

  function html(d) {
    const c = d.current || {}, h = d.hourly || {}, tm = h.time || [];
    const mx = a => Math.max.apply(null, (a || []).filter(x => x != null));
    const mn = a => Math.min.apply(null, (a || []).filter(x => x != null));
    const hora = s => String(s).slice(11, 13) + ':00';
    const chips = tm.map((t, i) => '<div class="shrink-0 w-14 text-center rounded-xl bg-slate-50 border py-1.5">' +
      '<div class="text-[10px] text-slate-500">' + hora(t) + '</div><div class="text-lg leading-none">' + ICONO(h.weather_code[i]) + '</div>' +
      '<div class="text-xs font-bold">' + n0(h.temperature_2m[i]) + '°</div>' +
      '<div class="text-[10px] text-sky-700">' + (h.precipitation_probability && h.precipitation_probability[i] != null ? '💧' + n0(h.precipitation_probability[i]) + '%' : '') + '</div></div>').join('');
    const cs = consejos(h, c);
    return '<div class="text-xs font-semibold mb-1">🌤️ Tiempo ahora y próximas 24 horas</div>' +
      '<div class="flex items-center gap-3"><div class="text-4xl">' + ICONO(c.weather_code) + '</div>' +
      '<div class="flex-1"><div class="text-2xl font-extrabold leading-none">' + n1(c.temperature_2m) + ' °C</div>' +
      '<div class="text-xs text-slate-600">' + esc2(TEXTO(c.weather_code)) + ' · sensación ' + n0(c.apparent_temperature) + ' °C</div></div></div>' +
      '<div class="grid grid-cols-3 gap-1.5 mt-2 text-center text-[11px]">' +
      '<div class="rounded-lg bg-slate-50 border p-1.5">⛰️<div class="font-bold text-xs">' + n0(d.elevation) + ' m</div>altura del lugar</div>' +
      '<div class="rounded-lg bg-slate-50 border p-1.5">💨<div class="font-bold text-xs">' + n0(c.wind_speed_10m) + ' km/h</div>viento (ráfaga ' + n0(c.wind_gusts_10m) + ')</div>' +
      '<div class="rounded-lg bg-slate-50 border p-1.5">💦<div class="font-bold text-xs">' + n0(c.relative_humidity_2m) + ' %</div>humedad</div>' +
      '<div class="rounded-lg bg-slate-50 border p-1.5">🌡️<div class="font-bold text-xs">' + n0(mn(h.temperature_2m)) + '° / ' + n0(mx(h.temperature_2m)) + '°</div>mín. / máx. 24 h</div>' +
      '<div class="rounded-lg bg-slate-50 border p-1.5">🌧️<div class="font-bold text-xs">' + n0(mx(h.precipitation_probability)) + ' %</div>lluvia máx. 24 h</div>' +
      '<div class="rounded-lg bg-slate-50 border p-1.5">🕶️<div class="font-bold text-xs">' + n1(mx(h.uv_index)) + '</div>UV máximo 24 h</div></div>' +
      '<div class="flex gap-1.5 overflow-x-auto mt-2 pb-1">' + chips + '</div>' +
      (cs.length ? '<div class="mt-2 rounded-xl bg-amber-50 border border-amber-200 p-2 text-xs space-y-0.5">' + cs.map(x => '<div>' + x + '</div>').join('') + '</div>' : '') +
      '<p class="text-[10px] text-slate-400 mt-1">Pronóstico del modelo Open-Meteo para su ubicación; es una estimación y puede cambiar. La altura es la del terreno según el modelo.</p>';
  }

  async function montar(box) {
    if (box.dataset.cargado) return;
    box.dataset.cargado = '1';
    box.innerHTML = '<span class="text-xs text-slate-500">Buscando el pronóstico…</span>';
    try {
      const l = await lugar();
      if (!l) { box.innerHTML = '<span class="text-xs text-slate-500">Active el GPS para ver el pronóstico de su ubicación.</span>'; box.dataset.cargado = ''; return; }
      const d = await traer(l[0], l[1]);
      if (document.body.contains(box)) box.innerHTML = html(d);
    } catch (_) {
      if (document.body.contains(box)) { box.innerHTML = '<span class="text-xs text-slate-500">No se pudo obtener el pronóstico (se necesita internet).</span>'; box.dataset.cargado = ''; }
    }
  }

  function revisar() {
    const prev = document.getElementById('rec-prev-clima');
    if (prev && !document.getElementById('clima24')) {
      const b = document.createElement('div');
      b.id = 'clima24'; b.className = 'bg-white rounded-2xl p-3 shadow text-sm';
      prev.parentNode.insertBefore(b, prev.nextSibling);
      montar(b);
    }
    const mapa = document.getElementById('rec-mapa');
    if (mapa && !document.getElementById('clima24')) {
      const b = document.createElement('div');
      b.id = 'clima24'; b.className = 'bg-white rounded-2xl p-3 shadow text-sm';
      mapa.parentNode.insertBefore(b, mapa);
      montar(b);
    }
  }
  let t = null;
  try { new MutationObserver(() => { clearTimeout(t); t = setTimeout(revisar, 200); }).observe(document.body, { childList: true, subtree: true }); } catch (_) {}
})();
