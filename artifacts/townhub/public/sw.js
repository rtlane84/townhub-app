/// <reference lib="webworker" />

const CACHE_NAME = "townhub-static-v1";

const STATIC_ASSET_PATTERN =
  /\.(?:js|css|woff2?|png|svg|ico|webp|wav|webmanifest|html)$/i;

const NEVER_CACHE_PATTERN =
  /^\/(?:api|health)(?:\/|$)/;

declare const self: ServiceWorkerGlobalScope;

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;
  if (NEVER_CACHE_PATTERN.test(url.pathname)) return;

  const isStatic =
    url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/sounds/") ||
    STATIC_ASSET_PATTERN.test(url.pathname);

  if (!isStatic) return;

  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) return cached;

      const response = await fetch(request);
      if (response.ok) {
        const copy = response.clone();
        const cache = await caches.open(CACHE_NAME);
        void cache.put(request, copy);
      }
      return response;
    })(),
  );
});

export {};
