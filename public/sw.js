// Service Worker بسيط: يخزّن هيكل الموقع للعمل السريع/دون اتصال جزئي.
// HTML: network-first (عشان الأخبار تتحدّث). الطلبات الخارجية (CDN/خرائط) تُترك للشبكة.
var CACHE = "pol-news-v1";
var SHELL = ["./", "./index.html", "./styles.css", "./icon.svg", "./manifest.json"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var url = new URL(e.request.url);
  if (url.origin !== location.origin) return; // اترك CDN/الخرائط للشبكة
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request).then(function (r) {
        var cp = r.clone();
        caches.open(CACHE).then(function (c) { c.put("./index.html", cp); });
        return r;
      }).catch(function () { return caches.match("./index.html"); })
    );
    return;
  }
  e.respondWith(caches.match(e.request).then(function (c) { return c || fetch(e.request); }));
});
