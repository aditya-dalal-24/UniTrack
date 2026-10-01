// Service Worker custom handlers for UniTrack PWA Notifications & Background Events

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  let targetUrl = data.url || '/';

  // If the user clicked the action button to mark attendance, pass action in query
  if (event.action === 'mark') {
    targetUrl = '/schedule?action=mark';
  } else if (data.action === 'update' || event.action === 'update') {
    self.skipWaiting();
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it and navigate
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client && targetUrl) {
            client.navigate(targetUrl);
          }
          if (data.action || event.action) {
            client.postMessage({
              type: 'NOTIFICATION_ACTION',
              action: event.action || data.action,
              url: targetUrl,
              data: data,
            });
          }
          return;
        }
      }

      // If no window is currently open, open a new window to the target URL
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

self.addEventListener('notificationclose', (event) => {
  // Notification dismissed by the user
});

// Listen for messages from frontend clients
self.addEventListener('message', (event) => {
  if (event.data) {
    if (event.data.type === 'SKIP_WAITING') {
      self.skipWaiting();
    }
  }
});
