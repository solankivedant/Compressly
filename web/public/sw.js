// Compressly service worker: shows the notifications the local server pushes,
// even when no Compressly tab is open. No caching: the site always talks to the live server.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (e) => {
  let n = {};
  try {
    n = e.data ? e.data.json() : {};
  } catch {
    n = { title: 'Compressly', body: e.data ? e.data.text() : '' };
  }
  e.waitUntil(
    self.registration.showNotification(n.title || 'Compressly', {
      body: n.body || '',
      tag: n.tag || 'compressly',
      renotify: !!n.renotify,
      silent: !!n.silent,
      icon: '/icon-192.png',
      badge: '/badge.png',
      data: { url: n.url || '/' },
    }),
  );
});

// Tapping a notification focuses an open Compressly tab, or opens one.
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || '/', self.location.origin).href;
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((tabs) => {
      for (const t of tabs) {
        if (new URL(t.url).origin === self.location.origin && 'focus' in t) {
          return t.focus().then((c) => (c && 'navigate' in c ? c.navigate(url) : c));
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
