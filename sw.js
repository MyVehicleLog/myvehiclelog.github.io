const CACHE = 'vehiclelog-v2026.11.04';
const OFFLINE_PAGE = './';

// Google login and the Google Drive API must always go straight to the network.
// They carry the user's data and must never be answered from the cache.
const isGoogleApi = url =>
  url.hostname === 'accounts.google.com' ||
  url.hostname === 'googleapis.com' ||
  url.hostname.endsWith('.googleapis.com') ||
  // The photo reader (Tesseract.js) and its large data files are handled by the browser itself.
  url.hostname === 'cdn.jsdelivr.net';

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.add(OFFLINE_PAGE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  if (isGoogleApi(new URL(request.url))) return;

  event.respondWith(
    fetch(request).then(response => {
      if (response && (response.ok || response.type === 'opaque')) {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(request, copy)).catch(() => {});
      }
      return response;
    }).catch(() => caches.match(request).then(cached => {
      if (cached) return cached;
      // The offline page is only a fallback for opening the app, never for other requests.
      return request.mode === 'navigate' ? caches.match(OFFLINE_PAGE) : Response.error();
    }))
  );
});
