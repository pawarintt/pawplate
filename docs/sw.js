// PawPlate offline cache.
// - Only same-origin GETs are handled; PocketBase (another origin) always goes
//   straight to the network, so reports and templates are never served stale.
// - Versioned files (?v=...), vendor files and fonts never change at a given
//   URL, so they come from the cache first.
// - Everything else (index.html, config.js, facets.json) tries the network
//   first and falls back to the cache when the network fails or stalls, so a
//   push to main shows up on the next load whenever the connection works.
const CACHE = "pawplate-v1";
const NETWORK_TIMEOUT_MS = 4000;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith("pawplate-") && name !== CACHE).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", event => {
  if (event.data?.type !== "warm" || !Array.isArray(event.data.urls)) return;
  event.waitUntil(Promise.all(event.data.urls.map(async url => {
    const request = new Request(url);
    if (!isHandled(request)) return;
    const cache = await caches.open(CACHE);
    if (await cache.match(request)) return;
    try {
      const response = await fetch(request);
      if (response.ok) await store(request, response);
    } catch {
      // Warming is best effort; the next normal load fills the gap.
    }
  })));
});

self.addEventListener("fetch", event => {
  const { request } = event;
  if (!isHandled(request)) return;
  event.respondWith(isImmutable(new URL(request.url)) ? cacheFirst(request) : networkFirst(request));
});

function isHandled(request) {
  if (request.method !== "GET") return false;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;
  return url.pathname.startsWith(new URL(self.registration.scope).pathname);
}

function isImmutable(url) {
  return url.searchParams.has("v") || url.pathname.includes("/vendor/") || url.pathname.includes("/fonts/");
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) await store(request, response.clone());
  return response;
}

async function networkFirst(request) {
  const network = fetch(request).then(async response => {
    if (response.ok) await store(request, response.clone());
    return response;
  });
  // The timeout may win the race; keep a late network failure from being
  // reported as an unhandled rejection.
  network.catch(() => {});
  let timer = 0;
  const timeout = new Promise(resolve => {
    timer = setTimeout(resolve, NETWORK_TIMEOUT_MS);
  });
  try {
    const response = await Promise.race([network, timeout]);
    if (response) return response;
  } catch {
    // Offline or the request failed: fall through to the cache.
  } finally {
    clearTimeout(timer);
  }
  const cached = await caches.match(request, { ignoreSearch: request.mode === "navigate" });
  if (cached) return cached;
  // Nothing cached yet: keep waiting on the network rather than failing.
  return network;
}

// Store a response and drop older copies of the same file with a different
// ?v= tag, so each version bump replaces its predecessor instead of piling up.
async function store(request, response) {
  const cache = await caches.open(CACHE);
  const url = new URL(request.url);
  if (url.searchParams.has("v")) {
    const keys = await cache.keys();
    await Promise.all(keys.map(key => {
      const keyUrl = new URL(key.url);
      const stale = keyUrl.pathname === url.pathname && keyUrl.searchParams.get("v") !== url.searchParams.get("v");
      return stale ? cache.delete(key) : null;
    }));
  }
  await cache.put(request, response);
}
