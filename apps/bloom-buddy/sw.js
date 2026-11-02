const CACHE_NAME = 'bloom-buddy-v1';

const STATIC_ASSETS = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './icon.svg',
  './js/app.js',
  './js/i18n.js',
  './js/speech.js',
  './js/db.js',
  './js/api.js',
  './js/mascot.js',
  './js/map.js',
];

const EXTERNAL_ASSETS = [
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://fonts.googleapis.com/css2?family=Nunito:wght@700;800;900&display=swap',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(async (cache) => {
        await cache.addAll(STATIC_ASSETS);
        try {
          await Promise.allSettled(
            EXTERNAL_ASSETS.map((url) =>
              fetch(url, { mode: 'cors' }).then((res) => {
                if (res.ok) return cache.put(url, res);
              })
            )
          );
        } catch {}
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Never cache local dev keys or live API POST/GET endpoints in SW
  if (
    url.pathname.endsWith('dev-keys.local.json') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('plantnet.org')
  ) {
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(event.request, copy));
          }
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((res) => {
        if (res && res.status === 200 && (url.origin === self.location.origin || url.hostname.includes('unpkg.com') || url.hostname.includes('fonts.g'))) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, copy));
        }
        return res;
      });
    })
  );
});
