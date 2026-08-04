// Bump this string on every deploy to force the new SW to activate
const CACHE = "stretch-1.0.22";

// Written by the page (lib/notifToken.js), read here. Holds the session
// generation whose notifications are currently allowed to show.
const NOTIF_TOKEN_CACHE = "notif-token";
const NOTIF_TOKEN_URL = "/__notif-token";

async function currentNotifToken() {
  try {
    const cache = await caches.open(NOTIF_TOKEN_CACHE);
    const res = await cache.match(NOTIF_TOKEN_URL);
    return res ? await res.json() : null;
  } catch {
    return null;
  }
}

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
        Promise.all(
          keys
            .filter((k) => k !== CACHE && k !== NOTIF_TOKEN_CACHE)
            .map((k) => caches.delete(k))
        )
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

// Push notifications sent from the server via QStash + web-push
self.addEventListener("push", (e) => {
  const data = e.data?.json() ?? {};
  e.waitUntil(
    (async () => {
      // Drop anything belonging to a session that has since been paused,
      // exited, finished, or superseded by a reschedule. Queued messages
      // outlive the client that created them, so this check — not the cancel
      // request, which is only best-effort — is what stops stale alerts.
      const token = await currentNotifToken();
      if (
        !token ||
        !data.token ||
        token.id !== data.token.id ||
        token.gen !== data.token.gen
      ) {
        return;
      }

      const cs = await clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      if (cs.some((c) => c.visibilityState === "visible")) return;

      await self.registration.showNotification(data.title ?? "Simple Stretch", {
        body: data.body ?? "",
        icon: "/icons/icon-192.png",
        tag: "stretch-timer",
        renotify: true,
      });
    })()
  );
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
