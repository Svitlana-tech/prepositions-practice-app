const CACHE_NAME = "app-cache-v2";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll([OFFLINE_URL]))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Cache-first ONLY for Next's own immutable, content-hashed build output
  // (the filename changes whenever the content does, so this can never go
  // stale). Everything else — including client-side route/RSC fetches,
  // which look like plain page URLs and are NOT `navigate` requests — must
  // stay network-first, or a returning visitor's in-app navigation can
  // silently serve a stale response from a previous deploy.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            return response;
          })
      )
    );
    return;
  }

  // Network-first for everything else (pages, RSC navigation fetches, API
  // calls), so content is always fresh when online.
  event.respondWith(
    fetch(request).catch(() =>
      request.mode === "navigate"
        ? caches.match(OFFLINE_URL)
        : new Response(JSON.stringify({ error: "offline" }), {
            status: 503,
            headers: { "Content-Type": "application/json" },
          })
    )
  );
});
