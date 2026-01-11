
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

async function manageServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      // Chỉ đăng ký nếu origin khớp, tránh lỗi sandbox trong môi trường Preview
      if (window.location.hostname.includes('usercontent.goog') || window.location.hostname.includes('ai.studio')) {
        console.log('Tokymon: Service Worker disabled in preview mode.');
        return;
      }

      const registrations = await navigator.serviceWorker.getRegistrations();
      for (let registration of registrations) {
        await registration.unregister();
      }
      
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    } catch (e) {}
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
