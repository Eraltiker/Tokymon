
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Hard reset Service Worker nếu bản cũ bị kẹt
async function manageServiceWorker() {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    const currentVersion = localStorage.getItem('tokymon_sw_version');
    const TARGET_VERSION = '1.3';

    if (currentVersion !== TARGET_VERSION) {
      // Xóa tất cả Service Worker cũ
      for (let registration of registrations) {
        await registration.unregister();
      }
      localStorage.setItem('tokymon_sw_version', TARGET_VERSION);
      // Ép tải lại trang từ server
      window.location.reload();
      return;
    }

    navigator.serviceWorker.register('./sw.js')
      .then(reg => {
        reg.onupdatefound = () => {
          const installingWorker = reg.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Có bản cập nhật mới, thông báo và reload
                if (window.confirm('Hệ thống có bản cập nhật bảo mật mới. Cập nhật ngay?')) {
                  window.location.reload();
                }
              }
            };
          }
        };
      })
      .catch(err => console.error('SW Registration Failed', err));
  }
}

manageServiceWorker();

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
