/* ==========================================================================
   ShortLink — application logic
   Vanilla JS, no frameworks, no build step.

   How "shortening" works in this demo
   ------------------------------------
   This is a front-end-only project with no server, so there is no live
   "short.ly" redirect service behind the generated links. Instead:
     - Each link gets a short, unique code (random, or your custom alias).
     - The code + original URL are saved to this browser's localStorage.
     - The "short URL" is shown as short.ly/<code> for a realistic feel.
     - "Open" and the QR code both resolve to the real destination URL,
       since short.ly isn't a domain this project owns or controls.
   This keeps every interaction genuinely functional rather than faking a
   working public redirect that doesn't exist. See the README for details.
   ========================================================================== */

(function () {
  "use strict";

  /* ---------------------------------------------------------------------
     Constants & state
     --------------------------------------------------------------------- */
  const STORAGE_KEY = "urlShortener_history";
  const DISPLAY_DOMAIN = "short.ly";
  const ALIAS_PATTERN = /^[a-zA-Z0-9-_]+$/;
  const ALIAS_MIN = 3;
  const ALIAS_MAX = 24;

  let historyCache = [];
  let currentResult = null; // { id, code, short, original, createdAt, clicks }
  let lastFocusedBeforeModal = null;

  /* ---------------------------------------------------------------------
     DOM references
     --------------------------------------------------------------------- */
  const $ = (sel) => document.querySelector(sel);

  const form = $("#shortenForm");
  const urlInput = $("#urlInput");
  const urlWrap = urlInput.closest(".input-wrap");
  const urlError = $("#urlError");
  const clearUrlBtn = $("#clearUrl");

  const aliasInput = $("#aliasInput");
  const aliasError = $("#aliasError");

  const shortenBtn = $("#shortenBtn");
  const btnLabel = shortenBtn.querySelector(".btn-label");
  const btnLoading = shortenBtn.querySelector(".btn-loading");

  const resultCard = $("#resultCard");
  const resultShortEl = $("#resultShort");
  const resultOriginalEl = $("#resultOriginal");
  const copyNote = $("#copyNote");
  const copyBtn = $("#copyBtn");
  const openBtn = $("#openBtn");
  const qrBtn = $("#qrBtn");
  const shareBtn = $("#shareBtn");

  const historyList = $("#historyList");
  const emptyState = $("#emptyState");
  const statsRow = $("#statsRow");
  const statCreated = $("#statCreated");
  const statSaved = $("#statSaved");
  const statToday = $("#statToday");
  const searchWrap = $("#searchWrap");
  const historySearch = $("#historySearch");
  const clearHistoryBtn = $("#clearHistoryBtn");

  const qrModal = $("#qrModal");
  const qrModalClose = $("#qrModalClose");
  const qrCloseBtn2 = $("#qrCloseBtn2");
  const qrCanvas = $("#qrCanvas");
  const qrModalUrl = $("#qrModalUrl");
  const qrDownloadBtn = $("#qrDownloadBtn");

  const confirmModal = $("#confirmModal");
  const confirmYes = $("#confirmYes");
  const confirmNo = $("#confirmNo");

  const navToggle = $("#navToggle");
  const mobileNav = $("#mobileNav");

  const liveRegion = $("#liveRegion");

  /* ---------------------------------------------------------------------
     Init
     --------------------------------------------------------------------- */
  function initializeApp() {
    historyCache = loadHistory();
    renderHistory(historyCache);
    updateStatistics(historyCache);
    bindEvents();
  }

  function bindEvents() {
    form.addEventListener("submit", handleShorten);

    urlInput.addEventListener("input", () => {
      clearUrlBtn.hidden = urlInput.value.length === 0;
      if (urlWrap.dataset.state === "error") resetFieldState(urlWrap, urlError);
    });
    clearUrlBtn.addEventListener("click", () => {
      urlInput.value = "";
      clearUrlBtn.hidden = true;
      resetFieldState(urlWrap, urlError);
      urlInput.focus();
    });

    aliasInput.addEventListener("input", () => {
      if (!aliasError.hidden) {
        aliasError.hidden = true;
        aliasInput.setAttribute("aria-invalid", "false");
      }
    });

    copyBtn.addEventListener(
      "click",
      () => currentResult && copyShortURL(currentResult.short),
    );
    openBtn.addEventListener(
      "click",
      () => currentResult && openShortURL(currentResult),
    );
    qrBtn.addEventListener(
      "click",
      () => currentResult && openQrModal(currentResult),
    );
    shareBtn.addEventListener(
      "click",
      () => currentResult && shareURL(currentResult),
    );

    historySearch.addEventListener("input", () =>
      searchHistory(historySearch.value),
    );
    clearHistoryBtn.addEventListener("click", () => openModal(confirmModal));

    qrModalClose.addEventListener("click", () => closeModal(qrModal));
    qrCloseBtn2.addEventListener("click", () => closeModal(qrModal));
    qrDownloadBtn.addEventListener("click", downloadQrCode);

    confirmYes.addEventListener("click", () => {
      clearHistory();
      closeModal(confirmModal);
    });
    confirmNo.addEventListener("click", () => closeModal(confirmModal));

    [qrModal, confirmModal].forEach((overlay) => {
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) closeModal(overlay);
      });
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (!qrModal.hidden) closeModal(qrModal);
        else if (!confirmModal.hidden) closeModal(confirmModal);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        if (
          document.activeElement === urlInput ||
          document.activeElement === aliasInput
        ) {
          form.requestSubmit();
        }
      }
    });

    navToggle.addEventListener("click", () => {
      const isOpen = !mobileNav.hidden;
      mobileNav.hidden = isOpen;
      navToggle.setAttribute("aria-expanded", String(!isOpen));
    });
    mobileNav.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => {
        mobileNav.hidden = true;
        navToggle.setAttribute("aria-expanded", "false");
      }),
    );

    // History list uses delegated events (copy / open / delete)
    historyList.addEventListener("click", handleHistoryListClick);

    // Footer placeholder links: functional in-app notices instead of dead links
    $("#privacyLink").addEventListener("click", (e) => {
      e.preventDefault();
      announce(
        "Everything you create here stays in this browser\u2019s local storage. Nothing is sent to a server.",
      );
    });
    $("#aboutLink").addEventListener("click", (e) => {
      e.preventDefault();
      announce(
        "ShortLink is a front-end demo project built with HTML, CSS, and vanilla JavaScript.",
      );
    });
  }

  /* ---------------------------------------------------------------------
     Validation
     --------------------------------------------------------------------- */
  function validateURL(rawValue) {
    const value = rawValue.trim();
    if (!value) return { valid: false, message: "Enter a URL to shorten." };

    let candidate = value;
    // Be forgiving: if someone forgets the protocol, don't punish them for it.
    if (!/^https?:\/\//i.test(candidate)) {
      candidate = "https://" + candidate;
    }

    try {
      const parsed = new URL(candidate);
      if (!/^https?:$/.test(parsed.protocol)) {
        return { valid: false, message: "Please enter a valid URL." };
      }
      if (!parsed.hostname || !parsed.hostname.includes(".")) {
        return { valid: false, message: "Please enter a valid URL." };
      }
      return { valid: true, url: parsed.href };
    } catch (err) {
      return { valid: false, message: "Please enter a valid URL." };
    }
  }

  function validateAlias(alias, existingHistory) {
    if (!alias) return { valid: true, alias: "" };

    if (alias.length < ALIAS_MIN || alias.length > ALIAS_MAX) {
      return {
        valid: false,
        message: `Alias must be ${ALIAS_MIN}\u2013${ALIAS_MAX} characters.`,
      };
    }
    if (!ALIAS_PATTERN.test(alias)) {
      return {
        valid: false,
        message: "Use only letters, numbers, hyphens, and underscores.",
      };
    }
    const taken = existingHistory.some(
      (item) => item.code.toLowerCase() === alias.toLowerCase(),
    );
    if (taken) {
      return {
        valid: false,
        message: "That alias is already in use. Try another.",
      };
    }
    return { valid: true, alias };
  }

  /* ---------------------------------------------------------------------
     Core shorten flow
     --------------------------------------------------------------------- */
  async function handleShorten(e) {
    e.preventDefault();

    resetFieldState(urlWrap, urlError);
    aliasError.hidden = true;

    const urlResult = validateURL(urlInput.value);
    if (!urlResult.valid) {
      showError(urlWrap, urlError, urlResult.message);
      urlInput.focus();
      return;
    }

    const aliasRaw = aliasInput.value.trim();
    const aliasResult = validateAlias(aliasRaw, historyCache);
    if (!aliasResult.valid) {
      aliasError.textContent = aliasResult.message;
      aliasError.hidden = false;
      aliasInput.setAttribute("aria-invalid", "true");
      aliasInput.focus();
      return;
    }

    showLoading(true);
    try {
      const record = await shortenURL(urlResult.url, aliasResult.alias);
      saveToHistory(record);
      displayResult(record);
      showSuccess(urlWrap);
      form.reset();
      clearUrlBtn.hidden = true;
      announce("Short link created: " + record.short);
    } catch (err) {
      showError(
        urlWrap,
        urlError,
        err.message || "Unable to shorten that URL. Please try again.",
      );
    } finally {
      showLoading(false);
    }
  }

  function generateCode(length = 7) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    let code = "";
    for (let i = 0; i < length; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  /**
   * Creates the short-link record for a validated URL.
   * There is no external shortening API wired in (a real one would need a
   * server-held key, which a static portfolio page can't safely hold — see
   * README > Configuration). Instead this runs a local/demo mode: a unique
   * code is generated and the mapping is saved to localStorage.
   */
  function shortenURL(originalUrl, alias) {
    return new Promise((resolve, reject) => {
      // Simulate the brief round-trip a real API call would take, so the
      // loading state is meaningful rather than instantaneous.
      setTimeout(() => {
        try {
          let code = alias;
          if (!code) {
            let attempts = 0;
            do {
              code = generateCode();
              attempts++;
            } while (
              historyCache.some(
                (h) => h.code.toLowerCase() === code.toLowerCase(),
              ) &&
              attempts < 100
            );

            if (
              attempts >= 100 &&
              historyCache.some(
                (h) => h.code.toLowerCase() === code.toLowerCase(),
              )
            ) {
              throw new Error(
                "Unable to generate a unique short code. Please try again.",
              );
            }
          }

          const record = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            code,
            short: `${DISPLAY_DOMAIN}/${code}`,
            original: originalUrl,
            isCustomAlias: Boolean(alias),
            createdAt: new Date().toISOString(),
            clicks: 0,
          };
          resolve(record);
        } catch (err) {
          reject(new Error("Something went wrong while creating your link."));
        }
      }, 500);
    });
  }

  /* ---------------------------------------------------------------------
     Result display
     --------------------------------------------------------------------- */
  function displayResult(record) {
    currentResult = record;
    resultShortEl.textContent = record.short;
    resultOriginalEl.textContent = record.original;
    copyNote.textContent = "";
    resultCard.hidden = false;
    resultCard.classList.remove("card--result"); // restart animation
    void resultCard.offsetWidth;
    resultCard.classList.add("card--result");
    resultCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  async function copyShortURL(shortUrl) {
    const displayText = String(shortUrl);
    try {
      if (
        !navigator.clipboard ||
        typeof navigator.clipboard.writeText !== "function"
      ) {
        throw new Error("Clipboard API unavailable");
      }
      await navigator.clipboard.writeText(displayText);
      flashCopyNote("Copied!");
    } catch (err) {
      try {
        const temp = document.createElement("textarea");
        temp.value = displayText;
        temp.style.position = "fixed";
        temp.style.opacity = "0";
        document.body.appendChild(temp);
        temp.select();
        const copied = document.execCommand("copy");
        document.body.removeChild(temp);
        flashCopyNote(
          copied
            ? "Copied!"
            : "Unable to copy automatically. Please copy the link manually.",
        );
      } catch (fallbackErr) {
        flashCopyNote(
          "Unable to copy automatically. Please copy the link manually.",
        );
      }
    }
  }

  function flashCopyNote(message) {
    copyNote.textContent = message;
    window.clearTimeout(flashCopyNote._t);
    flashCopyNote._t = window.setTimeout(() => {
      copyNote.textContent = "";
    }, 2400);
  }

  function openShortURL(record) {
    // short.ly is a display-only domain for this demo (see file header);
    // opening a link takes you to its real destination.
    const storedRecord = findHistoryRecord(record);
    if (!storedRecord) {
      announce("That link is no longer available in your history.");
      return;
    }

    const updatedRecord = {
      ...storedRecord,
      clicks: Number.isFinite(storedRecord.clicks)
        ? storedRecord.clicks + 1
        : 1,
    };
    historyCache = historyCache.map((item) =>
      item.id === updatedRecord.id ? updatedRecord : item,
    );
    const countSaved = persistHistory(historyCache);
    if (!countSaved) {
      historyCache = historyCache.map((item) =>
        item.id === updatedRecord.id ? storedRecord : item,
      );
      announce("The link opened, but its click count could not be saved.");
    }
    currentResult = countSaved ? updatedRecord : storedRecord;
    renderHistory(
      historySearch.value
        ? getFilteredHistory(historySearch.value)
        : historyCache,
    );
    updateStatistics(historyCache);
    window.open(updatedRecord.original, "_blank", "noopener,noreferrer");
  }

  async function shareURL(record) {
    const fullText = `https://${record.short}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "ShortLink", url: fullText });
      } catch (err) {
        /* user cancelled share — no action needed */
      }
    } else {
      await copyShortURL(record.short);
      flashCopyNote("Sharing isn\u2019t supported here — link copied instead.");
    }
  }

  /* ---------------------------------------------------------------------
     QR code
     --------------------------------------------------------------------- */
  function generateQRCode(canvas, text) {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const qr = qrcode(0, "M"); // type 0 = auto-detect smallest size
    qr.addData(text);
    qr.make();

    const count = qr.getModuleCount();
    const size = canvas.width;
    const tile = size / count;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "#12263A";
    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        if (qr.isDark(row, col)) {
          ctx.fillRect(
            Math.round(col * tile),
            Math.round(row * tile),
            Math.ceil(tile),
            Math.ceil(tile),
          );
        }
      }
    }
  }

  function openQrModal(record) {
    const storedRecord = findHistoryRecord(record);
    if (!storedRecord) {
      announce("That link is no longer available in your history.");
      return;
    }

    try {
      generateQRCode(qrCanvas, storedRecord.original);
      qrModalUrl.textContent = storedRecord.original;
      currentResult = storedRecord;
      openModal(qrModal);
    } catch (err) {
      announce("Unable to generate a QR code for this link.");
    }
  }

  function downloadQrCode() {
    try {
      const link = document.createElement("a");
      link.download = `${currentResult ? currentResult.code : "shortlink"}-qr.png`;
      link.href = qrCanvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      announce("Unable to download the QR code.");
    }
  }

  /* ---------------------------------------------------------------------
     History / localStorage
     --------------------------------------------------------------------- */
  function loadHistory() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      // Guard against corrupted/partial records so a bad entry can't break the app.
      return parsed
        .filter(
          (item) =>
            item &&
            typeof item.code === "string" &&
            typeof item.original === "string",
        )
        .map((item) => ({
          ...item,
          id:
            typeof item.id === "string" && item.id ? item.id : createRecordId(),
          short:
            typeof item.short === "string" && item.short
              ? item.short
              : `${DISPLAY_DOMAIN}/${item.code}`,
          createdAt:
            typeof item.createdAt === "string" &&
            !Number.isNaN(Date.parse(item.createdAt))
              ? item.createdAt
              : new Date().toISOString(),
          clicks:
            Number.isFinite(item.clicks) && item.clicks >= 0 ? item.clicks : 0,
        }));
    } catch (err) {
      console.warn("Could not read link history from localStorage:", err);
      return [];
    }
  }

  function persistHistory(items) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      return true;
    } catch (err) {
      console.warn("Could not save link history to localStorage:", err);
      announce("Link history could not be saved on this device.");
      return false;
    }
  }

  function saveToHistory(record) {
    const previousHistory = historyCache;
    historyCache = [record, ...historyCache];
    if (!persistHistory(historyCache)) {
      historyCache = previousHistory;
      throw new Error(
        "The link was created, but could not be saved on this device.",
      );
    }
    renderHistory(historyCache);
    updateStatistics(historyCache);
  }

  function renderHistory(items) {
    historyList.innerHTML = "";
    const hasAny = historyCache.length > 0;

    searchWrap.hidden = historyCache.length < 2;
    clearHistoryBtn.hidden = !hasAny;
    statsRow.hidden = !hasAny;

    emptyState.querySelector(".empty-title").textContent = "No links yet";
    emptyState.querySelector(".empty-sub").textContent =
      "Create your first short link and it will appear here.";

    if (!hasAny) {
      emptyState.hidden = false;
      return;
    }

    if (items.length === 0) {
      emptyState.hidden = false;
      emptyState.querySelector(".empty-title").textContent = "No matches";
      emptyState.querySelector(".empty-sub").textContent =
        "Try a different search term.";
      return;
    }

    emptyState.hidden = true;

    const fragment = document.createDocumentFragment();
    items.forEach((item) => fragment.appendChild(buildHistoryItem(item)));
    historyList.appendChild(fragment);
  }

  function buildHistoryItem(item) {
    const li = document.createElement("li");
    li.className = "history-item";
    li.dataset.id = item.id;

    const main = document.createElement("div");
    main.className = "history-main";

    const shortEl = document.createElement("span");
    shortEl.className = "history-short";
    shortEl.textContent = item.short;

    const originalEl = document.createElement("span");
    originalEl.className = "history-original";
    originalEl.textContent = item.original;
    originalEl.title = item.original;

    const metaEl = document.createElement("span");
    metaEl.className = "history-meta";
    metaEl.textContent = formatRelativeDate(item.createdAt);

    main.append(shortEl, originalEl, metaEl);

    const actions = document.createElement("div");
    actions.className = "history-actions";
    actions.innerHTML = `
      <button class="icon-btn" data-action="copy" aria-label="Copy ${escapeAttr(item.short)}">
        <svg width="16" height="16" viewBox="0 0 17 17" fill="none" aria-hidden="true"><rect x="6" y="6" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="1.4"/><path d="M4 11V4.5A1.5 1.5 0 015.5 3H11" stroke="currentColor" stroke-width="1.4"/></svg>
      </button>
      <button class="icon-btn" data-action="open" aria-label="Open ${escapeAttr(item.short)}">
        <svg width="16" height="16" viewBox="0 0 17 17" fill="none" aria-hidden="true"><path d="M7 3.5H3.5v10h10V10" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M9 3.5h4v4M13 3.5L7.5 9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <button class="icon-btn icon-btn--delete" data-action="delete" aria-label="Delete ${escapeAttr(item.short)}">
        <svg width="16" height="16" viewBox="0 0 17 17" fill="none" aria-hidden="true"><path d="M4 5.5h9M7 5.5V4a1 1 0 011-1h1a1 1 0 011 1v1.5M6 5.5V13a1 1 0 001 1h3a1 1 0 001-1V5.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
    `;

    li.append(main, actions);
    return li;
  }

  function handleHistoryListClick(e) {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const li = e.target.closest(".history-item");
    const id = li && li.dataset.id;
    const item = historyCache.find((h) => h.id === id);
    if (!item) return;

    const action = btn.dataset.action;
    if (action === "copy")
      copyShortURL(item.short).then(() => announce("Copied " + item.short));
    if (action === "open") openShortURL(item);
    if (action === "delete") deleteHistoryItem(id);
  }

  function searchHistory(query) {
    const q = query.trim().toLowerCase();
    if (!q) {
      renderHistory(historyCache);
      return;
    }
    renderHistory(getFilteredHistory(q));
  }

  function deleteHistoryItem(id) {
    if (!historyCache.some((item) => item.id === id)) {
      announce("That link is no longer available in your history.");
      return;
    }
    const previousHistory = historyCache;
    historyCache = historyCache.filter((h) => h.id !== id);
    if (!persistHistory(historyCache)) {
      historyCache = previousHistory;
      renderHistory(
        historySearch.value
          ? getFilteredHistory(historySearch.value)
          : historyCache,
      );
      announce("Unable to save the updated link history.");
      return;
    }
    if (currentResult && currentResult.id === id) currentResult = null;
    renderHistory(
      historySearch.value
        ? getFilteredHistory(historySearch.value)
        : historyCache,
    );
    updateStatistics(historyCache);
    announce("Link removed from history.");
  }

  function getFilteredHistory(query) {
    const q = String(query).trim().toLowerCase();
    return historyCache.filter(
      (item) =>
        item.short.toLowerCase().includes(q) ||
        item.original.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q),
    );
  }

  function findHistoryRecord(record) {
    if (!record) return null;
    return historyCache.find((item) => item.id === record.id) || null;
  }

  function createRecordId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function clearHistory() {
    const previousHistory = historyCache;
    historyCache = [];
    if (!persistHistory(historyCache)) {
      historyCache = previousHistory;
      announce("Unable to clear link history on this device.");
      return;
    }
    currentResult = null;
    historySearch.value = "";
    renderHistory(historyCache);
    updateStatistics(historyCache);
    announce("Link history cleared.");
  }

  function updateStatistics(items) {
    const today = new Date();
    const isToday = (iso) => {
      const d = new Date(iso);
      return (
        d.getFullYear() === today.getFullYear() &&
        d.getMonth() === today.getMonth() &&
        d.getDate() === today.getDate()
      );
    };
    statCreated.textContent = String(items.length);
    statSaved.textContent = String(items.length);
    statToday.textContent = String(
      items.filter((i) => isToday(i.createdAt)).length,
    );
  }

  /* ---------------------------------------------------------------------
     Field state helpers (loading / error / success)
     --------------------------------------------------------------------- */
  function showLoading(isLoading) {
    shortenBtn.disabled = isLoading;
    btnLabel.hidden = isLoading;
    btnLoading.hidden = !isLoading;
    shortenBtn.setAttribute("aria-busy", String(isLoading));
  }

  function showError(wrap, errorEl, message) {
    wrap.dataset.state = "error";
    errorEl.textContent = message;
    errorEl.hidden = false;
    wrap.setAttribute("aria-invalid", "true");
  }

  function showSuccess(wrap) {
    wrap.dataset.state = "valid";
    window.setTimeout(() => resetFieldState(wrap), 1800);
  }

  function resetFieldState(wrap, errorEl) {
    wrap.dataset.state = "default";
    wrap.removeAttribute("aria-invalid");
    if (errorEl) errorEl.hidden = true;
  }

  /* ---------------------------------------------------------------------
     Modal helpers
     --------------------------------------------------------------------- */
  function openModal(overlay) {
    lastFocusedBeforeModal = document.activeElement;
    overlay.hidden = false;
    const focusTarget = overlay.querySelector("button, input, [tabindex]");
    focusTarget && focusTarget.focus();
    document.body.style.overflow = "hidden";
  }

  function closeModal(overlay) {
    overlay.hidden = true;
    document.body.style.overflow = "";
    if (lastFocusedBeforeModal) lastFocusedBeforeModal.focus();
  }

  /* ---------------------------------------------------------------------
     Utilities
     --------------------------------------------------------------------- */
  function formatRelativeDate(iso) {
    const date = new Date(iso);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const time = date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
    if (isToday) return `Today, ${time}`;
    if (isYesterday) return `Yesterday, ${time}`;
    return (
      date.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
      `, ${time}`
    );
  }

  function escapeAttr(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function announce(message) {
    liveRegion.textContent = "";
    window.setTimeout(() => {
      liveRegion.textContent = message;
    }, 30);
  }

  /* ---------------------------------------------------------------------
     Boot
     --------------------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", initializeApp);
})();
