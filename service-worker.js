const CACHE_NAME = "score-manager-v10";

const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

const CDN_ASSETS = [
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"
];

// Install — cache everything
self.addEventListener("install", event => {
  self.skipWaiting(); // Activate immediately, don't wait
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Cache local assets first (must succeed)
      return cache.addAll(STATIC_ASSETS).then(() => {
        // Cache CDN assets silently (fail gracefully if offline during install)
        return Promise.allSettled(
          CDN_ASSETS.map(url => cache.add(url).catch(() => {}))
        );
      });
    })
  );
});

// Activate — delete old caches and claim all clients immediately
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim()) // Take control of all open tabs immediately
  );
});

// Fetch — cache-first for local assets, network-first for CDN
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  // Only handle GET requests
  if(event.request.method !== "GET") return;

  // Skip Anthropic API calls — always go to network
  if(url.hostname === "api.anthropic.com") return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if(cached) return cached;
      return fetch(event.request).then(response => {
        // Cache successful responses from CDN
        if(response && response.status === 200){
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // If offline and not cached, return the main app page as fallback
        return caches.match("./index.html");
      });
    })
  );
});

// Allow the app to trigger immediate activation
self.addEventListener("message", event => {
  if(event.data && event.data.type === "SKIP_WAITING"){
    self.skipWaiting();
  }
});
