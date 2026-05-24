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
    let updated = { ...stretch, ...updates };

    // Set sensible defaults when switching exercise type
    if ("exerciseType" in updates) {
      if (updates.exerciseType === "reps") {
        if (!updated.reps) updated.reps = 10;
        if (updated.instructions === undefined) updated.instructions = "";
      } else if (updates.exerciseType === "rep_hold") {
        if (!updated.reps) updated.reps = 5;
        if (!updated.holdPerRep) updated.holdPerRep = 8;
      } else if (updates.exerciseType === "timed") {
        if (!updated.duration) updated.duration = 30;
      }
    }

    // Auto-adjust duration when switchSides toggles (timed only)
    if ("switchSides" in updates && (updated.exerciseType ?? "timed") === "timed") {
      if (updates.switchSides && updated.duration === 30) updated.duration = 60;
      if (!updates.switchSides && updated.duration === 60) updated.duration = 30;
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

  const exerciseType = stretch.exerciseType ?? "timed";
  const halfDur = Math.floor((stretch.duration ?? 30) / 2);

  return (
    <div
      className="flex flex-col min-h-screen bg-neutral-950"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-4">
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
      <div className="px-4 space-y-3 overflow-y-auto flex-1">

        {/* Exercise Type */}
        <div className="bg-neutral-900 rounded-2xl p-4">
          <p className="font-semibold text-white mb-3">Exercise Type</p>
          <div className="flex gap-1 bg-neutral-800 p-1 rounded-xl">
            {[
              { value: "timed", label: "Timed" },
              { value: "reps", label: "Rep-Based" },
              { value: "rep_hold", label: "Rep × Hold" },
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => updateStretch({ exerciseType: value })}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  exerciseType === value
                    ? "bg-teal-500 text-black"
                    : "text-neutral-400 active:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-xs text-neutral-600 mt-2">
            {exerciseType === "timed" && "Single countdown timer"}
            {exerciseType === "reps" && "Count reps at your own pace"}
            {exerciseType === "rep_hold" && "Each rep has its own countdown"}
          </p>
        </div>

        {/* Timed: Duration */}
        {exerciseType === "timed" && (
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
                {stretch.duration ?? 30}s
              </span>
            </div>
            <div className="flex gap-3">
              <StepButton
                label="−15s"
                onClick={() =>
                  updateStretch({ duration: Math.max(15, (stretch.duration ?? 30) - 15) })
                }
                disabled={(stretch.duration ?? 30) <= 15}
              />
              <StepButton
                label="+15s"
                onClick={() => updateStretch({ duration: (stretch.duration ?? 30) + 15 })}
              />
            </div>
          </div>
        )}

        {/* Reps / Rep×Hold: Rep Count */}
        {(exerciseType === "reps" || exerciseType === "rep_hold") && (
          <div className="bg-neutral-900 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-4">
              <p className="font-semibold text-white">Reps</p>
              <span className="text-2xl font-bold text-teal-400">
                {stretch.reps ?? (exerciseType === "rep_hold" ? 5 : 10)}
              </span>
            </div>
            <div className="flex gap-3">
              <StepButton
                label="−1"
                onClick={() =>
                  updateStretch({ reps: Math.max(1, (stretch.reps ?? 5) - 1) })
                }
                disabled={(stretch.reps ?? 5) <= 1}
              />
              <StepButton
                label="+1"
                onClick={() => updateStretch({ reps: (stretch.reps ?? 5) + 1 })}
              />
            </div>
          </div>
        )}

        {/* Rep×Hold: Hold Per Rep */}
        {exerciseType === "rep_hold" && (
          <div className="bg-neutral-900 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-semibold text-white">Hold Per Rep</p>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Countdown for each rep
                </p>
              </div>
              <span className="text-2xl font-bold text-teal-400">
                {stretch.holdPerRep ?? 8}s
              </span>
            </div>
            <div className="flex gap-3">
              <StepButton
                label="−1s"
                onClick={() =>
                  updateStretch({ holdPerRep: Math.max(1, (stretch.holdPerRep ?? 8) - 1) })
                }
                disabled={(stretch.holdPerRep ?? 8) <= 1}
              />
              <StepButton
                label="+1s"
                onClick={() =>
                  updateStretch({ holdPerRep: (stretch.holdPerRep ?? 8) + 1 })
                }
              />
            </div>
          </div>
        )}

        {/* Rep-Based: Instructions */}
        {(exerciseType === "reps" || exerciseType === "rep_hold") && (
          <div className="bg-neutral-900 rounded-2xl p-4">
            <p className="font-semibold text-white mb-1">Instructions</p>
            <p className="text-xs text-neutral-500 mb-3">
              Optional reminder shown during the exercise
            </p>
            <textarea
              value={stretch.instructions ?? ""}
              onChange={(e) => updateStretch({ instructions: e.target.value })}
              placeholder="e.g. 10 circles forward, then 10 back"
              rows={2}
              className="w-full bg-neutral-800 text-neutral-200 text-sm rounded-xl p-3 border border-neutral-700 focus:border-teal-500 focus:outline-none resize-none"
            />
          </div>
        )}

        {/* Switch Sides */}
        <div className="bg-neutral-900 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-white">Switch Sides</p>
              <p className="text-xs text-neutral-500 mt-0.5">
                {stretch.switchSides
                  ? exerciseType === "timed"
                    ? `${halfDur}s each side with a 5s pause`
                    : "Complete all reps on each side"
                  : "No side switch"}
              </p>
            </div>
            <Toggle
              on={stretch.switchSides}
              onChange={(v) => updateStretch({ switchSides: v })}
            />
          </div>
        </div>

        {/* Demo GIF */}
        <div className="bg-neutral-900 rounded-2xl p-4">
          <p className="font-semibold text-white mb-1">Demo GIF</p>
          <p className="text-xs text-neutral-500 mb-3">
            Optional — shown during the exercise
          </p>
          {stretch.gifUrl ? (
            <img
              src={stretch.gifUrl}
              alt=""
              className="w-full rounded-xl mb-3 object-contain"
              style={{ maxHeight: "120px" }}
              onError={(e) => { e.target.style.display = "none"; }}
            />
          ) : null}
          <input
            type="url"
            value={stretch.gifUrl ?? ""}
            onChange={(e) => updateStretch({ gifUrl: e.target.value || undefined })}
            placeholder="https://i.imgur.com/..."
            className="w-full bg-neutral-800 text-neutral-200 text-sm rounded-xl p-3 border border-neutral-700 focus:border-teal-500 focus:outline-none"
          />
        </div>

        {/* Transition Time */}
        <div className="bg-neutral-900 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-semibold text-white">Transition</p>
              <p className="text-xs text-neutral-500 mt-0.5">
                Prep time before this exercise
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

        <div className="pb-2" />
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
