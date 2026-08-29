/* ==========================================================================
   modal.js — accessible modal management
   ========================================================================== */
(function (global) {
  'use strict';

  let activeOverlay = null;
  let lastFocused = null;
  let openPopovers = [];

  function getFocusable(container) {
    return Array.from(container.querySelectorAll(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    )).filter((el) => el.offsetParent !== null);
  }

  function trapFocus(e) {
    if (!activeOverlay || e.key !== 'Tab') return;
    const modal = activeOverlay.querySelector('.modal');
    if (!modal) return;
    const focusables = getFocusable(modal);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  }

  function openModal(overlayEl, opts = {}) {
    if (!overlayEl) return;
    closeAllPopovers();
    lastFocused = document.activeElement;
    overlayEl.hidden = false;
    activeOverlay = overlayEl;
    document.body.style.overflow = 'hidden';
    const modal = overlayEl.querySelector('.modal');
    setTimeout(() => {
      const target = (opts.focusSelector && overlayEl.querySelector(opts.focusSelector)) || getFocusable(modal)[0];
      if (target) target.focus();
    }, 10);
  }

  function closeModal(overlayEl) {
    if (!overlayEl) return;
    overlayEl.hidden = true;
    if (activeOverlay === overlayEl) activeOverlay = null;
    document.body.style.overflow = '';
    if (lastFocused && document.body.contains(lastFocused)) lastFocused.focus();
  }

  function closeAll() {
    document.querySelectorAll('.modal-overlay').forEach((el) => { el.hidden = true; });
    activeOverlay = null;
    document.body.style.overflow = '';
  }

  // Click outside to close + escape key wiring for every overlay present.
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.modal-overlay').forEach((overlay) => {
      overlay.addEventListener('mousedown', (e) => {
        if (e.target === overlay) closeModal(overlay);
      });
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (activeOverlay) { closeModal(activeOverlay); return; }
      if (openPopovers.length) { closeAllPopovers(); }
    }
    trapFocus(e);
  });

  /* ---------- Popovers (filters / sort / column menu) ---------- */
  function openPopover(panelEl, anchorEl) {
    closeAllPopovers();
    panelEl.hidden = false;
    openPopovers.push(panelEl);
    if (anchorEl) anchorEl.setAttribute('aria-expanded', 'true');
    setTimeout(() => {
      document.addEventListener('mousedown', onDocClickForPopover);
    }, 0);
  }

  function onDocClickForPopover(e) {
    const stillOpen = openPopovers.filter((p) => !p.hidden);
    for (const panel of stillOpen) {
      if (!panel.contains(e.target)) {
        closePopover(panel);
      }
    }
    if (!openPopovers.some((p) => !p.hidden)) {
      document.removeEventListener('mousedown', onDocClickForPopover);
    }
  }

  function closePopover(panelEl) {
    if (!panelEl) return;
    panelEl.hidden = true;
    document.querySelectorAll('[aria-controls]').forEach((btn) => {
      if (btn.getAttribute('aria-controls') === panelEl.id) btn.setAttribute('aria-expanded', 'false');
    });
    openPopovers = openPopovers.filter((p) => p !== panelEl);
  }

  function closeAllPopovers() {
    openPopovers.forEach((p) => { p.hidden = true; });
    document.querySelectorAll('[aria-expanded="true"]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
    openPopovers = [];
  }

  /* ---------- Confirm dialog helper (Promise-based) ---------- */
  function confirmDialog({ title, message, confirmLabel = 'Confirm', danger = true, extraHTML = null }) {
    return new Promise((resolve) => {
      const overlay = document.getElementById('confirm-modal-overlay');
      const titleEl = document.getElementById('confirm-modal-title');
      const msgEl = document.getElementById('confirm-modal-message');
      const okBtn = document.getElementById('confirm-ok-btn');
      const cancelBtn = document.getElementById('confirm-cancel-btn');
      const extraEl = document.getElementById('confirm-modal-extra');

      titleEl.textContent = title || 'Are you sure?';
      msgEl.textContent = message || 'This action cannot be undone.';
      okBtn.textContent = confirmLabel;
      okBtn.className = danger ? 'btn btn-danger' : 'btn btn-primary';

      if (extraHTML) {
        extraEl.innerHTML = extraHTML;
        extraEl.hidden = false;
      } else {
        extraEl.innerHTML = '';
        extraEl.hidden = true;
      }

      function cleanup(result) {
        closeModal(overlay);
        okBtn.removeEventListener('click', onOk);
        cancelBtn.removeEventListener('click', onCancel);
        resolve(result);
      }
      function onOk() { cleanup({ confirmed: true, extraEl }); }
      function onCancel() { cleanup({ confirmed: false, extraEl: null }); }

      okBtn.addEventListener('click', onOk);
      cancelBtn.addEventListener('click', onCancel);
      openModal(overlay, { focusSelector: '#confirm-cancel-btn' });
    });
  }

  global.KanbanModal = {
    open: openModal, close: closeModal, closeAll,
    openPopover, closePopover, closeAllPopovers,
    confirmDialog,
  };
})(window);
