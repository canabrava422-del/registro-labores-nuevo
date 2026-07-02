const CACHE = 'regcampo-4.17.44';
const SHELL = [
  '/index.html',
  '/manifest.json',
  '/icons/icon-any-192.png',
  '/icons/icon-any-512.png',
  '/icons/icon-maskable-192.png',
  '/icons/icon-maskable-512.png'
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

  // Supabase Storage (fotos): si falla la red, devolver error silencioso
  if (url.hostname.includes('supabase.co') && url.pathname.includes('/storage/')) {
    e.respondWith(
      fetch(e.request).catch(() => new Response('', { status: 503 }))
    );
    return;
  }

  // Supabase REST API: siempre intentar red primero, sin cachear
  if (url.hostname.includes('supabase.co')) {
    e.respondWith(
      fetch(e.request).catch(() => new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }))
    );
    return;
  }

  if (e.request.method !== 'GET') return;

  // App shell y recursos estáticos: cache-first con actualización en background
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
        .catch(() => cached || caches.match('/index.html'));
      // Si hay cache devuélvela inmediatamente; actualiza en background
      return cached || fetchPromise;
    })
  );
});
