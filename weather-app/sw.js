/* ==========================================================================
   SkyCast — sw.js
   Caches the app shell (HTML/CSS/JS/icons) so the UI loads offline.
   Weather data itself is cached separately, in localStorage, by api.js —
   this worker deliberately does NOT intercept API requests, so the app
   always tries the network first for fresh conditions.
   ========================================================================== */

const CACHE_NAME = "skycast-shell-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./css/styles.css",
  "./js/weather.js",
  "./js/storage.js",
  "./js/geolocation.js",
  "./js/api.js",
  "./js/theme.js",
  "./config.js",
  "./js/ui.js",
  "./js/app.js",
  "./manifest.json",
  "./assets/icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  // Only manage same-origin app-shell requests; let weather API calls pass through untouched.
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
