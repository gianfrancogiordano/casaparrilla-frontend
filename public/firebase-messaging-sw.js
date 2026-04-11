importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyAwfgfNdAUR_IMRymLAbAuYLRCxNPsW2jo',
  authDomain: 'un-2x3.firebaseapp.com',
  projectId: 'un-2x3',
  storageBucket: 'un-2x3.firebasestorage.app',
  messagingSenderId: '97741611493',
  appId: '1:97741611493:web:3417b7d5b6b21d861acf0c',
});

const messaging = firebase.messaging();

// Maneja notificaciones push cuando la app está en background o cerrada
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'Casa Parrilla';
  const body  = payload.notification?.body  || '';

  self.registration.showNotification(title, {
    body,
    icon:  '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    data:  payload.data ?? {},
    requireInteraction: true,
  });
});

// Al hacer click en la notificación, abre /delivery
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = '/delivery';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const existing = clientList.find(c => c.url.includes(self.location.origin));
      if (existing) return existing.focus();
      return clients.openWindow(url);
    })
  );
});
