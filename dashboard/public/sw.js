self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());

self.addEventListener('push', (event) => {
  let data = { title: 'Battalion 20', body: '', icon: '/favicon.ico', tag: 'b20-default' };
  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch (e) { /* ignore */ }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      tag: data.tag,
      renotify: true,
      vibrate: [200, 100, 200],
      requireInteraction: true,
      data: { url: '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';
  event.waitUntil(
    clients.openWindow(urlToOpen)
  );
});
