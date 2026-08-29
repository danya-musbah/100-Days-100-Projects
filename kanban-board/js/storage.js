/* ==========================================================================
   storage.js — persistence layer
   Default: localStorage. Optional: Python server (falls back automatically).
   ========================================================================== */
(function (global) {
  'use strict';

  const LS_KEY = 'kanban.board.v1';
  const LS_SETTINGS_KEY = 'kanban.settings.v1';
  const API_BASE = '/api';

  let localStorageAvailable = true;
  try {
    const testKey = '__kanban_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
  } catch (e) {
    localStorageAvailable = false;
  }

  function saveLocal(data) {
    if (!localStorageAvailable) return false;
    try {
      window.localStorage.setItem(LS_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.warn('localStorage save failed', e);
      return false;
    }
  }

  function loadLocal() {
    if (!localStorageAvailable) return null;
    try {
      const raw = window.localStorage.getItem(LS_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.warn('localStorage load failed / corrupted data', e);
      return null;
    }
  }

  function clearLocal() {
    if (!localStorageAvailable) return;
    try {
      window.localStorage.removeItem(LS_KEY);
      window.localStorage.removeItem(LS_SETTINGS_KEY);
    } catch (e) { /* ignore */ }
  }

  async function pingServer(timeoutMs = 1500) {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(`${API_BASE}/health`, { signal: controller.signal });
      clearTimeout(t);
      return res.ok;
    } catch (e) {
      return false;
    }
  }

  async function saveServer(data) {
    try {
      const res = await fetch(`${API_BASE}/board`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  }

  async function loadServer() {
    try {
      const res = await fetch(`${API_BASE}/board`);
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      return null;
    }
  }

  global.KanbanStorage = {
    localStorageAvailable,
    saveLocal, loadLocal, clearLocal,
    pingServer, saveServer, loadServer,
  };
})(window);
