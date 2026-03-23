self.addEventListener('push', function (event) {
  if (event.data) {
    try {
      const data = event.data.json();
      
      // Bật chấm đỏ (Red dot badge) cho icon PWA
      if ('setAppBadge' in navigator) {
        navigator.setAppBadge().catch(e => console.error("Badge error", e));
      }

      const options = {
        body: data.body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        data: {
          url: data.url || '/'
        }
      };
      event.waitUntil(self.registration.showNotification(data.title, options));
    } catch (e) {
      console.error('Push error', e);
    }
  }
});

self.addEventListener('notificationclick', function (event) {
  // Tẩy chấm đỏ khi người dùng bấm trực tiếp vào thông báo
  if ('clearAppBadge' in navigator) {
    navigator.clearAppBadge().catch(e => console.error(e));
  }

  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url === event.notification.data.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url);
      }
    })
  );
});
