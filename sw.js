/* Service worker de Virus!: guarda el juego en el teléfono para abrirlo sin conexión.
   La página se pide SIEMPRE primero a internet (así las actualizaciones llegan al abrir la app);
   si no hay conexión o tarda mucho, se usa la copia guardada. */
const CACHE = 'virus-v2';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(CORE.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => { })))).then(() => self.skipWaiting()));
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
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const saved = () => cache.match('./index.html').then(r => r || cache.match('./'));
      const net = fetch(url.origin + url.pathname, { cache: 'no-cache', credentials: 'same-origin' }).then(r => {
        if (r && r.ok) cache.put('./index.html', r.clone()).catch(() => { });
        return r;
      });
      const slow = new Promise(res => setTimeout(() => res(null), 4000));
      try {
        const r = await Promise.race([net, slow.then(async () => (await saved()) || net)]);
        if (r) return r;
      } catch (err) { }
      return (await saved()) || new Response('Sin conexión', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    })());
    return;
  }
  // Imágenes, manifest y tipografías: se muestra lo guardado y se refresca en segundo plano
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req);
    const net = fetch(req).then(r => { if (r && (r.ok || r.type === 'opaque')) cache.put(req, r.clone()).catch(() => { }); return r; }).catch(() => undefined);
    if (hit) { e.waitUntil(net); return hit; }
    return (await net) || new Response('', { status: 504 });
  })());
});

// Al tocar la notificación de turno, se abre/enfoca el juego
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    for (const c of cs) { if ('focus' in c) return c.focus(); }
    return self.clients.openWindow('./');
  }));
});
