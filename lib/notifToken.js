// Every push we schedule is stamped with the session generation that created
// it, and the service worker only shows a notification whose stamp matches the
// token stored here. Deleting the queued QStash messages can't be relied on:
// the ids come back in a response the client may never live to receive (a
// backgrounded PWA gets suspended mid-request), and by then there is nothing
// left anywhere that knows what to cancel. Revoking the token needs no ids, so
// pausing or exiting stops pending notifications no matter what the network
// did.
//
// The Cache API is used rather than localStorage because the service worker
// has to read this, and localStorage isn't available in a worker context.
const NOTIF_TOKEN_CACHE = "notif-token";
const NOTIF_TOKEN_URL = "/__notif-token";

// Writes go through a chain rather than running concurrently: pausing and
// immediately resuming issues a clear and a write back to back, and if the
// clear landed second it would silently revoke the schedule that just replaced
// it. Queueing makes the last call made the last one applied.
let writeQueue = Promise.resolve();

export function setNotifToken(token) {
  writeQueue = writeQueue.then(async () => {
    try {
      if (typeof caches === "undefined") return;
      const cache = await caches.open(NOTIF_TOKEN_CACHE);
      await cache.put(
        NOTIF_TOKEN_URL,
        new Response(JSON.stringify(token), {
          headers: { "Content-Type": "application/json" },
        })
      );
    } catch {}
  });
  return writeQueue;
}

export function clearNotifToken() {
  return setNotifToken(null);
}
