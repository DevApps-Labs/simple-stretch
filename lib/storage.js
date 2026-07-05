const KEY = "simple-stretch-data";
const SESSION_KEY = "simple-stretch-session";

const DEFAULT_DATA = { version: 1, library: [], routines: [] };

// Persists just enough of an in-progress session to survive a page reload
// (mobile PWAs get their JS context suspended/killed after extended
// backgrounding) and to let us cancel any server-scheduled push
// notifications that would otherwise fire for a session that no longer
// exists client-side.
export function saveSessionState(state) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(state));
  } catch {}
}

export function loadSessionState() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearSessionState() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {}
}

export function loadData() {
  try {
    const raw =
      typeof window !== "undefined" ? localStorage.getItem(KEY) : null;
    if (!raw) return structuredClone(DEFAULT_DATA);
    return JSON.parse(raw);
  } catch {
    return structuredClone(DEFAULT_DATA);
  }
}

export function saveData(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch (e) {
    if (e.name === "QuotaExceededError") {
      alert("Storage full. Export your data and clear some routines.");
    }
  }
}

export function generateId() {
  return (
    crypto.randomUUID?.() ??
    Date.now().toString(36) + Math.random().toString(36).slice(2)
  );
}

export function exportData() {
  const data = loadData();
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "simple-stretch-backup.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.version || !Array.isArray(data.routines)) {
          throw new Error("Invalid backup file");
        }
        if (!Array.isArray(data.library)) data.library = [];
        saveData(data);
        resolve(data);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}
