/* ==========================================================================
   Currency Converter — Application Logic
   Vanilla JavaScript. No frameworks, no build step.

   API: open.er-api.com (free tier, no API key required).
   ========================================================================== */

(function () {
  "use strict";

  /* ------------------------------------------------------------------ *
   * 1. Centralized API configuration
   *
   * IMPORTANT — API key security:
   * This app intentionally uses a provider (open.er-api.com) whose public
   * endpoint does not require a secret key, so nothing sensitive lives in
   * this client-side file.
   * ------------------------------------------------------------------ */
  const API_CONFIG = {
    baseURL: "https://open.er-api.com/v6/latest/",
    timeout: 10000, // 10 seconds
  };

  const CACHE_PREFIX = "cc_cache_";
  const STALE_MS = 15 * 60 * 1000; // rates older than this are refetched
  const AUTO_REFRESH_MS = 10 * 60 * 1000; // background auto-refresh interval
  const HISTORY_KEY = "cc_history";
  const HISTORY_LIMIT = 20;
  const THEME_KEY = "cc_theme";

  /* ------------------------------------------------------------------ *
   * 2. Static currency metadata (names & symbols only — NEVER rates)
   * ------------------------------------------------------------------ */
  const CURRENCY_META = {
    USD: { name: "US Dollar", symbol: "$" },
    EUR: { name: "Euro", symbol: "€" },
    GBP: { name: "British Pound", symbol: "£" },
    JPY: { name: "Japanese Yen", symbol: "¥" },
    CAD: { name: "Canadian Dollar", symbol: "CA$" },
    AUD: { name: "Australian Dollar", symbol: "A$" },
    CHF: { name: "Swiss Franc", symbol: "CHF" },
    CNY: { name: "Chinese Yuan", symbol: "¥" },
    HKD: { name: "Hong Kong Dollar", symbol: "HK$" },
    NZD: { name: "New Zealand Dollar", symbol: "NZ$" },
    SEK: { name: "Swedish Krona", symbol: "kr" },
    NOK: { name: "Norwegian Krone", symbol: "kr" },
    DKK: { name: "Danish Krone", symbol: "kr" },
    SGD: { name: "Singapore Dollar", symbol: "S$" },
    AED: { name: "UAE Dirham", symbol: "د.إ" },
    SAR: { name: "Saudi Riyal", symbol: "﷼" },
    QAR: { name: "Qatari Riyal", symbol: "﷼" },
    KWD: { name: "Kuwaiti Dinar", symbol: "د.ك" },
    BHD: { name: "Bahraini Dinar", symbol: ".د.ب" },
    EGP: { name: "Egyptian Pound", symbol: "E£" },
    MAD: { name: "Moroccan Dirham", symbol: "د.م." },
    DZD: { name: "Algerian Dinar", symbol: "د.ج" },
    TND: { name: "Tunisian Dinar", symbol: "د.ت" },
    LYD: { name: "Libyan Dinar", symbol: "ل.د" },
    TRY: { name: "Turkish Lira", symbol: "₺" },
    INR: { name: "Indian Rupee", symbol: "₹" },
    KRW: { name: "South Korean Won", symbol: "₩" },
    BRL: { name: "Brazilian Real", symbol: "R$" },
    ZAR: { name: "South African Rand", symbol: "R" },
    MXN: { name: "Mexican Peso", symbol: "MX$" },
    RUB: { name: "Russian Ruble", symbol: "₽" },
    PLN: { name: "Polish Zloty", symbol: "zł" },
    THB: { name: "Thai Baht", symbol: "฿" },
    IDR: { name: "Indonesian Rupiah", symbol: "Rp" },
    MYR: { name: "Malaysian Ringgit", symbol: "RM" },
    PHP: { name: "Philippine Peso", symbol: "₱" },
    VND: { name: "Vietnamese Dong", symbol: "₫" },
    PKR: { name: "Pakistani Rupee", symbol: "₨" },
    NGN: { name: "Nigerian Naira", symbol: "₦" },
    ILS: { name: "Israeli New Shekel", symbol: "₪" },
    JOD: { name: "Jordanian Dinar", symbol: "د.ا" },
    LBP: { name: "Lebanese Pound", symbol: "ل.ل" },
    IQD: { name: "Iraqi Dinar", symbol: "ع.د" },
    OMR: { name: "Omani Rial", symbol: "ر.ع." },
    CZK: { name: "Czech Koruna", symbol: "Kč" },
    HUF: { name: "Hungarian Forint", symbol: "Ft" },
    RON: { name: "Romanian Leu", symbol: "lei" },
    UAH: { name: "Ukrainian Hryvnia", symbol: "₴" },
    ARS: { name: "Argentine Peso", symbol: "$" },
    CLP: { name: "Chilean Peso", symbol: "$" },
    COP: { name: "Colombian Peso", symbol: "$" },
    PEN: { name: "Peruvian Sol", symbol: "S/" },
    ISK: { name: "Icelandic Krona", symbol: "kr" },
    KES: { name: "Kenyan Shilling", symbol: "KSh" },
    GHS: { name: "Ghanaian Cedi", symbol: "₵" },
    ETB: { name: "Ethiopian Birr", symbol: "Br" },
    BDT: { name: "Bangladeshi Taka", symbol: "৳" },
    LKR: { name: "Sri Lankan Rupee", symbol: "Rs" },
    TWD: { name: "New Taiwan Dollar", symbol: "NT$" },
    XAU: { name: "Gold (troy ounce)", symbol: "XAU" },
  };

  const CURRENCY_FLAGS = {
    USD: "🇺🇸", EUR: "🇪🇺", GBP: "🇬🇧", JPY: "🇯🇵", CAD: "🇨🇦", AUD: "🇦🇺",
    CHF: "🇨🇭", CNY: "🇨🇳", HKD: "🇭🇰", NZD: "🇳🇿", SEK: "🇸🇪", NOK: "🇳🇴",
    DKK: "🇩🇰", SGD: "🇸🇬", AED: "🇦🇪", SAR: "🇸🇦", QAR: "🇶🇦", KWD: "🇰🇼",
    BHD: "🇧🇭", EGP: "🇪🇬", MAD: "🇲🇦", DZD: "🇩🇿", TND: "🇹🇳", LYD: "🇱🇾",
    TRY: "🇹🇷", INR: "🇮🇳", KRW: "🇰🇷", BRL: "🇧🇷", ZAR: "🇿🇦", MXN: "🇲🇽",
    RUB: "🇷🇺", PLN: "🇵🇱", THB: "🇹🇭", IDR: "🇮🇩", MYR: "🇲🇾", PHP: "🇵🇭",
    VND: "🇻🇳", PKR: "🇵🇰", NGN: "🇳🇬", ILS: "🇮🇱", JOD: "🇯🇴", LBP: "🇱🇧",
    IQD: "🇮🇶", OMR: "🇴🇲", CZK: "🇨🇿", HUF: "🇭🇺", RON: "🇷🇴", UAH: "🇺🇦",
    ARS: "🇦🇷", CLP: "🇨🇱", COP: "🇨🇴", PEN: "🇵🇪", ISK: "🇮🇸", KES: "🇰🇪",
    GHS: "🇬🇭", ETB: "🇪🇹", BDT: "🇧🇩", LKR: "🇱🇰", TWD: "🇹🇼",
  };

  const POPULAR_PAIRS = [
    ["USD", "EUR"], ["EUR", "USD"], ["GBP", "USD"],
    ["USD", "JPY"], ["USD", "CAD"], ["USD", "LYD"],
  ];

  /* ------------------------------------------------------------------ *
   * 3. Application state
   * ------------------------------------------------------------------ */
  const state = {
    amount: 100,
    fromCurrency: "USD",
    toCurrency: "EUR",
    exchangeRate: null,
    convertedAmount: null,
    lastUpdated: null, // string supplied by the API
    isLoading: false,
    history: [],
    ratesBase: null,
    rates: {},
    availableCurrencies: [], // array of currency codes
    isStale: false,
    activeRequestId: 0,
  };

  /* ------------------------------------------------------------------ *
   * 4. DOM references
   * ------------------------------------------------------------------ */
  const dom = {
    form: document.getElementById("converterForm"),
    amountInput: document.getElementById("amountInput"),
    amountError: document.getElementById("amountError"),
    quickAmounts: document.getElementById("quickAmounts"),
    fromSelect: document.getElementById("fromSelect"),
    toSelect: document.getElementById("toSelect"),
    swapBtn: document.getElementById("swapBtn"),
    convertBtn: document.getElementById("convertBtn"),
    convertBtnText: document.getElementById("convertBtnText"),
    resultEmpty: document.getElementById("resultEmpty"),
    resultBox: document.getElementById("resultBox"),
    resultFrom: document.getElementById("resultFrom"),
    resultTo: document.getElementById("resultTo"),
    resultFormatted: document.getElementById("resultFormatted"),
    rateCard: document.getElementById("rateCard"),
    rateLineForward: document.getElementById("rateLineForward"),
    rateLineReverse: document.getElementById("rateLineReverse"),
    rateUpdated: document.getElementById("rateUpdated"),
    rateCachedNote: document.getElementById("rateCachedNote"),
    refreshBtn: document.getElementById("refreshBtn"),
    refreshBtnText: document.getElementById("refreshBtnText"),
    globalError: document.getElementById("globalError"),
    globalErrorTitle: document.getElementById("globalErrorTitle"),
    globalErrorMessage: document.getElementById("globalErrorMessage"),
    retryBtn: document.getElementById("retryBtn"),
    toastRegion: document.getElementById("toastRegion"),
    pairsList: document.getElementById("pairsList"),
    historyList: document.getElementById("historyList"),
    historyEmpty: document.getElementById("historyEmpty"),
    clearHistoryBtn: document.getElementById("clearHistoryBtn"),
    clearHistoryDialog: document.getElementById("clearHistoryDialog"),
    cancelClearBtn: document.getElementById("cancelClearBtn"),
    confirmClearBtn: document.getElementById("confirmClearBtn"),
    currencyInfoSection: document.getElementById("currencyInfoSection"),
    currencyInfoGrid: document.getElementById("currencyInfoGrid"),
    currencyCountPill: document.getElementById("currencyCountPill"),
    themeToggle: document.getElementById("themeToggle"),
  };

  let lastFailedAction = null; // function to re-run on Retry

  /* ------------------------------------------------------------------ *
   * 5. Utilities
   * ------------------------------------------------------------------ */
  function debounce(fn, delay) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  function currencyMeta(code) {
    return CURRENCY_META[code] || { name: code, symbol: code };
  }

  function currencyFlag(code) {
    return CURRENCY_FLAGS[code] || "💱";
  }

  // Format a plain number with sensible, non-misleading precision.
  function formatNumber(value, maxDecimals) {
    const decimals = typeof maxDecimals === "number" ? maxDecimals : 2;
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: Math.min(2, decimals),
      maximumFractionDigits: decimals,
    }).format(value);
  }

  // Format using Intl.NumberFormat as a currency where possible.
  function formatCurrency(value, code) {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: code,
        currencyDisplay: "narrowSymbol",
      }).format(value);
    } catch (e) {
      // Intl may not recognize some codes (e.g. metals) — fall back.
      return `${currencyMeta(code).symbol} ${formatNumber(value)}`;
    }
  }

  function rateDecimals(rate) {
    if (rate >= 100) return 2;
    if (rate >= 1) return 4;
    return 6;
  }

  // Validate a raw amount string. Returns { valid, value, message }.
  function validateAmount(raw) {
    if (raw === null || raw === undefined || String(raw).trim() === "") {
      return { valid: false, message: "Please enter an amount." };
    }
    const cleaned = String(raw).trim().replace(/,/g, "");
    if (!/^\d*\.?\d*$/.test(cleaned) || cleaned === "." ) {
      return { valid: false, message: "Please enter a valid number." };
    }
    const value = Number(cleaned);
    if (!Number.isFinite(value) || Number.isNaN(value)) {
      return { valid: false, message: "Please enter a valid number." };
    }
    if (value <= 0) {
      return { valid: false, message: "Amount must be greater than zero." };
    }
    if (value > 1e12) {
      return { valid: false, message: "Amount is too large to convert." };
    }
    return { valid: true, value };
  }

  function showFieldError(el, message) {
    el.textContent = message || "";
  }

  function showToast(message, type) {
    const el = document.createElement("div");
    el.className = "toast" + (type ? ` toast-${type}` : "");
    el.setAttribute("role", "status");
    el.textContent = message;
    dom.toastRegion.appendChild(el);
    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transition = "opacity 0.25s ease";
      setTimeout(() => el.remove(), 260);
    }, 2600);
  }

  function showGlobalError(title, message, retryFn) {
    dom.globalErrorTitle.textContent = title;
    dom.globalErrorMessage.textContent = message;
    dom.globalError.hidden = false;
    lastFailedAction = retryFn || null;
    dom.retryBtn.hidden = !retryFn;
  }

  function clearGlobalError() {
    dom.globalError.hidden = true;
    lastFailedAction = null;
  }

  function setLoading(isLoading, label) {
    state.isLoading = isLoading;
    dom.convertBtn.disabled = isLoading;
    dom.refreshBtn.disabled = isLoading;
    if (isLoading) {
      dom.convertBtnText.innerHTML = "";
      const spinner = document.createElement("span");
      spinner.className = "spinner";
      spinner.setAttribute("aria-hidden", "true");
      dom.convertBtnText.appendChild(spinner);
      dom.convertBtnText.appendChild(document.createTextNode(" " + (label || "Converting…")));
    } else {
      dom.convertBtnText.textContent = "Convert Currency";
    }
  }

  function setRefreshLoading(isLoading) {
    dom.refreshBtn.disabled = isLoading;
    dom.convertBtn.disabled = isLoading;
    dom.refreshBtnText.textContent = isLoading ? "Updating rates…" : "Refresh Rates";
  }

  /* ------------------------------------------------------------------ *
   * 6. Caching (localStorage) — rates are never treated as permanently
   *    fresh; every read carries its own fetch timestamp.
   * ------------------------------------------------------------------ */
  function getCachedRates(base) {
    try {
      const raw = localStorage.getItem(CACHE_PREFIX + base);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.rates || !parsed.fetchedAt) return null;
      return parsed;
    } catch (e) {
      return null;
    }
  }

  function setCachedRates(base, payload) {
    try {
      localStorage.setItem(CACHE_PREFIX + base, JSON.stringify(payload));
    } catch (e) {
      // localStorage may be unavailable (private browsing, quota) — non-fatal.
    }
  }

  function isFresh(fetchedAt) {
    return Date.now() - fetchedAt < STALE_MS;
  }

  /* ------------------------------------------------------------------ *
   * 7. API integration
   * ------------------------------------------------------------------ */
  function fetchWithTimeout(url, timeout) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    return fetch(url, { signal: controller.signal })
      .finally(() => clearTimeout(timer));
  }

  // Fetches exchange rate data for a base currency. Resolves to:
  // { rates, base, lastUpdated, fromCache, fetchedAt }
  // Rejects with an Error carrying a `.kind` for categorized handling.
  async function fetchExchangeRates(base, options) {
    options = options || {};
    const cached = getCachedRates(base);

    if (!options.force && cached && isFresh(cached.fetchedAt)) {
      return {
        rates: cached.rates,
        base,
        lastUpdated: cached.lastUpdated,
        fromCache: true,
        stale: false,
        fetchedAt: cached.fetchedAt,
      };
    }

    let response;
    try {
      response = await fetchWithTimeout(API_CONFIG.baseURL + encodeURIComponent(base), API_CONFIG.timeout);
    } catch (err) {
      if (cached) {
        return {
          rates: cached.rates,
          base,
          lastUpdated: cached.lastUpdated,
          fromCache: true,
          stale: true,
          fetchedAt: cached.fetchedAt,
        };
      }
      const kind = err && err.name === "AbortError" ? "timeout" : "network";
      const error = new Error(
        kind === "timeout"
          ? "Request timed out. Please try again."
          : "Unable to retrieve current exchange rates. Please check your internet connection and try again."
      );
      error.kind = kind;
      throw error;
    }

    if (!response.ok) {
      if (cached) {
        return {
          rates: cached.rates,
          base,
          lastUpdated: cached.lastUpdated,
          fromCache: true,
          stale: true,
          fetchedAt: cached.fetchedAt,
        };
      }
      const kind = response.status === 429 ? "rate-limit" : "http";
      const error = new Error(
        kind === "rate-limit"
          ? "Too many requests right now. Please wait a moment and try again."
          : `The exchange rate service returned an error (HTTP ${response.status}).`
      );
      error.kind = kind;
      throw error;
    }

    let data;
    try {
      data = await response.json();
    } catch (e) {
      const error = new Error("The exchange rate service returned an unreadable response.");
      error.kind = "malformed";
      throw error;
    }

    if (!data || data.result !== "success" || !data.rates || typeof data.rates !== "object") {
      if (cached) {
        return {
          rates: cached.rates,
          base,
          lastUpdated: cached.lastUpdated,
          fromCache: true,
          stale: true,
          fetchedAt: cached.fetchedAt,
        };
      }
      const error = new Error("The exchange rate service returned an unexpected response.");
      error.kind = "malformed";
      throw error;
    }

    const fetchedAt = Date.now();
    const payload = { rates: data.rates, lastUpdated: data.time_last_update_utc || null, fetchedAt };
    setCachedRates(base, payload);

    return {
      rates: data.rates,
      base,
      lastUpdated: payload.lastUpdated,
      fromCache: false,
      stale: false,
      fetchedAt,
    };
  }

  function handleAPIError(err, retryFn) {
    console.error("Currency Converter API error:", err && err.kind, err && err.message);
    let title = "Something went wrong.";
    let message = "We couldn't retrieve the exchange rate. Please try again.";
    if (err) {
      if (err.kind === "timeout") {
        title = "Request timed out.";
        message = "Please try again.";
      } else if (err.kind === "network") {
        title = "Unable to retrieve current exchange rates.";
        message = "Please check your internet connection and try again.";
      } else if (err.kind === "rate-limit") {
        title = "Rate limit reached.";
        message = err.message;
      } else if (err.kind === "malformed") {
        title = "Unexpected response.";
        message = "The exchange rate service returned data we couldn't understand.";
      } else if (err.message) {
        message = err.message;
      }
    }
    showGlobalError(title, message, retryFn);
    showToast("Unable to retrieve exchange rates", "error");
  }

  /* ------------------------------------------------------------------ *
   * 8. Currency list loading
   * ------------------------------------------------------------------ */
  async function loadCurrencies() {
    try {
      const result = await fetchExchangeRates("USD");
      const codes = Object.keys(result.rates);
      if (!codes.includes("USD")) codes.push("USD");
      codes.sort();
      state.availableCurrencies = codes;
      state.ratesBase = "USD";
      state.rates = result.rates;
      state.lastUpdated = result.lastUpdated;
      state.isStale = !!result.stale;
      dom.currencyCountPill.textContent = `${codes.length}+ Currencies`;
      return codes;
    } catch (err) {
      // Fall back to a minimal static list so the app remains usable.
      state.availableCurrencies = Object.keys(CURRENCY_META);
      dom.currencyCountPill.textContent = `${state.availableCurrencies.length}+ Currencies`;
      handleAPIError(err, loadCurrencies);
      return state.availableCurrencies;
    }
  }

  /* ------------------------------------------------------------------ *
   * 9. Searchable currency dropdown component
   * ------------------------------------------------------------------ */
  function buildDropdown(container, target, selectedCode, onSelect) {
    container.innerHTML = "";

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "currency-select-trigger";
    trigger.id = target + "SelectTrigger";
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");

    const panel = document.createElement("div");
    panel.className = "currency-dropdown";
    panel.setAttribute("role", "listbox");
    panel.id = target + "SelectDropdown";
    panel.hidden = true;

    const search = document.createElement("input");
    search.type = "text";
    search.className = "currency-search";
    search.placeholder = "Search currency...";
    search.setAttribute("aria-label", "Search currency");

    const list = document.createElement("ul");
    list.className = "currency-list";

    panel.appendChild(search);
    panel.appendChild(list);
    container.appendChild(trigger);
    container.appendChild(panel);

    let activeIndex = -1;

    function renderTrigger(code) {
      trigger.innerHTML = "";
      const flag = document.createElement("span");
      flag.className = "flag";
      flag.textContent = currencyFlag(code);
      flag.setAttribute("aria-hidden", "true");
      const codeEl = document.createElement("span");
      codeEl.className = "code";
      codeEl.textContent = code;
      const nameEl = document.createElement("span");
      nameEl.className = "name";
      nameEl.textContent = currencyMeta(code).name;
      const chevron = document.createElement("span");
      chevron.className = "chevron";
      chevron.setAttribute("aria-hidden", "true");
      chevron.textContent = "▾";
      trigger.appendChild(flag);
      trigger.appendChild(codeEl);
      trigger.appendChild(nameEl);
      trigger.appendChild(chevron);
    }

    function renderList(filter) {
      list.innerHTML = "";
      const term = (filter || "").trim().toLowerCase();
      const codes = state.availableCurrencies.filter((code) => {
        if (!term) return true;
        const meta = currencyMeta(code);
        return code.toLowerCase().includes(term) || meta.name.toLowerCase().includes(term);
      });

      if (codes.length === 0) {
        const empty = document.createElement("li");
        empty.className = "currency-list-empty";
        empty.textContent = "No currencies found.";
        list.appendChild(empty);
        activeIndex = -1;
        return;
      }

      codes.forEach((code, idx) => {
        const li = document.createElement("li");
        li.className = "currency-option";
        li.id = target + "-option-" + code;
        li.setAttribute("role", "option");
        li.setAttribute("data-code", code);
        li.setAttribute("aria-selected", code === container.dataset.value ? "true" : "false");

        const flag = document.createElement("span");
        flag.className = "flag";
        flag.textContent = currencyFlag(code);
        flag.setAttribute("aria-hidden", "true");

        const codeEl = document.createElement("span");
        codeEl.className = "code";
        codeEl.textContent = code;

        const nameEl = document.createElement("span");
        nameEl.className = "name";
        nameEl.textContent = currencyMeta(code).name;

        li.appendChild(flag);
        li.appendChild(codeEl);
        li.appendChild(nameEl);

        li.addEventListener("click", () => {
          choose(code);
        });

        list.appendChild(li);
      });
      activeIndex = -1;
    }

    function choose(code) {
      container.dataset.value = code;
      renderTrigger(code);
      close();
      onSelect(code);
    }

    function open() {
      closeAllDropdowns();
      panel.hidden = false;
      trigger.setAttribute("aria-expanded", "true");
      search.value = "";
      renderList("");
      search.focus();
    }

    function close() {
      panel.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
    }

    trigger.addEventListener("click", () => {
      if (panel.hidden) open(); else close();
    });

    search.addEventListener("input", debounce(() => renderList(search.value), 120));

    search.addEventListener("keydown", (e) => {
      const options = Array.from(list.querySelectorAll(".currency-option"));
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (options.length === 0) return;
        activeIndex = Math.min(activeIndex + 1, options.length - 1);
        options.forEach((o, i) => o.classList.toggle("active", i === activeIndex));
        options[activeIndex].scrollIntoView({ block: "nearest" });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (options.length === 0) return;
        activeIndex = Math.max(activeIndex - 1, 0);
        options.forEach((o, i) => o.classList.toggle("active", i === activeIndex));
        options[activeIndex].scrollIntoView({ block: "nearest" });
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (activeIndex >= 0 && options[activeIndex]) {
          choose(options[activeIndex].getAttribute("data-code"));
        } else if (options.length === 1) {
          choose(options[0].getAttribute("data-code"));
        }
      } else if (e.key === "Escape") {
        close();
        trigger.focus();
      }
    });

    container.dataset.value = selectedCode;
    renderTrigger(selectedCode);

    container._refresh = () => {
      renderTrigger(container.dataset.value);
    };
    container._close = close;

    dropdownRegistry.push(container);
  }

  const dropdownRegistry = [];
  function closeAllDropdowns() {
    dropdownRegistry.forEach((c) => c._close && c._close());
  }

  document.addEventListener("click", (e) => {
    const isInsideDropdown = e.target.closest(".currency-select");
    if (!isInsideDropdown) closeAllDropdowns();
  });

  function initCurrencySelectors() {
    buildDropdown(dom.fromSelect, "from", state.fromCurrency, (code) => {
      state.fromCurrency = code;
      showToast(`From currency set to ${code}`);
      autoConvertIfPossible();
    });
    buildDropdown(dom.toSelect, "to", state.toCurrency, (code) => {
      state.toCurrency = code;
      showToast(`To currency set to ${code}`);
      autoConvertIfPossible();
    });
    renderCurrencyInfo();
  }

  function refreshSelectorDisplays() {
    if (dom.fromSelect._refresh) dom.fromSelect._refresh();
    if (dom.toSelect._refresh) dom.toSelect._refresh();
  }

  /* ------------------------------------------------------------------ *
   * 10. Conversion logic
   * ------------------------------------------------------------------ */
  function autoConvertIfPossible() {
    // Re-run conversion silently if a result is already showing, so
    // switching currencies keeps the display in sync without spamming
    // the API — only fetches when the base currency actually changes.
    if (!dom.resultBox.hidden) {
      convertCurrency();
    }
  }

  async function ensureRatesForBase(base, force) {
    if (!force && state.ratesBase === base && state.rates && Object.keys(state.rates).length) {
      return { rates: state.rates, lastUpdated: state.lastUpdated, stale: state.isStale };
    }
    const result = await fetchExchangeRates(base, { force });
    state.ratesBase = base;
    state.rates = result.rates;
    state.lastUpdated = result.lastUpdated;
    state.isStale = !!result.stale;
    return result;
  }

  async function convertCurrency() {
    clearGlobalError();

    const validation = validateAmount(dom.amountInput.value);
    if (!validation.valid) {
      showFieldError(dom.amountError, validation.message);
      dom.amountInput.classList.add("invalid");
      dom.amountInput.focus();
      return;
    }
    showFieldError(dom.amountError, "");
    dom.amountInput.classList.remove("invalid");
    state.amount = validation.value;

    if (state.isLoading) return; // prevent duplicate requests

    const from = state.fromCurrency;
    const to = state.toCurrency;
    const requestId = ++state.activeRequestId;

    setLoading(true, "Converting…");

    try {
      let rate;
      let lastUpdated;
      let stale = false;

      if (from === to) {
        rate = 1;
        lastUpdated = state.lastUpdated;
      } else {
        const result = await ensureRatesForBase(from);
        if (requestId !== state.activeRequestId) return; // superseded
        if (!(to in result.rates)) {
          throw Object.assign(new Error(`Exchange rate for ${to} is not available right now.`), { kind: "missing-rate" });
        }
        rate = result.rates[to];
        lastUpdated = result.lastUpdated;
        stale = result.stale;
      }

      const convertedAmount = state.amount * rate;
      state.exchangeRate = rate;
      state.convertedAmount = convertedAmount;
      state.lastUpdated = lastUpdated;
      state.isStale = stale;

      updateResult();
      renderPairs();
      saveHistoryEntry({ amount: state.amount, from, to, result: convertedAmount, rate, timestamp: Date.now() });
      showToast("Conversion complete", "success");
    } catch (err) {
      if (requestId !== state.activeRequestId) return;
      if (err && err.kind === "missing-rate") {
        showGlobalError("Unsupported currency pair.", err.message, null);
        showToast("Unable to retrieve exchange rates", "error");
      } else {
        handleAPIError(err, convertCurrency);
      }
    } finally {
      if (requestId === state.activeRequestId) setLoading(false);
    }
  }

  function updateResult() {
    const { amount, fromCurrency, toCurrency, exchangeRate, convertedAmount } = state;
    if (exchangeRate === null || convertedAmount === null) return;

    dom.resultEmpty.hidden = true;
    dom.resultBox.hidden = false;

    dom.resultFrom.textContent = `${formatNumber(amount)} ${fromCurrency}`;
    dom.resultTo.textContent = `${formatNumber(convertedAmount, rateDecimals(convertedAmount) > 2 ? 2 : 2)} ${toCurrency}`;

    let formattedLine = "";
    try {
      formattedLine = `${formatCurrency(amount, fromCurrency)} = ${formatCurrency(convertedAmount, toCurrency)}`;
    } catch (e) {
      formattedLine = "";
    }
    dom.resultFormatted.textContent = formattedLine;

    const forward = exchangeRate;
    const reverse = forward !== 0 ? 1 / forward : 0;

    dom.rateLineForward.textContent = `1 ${fromCurrency} = ${formatNumber(forward, rateDecimals(forward))} ${toCurrency}`;
    dom.rateLineReverse.textContent = `1 ${toCurrency} = ${formatNumber(reverse, rateDecimals(reverse))} ${fromCurrency}`;

    if (state.lastUpdated) {
      dom.rateUpdated.textContent = `Last updated: ${state.lastUpdated}`;
    } else {
      dom.rateUpdated.textContent = "";
    }

    if (state.isStale) {
      dom.rateCachedNote.hidden = false;
      dom.rateCachedNote.textContent = "Using cached rates — live data was unavailable.";
    } else {
      dom.rateCachedNote.hidden = true;
    }

    dom.rateCard.hidden = false;
  }

  async function refreshRates() {
    if (state.isLoading) return;
    clearGlobalError();
    setRefreshLoading(true);
    try {
      const from = state.fromCurrency;
      if (from !== state.toCurrency) {
        const result = await ensureRatesForBase(from, true);
        state.lastUpdated = result.lastUpdated;
        state.isStale = !!result.stale;
      }
      // Recalculate current conversion, if any, with the fresh data.
      if (!dom.resultBox.hidden) {
        await convertCurrency();
      }
      showToast("Rates updated", "success");
    } catch (err) {
      handleAPIError(err, refreshRates);
    } finally {
      setRefreshLoading(false);
    }
  }

  function swapCurrencies() {
    const prevFrom = state.fromCurrency;
    const prevTo = state.toCurrency;
    state.fromCurrency = prevTo;
    state.toCurrency = prevFrom;

    dom.fromSelect.dataset.value = state.fromCurrency;
    dom.toSelect.dataset.value = state.toCurrency;
    refreshSelectorDisplays();

    dom.swapBtn.classList.add("spinning");
    setTimeout(() => dom.swapBtn.classList.remove("spinning"), 200);

    showToast("Currencies swapped");

    if (!dom.resultBox.hidden && state.exchangeRate) {
      // Use the reverse rate immediately for a snappy UI update, then
      // reconcile with a fresh lookup for the new base currency.
      convertCurrency();
    }
  }

  /* ------------------------------------------------------------------ *
   * 11. Popular pairs
   * ------------------------------------------------------------------ */
  function renderPairs() {
    dom.pairsList.innerHTML = "";
    const supported = POPULAR_PAIRS.filter(
      ([a, b]) => state.availableCurrencies.includes(a) && state.availableCurrencies.includes(b)
    );

    if (supported.length === 0) {
      const p = document.createElement("p");
      p.className = "history-empty";
      p.textContent = "No popular pairs available right now.";
      dom.pairsList.appendChild(p);
      return;
    }

    supported.forEach(([a, b]) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pair-btn";
      btn.innerHTML = "";
      const label = document.createElement("span");
      label.textContent = `${currencyFlag(a)} ${a} → ${currencyFlag(b)} ${b}`;
      const arrow = document.createElement("span");
      arrow.className = "arrow";
      arrow.setAttribute("aria-hidden", "true");
      arrow.textContent = "›";
      btn.appendChild(label);
      btn.appendChild(arrow);
      btn.addEventListener("click", () => {
        state.fromCurrency = a;
        state.toCurrency = b;
        dom.fromSelect.dataset.value = a;
        dom.toSelect.dataset.value = b;
        refreshSelectorDisplays();
        convertCurrency();
      });
      dom.pairsList.appendChild(btn);
    });
  }

  /* ------------------------------------------------------------------ *
   * 12. Currency info section
   * ------------------------------------------------------------------ */
  function renderCurrencyInfo() {
    dom.currencyInfoGrid.innerHTML = "";
    const codes = [state.fromCurrency, state.toCurrency];
    codes.forEach((code) => {
      const meta = currencyMeta(code);
      const item = document.createElement("div");
      item.className = "currency-info-item";
      const codeEl = document.createElement("div");
      codeEl.className = "code";
      codeEl.textContent = `${currencyFlag(code)} ${code}`;
      const nameEl = document.createElement("div");
      nameEl.className = "name";
      nameEl.textContent = meta.name;
      item.appendChild(codeEl);
      item.appendChild(nameEl);
      dom.currencyInfoGrid.appendChild(item);
    });
    dom.currencyInfoSection.hidden = false;
  }

  /* ------------------------------------------------------------------ *
   * 13. History
   * ------------------------------------------------------------------ */
  function loadHistory() {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      state.history = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(state.history)) state.history = [];
    } catch (e) {
      state.history = [];
    }
    renderHistory();
  }

  function saveHistoryEntry(entry) {
    state.history.unshift(entry);
    state.history = state.history.slice(0, HISTORY_LIMIT);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(state.history));
    } catch (e) {
      // ignore storage errors (e.g. quota exceeded)
    }
    renderHistory();
    showToast("Conversion saved");
  }

  function clearHistory() {
    state.history = [];
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch (e) {
      /* ignore */
    }
    renderHistory();
    showToast("History cleared");
  }

  function renderHistory() {
    dom.historyList.innerHTML = "";
    if (state.history.length === 0) {
      const li = document.createElement("li");
      li.className = "history-empty";
      li.id = "historyEmpty";
      li.textContent = "No conversions yet. Your recent conversions will appear here.";
      dom.historyList.appendChild(li);
      return;
    }
    state.history.forEach((entry) => {
      const li = document.createElement("li");
      li.className = "history-item";

      const main = document.createElement("div");
      main.className = "history-item-main";
      const left = document.createElement("span");
      left.textContent = `${formatNumber(entry.amount)} ${entry.from} → ${entry.to}`;
      const right = document.createElement("span");
      right.textContent = `${formatNumber(entry.result)} ${entry.to}`;
      main.appendChild(left);
      main.appendChild(right);

      const meta = document.createElement("div");
      meta.className = "history-item-meta";
      const date = new Date(entry.timestamp);
      const dateStr = Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
      meta.textContent = `Rate: 1 ${entry.from} = ${formatNumber(entry.rate, rateDecimals(entry.rate))} ${entry.to} · ${dateStr}`;

      li.appendChild(main);
      li.appendChild(meta);
      dom.historyList.appendChild(li);
    });
  }

  /* ------------------------------------------------------------------ *
   * 14. Theme toggle
   * ------------------------------------------------------------------ */
  function initTheme() {
    let saved = null;
    try {
      saved = localStorage.getItem(THEME_KEY);
    } catch (e) { /* ignore */ }
    const theme = saved === "dark" ? "dark" : "light";
    applyTheme(theme);
  }

  function applyTheme(theme) {
    if (theme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
      dom.themeToggle.setAttribute("aria-pressed", "true");
      dom.themeToggle.querySelector(".theme-icon").textContent = "";
      dom.themeToggle.querySelector(".theme-label").textContent = "Light";
    } else {
      document.documentElement.removeAttribute("data-theme");
      dom.themeToggle.setAttribute("aria-pressed", "false");
      dom.themeToggle.querySelector(".theme-icon").textContent = "";
      dom.themeToggle.querySelector(".theme-label").textContent = "Dark";
    }
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (e) { /* ignore */ }
  }

  function toggleTheme() {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    applyTheme(isDark ? "light" : "dark");
  }

  /* ------------------------------------------------------------------ *
   * 15. Auto-refresh (paused when tab is hidden)
   * ------------------------------------------------------------------ */
  let autoRefreshTimer = null;

  function startAutoRefresh() {
    stopAutoRefresh();
    autoRefreshTimer = setInterval(() => {
      if (!document.hidden) refreshRates();
    }, AUTO_REFRESH_MS);
  }

  function stopAutoRefresh() {
    if (autoRefreshTimer) {
      clearInterval(autoRefreshTimer);
      autoRefreshTimer = null;
    }
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopAutoRefresh();
    } else {
      startAutoRefresh();
    }
  });

  /* ------------------------------------------------------------------ *
   * 16. Event wiring
   * ------------------------------------------------------------------ */
  function wireEvents() {
    dom.form.addEventListener("submit", (e) => {
      e.preventDefault();
      convertCurrency();
    });

    dom.amountInput.addEventListener("input", () => {
      showFieldError(dom.amountError, "");
      dom.amountInput.classList.remove("invalid");
    });

    dom.quickAmounts.addEventListener("click", (e) => {
      const btn = e.target.closest(".chip");
      if (!btn) return;
      dom.amountInput.value = btn.getAttribute("data-amount");
      showFieldError(dom.amountError, "");
      dom.amountInput.classList.remove("invalid");
      dom.amountInput.focus();
    });

    dom.swapBtn.addEventListener("click", swapCurrencies);

    dom.refreshBtn.addEventListener("click", refreshRates);

    dom.retryBtn.addEventListener("click", () => {
      clearGlobalError();
      if (typeof lastFailedAction === "function") lastFailedAction();
    });

    dom.clearHistoryBtn.addEventListener("click", () => {
      dom.clearHistoryDialog.showModal();
    });
    dom.cancelClearBtn.addEventListener("click", () => dom.clearHistoryDialog.close());
    dom.confirmClearBtn.addEventListener("click", () => {
      clearHistory();
      dom.clearHistoryDialog.close();
    });

    dom.themeToggle.addEventListener("click", toggleTheme);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeAllDropdowns();
    });
  }

  /* ------------------------------------------------------------------ *
   * 17. Initialization
   * ------------------------------------------------------------------ */
  async function initializeApp() {
    initTheme();
    wireEvents();
    loadHistory();

    showFieldError(dom.amountError, "");

    await loadCurrencies();
    initCurrencySelectors();
    renderPairs();

    startAutoRefresh();

    // Perform an initial conversion so the app feels alive right away.
    convertCurrency();
  }

  document.addEventListener("DOMContentLoaded", initializeApp);
})();
