// Lettuce Check service worker: caches the app itself so it opens instantly.
// Product lookups always go to the network (Open Food Facts).
// Bump VERSION whenever you change any file so phones pick up the update.
const VERSION = 'lettuce-check-v1';
const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'zxing.min.js',
  'icons/logo.png',
  'icons/apple-touch-icon.png',
  'icons/icon-192.png',
  'icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // let API calls go straight out

  // Pages: network first so updates show, fall back to cache when offline
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put('./', copy)); return r; })
        .catch(() => caches.match('./'))
    );
    return;
  }
  // Everything else: cache first
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request)));
});
