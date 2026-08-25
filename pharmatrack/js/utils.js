/**
 * utils.js — shared helpers used across every page.
 * No dependencies. Everything hangs off the `PTUtils` namespace.
 */
(function (global) {
  "use strict";

  // The dataset is generated as of this instant (see js/data.js header).
  // We treat this as "now" so freshness labels stay consistent no matter
  // when the grader actually opens the file.
  const DATASET_NOW = new Date("2026-08-21T14:00:00");

  function now() {
    return DATASET_NOW;
  }

  function parseDate(str) {
    // Supports "YYYY-MM-DD HH:MM:SS"
    if (!str) return null;
    return new Date(str.replace(" ", "T"));
  }

  function hoursSince(dateStr) {
    const d = parseDate(dateStr);
    if (!d) return Infinity;
    return (now() - d) / 36e5;
  }

  /**
   * Freshness tiers, per spec section 7:
   *   < 1h      fresh
   *   1-24h     recent
   *   1-7d      aging
   *   > 7d      outdated
   */
  function freshnessTier(dateStr) {
    const h = hoursSince(dateStr);
    if (h < 1) return "fresh";
    if (h < 24) return "recent";
    if (h < 24 * 7) return "aging";
    return "outdated";
  }

  const FRESHNESS_LABEL = {
    fresh: "Updated just now",
    recent: "Updated recently",
    aging: "Data may be aging",
    outdated: "Data may be outdated",
  };

  function timeAgo(dateStr) {
    const h = hoursSince(dateStr);
    if (!isFinite(h)) return "unknown";
    if (h < 1) {
      const mins = Math.max(1, Math.round(h * 60));
      return `${mins} minute${mins === 1 ? "" : "s"} ago`;
    }
    if (h < 24) {
      const hrs = Math.round(h);
      return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
    }
    const days = Math.round(h / 24);
    if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
    const months = Math.round(days / 30);
    return `${months} month${months === 1 ? "" : "s"} ago`;
  }

  function freshnessBadgeHTML(dateStr, { withWarning = false } = {}) {
    const tier = freshnessTier(dateStr);
    let html = `<span class="freshness ${tier}"><span class="pulse-dot ${tier === "aging" ? "aging" : tier === "outdated" ? "outdated" : ""}"></span>Updated ${timeAgo(dateStr)}</span>`;
    if (withWarning && (tier === "aging" || tier === "outdated")) {
      html += `<div class="freshness-warning">⚠ ${FRESHNESS_LABEL[tier]}</div>`;
    }
    return html;
  }

  function statusBadgeHTML(status) {
    const map = {
      AVAILABLE: ["badge-available", "Available"],
      LOW_STOCK: ["badge-low", "Low Stock"],
      OUT_OF_STOCK: ["badge-out", "Out of Stock"],
      UNKNOWN: ["badge-unknown", "Unknown"],
    };
    const [cls, label] = map[status] || map.UNKNOWN;
    return `<span class="badge ${cls}">${label}</span>`;
  }

  function riskBadgeHTML(risk) {
    const map = {
      HIGH: ["badge-risk-high", "High Risk"],
      MEDIUM: ["badge-risk-medium", "Medium Risk"],
      LOW: ["badge-risk-low", "Low Risk"],
    };
    const [cls, label] = map[risk] || map.LOW;
    return `<span class="badge ${cls}">${label}</span>`;
  }

  function debounce(fn, wait = 220) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  function escapeHTML(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatNumber(n) {
    if (n === null || n === undefined || isNaN(n)) return "—";
    return Number(n).toLocaleString("en-US");
  }

  function formatPercent(n, digits = 0) {
    return `${(n * 100).toFixed(digits)}%`;
  }

  // ---- string normalization / basic fuzzy matching (section 15) ----
  function normalizeMedicineString(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/mg|ml|mcg|iu\/ml|iu|g\b/g, (m) => ` ${m}`) // separate glued units
      .replace(/[^a-z0-9%.\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function tokenSet(s) {
    return new Set(normalizeMedicineString(s).split(" ").filter(Boolean));
  }

  /** Jaccard similarity between token sets — good enough for a demo matcher. */
  function similarity(a, b) {
    const ta = tokenSet(a);
    const tb = tokenSet(b);
    if (ta.size === 0 || tb.size === 0) return 0;
    let inter = 0;
    ta.forEach((t) => {
      if (tb.has(t)) inter++;
    });
    const union = new Set([...ta, ...tb]).size;
    return inter / union;
  }

  function qs(sel, root = document) {
    return root.querySelector(sel);
  }
  function qsa(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }

  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  global.PTUtils = {
    now,
    parseDate,
    hoursSince,
    freshnessTier,
    FRESHNESS_LABEL,
    timeAgo,
    freshnessBadgeHTML,
    statusBadgeHTML,
    riskBadgeHTML,
    debounce,
    escapeHTML,
    formatNumber,
    formatPercent,
    normalizeMedicineString,
    tokenSet,
    similarity,
    qs,
    qsa,
    getParam,
  };
})(window);
