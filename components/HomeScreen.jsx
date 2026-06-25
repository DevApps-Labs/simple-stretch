"use client";
import { useState, useEffect } from "react";
import { loadData, saveData, generateId } from "@/lib/storage";
import { totalRoutineSeconds } from "@/lib/timer";
import { VERSION } from "@/lib/version";

export default function HomeScreen({ navigate }) {
  const [data, setData] = useState(null);
  const [modal, setModal] = useState(null); // 'export' | 'import'

  useEffect(() => {
    setData(loadData());
  }, []);

  if (!data) return <ScreenLoader />;

  function createRoutine() {
    const id = generateId();
    const routine = {
      id,
      name: "New Routine",
      createdAt: Date.now(),
      stretches: [],
    };
    const updated = { ...data, routines: [...data.routines, routine] };
    saveData(updated);
    setData(updated);
    navigate("routine-edit", { routineId: id });
  }

  function deleteRoutine(routineId) {
    const routine = data.routines.find((r) => r.id === routineId);
    if (!confirm(`Delete "${routine?.name}"?`)) return;
    const updated = {
      ...data,
      routines: data.routines.filter((r) => r.id !== routineId),
    };
    saveData(updated);
    setData(updated);
  }

  return (
    <>
      <div className="flex flex-col min-h-screen bg-neutral-950">
        <div
          className="flex flex-col flex-1"
          style={{
            paddingTop: "env(safe-area-inset-top)",
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
        >
          {/* Header */}
          <div className="px-5 pt-6 pb-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Simple Stretch{" "}
              <span className="text-xs font-normal text-neutral-600">v{VERSION}</span>
            </h1>
            <p className="text-sm text-neutral-500 mt-0.5">
              {data.routines.length === 0
                ? "No routines yet"
                : `${data.routines.length} routine${data.routines.length !== 1 ? "s" : ""}`}
            </p>
          </div>

          {/* Routines list */}
          <div className="flex-1 overflow-y-auto px-4 py-2">
            {data.routines.length === 0 ? (
              <div className="text-center py-20 text-neutral-600">
                <div className="text-5xl mb-4">🧘</div>
                <p className="text-base">No routines yet.</p>
                <p className="text-sm mt-1">Tap + New Routine to get started.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.routines.map((routine) => (
                  <RoutineCard
                    key={routine.id}
                    routine={routine}
                    onStart={() =>
                      navigate("session", { routineId: routine.id })
                    }
                    onEdit={() =>
                      navigate("routine-edit", { routineId: routine.id })
                    }
                    onDelete={() => deleteRoutine(routine.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Bottom bar */}
          <div className="px-4 pt-3 pb-4 border-t border-neutral-800 space-y-2">
            <button
              onClick={createRoutine}
              className="w-full bg-teal-500 active:bg-teal-600 text-black font-semibold py-3.5 rounded-2xl text-base"
            >
              + New Routine
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => setModal("export")}
                className="flex-1 bg-neutral-800 active:bg-neutral-700 text-neutral-300 font-medium py-2.5 rounded-xl text-sm"
              >
                Export JSON
              </button>
              <button
                onClick={() => setModal("import")}
                className="flex-1 bg-neutral-800 active:bg-neutral-700 text-neutral-300 font-medium py-2.5 rounded-xl text-sm"
              >
                Import JSON
              </button>
            </div>
            <button
              onClick={() => navigate("json-schema")}
              className="w-full bg-neutral-800 active:bg-neutral-700 text-neutral-500 font-medium py-2.5 rounded-xl text-sm"
            >
              JSON Schema &amp; AI Prompt
            </button>
          </div>
        </div>
      </div>

      {modal === "export" && (
        <ExportModal data={data} onClose={() => setModal(null)} />
      )}
      {modal === "import" && (
        <ImportModal
          onClose={() => setModal(null)}
          onImport={(imported) => {
            setData(imported);
            setModal(null);
          }}
        />
      )}
    </>
  );
}

function ExportModal({ data, onClose }) {
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify(data, null, 2);

  function copy() {
    navigator.clipboard.writeText(json).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div
        className="relative bg-neutral-900 rounded-t-2xl flex flex-col"
        style={{
          maxHeight: "70vh",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 flex-shrink-0">
          <h2 className="font-semibold text-white">Export Data</h2>
          <div className="flex items-center gap-4">
            <button
              onClick={copy}
              className="flex items-center gap-1.5 text-sm text-teal-400 active:text-teal-300 font-medium"
            >
              {copied ? (
                "Copied!"
              ) : (
                <>
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Copy
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="text-neutral-500 active:text-white text-lg leading-none"
            >
              ✕
            </button>
          </div>
        </div>
        <pre className="overflow-y-auto p-4 text-xs text-neutral-300 font-mono flex-1 whitespace-pre">
          {json}
        </pre>
      </div>
    </div>
  );
}

function ImportModal({ onClose, onImport }) {
  const [text, setText] = useState("");
  const [error, setError] = useState(null);

  function apply() {
    try {
      const imported = JSON.parse(text.trim());
      if (!imported.version || !Array.isArray(imported.routines))
        throw new Error("Invalid backup file");
      if (!Array.isArray(imported.library)) imported.library = [];
      const existing = loadData();
      const importedRoutineIds = new Set(imported.routines.map((r) => r.id));
      const importedLibIds = new Set(imported.library.map((e) => e.id));
      const merged = {
        ...existing,
        routines: [
          ...existing.routines.filter((r) => !importedRoutineIds.has(r.id)),
          ...imported.routines,
        ],
        library: [
          ...existing.library.filter((e) => !importedLibIds.has(e.id)),
          ...imported.library,
        ],
      };
      saveData(merged);
      onImport(merged);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div
        className="relative bg-neutral-900 rounded-t-2xl flex flex-col"
        style={{
          maxHeight: "75vh",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 flex-shrink-0">
          <h2 className="font-semibold text-white">Import Data</h2>
          <button
            onClick={onClose}
            className="text-neutral-500 active:text-white text-lg leading-none"
          >
            ✕
          </button>
        </div>
        <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-3">
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setError(null);
            }}
            placeholder="Paste your JSON backup here…"
            className="w-full flex-1 min-h-48 bg-neutral-800 text-neutral-300 text-xs font-mono rounded-xl p-3 border border-neutral-700 focus:border-teal-500 focus:outline-none resize-none"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>
        <div className="px-4 pb-4 flex-shrink-0">
          <button
            onClick={apply}
            disabled={!text.trim()}
            className="w-full bg-teal-500 active:bg-teal-600 disabled:bg-neutral-700 disabled:text-neutral-500 text-black font-semibold py-3.5 rounded-2xl text-base"
          >
            Apply Import
          </button>
        </div>
      </div>
    </div>
  );
}

function RoutineCard({ routine, onStart, onEdit, onDelete }) {
  const count = routine.stretches.length;
  const totalSec = totalRoutineSeconds(routine);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  const timeStr =
    totalSec === 0
      ? "0:00"
      : m > 0
        ? `${m}:${String(s).padStart(2, "0")}`
        : `0:${String(s).padStart(2, "0")}`;

  return (
    <div className="bg-neutral-900 rounded-2xl p-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onStart}
          className="w-12 h-12 rounded-full bg-teal-500 active:bg-teal-600 flex items-center justify-center flex-shrink-0"
          aria-label="Start"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="black"
            className="translate-x-0.5"
          >
            <polygon points="5,3 20,12 5,21" />
          </svg>
        </button>

        <div className="flex-1 min-w-0" onClick={onEdit}>
          <h3 className="font-semibold text-white text-base leading-tight truncate">
            {routine.name}
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            {count} stretch{count !== 1 ? "es" : ""} · ~{timeStr}
          </p>
        </div>

        <button
          onClick={onEdit}
          className="w-9 h-9 flex items-center justify-center text-neutral-500 active:text-neutral-300"
          aria-label="Edit"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>

        <button
          onClick={onDelete}
          className="w-9 h-9 flex items-center justify-center text-neutral-600 active:text-red-400"
          aria-label="Delete"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="3,6 5,6 21,6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function ScreenLoader() {
  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
