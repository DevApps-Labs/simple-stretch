"use client";
import { useState, useEffect } from "react";
import { loadData, saveData } from "@/lib/storage";

export default function StretchConfigScreen({ goBack, params }) {
  const { routineId, stretchId } = params;
  const [data, setData] = useState(null);
  const [stretch, setStretch] = useState(null);

  useEffect(() => {
    const d = loadData();
    setData(d);
    const routine = d.routines.find((r) => r.id === routineId);
    if (routine) {
      setStretch(routine.stretches.find((s) => s.id === stretchId) ?? null);
    }
  }, [routineId, stretchId]);

  function updateStretch(updates) {
    const updated = { ...stretch, ...updates };

    // Auto-adjust duration when switchSides toggles
    if ("switchSides" in updates) {
      if (updates.switchSides && stretch.duration === 30) updated.duration = 60;
      if (!updates.switchSides && stretch.duration === 60) updated.duration = 30;
    }

    setStretch(updated);

    const updatedData = {
      ...data,
      routines: data.routines.map((r) =>
        r.id === routineId
          ? {
              ...r,
              stretches: r.stretches.map((s) =>
                s.id === stretchId ? updated : s
              ),
            }
          : r
      ),
    };
    setData(updatedData);
    saveData(updatedData);
  }

  if (!stretch) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const halfDur = Math.floor(stretch.duration / 2);

  return (
    <div
      className="flex flex-col min-h-screen bg-neutral-950"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-6">
        <button
          onClick={goBack}
          className="w-10 h-10 flex items-center justify-center text-neutral-400 active:text-white"
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
        <h1 className="text-xl font-bold text-white">{stretch.name}</h1>
      </div>

      {/* Settings cards */}
      <div className="px-4 space-y-3">
        {/* Duration */}
        <div className="bg-neutral-900 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-semibold text-white">Duration</p>
              {stretch.switchSides && (
                <p className="text-xs text-neutral-500 mt-0.5">
                  {halfDur}s per side
                </p>
              )}
            </div>
            <span className="text-2xl font-bold text-teal-400">
              {stretch.duration}s
            </span>
          </div>
          <div className="flex gap-3">
            <StepButton
              label="−15s"
              onClick={() =>
                updateStretch({ duration: Math.max(15, stretch.duration - 15) })
              }
              disabled={stretch.duration <= 15}
            />
            <StepButton
              label="+15s"
              onClick={() => updateStretch({ duration: stretch.duration + 15 })}
            />
          </div>
        </div>

        {/* Switch Sides */}
        <div className="bg-neutral-900 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-white">Switch Sides</p>
              <p className="text-xs text-neutral-500 mt-0.5">
                {stretch.switchSides
                  ? `${halfDur}s each side with a 5s pause`
                  : "Single side only"}
              </p>
            </div>
            <Toggle
              on={stretch.switchSides}
              onChange={(v) => updateStretch({ switchSides: v })}
            />
          </div>
        </div>

        {/* Transition Time */}
        <div className="bg-neutral-900 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-semibold text-white">Transition</p>
              <p className="text-xs text-neutral-500 mt-0.5">
                Prep time before this stretch
              </p>
            </div>
            <span className="text-2xl font-bold text-teal-400">
              {stretch.transitionTime}s
            </span>
          </div>
          <div className="flex gap-3">
            <StepButton
              label="−5s"
              onClick={() =>
                updateStretch({
                  transitionTime: Math.max(0, stretch.transitionTime - 5),
                })
              }
              disabled={stretch.transitionTime <= 0}
            />
            <StepButton
              label="+5s"
              onClick={() =>
                updateStretch({ transitionTime: stretch.transitionTime + 5 })
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StepButton({ label, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex-1 bg-neutral-800 active:bg-neutral-700 disabled:opacity-30 text-white font-semibold py-3 rounded-xl text-base"
    >
      {label}
    </button>
  );
}

function Toggle({ on, onChange }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`relative w-14 h-8 rounded-full transition-colors duration-200 ${
        on ? "bg-teal-500" : "bg-neutral-700"
      }`}
      role="switch"
      aria-checked={on}
    >
      <span
        className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform duration-200 ${
          on ? "translate-x-7" : "translate-x-1"
        }`}
      />
    </button>
  );
}
