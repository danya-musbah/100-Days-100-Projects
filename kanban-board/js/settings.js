/* ==========================================================================
   settings.js — user settings application & persistence
   ========================================================================== */
(function (global) {
  'use strict';

  function applySettings(settings) {
    document.documentElement.setAttribute('data-theme', settings.theme === 'light' ? 'light' : 'dark');
    document.body.classList.toggle('compact-mode', !!settings.compactMode);
    document.body.classList.toggle('no-animations', !settings.animations);
  }

  function populateSettingsForm(settings) {
    document.getElementById('setting-theme').value = settings.theme;
    document.getElementById('setting-storage-mode').value = settings.storageMode;
    document.getElementById('setting-confirm-delete').checked = !!settings.confirmBeforeDelete;
    document.getElementById('setting-animations').checked = !!settings.animations;
    document.getElementById('setting-compact-mode').checked = !!settings.compactMode;
  }

  global.KanbanSettings = { applySettings, populateSettingsForm };
})(window);
