// WTC Service Worker — cache-first with update detection
// Bump CACHE version any time you deploy new files.
const CACHE = 'wtc-v3';

const FILES = [
  './',
  './index.html',
  './manifest.json',
  './favicon.ico',
  './favicon-32.png',
  './apple-touch-icon.png',
  './icon-192-any.png',
  './icon-192-maskable.png',
  './icon-512-any.png',
  './icon-512-maskable.png',
  './splash-iphone14.png',
  './splash-iphone14pro.png',
  './splash-iphone11.png',
  './splash-iphonex.png',
  './splash-iphone8.png',
  './splash-ipadmini.png',
  './splash-ipadpro12.png',
  './screenshot-mobile.png',
];

// Install: cache all app shell files
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(FILES))
      .then(() => self.skipWaiting())
  );
});

// Activate: delete old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch: cache-first for app shell, network-first for everything else
self.addEventListener('fetch', e => {
  // Only handle GET requests
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        // Cache successful responses for app files
        if (response.ok && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback for navigation requests
        if (e.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});

// Allow page to trigger SW update via postMessage
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
