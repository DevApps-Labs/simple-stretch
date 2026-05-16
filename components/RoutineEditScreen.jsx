"use client";
import { useState, useEffect } from "react";
import { loadData, saveData, generateId } from "@/lib/storage";
import LibraryPicker from "./LibraryPicker";

export default function RoutineEditScreen({ navigate, goBack, params }) {
  const { routineId } = params;
  const [data, setData] = useState(null);
  const [routine, setRoutine] = useState(null);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    const d = loadData();
    setData(d);
    setRoutine(d.routines.find((r) => r.id === routineId) ?? null);
  }, [routineId]);

  if (!data || !routine) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  function persist(updatedRoutine, updatedLibrary) {
    const updatedData = {
      ...data,
      library: updatedLibrary ?? data.library,
      routines: data.routines.map((r) =>
        r.id === routineId ? updatedRoutine : r
      ),
    };
    setData(updatedData);
    setRoutine(updatedRoutine);
    saveData(updatedData);
  }

  function updateName(name) {
    persist({ ...routine, name });
  }

  function addFromLibrary(entry) {
    const stretch = {
      id: generateId(),
      libraryId: entry.id,
      name: entry.name,
      exerciseType: "timed",
      duration: 30,
      reps: 10,
      holdPerRep: 8,
      instructions: "",
      switchSides: false,
      transitionTime: 5,
    };
    persist({ ...routine, stretches: [...routine.stretches, stretch] });
    setShowPicker(false);
  }

  function addNew(name) {
    const libEntry = { id: generateId(), name };
    const updatedLibrary = [...data.library, libEntry];
    const stretch = {
      id: generateId(),
      libraryId: libEntry.id,
      name,
      exerciseType: "timed",
      duration: 30,
      reps: 10,
      holdPerRep: 8,
      instructions: "",
      switchSides: false,
      transitionTime: 5,
    };
    persist(
      { ...routine, stretches: [...routine.stretches, stretch] },
      updatedLibrary
    );
    setShowPicker(false);
  }

  function deleteStretch(stretchId) {
    persist({
      ...routine,
      stretches: routine.stretches.filter((s) => s.id !== stretchId),
    });
  }

  function moveStretch(index, dir) {
    const arr = [...routine.stretches];
    const target = index + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[index], arr[target]] = [arr[target], arr[index]];
    persist({ ...routine, stretches: arr });
  }

  return (
    <div
      className="flex flex-col min-h-screen bg-neutral-950"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-3">
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
        <input
          type="text"
          value={routine.name}
          onChange={(e) => updateName(e.target.value)}
          className="flex-1 bg-transparent text-xl font-bold text-white focus:outline-none placeholder:text-neutral-600"
          placeholder="Routine name"
        />
        {routine.stretches.length > 0 && (
          <button
            onClick={() => navigate("session", { routineId })}
            className="bg-teal-500 active:bg-teal-600 text-black font-semibold px-4 py-2 rounded-xl text-sm"
          >
            Start
          </button>
        )}
      </div>

      {/* Stretch list */}
      <div className="flex-1 overflow-y-auto px-4 pb-2">
        {routine.stretches.length === 0 ? (
          <div className="text-center py-16 text-neutral-600 text-sm">
            No stretches yet. Tap Add Stretch below.
          </div>
        ) : (
          <div className="space-y-2 py-1">
            {routine.stretches.map((stretch, index) => (
              <StretchRow
                key={stretch.id}
                stretch={stretch}
                index={index}
                total={routine.stretches.length}
                onEdit={() =>
                  navigate("stretch-config", {
                    routineId,
                    stretchId: stretch.id,
                  })
                }
                onDelete={() => deleteStretch(stretch.id)}
                onMove={(dir) => moveStretch(index, dir)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add button */}
      <div className="px-4 pt-2 pb-4 border-t border-neutral-800">
        <button
          onClick={() => setShowPicker(true)}
          className="w-full bg-neutral-800 active:bg-neutral-700 text-white font-semibold py-3.5 rounded-2xl"
        >
          + Add Stretch
        </button>
      </div>

      {showPicker && (
        <LibraryPicker
          library={data.library}
          onSelect={addFromLibrary}
          onNew={addNew}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}

function StretchRow({ stretch, index, total, onEdit, onDelete, onMove }) {
  const type = stretch.exerciseType ?? "timed";
  let timeStr;
  if (type === "reps") {
    timeStr = `${stretch.reps ?? 10} reps`;
  } else if (type === "rep_hold") {
    timeStr = `${stretch.reps ?? 5} × ${stretch.holdPerRep ?? 8}s`;
  } else {
    const dur = stretch.duration ?? 0;
    const mins = Math.floor(dur / 60);
    const secs = dur % 60;
    timeStr = mins > 0 ? `${mins}m ${secs > 0 ? secs + "s" : ""}` : `${secs}s`;
  }

  return (
    <div className="bg-neutral-900 rounded-xl flex items-center gap-1 pr-1">
      {/* Reorder */}
      <div className="flex flex-col pl-2 py-2">
        <button
          onClick={() => onMove(-1)}
          disabled={index === 0}
          className="w-7 h-7 flex items-center justify-center text-neutral-500 disabled:opacity-20 active:text-white"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <path d="M18 15l-6-6-6 6" />
          </svg>
        </button>
        <button
          onClick={() => onMove(1)}
          disabled={index === total - 1}
          className="w-7 h-7 flex items-center justify-center text-neutral-500 disabled:opacity-20 active:text-white"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>

      {/* Info — tap to edit */}
      <button
        onClick={onEdit}
        className="flex-1 py-3 text-left min-w-0"
      >
        <p className="font-medium text-white text-sm truncate">{stretch.name}</p>
        <p className="text-xs text-neutral-500 mt-0.5">
          {timeStr}
          {stretch.switchSides ? " · Both sides" : ""}
          {stretch.transitionTime > 0
            ? ` · ${stretch.transitionTime}s transition`
            : ""}
        </p>
      </button>

      {/* Chevron */}
      <button onClick={onEdit} className="w-8 h-8 flex items-center justify-center text-neutral-600">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>

      {/* Delete */}
      <button
        onClick={onDelete}
        className="w-9 h-9 flex items-center justify-center text-neutral-600 active:text-red-400"
        aria-label="Remove"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
