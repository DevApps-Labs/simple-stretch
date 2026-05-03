"use client";
import { useState, useRef, useEffect } from "react";

export default function LibraryPicker({ library, onSelect, onNew, onClose }) {
  const [search, setSearch] = useState("");
  const [newName, setNewName] = useState("");
  const [showNew, setShowNew] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filtered = library.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase())
  );

  function handleNew() {
    const name = newName.trim();
    if (!name) return;
    onNew(name);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      {/* Sheet */}
      <div
        className="relative w-full bg-neutral-900 rounded-t-3xl max-h-[80vh] flex flex-col"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* Handle */}
        <div className="w-10 h-1 bg-neutral-700 rounded-full mx-auto mt-3 mb-1" />

        {/* Header */}
        <div className="px-5 py-3 flex items-center">
          <h3 className="text-lg font-semibold text-white flex-1">
            Add Stretch
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-neutral-400 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pb-2">
          <input
            ref={inputRef}
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search or type to filter…"
            className="w-full bg-neutral-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none placeholder:text-neutral-500"
          />
        </div>

        {/* Library list */}
        <div className="overflow-y-auto flex-1 px-3 pb-2">
          {filtered.length > 0 ? (
            filtered.map((entry) => (
              <button
                key={entry.id}
                onClick={() => onSelect(entry)}
                className="w-full text-left px-4 py-3 rounded-xl active:bg-neutral-800 text-white text-sm mb-0.5"
              >
                {entry.name}
              </button>
            ))
          ) : (
            <p className="text-neutral-600 text-sm text-center py-6">
              {search ? "No matches. Add as new below." : "No stretches yet."}
            </p>
          )}
        </div>

        {/* New stretch input */}
        <div className="px-4 pt-2 pb-3 border-t border-neutral-800">
          {showNew ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Stretch name…"
                className="flex-1 bg-neutral-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none placeholder:text-neutral-500"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleNew()}
              />
              <button
                onClick={handleNew}
                disabled={!newName.trim()}
                className="bg-teal-500 active:bg-teal-600 disabled:opacity-40 text-black font-semibold px-4 py-2.5 rounded-xl text-sm"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setShowNew(false);
                  setNewName("");
                }}
                className="px-3 py-2.5 text-neutral-400 text-sm"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowNew(true)}
              className="w-full text-center text-teal-400 active:text-teal-300 py-2 text-sm font-medium"
            >
              + Create new stretch
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
