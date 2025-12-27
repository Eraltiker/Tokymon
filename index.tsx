
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Đăng ký Service Worker cho chế độ Offline
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Trong môi trường sandbox như Google AI Studio, Service Worker thường bị chặn
    // do chính sách Same-Origin khi chạy trong iframe. 
    // Chúng ta sử dụng URL tuyệt đối dựa trên location hiện tại để đảm bảo tính chính xác.
    try {
      const swUrl = new URL('sw.js', window.location.href).href;
      const swOrigin = new URL(swUrl).origin;

      // Chỉ thử đăng ký nếu origin của file SW khớp với origin của trang hiện tại
      if (swOrigin === window.location.origin) {
        navigator.serviceWorker.register(swUrl)
          .then(reg => {
            console.log('Tokymon SW registered with scope:', reg.scope);
          })
          .catch(err => {
            // Lỗi origin mismatch là phổ biến trong preview, chúng ta log nhẹ nhàng
            if (err.message.includes('origin')) {
              console.warn('Service Worker blocked by sandbox origin policy. Offline mode disabled.');
            } else {
              console.error('Service Worker registration failed:', err);
            }
          });
      }
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
