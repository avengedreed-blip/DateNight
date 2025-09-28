const APP_SHELL_CACHE = "date-night-shell-v1";
const RUNTIME_CACHE = "date-night-runtime-v1";
const CORE_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.svg",
  "/icons/icon-192.svg",
  "/icons/icon-512.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(APP_SHELL_CACHE)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .catch((error) => console.warn("Service worker install cache failed", error))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== APP_SHELL_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(APP_SHELL_CACHE).then((cache) => cache.put("/index.html", copy));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) {
            return cached;
          }
          return caches.match("/index.html");
        })
    );
    return;
  }

  if (url.origin === self.location.origin) {
    if (CORE_ASSETS.includes(url.pathname)) {
      event.respondWith(cacheFirst(event.request, APP_SHELL_CACHE));
      return;
    }

    if (url.pathname.startsWith("/assets/")) {
      event.respondWith(cacheFirst(event.request, APP_SHELL_CACHE));
      return;
    }
  }

  event.respondWith(networkFirst(event.request));
});

function cacheFirst(request, cacheName) {
  return caches.open(cacheName).then((cache) =>
    cache.match(request).then((cached) => {
      if (cached) {
        return cached;
      }
      return fetch(request)
        .then((response) => {
          cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached);
    })
  );
}

function networkFirst(request) {
  return caches
    .open(RUNTIME_CACHE)
    .then((cache) =>
      fetch(request)
        .then((response) => {
          cache.put(request, response.clone());
          return response;
        })
        .catch(() => cache.match(request))
    );
}
