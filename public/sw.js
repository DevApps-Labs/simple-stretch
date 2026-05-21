// Bump this string on every deploy to force the new SW to activate
const CACHE = "stretch-1.0.5";

// Pre-cache app shell on install
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) =>
        c.addAll([
          "/",
          "/manifest.webmanifest",
          "/icons/icon-192.png",
          "/icons/icon-512.png",
        ])
      )
      .then(() => self.skipWaiting())
  );
});

// Remove old caches on activate
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);

  // Cache-first for content-hashed Next.js static chunks (never changes)
  if (url.pathname.startsWith("/_next/static/")) {
    e.respondWith(
      caches.match(e.request).then(
        (cached) =>
          cached ??
          fetch(e.request).then((res) => {
            caches.open(CACHE).then((c) => c.put(e.request, res.clone()));
            return res;
          })
      )
    );
    return;
  }

  // Network-first with offline fallback for HTML navigation
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          caches.open(CACHE).then((c) => c.put(e.request, res.clone()));
          return res;
        })
        .catch(() => caches.match(e.request) ?? caches.match("/"))
    );
    return;
  }

  // Stale-while-revalidate for everything else
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fetched = fetch(e.request).then((res) => {
        caches.open(CACHE).then((c) => c.put(e.request, res.clone()));
        return res;
      });
      return cached ?? fetched;
    })
  );
});

// Notification scheduling for background timer alerts
let notifTimers = [];

self.addEventListener("message", (e) => {
  if (e.data?.type === "SCHEDULE_NOTIFICATIONS") {
    notifTimers.forEach(clearTimeout);
    notifTimers = [];
    const now = Date.now();
    for (const item of e.data.schedule ?? []) {
      const delay = item.at - now;
      if (delay <= 0) continue;
      const t = setTimeout(() => {
        self.registration.showNotification(item.title, {
          body: item.body,
          icon: "/icons/icon-192.png",
          tag: "stretch-timer",
          renotify: true,
          silent: false,
        });
      }, delay);
      notifTimers.push(t);
    }
  }

  if (e.data?.type === "CANCEL_NOTIFICATIONS") {
    notifTimers.forEach(clearTimeout);
    notifTimers = [];
  }

  if (e.data?.type === "CLOSE_NOTIFICATIONS") {
    self.registration.getNotifications({ tag: "stretch-timer" }).then((ns) =>
      ns.forEach((n) => n.close())
    );
  }
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => {
      for (const c of cs) {
        if (c.url.includes(self.location.origin)) return c.focus();
      }
      return clients.openWindow("/");
    })
  );
});
