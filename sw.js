// Service Worker – App-Shell offline verfuegbar machen.
// Bei Aenderungen an den Dateien die Versionsnummer erhoehen.
const VERSION = 'v1';
const SHELL_CACHE = `sport-duell-shell-${VERSION}`;
const RUNTIME_CACHE = `sport-duell-runtime-${VERSION}`;

// Lokale Dateien, die fuer den Offline-Start gebraucht werden.
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/manifest.webmanifest',
  '/js/app.js',
  '/js/main.js',
  '/js/config.js',
  '/js/supabaseClient.js',
  '/js/store.js',
  '/js/auth.js',
  '/js/ui.js',
  '/js/format.js',
  '/js/streak.js',
  '/js/points.js',
  '/js/views/auth.js',
  '/js/views/dashboard.js',
  '/js/views/log.js',
  '/js/views/history.js',
  '/js/views/settings.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/favicon.svg',
  '/icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // Einzeln cachen, damit ein fehlendes Asset die Installation nicht stoppt.
      await Promise.allSettled(SHELL_ASSETS.map((url) => cache.add(url)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== SHELL_CACHE && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Supabase-API (Daten/Auth) niemals cachen – immer frisch aus dem Netz.
  if (url.hostname.endsWith('.supabase.co')) return;

  // HTML-Navigation: erst Netz, dann Cache (damit Updates ankommen).
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(SHELL_CACHE);
          cache.put('/index.html', fresh.clone());
          return fresh;
        } catch {
          const cache = await caches.open(SHELL_CACHE);
          return (await cache.match(request)) || (await cache.match('/index.html'));
        }
      })(),
    );
    return;
  }

  // Alles andere (eigene Assets + CDN-Bibliothek): stale-while-revalidate.
  event.respondWith(
    (async () => {
      const cacheName = url.origin === self.location.origin ? SHELL_CACHE : RUNTIME_CACHE;
      const cache = await caches.open(cacheName);
      const cached = await cache.match(request);
      const network = fetch(request)
        .then((response) => {
          if (response && (response.ok || response.type === 'opaque')) {
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() => null);
      return cached || (await network) || Response.error();
    })(),
  );
});
