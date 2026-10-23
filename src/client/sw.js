/* Mampf – Service Worker (PWA / Offline)
 *
 * - App-Shell wird vorab gecacht, damit die App offline startet.
 * - Navigation: Netzwerk zuerst, Fallback auf den gecachten Shell.
 * - Statische Dateien: Cache zuerst, im Hintergrund aktualisiert.
 * - API-Aufrufe gehen immer direkt ins Netz (nie cachen).
 *
 * Die Dateien des optionalen Anna-Themes (/anna/…) stehen bewusst nicht in der Liste:
 * Sie werden erst beim Einschalten geladen und dann vom Laufzeit-Cache unten übernommen.
 *
 * Bei Änderungen an der Dateiliste unten CACHE_NAME hochzählen.
 */
const CACHE_NAME = 'mampf-v7';
const APP_SHELL = [
  '/',
  '/styles.css',
  '/manifest.json',
  '/js/main.js',
  '/js/anna-settings.js',
  '/js/api.js',
  '/js/auth.js',
  '/js/dom.js',
  '/js/domain.js',
  '/js/footer.js',
  '/js/meals.js',
  '/js/plan.js',
  '/js/pull-to-refresh.js',
  '/js/shopping.js',
  '/js/storage.js',
  '/js/tabs.js',
  '/js/theme-init.js',
  '/js/theme.js',
  '/js/templates.js',
  '/icons/sprite.svg',
  '/icons/icon.svg',
  '/icons/icon-32.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/', copy));
          return response;
        })
        .catch(() => caches.match('/'))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
