const SHELL = "martucci-shell-v3";
const RUNTIME = "martucci-runtime-v3";

const PRECACHE = ["/", "/favicon.svg", "/__grok/icon-180.png", "/__grok/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL);
      await Promise.all(PRECACHE.map((url) => cache.add(url).catch(() => undefined)));
    })(),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([SHELL, RUNTIME]);
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => !keep.has(key)).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.protocol !== "http:" && url.protocol !== "https:") return;
  if (url.pathname.startsWith("/api") || url.pathname.startsWith("/auth")) return;
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, SHELL, "/"));
    return;
  }
  if (isCacheableAsset(url)) {
    event.respondWith(cacheFirst(request, RUNTIME));
    return;
  }
  if (url.origin === self.location.origin) {
    event.respondWith(networkFirst(request, RUNTIME));
  }
});

function isCacheableAsset(url) {
  if (url.hostname === "fonts.gstatic.com" || url.hostname === "fonts.googleapis.com") return true;
  if (url.origin !== self.location.origin) return false;
  return (
    url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/__grok/") ||
    url.pathname === "/favicon.svg" ||
    url.pathname === "/og.jpg" ||
    url.pathname === "/sw.js" ||
    /\.(?:js|css|woff2|woff|ttf|svg|png|jpg|jpeg|webp|ico)$/i.test(url.pathname)
  );
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request, cacheName, fallbackUrl) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(fallbackUrl && request.mode === "navigate" ? fallbackUrl : request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (fallbackUrl) {
      const shell = await caches.match(fallbackUrl);
      if (shell) return shell;
    }
    return new Response("Martucci está sin conexión. Abrí la app una vez con internet.", {
      status: 503,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
}
