"use client";
import { useEffect } from "react";
import { loadSessionState, saveSessionState } from "@/lib/storage";
import { clearNotifToken } from "@/lib/notifToken";

// If the app was killed (backgrounded PWA suspension, crash, etc.) while a
// session had push notifications scheduled server-side, the in-app cleanup
// that normally cancels them never gets a chance to run. Sweep on every boot
// so an abandoned session can't fire phantom notifications later.
//
// Revoking the token is the reliable half — it retires every pending alert,
// including any whose ids were lost when the app died mid-request. Cancelling
// the ids we do know about just saves the server the wasted sends.
function sweepStaleNotifs() {
  clearNotifToken();

  const saved = loadSessionState();
  if (!saved?.notifIds?.length) return;

  fetch("/api/cancel-notifs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids: saved.notifIds }),
    keepalive: true,
  }).catch(() => {});

  // Keep the rest of the saved session (routineId/idx/deadline) around so
  // SessionScreen can still offer to resume progress — just drop the ids,
  // which are now retired.
  saveSessionState({ ...saved, notifIds: [] });
}

export default function SWInit() {
  useEffect(() => {
    sweepStaleNotifs();
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(console.error);
    }
  }, []);
  return null;
}
