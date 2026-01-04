
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

async function manageServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      if (!window.isSecureContext && window.location.hostname !== 'localhost') {
        console.warn('Tokymon: Service Workers require a secure context (HTTPS).');
        return;
      }

      const registrations = await navigator.serviceWorker.getRegistrations().catch(err => {
        console.warn('Tokymon: Failed to get ServiceWorker registrations:', err);
        return [];
      });

      const currentVersion = localStorage.getItem('tokymon_sw_version');
      const TARGET_VERSION = '1.7.0'; // TokyPro Version

      if (currentVersion !== TARGET_VERSION) {
        for (let registration of registrations) {
          await registration.unregister();
        }
        localStorage.setItem('tokymon_sw_version', TARGET_VERSION);
        
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
                  if (window.confirm('Hệ thống có bản cập nhật bảo mật mới (v1.7.0). Cập nhật ngay?')) {
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
