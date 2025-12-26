
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Đăng ký Service Worker cho chế độ Offline
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Sử dụng đường dẫn tương đối './sw.js' thay vì '/sw.js' 
    // để đảm bảo trình duyệt tìm đúng file trong môi trường lưu trữ hiện tại
    navigator.serviceWorker.register('./sw.js').catch(err => {
      console.error('Service Worker registration failed:', err);
    });
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
