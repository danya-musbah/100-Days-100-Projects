/**
 * app.js — application shell behavior shared by every page:
 * mobile nav, demo authentication (localStorage-backed, clearly a
 * prototype stand-in for JWT auth — see section 31), and small
 * shared UI helpers (toasts, active-link highlighting).
 */
(function (global) {
  "use strict";
  const U = global.PTUtils;

  const SESSION_KEY = "pharmatrack_demo_session";

  const DEMO_ACCOUNTS = [
    { role: "admin", email: "admin@pharmatrack.demo", password: "admin123", name: "System Admin" },
    { role: "pharmacy", email: "pharmacy@pharmatrack.demo", password: "pharmacy123", name: "Al-Shifa Pharmacy", pharmacyId: "PH0001" },
  ];

  function login(email, password) {
    const acct = DEMO_ACCOUNTS.find(
      (a) => a.email.toLowerCase() === String(email).trim().toLowerCase() && a.password === password
    );
    if (!acct) return { ok: false, error: "Invalid demo email or password." };
    const session = { role: acct.role, email: acct.email, name: acct.name, pharmacyId: acct.pharmacyId || null, at: Date.now() };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return { ok: true, session };
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
  }

  function getSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  /** Redirects to login if the required role isn't active. Call at top of dashboard pages. */
  function requireRole(role, loginPage = "login.html") {
    const s = getSession();
    if (!s || s.role !== role) {
      window.location.href = `${loginPage}?next=${encodeURIComponent(window.location.pathname.split("/").pop())}&role=${role}`;
      return null;
    }
    return s;
  }

  function highlightActiveNav() {
    const page = window.location.pathname.split("/").pop() || "index.html";
    U.qsa("[data-nav-link]").forEach((a) => {
      const href = a.getAttribute("href");
      if (href === page) a.classList.add("active");
    });
  }

  function initMobileNav() {
    const toggle = U.qs(".nav-toggle");
    const panel = U.qs(".mobile-nav-panel");
    if (!toggle || !panel) return;
    toggle.addEventListener("click", () => {
      panel.classList.toggle("open");
      toggle.textContent = panel.classList.contains("open") ? "✕" : "☰";
    });
    U.qsa("a", panel).forEach((a) => a.addEventListener("click", () => panel.classList.remove("open")));
  }

  function paintSessionAwareNav() {
    const session = getSession();
    U.qsa("[data-session-slot]").forEach((el) => {
      if (session) {
        el.innerHTML = `<span class="row gap-8" style="color:#fff;font-size:0.85rem;">
            <span class="avatar" style="width:26px;height:26px;font-size:0.7rem;">${session.name.charAt(0)}</span>
            ${U.escapeHTML(session.name)}
          </span>
          <button class="btn btn--outline btn--sm" id="pt-logout-btn">Log out</button>`;
        const btn = U.qs("#pt-logout-btn", el);
        if (btn) btn.addEventListener("click", () => { logout(); window.location.href = "index.html"; });
      }
    });
  }

  function toast(message, kind = "info") {
    let holder = U.qs("#pt-toast-holder");
    if (!holder) {
      holder = document.createElement("div");
      holder.id = "pt-toast-holder";
      holder.style.cssText = "position:fixed;bottom:20px;right:20px;z-index:400;display:flex;flex-direction:column;gap:8px;";
      document.body.appendChild(holder);
    }
    const el = document.createElement("div");
    el.className = `alert alert-${kind}`;
    el.style.cssText = "box-shadow:var(--shadow-md);min-width:240px;";
    el.textContent = message;
    holder.appendChild(el);
    setTimeout(() => el.remove(), 3600);
  }

  document.addEventListener("DOMContentLoaded", () => {
    highlightActiveNav();
    initMobileNav();
    paintSessionAwareNav();
    const yearEls = U.qsa("[data-year]");
    yearEls.forEach((el) => (el.textContent = new Date().getFullYear()));
  });

  global.PTAuth = { login, logout, getSession, requireRole, DEMO_ACCOUNTS };
  global.PTApp = { toast, highlightActiveNav };
})(window);
