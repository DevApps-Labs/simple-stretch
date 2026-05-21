"use client";
import { useState, useEffect, useRef } from "react";
import { loadData } from "@/lib/storage";
import {
  buildQueue,
  getPhaseLabel,
  formatTime,
  totalRoutineSeconds,
} from "@/lib/timer";
import {
  unlockAudio,
  resumeAudio,
  beep,
  warmupSpeech,
  speak,
} from "@/lib/audio";

function itemToUi(item, t, idx, queueLen, paused) {
  return {
    stretchName: item.stretchName,
    phaseLabel: getPhaseLabel(item),
    timeRemaining: t,
    duration: item.duration ?? 0,
    isPaused: paused,
    itemIndex: idx,
    queueLength: queueLen,
    itemType: item.type,
    reps: item.reps ?? 0,
    instructions: item.instructions ?? "",
  };
}

// Send the upcoming phase schedule to the SW so it can fire notifications
// while the user is in another app.
function sendSwSchedule(queue, fromIdx, tRemaining) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  const ctrl = navigator.serviceWorker?.controller;
  if (!ctrl) return;

  const schedule = [];
  let cursor = Date.now() + tRemaining * 1000;

  for (let i = fromIdx + 1; i < queue.length; i++) {
    const item = queue[i];
    if (item.type === "reps") break;

    const title =
      item.type === "side_switch" ? "Switch sides" :
      item.type === "transition" ? `Get ready: ${item.stretchName}` :
      item.stretchName;
    const body =
      item.type === "side_switch" ? item.stretchName :
      item.type === "transition" ? "" :
      getPhaseLabel(item) || "";

    schedule.push({ at: cursor, title, body });
    cursor += (item.duration ?? 0) * 1000;
  }
  schedule.push({ at: cursor, title: "Session complete!", body: "Great job!" });

  ctrl.postMessage({ type: "SCHEDULE_NOTIFICATIONS", schedule });
}

function cancelSwNotifs() {
  navigator.serviceWorker?.controller?.postMessage({ type: "CANCEL_NOTIFICATIONS" });
}

export default function SessionScreen({ goBack, params }) {
  const { routineId } = params;
  const [routine, setRoutine] = useState(null);
  const [phase, setPhase] = useState("pre"); // pre | active | done

  // All timer state in a ref to avoid stale closures in setInterval
  const sess = useRef({
    queue: [],
    idx: 0,
    t: 0,
    deadline: 0, // absolute ms timestamp when current phase ends
    paused: false,
    timerId: null,
    wakeLock: null,
    repCount: 0,
  });

  const [ui, setUi] = useState({
    stretchName: "",
    phaseLabel: "",
    timeRemaining: 0,
    duration: 1,
    isPaused: false,
    itemIndex: 0,
    queueLength: 0,
    itemType: "timed",
    reps: 0,
    instructions: "",
  });

  // Rep counter for reps-type items — kept in sync with sess.current.repCount
  const [repCount, setRepCount] = useState(0);

  useEffect(() => {
    const data = loadData();
    setRoutine(data.routines.find((r) => r.id === routineId) ?? null);
  }, [routineId]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        resumeAudio();
        // Close any stale notifications that fired while away
        navigator.serviceWorker?.controller?.postMessage({ type: "CLOSE_NOTIFICATIONS" });
        // Catch up the timer to the real elapsed time
        const s = sess.current;
        if (!s.paused && s.timerId) {
          const item = s.queue[s.idx];
          if (item && item.type !== "reps") {
            s.t = Math.round((s.deadline - Date.now()) / 1000);
            if (s.t <= 0) {
              advanceQueue();
            } else {
              setUi((prev) => ({ ...prev, timeRemaining: s.t }));
            }
          }
        }
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      const s = sess.current;
      if (s.timerId) clearInterval(s.timerId);
      s.wakeLock?.release().catch(() => {});
    };
  }, []);

  function resetRepCount() {
    sess.current.repCount = 0;
    setRepCount(0);
  }

  function refreshUi() {
    const s = sess.current;
    const item = s.queue[s.idx];
    if (!item) return;
    setUi(itemToUi(item, s.t, s.idx, s.queue.length, s.paused));
    setRepCount(s.repCount);
  }

  // Advance through any queue items whose deadline has already passed.
  // Called when s.t <= 0, and also on visibility restore after backgrounding.
  function advanceQueue() {
    const s = sess.current;
    while (s.idx < s.queue.length) {
      const item = s.queue[s.idx];
      if (item.type === "reps") break;
      if (s.t > 0) break;

      s.idx++;
      if (s.idx >= s.queue.length) {
        if (s.timerId) clearInterval(s.timerId);
        s.timerId = null;
        s.wakeLock?.release().catch(() => {});
        s.wakeLock = null;
        cancelSwNotifs();
        setPhase("done");
        return "done";
      }

      const next = s.queue[s.idx];
      // Chain the deadline off the previous item's end time so we correctly
      // account for how long we've been in the background.
      s.deadline = s.deadline + (next.duration ?? 0) * 1000;
      s.t = Math.round((s.deadline - Date.now()) / 1000);
      s.repCount = 0;
      if (next.type === "side_switch") speak("Switch sides");
      setUi(itemToUi(next, Math.max(0, s.t), s.idx, s.queue.length, false));
      setRepCount(0);
    }
    return "ok";
  }

  function doStart() {
    if (!routine?.stretches?.length) return;

    unlockAudio();
    warmupSpeech();

    const s = sess.current;
    const queue = buildQueue(routine);
    s.queue = queue;
    s.idx = 0;
    s.t = queue[0].duration ?? 0;
    s.deadline = Date.now() + s.t * 1000;
    s.paused = false;
    s.repCount = 0;

    const first = queue[0];
    setUi(itemToUi(first, s.t, 0, queue.length, false));
    setRepCount(0);
    setPhase("active");

    navigator.wakeLock
      ?.request("screen")
      .then((wl) => {
        if (sess.current) sess.current.wakeLock = wl;
      })
      .catch(() => {});

    // Request notification permission then schedule all phase alerts.
    if (typeof Notification !== "undefined") {
      if (Notification.permission === "granted") {
        sendSwSchedule(queue, 0, s.t);
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then((perm) => {
          if (perm === "granted") {
            const cs = sess.current;
            sendSwSchedule(cs.queue, cs.idx, cs.t);
          }
        });
      }
    }

    s.timerId = setInterval(() => {
      const s = sess.current;
      if (s.paused) return;

      const item = s.queue[s.idx];
      if (!item) return;

      // Rep-based items wait for user input — don't countdown or auto-advance
      if (item.type === "reps") return;

      const prevT = s.t;
      // Use deadline-based time so the timer catches up correctly after backgrounding
      s.t = Math.round((s.deadline - Date.now()) / 1000);

      // 3-beep countdown at 3, 2, 1 seconds before any timed phase ends
      if (s.t >= 1 && s.t <= 3) beep();

      // "Next up" voice when crossing the 10-second mark
      if (
        (item.type === "stretch_full" || item.type === "stretch_second" || item.type === "rep_hold") &&
        prevT > 10 && s.t <= 10 &&
        item.nextStretchName
      ) {
        speak(`Next up: ${item.nextStretchName}`);
      }

      if (s.t <= 0) {
        advanceQueue();
        return;
      }

      setUi((prev) => ({ ...prev, timeRemaining: s.t }));
    }, 1000);
  }

  function doPause() {
    const s = sess.current;
    s.paused = !s.paused;
    if (s.paused) {
      cancelSwNotifs();
    } else {
      // Restart the deadline from the current remaining time on resume
      s.deadline = Date.now() + s.t * 1000;
      sendSwSchedule(s.queue, s.idx, s.t);
    }
    setUi((prev) => ({ ...prev, isPaused: s.paused }));
  }

  function doNext() {
    resetRepCount();
    const s = sess.current;
    s.idx++;
    if (s.idx >= s.queue.length) {
      if (s.timerId) clearInterval(s.timerId);
      s.timerId = null;
      s.wakeLock?.release().catch(() => {});
      s.wakeLock = null;
      cancelSwNotifs();
      setPhase("done");
      return;
    }
    const item = s.queue[s.idx];
    s.t = item.duration ?? 0;
    s.deadline = Date.now() + s.t * 1000;
    if (item.type === "side_switch") speak("Switch sides");
    sendSwSchedule(s.queue, s.idx, s.t);
    refreshUi();
  }

  function doPrev() {
    const s = sess.current;
    const item = s.queue[s.idx];
    if (!item) return;

    // For reps items: if any reps counted, reset count; otherwise go back
    if (item.type === "reps") {
      if (s.repCount > 0) {
        resetRepCount();
      } else if (s.idx > 0) {
        s.idx--;
        s.t = s.queue[s.idx].duration ?? 0;
        s.deadline = Date.now() + s.t * 1000;
        resetRepCount();
        refreshUi();
      }
      return;
    }

    resetRepCount();
    if (s.t < item.duration - 3) {
      s.t = item.duration;
      s.deadline = Date.now() + s.t * 1000;
    } else if (s.idx > 0) {
      s.idx--;
      s.t = s.queue[s.idx].duration ?? 0;
      s.deadline = Date.now() + s.t * 1000;
    } else {
      s.t = item.duration;
      s.deadline = Date.now() + s.t * 1000;
    }
    sendSwSchedule(s.queue, s.idx, s.t);
    refreshUi();
  }

  function handleBack() {
    if (phase === "active") {
      if (!confirm("Exit this session?")) {
        resumeAudio();
        return;
      }
      const s = sess.current;
      if (s.timerId) clearInterval(s.timerId);
      s.timerId = null;
      s.wakeLock?.release().catch(() => {});
      cancelSwNotifs();
    }
    goBack();
  }

  if (!routine) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (phase === "pre") {
    return <PreScreen routine={routine} onStart={doStart} onBack={goBack} />;
  }

  if (phase === "done") {
    return (
      <DoneScreen
        routine={routine}
        onRestart={() => setPhase("pre")}
        onBack={goBack}
      />
    );
  }

  const isRepsItem = ui.itemType === "reps";
  const progress = !isRepsItem && ui.duration > 0 ? ui.timeRemaining / ui.duration : 0;

  return (
    <div
      className="fixed inset-0 bg-neutral-950 flex flex-col"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {/* Top bar */}
      <div className="flex items-center px-4 pt-3 pb-1">
        <button
          onClick={handleBack}
          className="w-10 h-10 flex items-center justify-center text-neutral-500 active:text-white"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <div className="flex-1 text-center">
          <p className="text-xs text-neutral-600 font-medium">
            {ui.itemIndex + 1} / {ui.queueLength}
          </p>
        </div>
        <div className="w-10" />
      </div>

      {/* Progress bar */}
      <div className="mx-4 h-1 bg-neutral-800 rounded-full overflow-hidden">
        {isRepsItem ? (
          <div
            className="h-full bg-teal-500 rounded-full transition-all duration-300"
            style={{ width: `${ui.reps > 0 ? (repCount / ui.reps) * 100 : 0}%` }}
          />
        ) : (
          <div
            className="h-full bg-teal-500 rounded-full transition-all duration-1000 ease-linear"
            style={{ width: `${progress * 100}%` }}
          />
        )}
      </div>

      {/* Main area */}
      {isRepsItem ? (
        <div className="flex-1 flex flex-col items-center justify-center px-8 py-4">
          {ui.phaseLabel ? (
            <p className="text-sm font-medium text-teal-400 uppercase tracking-widest mb-3">
              {ui.phaseLabel}
            </p>
          ) : (
            <div className="mb-3 h-5" />
          )}

          <h2 className="text-3xl font-bold text-white text-center mb-4 leading-tight">
            {ui.stretchName}
          </h2>

          {ui.instructions ? (
            <p className="text-sm text-neutral-400 text-center mb-8 leading-relaxed max-w-xs">
              {ui.instructions}
            </p>
          ) : (
            <div className="mb-8" />
          )}

          {/* Rep counter button */}
          <button
            onClick={() => {
              const next = Math.min(sess.current.repCount + 1, ui.reps);
              sess.current.repCount = next;
              setRepCount(next);
            }}
            className="w-40 h-40 rounded-full bg-neutral-800 active:bg-neutral-700 flex flex-col items-center justify-center mb-3"
            aria-label="Count rep"
          >
            <span className="text-6xl font-bold text-white tabular-nums leading-none">
              {repCount}
            </span>
            <span className="text-sm text-neutral-500 mt-1.5">of {ui.reps}</span>
          </button>

          {repCount > 0 && (
            <button
              onClick={() => {
                const next = Math.max(sess.current.repCount - 1, 0);
                sess.current.repCount = next;
                setRepCount(next);
              }}
              className="text-xs text-neutral-600 active:text-neutral-400 py-1 px-3"
            >
              undo
            </button>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center px-8 py-4">
          {ui.phaseLabel ? (
            <p className="text-sm font-medium text-teal-400 uppercase tracking-widest mb-3">
              {ui.phaseLabel}
            </p>
          ) : (
            <div className="mb-3 h-5" />
          )}

          <h2 className="text-3xl font-bold text-white text-center mb-8 leading-tight">
            {ui.stretchName}
          </h2>

          <div className="text-8xl font-mono font-bold text-teal-400 tabular-nums leading-none mb-8">
            {formatTime(ui.timeRemaining)}
          </div>

          {ui.isPaused && (
            <p className="text-neutral-500 text-sm tracking-widest uppercase">
              Paused
            </p>
          )}
        </div>
      )}

      {/* Bottom controls */}
      {isRepsItem ? (
        <div className="flex items-center gap-4 pb-6 px-8">
          {/* Prev */}
          <button
            onClick={doPrev}
            className="w-14 h-14 rounded-full bg-neutral-800 active:bg-neutral-700 flex items-center justify-center flex-shrink-0"
            aria-label="Previous"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="text-white"
            >
              <polygon points="18,3 7,12 18,21" />
              <rect x="4" y="3" width="3" height="18" rx="1" />
            </svg>
          </button>

          {/* Done button */}
          <button
            onClick={doNext}
            className={`flex-1 py-5 rounded-2xl font-bold text-lg transition-colors ${
              repCount >= ui.reps && ui.reps > 0
                ? "bg-teal-500 active:bg-teal-600 text-black"
                : "bg-neutral-800 active:bg-neutral-700 text-white"
            }`}
          >
            Done
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-8 pb-6 px-8">
          {/* Prev */}
          <button
            onClick={doPrev}
            className="w-14 h-14 rounded-full bg-neutral-800 active:bg-neutral-700 flex items-center justify-center"
            aria-label="Previous"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="text-white"
            >
              <polygon points="18,3 7,12 18,21" />
              <rect x="4" y="3" width="3" height="18" rx="1" />
            </svg>
          </button>

          {/* Pause / Resume */}
          <button
            onClick={doPause}
            className="w-20 h-20 rounded-full bg-teal-500 active:bg-teal-600 flex items-center justify-center shadow-lg"
            aria-label={ui.isPaused ? "Resume" : "Pause"}
          >
            {ui.isPaused ? (
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="black"
                className="translate-x-0.5"
              >
                <polygon points="5,3 20,12 5,21" />
              </svg>
            ) : (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="black">
                <rect x="5" y="3" width="4" height="18" rx="1" />
                <rect x="15" y="3" width="4" height="18" rx="1" />
              </svg>
            )}
          </button>

          {/* Next */}
          <button
            onClick={doNext}
            className="w-14 h-14 rounded-full bg-neutral-800 active:bg-neutral-700 flex items-center justify-center"
            aria-label="Next"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="text-white"
            >
              <polygon points="6,3 17,12 6,21" />
              <rect x="17" y="3" width="3" height="18" rx="1" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

function PreScreen({ routine, onStart, onBack }) {
  const count = routine.stretches.length;
  const totalSec = totalRoutineSeconds(routine);

  return (
    <div
      className="flex flex-col min-h-screen bg-neutral-950 items-center justify-center px-8"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <button
        onClick={onBack}
        className="absolute left-4 top-4 w-10 h-10 flex items-center justify-center text-neutral-500"
        style={{ top: "calc(env(safe-area-inset-top) + 16px)" }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <path d="M19 12H5M12 5l-7 7 7 7" />
        </svg>
      </button>

      <h2 className="text-3xl font-bold text-white mb-2 text-center">
        {routine.name}
      </h2>
      <p className="text-neutral-400 mb-12 text-center">
        {count} exercise{count !== 1 ? "s" : ""}
        {totalSec > 0 && ` · ~${formatTime(totalSec)}`}
      </p>

      {count === 0 ? (
        <p className="text-neutral-600 text-center">
          Add exercises to this routine first.
        </p>
      ) : (
        <button
          onClick={onStart}
          className="bg-teal-500 active:bg-teal-600 text-black font-bold text-xl py-5 px-16 rounded-2xl"
        >
          Start
        </button>
      )}
    </div>
  );
}

function DoneScreen({ routine, onRestart, onBack }) {
  return (
    <div
      className="flex flex-col min-h-screen bg-neutral-950 items-center justify-center px-8"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="text-6xl mb-6">✓</div>
      <h2 className="text-3xl font-bold text-white mb-2">Done!</h2>
      <p className="text-neutral-400 mb-12">{routine.name} complete</p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={onRestart}
          className="w-full bg-teal-500 active:bg-teal-600 text-black font-semibold py-3.5 rounded-2xl"
        >
          Do Again
        </button>
        <button
          onClick={onBack}
          className="w-full bg-neutral-800 active:bg-neutral-700 text-white font-semibold py-3.5 rounded-2xl"
        >
          Back to Routines
        </button>
      </div>
    </div>
  );
}
