const CACHE = 'traktirie';
const ASSETS = [
  '/','/login','/signup','/dashboard',
  '/support','/shop','/linkbio','/commission',
  '/css/style.css',
  '/js/main.js', '/js/backend-config.js', '/js/backend-client.js', '/js/auth.js',
  '/js/payment.js', '/js/commission.js', '/js/theme-engine.js', '/js/router.js',
  '/js/icons.js', '/js/store-data.js', '/js/wallet-data.js',
  '/manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  // Data dari /api/* (saldo, profil, produk, dst) HARUS selalu fresh dari
  // server -- jangan pernah dicache, biar gak nyangkut data basi.
  const url = new URL(e.request.url);
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(fetch(e.request));
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fetchPromise = fetch(e.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
          return res;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
