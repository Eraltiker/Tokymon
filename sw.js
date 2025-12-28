
const CACHE_NAME = 'tokymon-finance-v1.3.1'; // Version mới cưỡng bức
const ASSETS_TO_CACHE = [
  './',
  './index.html'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('Tokymon: Clearing old cache', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Tuyệt đối không cache dữ liệu API hoặc Sync
  if (
    event.request.url.includes('kvdb.io') || 
    event.request.url.includes('generativelanguage') ||
    event.request.method !== 'GET'
  ) {
    return;
  }

  // Luôn ưu tiên mạng (Network First)
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200 && response.type === 'basic') {
          const resClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, resClone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
