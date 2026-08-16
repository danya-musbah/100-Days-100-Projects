/* ==========================================================================
   SkyCast — storage.js
   Thin wrapper around LocalStorage. 
   ========================================================================== */

const STORAGE_KEY = "skycast:v1";
const MAX_RECENTS = 6;

const DEFAULT_STATE = {
  recentCities: [], // [{ name, country, lat, lon }]
  lastLocation: null, // { name, country, lat, lon }
  preferredUnit: "C", // "C" | "F"
  themeMode: "auto", // currently only "auto" is implemented
  notifications: false,
};

function readState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_STATE, ...parsed };
  } catch (err) {
    console.warn("SkyCast: could not read localStorage, using defaults.", err);
    return { ...DEFAULT_STATE };
  }
}

function writeState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (err) {
    console.warn("SkyCast: could not write to localStorage (quota or private mode).", err);
    return false;
  }
}

function getRecentCities() {
  return readState().recentCities;
}

function addRecentCity(city) {
  const state = readState();
  const key = (c) => `${c.name}|${c.country}`;
  const withoutDupe = state.recentCities.filter((c) => key(c) !== key(city));
  state.recentCities = [city, ...withoutDupe].slice(0, MAX_RECENTS);
  writeState(state);
  return state.recentCities;
}

function clearRecentCities() {
  const state = readState();
  state.recentCities = [];
  writeState(state);
}

function getLastLocation() {
  return readState().lastLocation;
}

function setLastLocation(city) {
  const state = readState();
  state.lastLocation = city;
  writeState(state);
}

function getPreferredUnit() {
  return readState().preferredUnit;
}

function setPreferredUnit(unit) {
  const state = readState();
  state.preferredUnit = unit === "F" ? "F" : "C";
  writeState(state);
}

function getNotifications() {
  return readState().notifications;
}

function setNotifications(enabled) {
  const state = readState();
  state.notifications = Boolean(enabled);
  writeState(state);
}

window.SkyCast = window.SkyCast || {};
window.SkyCast.storage = {
  getRecentCities,
  addRecentCity,
  clearRecentCities,
  getLastLocation,
  setLastLocation,
  getPreferredUnit,
  setPreferredUnit,
  getNotifications,
  setNotifications,
};
