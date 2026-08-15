// storage.js — LocalStorage persistence with safe parsing and defaults.

const STORAGE_KEY = "nightclock:preferences";

export const DEFAULT_SETTINGS = Object.freeze({
  timeFormat: "24",
  showSeconds: true,
  showDate: true,
  showTimezone: true,
  showGreeting: false,
  keepAwake: false,
});

/**
 * Reads persisted settings from LocalStorage.
 * Falls back to defaults if the data is missing, corrupted, or invalid.
 * @returns {typeof DEFAULT_SETTINGS}
 */
export function loadSettings() {
  let raw;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch (err) {
    // LocalStorage may be unavailable (private mode, disabled storage, etc.)
    return { ...DEFAULT_SETTINGS };
  }

  if (!raw) return { ...DEFAULT_SETTINGS };

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return { ...DEFAULT_SETTINGS };
    }

    const merged = { ...DEFAULT_SETTINGS };

    if (parsed.timeFormat === "12" || parsed.timeFormat === "24") {
      merged.timeFormat = parsed.timeFormat;
    }
    for (const key of ["showSeconds", "showDate", "showTimezone", "showGreeting", "keepAwake"]) {
      if (typeof parsed[key] === "boolean") {
        merged[key] = parsed[key];
      }
    }
    return merged;
  } catch (err) {
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Persists settings to LocalStorage. Fails silently if storage is unavailable.
 * @param {typeof DEFAULT_SETTINGS} settings
 */
export function saveSettings(settings) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    // Ignore quota / availability errors — app still works without persistence.
  }
}

export function clearSettings() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    // Ignore.
  }
}
