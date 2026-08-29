/* ==========================================================================
   service-worker.js — minimal offline cache (optional PWA support)
   ========================================================================== */
const CACHE_NAME = 'kanban-board-cache-v1';
const CORE_ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './css/components.css',
  './css/responsive.css',
  './js/utils.js',
  './js/state.js',
  './js/storage.js',
  './js/toast.js',
  './js/modal.js',
  './js/tasks.js',
  './js/columns.js',
  './js/search.js',
  './js/filters.js',
  './js/statistics.js',
  './js/drag-drop.js',
  './js/touch-drag.js',
  './js/import-export.js',
  './js/settings.js',
  './js/ui.js',
  './js/app.js',
  './data/demo-board.json',
  './manifest.json',
  './assets/icons/favicon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Never intercept API calls to the optional Python server.
  if (event.request.url.includes('/api/')) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).catch(() => cached);
    })
  );
});
