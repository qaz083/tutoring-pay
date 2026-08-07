const CACHE = "tutoring-pay-v1786125744114";
const ASSETS = ["/tutoring-pay/","/tutoring-pay/_expo/static/js/web/index-83e42195f8c3bdfcacb5c9335eccfaed.js","/tutoring-pay/index.html","/tutoring-pay/metadata.json"];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  // 캐시를 먼저 주고, 네트워크가 되면 조용히 갱신한다
  e.respondWith(caches.match(e.request).then((hit) => {
    const live = fetch(e.request)
      .then((res) => { caches.open(CACHE).then((c) => c.put(e.request, res.clone())); return res; })
      .catch(() => hit || caches.match("/tutoring-pay/"));
    return hit || live;
  }));
});