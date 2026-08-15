// settings.js — in-memory settings state, change notifications, and
// persistence orchestration (delegates actual storage I/O to storage.js).

import { DEFAULT_SETTINGS, loadSettings, saveSettings, clearSettings } from "./storage.js";

export class SettingsStore {
  constructor() {
    this._state = loadSettings();
    this._listeners = new Set();
  }

  get state() {
    return this._state;
  }

  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  _notify() {
    for (const listener of this._listeners) listener(this._state);
  }

  _commit() {
    saveSettings(this._state);
    this._notify();
  }

  set(key, value) {
    if (this._state[key] === value) return;
    this._state = { ...this._state, [key]: value };
    this._commit();
  }

  toggle(key) {
    this.set(key, !this._state[key]);
  }

  setTimeFormat(format) {
    if (format !== "12" && format !== "24") return;
    this.set("timeFormat", format);
  }

  reset() {
    this._state = { ...DEFAULT_SETTINGS };
    clearSettings();
    saveSettings(this._state);
    this._notify();
  }
}
