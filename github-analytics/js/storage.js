/**
 * storage.js
 * Responsible for recent searches, cached profile data, and user preferences.
 */

const Storage = (() => {
  const KEYS = {
    RECENT: 'gha:recent-profiles',
    CACHE_PREFIX: 'gha:cache:',
    PREFS: 'gha:preferences',
  };

  const CACHE_LIFETIME_MS = 5 * 60 * 1000; // 5 minutes
  const MAX_RECENT = 8;

  function safeGet(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  }

  function safeSet(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      return false;
    }
  }

  function safeRemove(key) {
    try {
      localStorage.removeItem(key);
    } catch (err) { /* noop */ }
  }

  // ---- Recent profiles ----

  function getRecentProfiles() {
    return safeGet(KEYS.RECENT) || [];
  }

  function addRecentProfile(username) {
    if (!username) return;
    const lower = username.toLowerCase();
    let list = getRecentProfiles().filter((u) => u.toLowerCase() !== lower);
    list.unshift(username);
    list = list.slice(0, MAX_RECENT);
    safeSet(KEYS.RECENT, list);
  }

  function clearRecentProfiles() {
    safeRemove(KEYS.RECENT);
  }

  // ---- Cache ----

  function getCache(username) {
    const prefs = getPreferences();
    if (!prefs.cacheEnabled) return null;
    const entry = safeGet(KEYS.CACHE_PREFIX + username.toLowerCase());
    if (!entry || !entry.timestamp) return null;
    if (Date.now() - entry.timestamp > CACHE_LIFETIME_MS) return null;
    return entry.data;
  }

  function setCache(username, data) {
    safeSet(KEYS.CACHE_PREFIX + username.toLowerCase(), {
      username,
      timestamp: Date.now(),
      data,
    });
  }

  function clearAllCache() {
    try {
      const toRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.indexOf(KEYS.CACHE_PREFIX) === 0) toRemove.push(key);
      }
      toRemove.forEach((k) => localStorage.removeItem(k));
    } catch (err) { /* noop */ }
  }

  // ---- Preferences ----

  function getPreferences() {
    return Object.assign(
      {
        perPage: 12,
        defaultSort: 'score',
        animations: true,
        cacheEnabled: true,
      },
      safeGet(KEYS.PREFS) || {}
    );
  }

  function setPreferences(partial) {
    const merged = Object.assign(getPreferences(), partial);
    safeSet(KEYS.PREFS, merged);
    return merged;
  }

  return {
    getRecentProfiles,
    addRecentProfile,
    clearRecentProfiles,
    getCache,
    setCache,
    clearAllCache,
    getPreferences,
    setPreferences,
  };
})();
