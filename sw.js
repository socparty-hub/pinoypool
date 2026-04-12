const CACHE = 'pinoypool-v2';
const PRECACHE = ['/', '/index.html', '/pinoypool-logo-new.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});

/* ── Web Push: show notification when received ── */
self.addEventListener('push', e => {
  let data = { title: 'PinoyPool', body: 'You have a new notification.', type: '' };
  try { data = Object.assign(data, e.data.json()); } catch {}

  const options = {
    body: data.body,
    icon: '/pinoypool-logo-new.png',
    badge: '/pinoypool-logo-new.png',
    tag: data.type || 'pp-notif',
    renotify: true,
    vibrate: [200, 100, 200],
    data: { url: '/' }
  };

  e.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

/* ── Tap on notification: open/focus the app ── */
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const target = e.notification.data?.url || '/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(target);
    })
  );
});
