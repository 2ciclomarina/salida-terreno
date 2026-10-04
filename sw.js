/* Service Worker – Salida a Terreno */
const VERSION = 'terreno-v2';
const TILES = VERSION + '-tiles';
const SHELL = ['./', './index.html', './docente.html', './app.js', './manifest.json'];
const CDN = [
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];
const MAX_TILES = 600;

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await c.addAll(SHELL);
    await Promise.all(CDN.map(u => fetch(u, { mode: 'no-cors' }).then(r => c.put(u, r)).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const claves = await caches.keys();
    await Promise.all(claves.filter(k => !k.startsWith(VERSION)).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

async function recortar(cache, max) {
  const ks = await cache.keys();
  if (ks.length > max) await Promise.all(ks.slice(0, ks.length - max).map(k => cache.delete(k)));
}

async function tiles(req) {
  const c = await caches.open(TILES);
  const hit = await c.match(req);
  if (hit) return hit;
  try {
    const r = await fetch(req);
    if (r && (r.ok || r.type === 'opaque')) { c.put(req, r.clone()); recortar(c, MAX_TILES); }
    return r;
  } catch (_) { return new Response('', { status: 504 }); }
}

async function swr(req) {
  const c = await caches.open(VERSION);
  const hit = await c.match(req);
  const red = fetch(req).then(r => {
    if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone());
    return r;
  }).catch(() => hit);
  return hit || red;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  // La API de Apps Script nunca se cachea
  if (/(^|\.)script\.google(usercontent)?\.com$/.test(u.hostname)) return;
  if (/tile\.opentopomap\.org|tile\.openstreetmap\.org|arcgisonline\.com/.test(u.hostname)) {
    return e.respondWith(tiles(req));
  }
  if (req.mode === 'navigate') {
    return e.respondWith(fetch(req).catch(() => caches.match(req).then(r => r || caches.match('./index.html'))));
  }
  e.respondWith(swr(req));
});

// Cuando vuelve la señal, avisa a la app abierta para que envíe la cola
self.addEventListener('sync', e => {
  if (e.tag === 'sync-respuestas') {
    e.waitUntil(self.clients.matchAll({ includeUncontrolled: true }).then(cs => cs.forEach(c => c.postMessage('SYNC'))));
  }
});
