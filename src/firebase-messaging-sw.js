importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCm2Va0UofAdGW7PH9h2hYIzt0IwM02_Vs",
  authDomain: "todoapp-b1322.firebaseapp.com",
  projectId: "todoapp-b1322",
  storageBucket: "todoapp-b1322.firebasestorage.app",
  messagingSenderId: "224387757120",
  appId: "1:224387757120:web:7d4c7b93849af421e45ba5",
  measurementId: "G-F1CVF6VE98"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('Received background message:', payload);

  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.icon || '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [200, 100, 200],
    sound: '/notification-sound.mp3',
    tag: payload.data?.tag || 'default',
    requireInteraction: true,
    renotify: true,
  };

  self.registration.showNotification(
    payload.notification.title,
    notificationOptions
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});