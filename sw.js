// Lettuce Check service worker: keeps the app on the phone so it opens instantly.
// Product lookups always go to the network (Open Food Facts).
// Bump VERSION whenever you change any file so phones pick up the update.
const VERSION = 'lettuce-check-v3';
const SHELL = [
  './',
  'index.html',
  'rules.js',
  'manifest.webmanifest',
  'lib/barcode-detector.js',
  'lib/zxing_reader.wasm',
  'icons/logo.png',
  'icons/apple-touch-icon.png',
  'icons/icon-192.png',
  'icons/icon-512.png'
];
// The label reader (lib/tesseract*, lib/lang) is big, so it's cached the first time it's used instead.

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
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // API calls go straight out

  // Pages: network first so updates show, fall back to cache when offline
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put('./', copy)); return r; })
        .catch(() => caches.match('./'))
    );
    return;
  }
  // Everything else: cache first, and remember anything new (e.g. the label reader)
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(r => {
      if (r.ok) { const copy = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); }
      return r;
    }))
  );
});
