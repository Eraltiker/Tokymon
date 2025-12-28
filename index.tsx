
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Đăng ký Service Worker với logic tự động cập nhật nâng cao
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    try {
      const swUrl = new URL('sw.js', window.location.href).href;
      
      navigator.serviceWorker.register(swUrl)
        .then(reg => {
          console.log('Tokymon Security Core registered:', reg.scope);

          // Phát hiện khi có bản cập nhật mới đang chờ
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // Thông báo cho người dùng có bản cập nhật mới
                  if (window.confirm('Phiên bản mới của Tokymon đã sẵn sàng. Cập nhật ngay? / Eine neue Version ist verfügbar. Jetzt aktualisieren?')) {
                    window.location.reload();
                  }
                }
              });
            }
          });
        })
        .catch(err => {
          console.warn('Service Worker registration failed:', err);
        });

      // Tự động làm mới khi Service Worker mới chiếm quyền điều khiển
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          window.location.reload();
          refreshing = true;
        }
      });

    } catch (e) {
      console.warn('Could not initialize Service Worker:', e);
    }
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
