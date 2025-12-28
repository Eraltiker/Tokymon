
const CACHE_NAME = 'tokymon-finance-v1.2'; // Cập nhật version để bust cache
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  // Buộc Service Worker mới kích hoạt ngay lập tức
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  // Đảm bảo client được điều khiển ngay lập tức
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  
  // Tuyệt đối không cache các API quan trọng hoặc dữ liệu cloud
  if (url.includes('kvdb.io') || url.includes('generativelanguage')) {
    return;
  }

  // Chiến lược: Network First, falling back to cache
  // Giúp trình duyệt luôn ưu tiên lấy bản mới nhất từ mạng
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// Lắng nghe lệnh skipWaiting từ giao diện
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
