/* 离线缓存：页面走网络优先（保证更新），资源走缓存优先 */
const VER = 'e467a048e8';
const CACHE = 'aiq-' + VER;
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(CORE).catch(function () { /* 个别资源失败不影响安装 */ });
    })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  const req = e.request;
  if (req.method !== 'GET') return;

  let same;
  try { same = new URL(req.url).origin === self.location.origin; } catch (err) { same = false; }
  if (!same) return;

  const accept = req.headers.get('accept') || '';
  const isDoc = req.mode === 'navigate' || accept.indexOf('text/html') >= 0;

  if (isDoc) {
    e.respondWith(
      fetch(req).then(function (res) {
        const copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); }).catch(function () {});
        return res;
      }).catch(function () {
        return caches.match(req).then(function (r) {
          return r || caches.match('./index.html');
        }).then(function (r) {
          return r || new Response('离线且无缓存', { status: 504, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
        });
      })
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        const copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); }).catch(function () {});
        return res;
      });
    })
  );
});
