/* ==========================================================================
   utils.js — small, dependency-free helper functions
   ========================================================================== */
(function (global) {
  'use strict';

  function uid(prefix) {
    const rand = Math.random().toString(36).slice(2, 9);
    const time = Date.now().toString(36);
    return `${prefix || 'id'}-${time}-${rand}`;
  }

  /** Escape a string for safe insertion into HTML text content / attributes. */
  function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function debounce(fn, wait) {
    let t = null;
    return function debounced(...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  function nowISO() {
    return new Date().toISOString();
  }

  /** Parse a YYYY-MM-DD date string as a local date (avoids UTC off-by-one). */
  function parseLocalDate(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.split('-').map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function startOfDay(d) {
    const c = new Date(d);
    c.setHours(0, 0, 0, 0);
    return c;
  }

  function formatDateShort(dateStr) {
    const d = parseLocalDate(dateStr);
    if (!d) return '';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  function formatDateLong(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  /**
   * Determine due-date status: 'none' | 'completed' | 'overdue' | 'today' | 'upcoming'
   */
  function getDueStatus(dueDateStr, isCompleted) {
    if (!dueDateStr) return 'none';
    if (isCompleted) return 'completed';
    const due = startOfDay(parseLocalDate(dueDateStr));
    const today = startOfDay(new Date());
    if (!due) return 'none';
    if (due.getTime() < today.getTime()) return 'overdue';
    if (due.getTime() === today.getTime()) return 'today';
    return 'upcoming';
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function initials(name) {
    if (!name) return '';
    const parts = String(name).trim().split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]).join('').toUpperCase();
  }

  function download(filename, textContent, mime) {
    const blob = new Blob([textContent], { type: mime || 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function isPlainObject(val) {
    return Object.prototype.toString.call(val) === '[object Object]';
  }

  global.KanbanUtils = {
    uid, escapeHTML, debounce, nowISO, parseLocalDate, startOfDay,
    formatDateShort, formatDateLong, getDueStatus, clamp, initials,
    download, isPlainObject,
  };
})(window);
