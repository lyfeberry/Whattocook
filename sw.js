// WTC Service Worker — network-first for shell, cache-first for assets
// Bump CACHE version any time you deploy new files.
const CACHE = 'wtc-v14';

// These files are fetched network-first so updates are always picked up
const NETWORK_FIRST = [
  './',
  './index.html',
  './sw.js',
  './manifest.json',
];

// These are cached aggressively — they rarely change
const CACHE_FIRST_FILES = [
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

const ALL_FILES = [...NETWORK_FIRST, ...CACHE_FIRST_FILES];

// Install: pre-cache everything.
// Do NOT skipWaiting here — let the page control when to switch via the banner.
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ALL_FILES))
  );
});

// Activate: delete old caches and claim clients.
// Do NOT navigate clients here — the page shows the update banner instead.
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Helper: is this URL in the network-first list?
function isNetworkFirst(url) {
  const path = new URL(url).pathname;
  return NETWORK_FIRST.some(f => {
    const fPath = new URL(f, self.location).pathname;
    return path === fPath || (path.endsWith('/') && f === './');
  });
}

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = e.request.url;

  // Network-first: try network, fall back to cache
  if (isNetworkFirst(url)) {
    e.respondWith(
      fetch(e.request)
        .then(response => {
          if (response.ok && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(e.request)
          .then(cached => cached || caches.match('./index.html'))
        )
    );
    return;
  }

  // Cache-first with background revalidation for assets
  e.respondWith(
    caches.match(e.request).then(cached => {
      const networkFetch = fetch(e.request).then(response => {
        if (response.ok && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return response;
      }).catch(() => null);

      return cached || networkFetch;
    })
  );
});

// Allow page to manually trigger SW update via postMessage
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
