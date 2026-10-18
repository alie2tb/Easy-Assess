const CACHE_NAME = "score-manager-v585";

const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

// Reference PDFs for the Notes tab — cached best-effort so a missing/renamed
// file can't break the install step for the rest of the app.
const PDF_ASSETS = [
  "./Std_5_Agriculture.pdf",
  "./Std 5 Bible Knowledge.pdf",
  "./Std 5 Expressive Arts.pdf",
  "./Std 5 Life Skills.pdf",
  "./Std 5 Religious Education.pdf",
  "./Std 5 Science.pdf",
  "./Std 5 Social Studies.pdf",
  "./Std 6 Agriculture.pdf",
  "./Std 6 Bible Knowledge.pdf",
  "./Std 6 Expressive Arts.pdf",
  "./Std 6 Life Skills.pdf",
  "./Std 6 Religious Education.pdf",
  "./Std 6 Science.pdf",
  "./Std 6 Social Studies.pdf",
  "./Std 7 Agriculture.pdf",
  "./Std 7 Bible Knowledge.pdf",
  "./Std 7 Expressive Arts.pdf",
  "./Std 7 Life Skills.pdf",
  "./Std 7 Religious Education.pdf",
  "./Std 7 Science.pdf",
  "./Std 7 Social Studies.pdf",
  "./Std 8 Agriculture.pdf",
  "./Std 8 Bible Knowledge.pdf",
  "./Std 8 Expressive Arts.pdf",
  "./Std 8 Life Skills.pdf",
  "./Std 8 Religious Education.pdf",
  "./Std 8 Science.pdf",
  "./Std 8 Social Studies.pdf",
  "./Standard 1 Syllabus.pdf",
  "./Standard 2 Syllabus.pdf",
  "./Standard 3 Syllabus.pdf",
  "./Standard 4 Syllabus.pdf",
  "./Standard 5 Syllabus.pdf",
  "./Standard 6 Syllabus.pdf",
  "./Standard 7 Syllabus.pdf",
  "./Standard 8 Syllabus.pdf"
];

const CDN_ASSETS = [
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"
];

// Install
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(STATIC_ASSETS).then(() =>
        Promise.allSettled([
          ...CDN_ASSETS.map(url => cache.add(url).catch(()=>{})),
          ...PDF_ASSETS.map(url => cache.add(url).catch(()=>{}))
        ])
      )
    ).then(() => self.skipWaiting()) // activate a new version immediately —
                                      // no waiting on the user, no dialog
  );
});

// Activate
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim()) // take over open tabs right away too
  );
});

// Fetch
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if(event.request.method !== "GET") return;
  if(url.hostname === "api.anthropic.com") return;
  if(url.hostname === "www.googletagmanager.com" || url.hostname === "www.google-analytics.com" || url.hostname === "analytics.google.com" || url.hostname === "region1.google-analytics.com") return;

  // Only the fixed app-shell/PDF/CDN files are safe to treat as cache-first:
  // their content never changes at the same URL between versions (a new
  // version ships under a new CACHE_NAME anyway). Anything else can have its
  // content replaced at the very same URL, so it gets network-first instead,
  // falling back to cache only when offline.
  const isPrecached = STATIC_ASSETS.some(a => new URL(a, self.location).href === url.href)
    || PDF_ASSETS.some(a => new URL(a, self.location).href === url.href)
    || CDN_ASSETS.includes(url.href);

  if(!isPrecached){
    event.respondWith(
      fetch(event.request, {cache:"no-store"}).then(response => {
        if(response && response.status === 200){
          const clone = response.clone();
          event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone)));
        }
        return response;
      }).catch(() => caches.match(event.request).then(cached => cached || caches.match("./index.html")))
    );
    return;
  }

  // Cache-first for the known, fixed app-shell/PDF/CDN files
  event.respondWith(
    caches.match(event.request).then(cached => {
      if(cached) return cached;
      return fetch(event.request).then(response => {
        if(response && response.status === 200){
          const clone = response.clone();
          event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone)));
        }
        return response;
      }).catch(() => caches.match("./index.html"));
    })
  );
});

// ── Message handler (SKIP_WAITING) ────────────────────────────────────────
self.addEventListener("message", event => {
  if(event.data && event.data.type === "SKIP_WAITING"){
    self.skipWaiting();
  }
});
