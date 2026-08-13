const CACHE_NAME = "score-manager-v55";

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
    )
  );
});

// Activate
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if(event.request.method !== "GET") return;
  if(url.hostname === "api.anthropic.com") return;

  // Cache-first for everything
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

// ── Push notification handler ─────────────────────────────────────────────
// Fires when a push event is received (from background)
self.addEventListener("push", event => {
  let data = { title: "Easy Assess 33", body: "You have a new announcement." };
  if(event.data){
    try { data = event.data.json(); } catch(e){ data.body = event.data.text(); }
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body:    data.body,
      icon:    "./icon-192.png",
      badge:   "./icon-192.png",
      vibrate: [200, 100, 200],
      tag:     data.tag || "ea33-announcement",
      renotify: true,
      data:    { url: data.url || "./" }
    })
  );
});

// ── Notification click — open the app ─────────────────────────────────────
self.addEventListener("notificationclick", event => {
  event.notification.close();
  const target = event.notification.data && event.notification.data.url
    ? event.notification.data.url : "./";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
      for(const client of list){
        if(client.url.includes(self.location.origin) && "focus" in client)
          return client.focus();
      }
      if(clients.openWindow) return clients.openWindow(target);
    })
  );
});

// ── Message handler (SKIP_WAITING + SHOW_NOTIFICATION) ────────────────────
self.addEventListener("message", event => {
  if(!event.data) return;
  if(event.data.type === "SKIP_WAITING"){
    self.skipWaiting();
  }
  if(event.data.type === "SHOW_NOTIFICATION"){
    const d = event.data;
    self.registration.showNotification(d.title || "Easy Assess 33", {
      body:    d.body  || "New announcement available.",
      icon:    "./icon-192.png",
      badge:   "./icon-192.png",
      vibrate: [200, 100, 200],
      tag:     d.tag   || "ea33-announcement",
      renotify: true,
      data:    { url: "./" }
    });
  }
});
