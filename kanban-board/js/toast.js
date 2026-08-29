/* ==========================================================================
   toast.js — toast notifications
   ========================================================================== */
(function (global) {
  'use strict';

  let container = null;

  function ensureContainer() {
    if (!container) container = document.getElementById('toast-container');
    return container;
  }

  function icon(type) {
    if (type === 'error') return '⚠';
    if (type === 'warning') return '!';
    return '✓';
  }

  function show(message, type = 'success', duration = 3200) {
    const c = ensureContainer();
    if (!c) return;
    const el = document.createElement('div');
    el.className = `toast${type === 'error' ? ' toast-error' : ''}${type === 'warning' ? ' toast-warning' : ''}`;
    el.setAttribute('role', 'status');
    el.innerHTML = `<span aria-hidden="true">${icon(type)}</span><span>${KanbanUtils.escapeHTML(message)}</span>`;
    c.appendChild(el);

    const remove = () => {
      el.classList.add('leaving');
      setTimeout(() => el.remove(), 180);
    };
    const timer = setTimeout(remove, duration);
    el.addEventListener('click', () => { clearTimeout(timer); remove(); });
  }

  global.KanbanToast = {
    show,
    success: (msg) => show(msg, 'success'),
    error: (msg) => show(msg, 'error', 4200),
    warning: (msg) => show(msg, 'warning'),
  };
})(window);
