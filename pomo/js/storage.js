// storage.js — safe LocalStorage access, settings persistence, daily stats.

const KEYS = {
  settings: "pomo:settings",
  stats: "pomo:stats",
};

export const DEFAULT_SETTINGS = {
  focus: 25,
  shortBreak: 5,
  longBreak: 15,
  longBreakInterval: 4,
  soundEnabled: true,
  autoStart: false,
  notificationsEnabled: true,
};

const LIMITS = {
  focus: { min: 1, max: 180 },
  shortBreak: { min: 1, max: 60 },
  longBreak: { min: 1, max: 120 },
  longBreakInterval: { min: 1, max: 12 },
};

let storageAvailable = true;
try {
  const testKey = "pomo:__test__";
  window.localStorage.setItem(testKey, "1");
  window.localStorage.removeItem(testKey);
} catch {
  storageAvailable = false;
}

function safeGet(key) {
  if (!storageAvailable) return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function safeSet(key, value) {
  if (!storageAvailable) return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/** Clamp and validate a settings object against sensible limits. */
export function validateSettings(input) {
  const clean = { ...DEFAULT_SETTINGS };
  for (const key of ["focus", "shortBreak", "longBreak", "longBreakInterval"]) {
    const value = Number(input?.[key]);
    if (Number.isFinite(value)) {
      const { min, max } = LIMITS[key];
      clean[key] = Math.min(max, Math.max(min, Math.round(value)));
    }
  }
  clean.soundEnabled = Boolean(input?.soundEnabled ?? DEFAULT_SETTINGS.soundEnabled);
  clean.autoStart = Boolean(input?.autoStart ?? DEFAULT_SETTINGS.autoStart);
  clean.notificationsEnabled = Boolean(
    input?.notificationsEnabled ?? DEFAULT_SETTINGS.notificationsEnabled
  );
  return clean;
}

export function loadSettings() {
  const stored = safeGet(KEYS.settings);
  if (!stored || typeof stored !== "object") return { ...DEFAULT_SETTINGS };
  return validateSettings(stored);
}

export function saveSettings(settings) {
  const clean = validateSettings(settings);
  safeSet(KEYS.settings, clean);
  return clean;
}

/** YYYY-MM-DD in the user's local timezone. */
export function todayKey() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function loadAllStats() {
  const stored = safeGet(KEYS.stats);
  if (!stored || typeof stored !== "object") return {};
  return stored;
}

export function getTodayStats() {
  const all = loadAllStats();
  const today = all[todayKey()];
  if (!today || typeof today !== "object") return { pomodoros: 0, minutes: 0 };
  return {
    pomodoros: Number.isFinite(today.pomodoros) ? today.pomodoros : 0,
    minutes: Number.isFinite(today.minutes) ? today.minutes : 0,
  };
}

/** Record one completed focus session and its duration in minutes. */
export function recordCompletedFocus(minutes) {
  const all = loadAllStats();
  const key = todayKey();
  const current = all[key] && typeof all[key] === "object" ? all[key] : { pomodoros: 0, minutes: 0 };
  const updated = {
    pomodoros: (Number.isFinite(current.pomodoros) ? current.pomodoros : 0) + 1,
    minutes: (Number.isFinite(current.minutes) ? current.minutes : 0) + minutes,
  };
  all[key] = updated;
  safeSet(KEYS.stats, all);
  return updated;
}

export function isStorageAvailable() {
  return storageAvailable;
}
