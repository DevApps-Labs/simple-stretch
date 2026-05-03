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

export default function SessionScreen({ goBack, params }) {
  const { routineId } = params;
  const [routine, setRoutine] = useState(null);
  const [phase, setPhase] = useState("pre"); // pre | active | done

  // All timer state in a ref to avoid stale closures in setInterval
  const sess = useRef({
    queue: [],
    idx: 0,
    t: 0,
    paused: false,
    timerId: null,
    wakeLock: null,
  });

  const [ui, setUi] = useState({
    stretchName: "",
    phaseLabel: "",
    timeRemaining: 0,
    duration: 1,
    isPaused: false,
    itemIndex: 0,
    queueLength: 0,
  });

  useEffect(() => {
    const data = loadData();
    setRoutine(data.routines.find((r) => r.id === routineId) ?? null);
  }, [routineId]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") resumeAudio();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      const s = sess.current;
      if (s.timerId) clearInterval(s.timerId);
      s.wakeLock?.release().catch(() => {});
    };
  }, []);

  // Called from button click handlers (always fresh closure — stable deps only)
  function refreshUi() {
    const s = sess.current;
    const item = s.queue[s.idx];
    if (!item) return;
    setUi({
      stretchName: item.stretchName,
      phaseLabel: getPhaseLabel(item),
      timeRemaining: s.t,
      duration: item.duration,
      isPaused: s.paused,
      itemIndex: s.idx,
      queueLength: s.queue.length,
    });
  }

  function doStart() {
    if (!routine?.stretches?.length) return;

    // Must unlock audio in a synchronous user gesture handler
    unlockAudio();
    warmupSpeech();

    const s = sess.current;
    const queue = buildQueue(routine);
    s.queue = queue;
    s.idx = 0;
    s.t = queue[0].duration;
    s.paused = false;

    // Set initial UI before starting tick
    const first = queue[0];
    setUi({
      stretchName: first.stretchName,
      phaseLabel: getPhaseLabel(first),
      timeRemaining: first.duration,
      duration: first.duration,
      isPaused: false,
      itemIndex: 0,
      queueLength: queue.length,
    });
    setPhase("active");

    navigator.wakeLock
      ?.request("screen")
      .then((wl) => {
        if (sess.current) sess.current.wakeLock = wl;
      })
      .catch(() => {});

    // The interval closure only touches sess.current (ref) and stable setters.
    // refreshUi and advance logic are inlined to avoid stale function captures.
    s.timerId = setInterval(() => {
      const s = sess.current;
      if (s.paused) return;

      s.t--;
      const item = s.queue[s.idx];
      if (!item) return;

      // 3-beep countdown at 3, 2, 1 seconds before any phase ends
      if (s.t >= 1 && s.t <= 3) beep();

      // "Next up" voice 10 seconds before a stretch phase ends
      if (
        (item.type === "stretch_full" || item.type === "stretch_second") &&
        s.t === 10 &&
        item.nextStretchName
      ) {
        speak(`Next up: ${item.nextStretchName}`);
      }

      if (s.t <= 0) {
        s.idx++;
        if (s.idx >= s.queue.length) {
          clearInterval(s.timerId);
          s.timerId = null;
          s.wakeLock?.release().catch(() => {});
          s.wakeLock = null;
          setPhase("done");
          return;
        }
        const next = s.queue[s.idx];
        s.t = next.duration;
        if (next.type === "side_switch") speak("Switch sides");
        // Update UI for the new item
        setUi({
          stretchName: next.stretchName,
          phaseLabel: getPhaseLabel(next),
          timeRemaining: next.duration,
          duration: next.duration,
          isPaused: false,
          itemIndex: s.idx,
          queueLength: s.queue.length,
        });
        return;
      }

      // Update countdown display
      setUi((prev) => ({ ...prev, timeRemaining: s.t }));
    }, 1000);
  }

  function doPause() {
    sess.current.paused = !sess.current.paused;
    setUi((prev) => ({ ...prev, isPaused: sess.current.paused }));
  }

  function doNext() {
    const s = sess.current;
    s.idx++;
    if (s.idx >= s.queue.length) {
      if (s.timerId) clearInterval(s.timerId);
      s.timerId = null;
      s.wakeLock?.release().catch(() => {});
      s.wakeLock = null;
      setPhase("done");
      return;
    }
    const item = s.queue[s.idx];
    s.t = item.duration;
    if (item.type === "side_switch") speak("Switch sides");
    refreshUi();
  }

  function doPrev() {
    const s = sess.current;
    const item = s.queue[s.idx];
    if (!item) return;
    // If more than 3 seconds elapsed, restart current item
    if (s.t < item.duration - 3) {
      s.t = item.duration;
    } else if (s.idx > 0) {
      s.idx--;
      s.t = s.queue[s.idx].duration;
    } else {
      s.t = item.duration;
    }
    refreshUi();
  }

  function handleBack() {
    if (phase === "active") {
      if (!confirm("Exit this session?")) return;
      const s = sess.current;
      if (s.timerId) clearInterval(s.timerId);
      s.timerId = null;
      s.wakeLock?.release().catch(() => {});
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

  // Active session
  const progress = ui.duration > 0 ? ui.timeRemaining / ui.duration : 0;

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
        <div
          className="h-full bg-teal-500 rounded-full transition-all duration-1000 ease-linear"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Main timer area */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-4">
        {/* Phase label */}
        {ui.phaseLabel ? (
          <p className="text-sm font-medium text-teal-400 uppercase tracking-widest mb-3">
            {ui.phaseLabel}
          </p>
        ) : (
          <div className="mb-3 h-5" />
        )}

        {/* Stretch name */}
        <h2 className="text-3xl font-bold text-white text-center mb-8 leading-tight">
          {ui.stretchName}
        </h2>

        {/* Big countdown */}
        <div className="text-8xl font-mono font-bold text-teal-400 tabular-nums leading-none mb-8">
          {formatTime(ui.timeRemaining)}
        </div>

        {ui.isPaused && (
          <p className="text-neutral-500 text-sm tracking-widest uppercase">
            Paused
          </p>
        )}
      </div>

      {/* Media player controls */}
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
        {count} stretch{count !== 1 ? "es" : ""} · ~{formatTime(totalSec)}
      </p>

      {count === 0 ? (
        <p className="text-neutral-600 text-center">
          Add stretches to this routine first.
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
