const CACHE_NAME = "expense-tracker-v2";
const PRECACHE = [
  "/",
  "/index.html",
  "/manifest.json"
];

// Install: precache shell
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: network-first for API calls, cache-first for assets
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  
  // Never cache Google API calls
  if (url.hostname.includes("googleapis.com") || url.hostname.includes("google.com")) {
    return;
  }
  
  // Cache-first for static assets
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fetched = fetch(e.request).then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        return response;
      });
      return cached || fetched;
    })
  );
});

// Periodic sync for year-end check (where supported)
self.addEventListener("periodicsync", e => {
  if (e.tag === "year-end-check") {
    e.waitUntil(checkYearEndFromSW());
  }
});

async function checkYearEndFromSW() {
  const now = new Date();
  if (now.getMonth() !== 11 || now.getDate() < 15) return;
  
  // Notify the main app to check
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({ type: "YEAR_END_CHECK" });
  });
}
