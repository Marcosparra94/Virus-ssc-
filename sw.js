/* Service worker de Virus!: guarda el juego en el teléfono para abrirlo al instante y sin conexión.
   Estrategia: se muestra lo guardado y, en segundo plano, se baja la versión nueva (se ve la próxima vez que abras la app). */
const CACHE = 'virus-v1';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(CORE.map(u => c.add(u).catch(() => { })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const same = url.origin === self.location.origin;
  if (!same && FONT_HOSTS.indexOf(url.hostname) < 0) return; // señalización y llamadas no pasan por aquí
  const nav = req.mode === 'navigate';
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req, { ignoreSearch: nav }) || (nav ? await cache.match('./index.html') || await cache.match('./') : undefined);
    const net = fetch(req).then(r => {
      if (r && (r.ok || r.type === 'opaque')) cache.put(nav ? './index.html' : req, r.clone()).catch(() => { });
      return r;
    }).catch(() => undefined);
    if (hit) { e.waitUntil(net); return hit; }
    return (await net) || new Response('Sin conexión', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  })());
});
