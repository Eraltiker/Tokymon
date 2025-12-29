
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Hard reset Service Worker nếu bản cũ bị kẹt
// Thêm try-catch để tránh lỗi "The document is in an invalid state" trong một số môi trường trình duyệt
async function manageServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      // Một số môi trường sandbox hoặc iframe có thể chặn Service Worker
      if (!window.isSecureContext && window.location.hostname !== 'localhost') {
        console.warn('Tokymon: Service Workers require a secure context (HTTPS).');
        return;
      }

      const registrations = await navigator.serviceWorker.getRegistrations().catch(err => {
        console.warn('Tokymon: Failed to get ServiceWorker registrations:', err);
        return [];
      });

      const currentVersion = localStorage.getItem('tokymon_sw_version');
      const TARGET_VERSION = '1.3.2'; // Tăng version để cưỡng bức cập nhật lên Security Patch

      if (currentVersion !== TARGET_VERSION) {
        // Xóa tất cả Service Worker cũ
        for (let registration of registrations) {
          await registration.unregister();
        }
        localStorage.setItem('tokymon_sw_version', TARGET_VERSION);
        
        // Chỉ reload nếu thực sự có registration cũ cần xóa
        if (registrations.length > 0) {
          window.location.reload();
          return;
        }
      }

      navigator.serviceWorker.register('./sw.js')
        .then(reg => {
          reg.onupdatefound = () => {
            const installingWorker = reg.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // Có bản cập nhật mới
                  if (window.confirm('Hệ thống có bản cập nhật bảo mật mới (v1.0.2). Cập nhật ngay?')) {
                    window.location.reload();
                  }
                }
              };
            }
          };
        })
        .catch(err => console.warn('Tokymon: SW Registration failed (Safe mode):', err));
        
    } catch (e) {
      console.error('Tokymon: Service Worker Management Error:', e);
    }
  }
}

// Chạy quản lý SW nhưng không chặn việc render App
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
