const CACHE = 'regcampo-4.15.0';
const SHELL = [
  '/registro-labores-nuevo/index.html',
  '/registro-labores-nuevo/manifest.json',
  '/registro-labores-nuevo/icons/icon-any-192.png',
  '/registro-labores-nuevo/icons/icon-any-512.png',
  '/registro-labores-nuevo/icons/icon-maskable-192.png',
  '/registro-labores-nuevo/icons/icon-maskable-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Nunca cachear llamadas a Supabase: siempre red, siempre datos frescos.
  if (url.hostname.includes('supabase.co')) {
    e.respondWith(fetch(e.request));
    return;
  }
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fetchPromise = fetch(e.request)
        .then((networkResp) => {
          if (networkResp && networkResp.status === 200) {
            const clone = networkResp.clone();
            caches.open(CACHE).then((cache) => cache.put(e.request, clone));
          }
          return networkResp;
        })
        .catch(() => cached || caches.match('/registro-labores-nuevo/index.html'));
      return cached || fetchPromise;
    })
  );
});
