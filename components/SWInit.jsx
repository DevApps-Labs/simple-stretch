"use client";
import { useEffect } from "react";
import { loadSessionState, saveSessionState, clearSessionState } from "@/lib/storage";

// If the app was killed (backgrounded PWA suspension, crash, etc.) while a
// session had push notifications scheduled server-side, the in-app cleanup
// that normally cancels them never gets a chance to run. Sweep on every
// boot so an abandoned session can't fire phantom notifications later.
function sweepStaleNotifs() {
  const saved = loadSessionState();
  if (!saved) return;

  if (saved.notifIds?.length) {
    fetch("/api/cancel-notifs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: saved.notifIds }),
      keepalive: true,
    }).catch(() => {});
  }

  if (saved.ended) {
    // Already finished/exited — this record only existed to carry ids we
    // couldn't confirm cancelling earlier. Nothing left to resume.
    clearSessionState();
  } else if (saved.notifIds?.length) {
    // Keep the rest of the saved session (routineId/idx/deadline) around so
    // SessionScreen can still offer to resume progress — just clear the ids
    // we've already asked the server to cancel.
    saveSessionState({ ...saved, notifIds: [] });
  }
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
