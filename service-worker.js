const CACHE_NAME = "soundaura-cache-v3";  // <-- CHANGE THIS EVERY UPDATE

const urlsToCache = [
  "./",
  "./index.html",
  "./style.css?v=3",   // versioning !!
  "./script.js?v=3",   // versioning !!
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

// 🧩 INSTALL
self.addEventListener("install", (event) => {
  console.log("[ServiceWorker] Installing...");
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// 🌀 ACTIVATE
self.addEventListener("activate", (event) => {
  console.log("[ServiceWorker] Activated");
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => {
        if (key !== CACHE_NAME) return caches.delete(key);
      }))
    )
  );
  self.clients.claim();
});

// 🌐 FETCH
self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const cloned = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
