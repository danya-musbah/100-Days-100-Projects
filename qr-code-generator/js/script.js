'use strict';

/* ==========================================================================
   QR Code Generator — Application Logic
   Client-side generation only (no data ever leaves the browser).
   ========================================================================== */

/* ---------- Centralized configuration ---------- */
const QR_CONFIG = {
  defaultSize: 512,
  defaultForeground: '#46334F',
  defaultBackground: '#FFFFFF',
  defaultErrorCorrection: 'M',
  defaultMargin: 4,   // quiet-zone width in modules
  minMargin: 2,       // never drop below this — protects scan reliability
  debounceMs: 550,
  generationTimeoutMs: 8000,
  toastDurationMs: 3200,
  historyLimit: 6,
  historyStorageKey: 'qr_generator_recent_history_v1'
};

/* ---------- Small state container (kept intentionally minimal) ---------- */
const appState = {
  currentType: 'text',
  lastPayload: null,
  lastLabel: '',
  generationToken: 0
};

/* ---------- Cached DOM references ---------- */
const dom = {};

function cacheDom() {
  dom.tabs = Array.from(document.querySelectorAll('.type-tab'));
  dom.panels = Array.from(document.querySelectorAll('.type-panel'));
  dom.form = document.getElementById('qr-form');
  dom.formError = document.getElementById('form-error');
  dom.generateBtn = document.getElementById('generate-btn');

  dom.fgColor = document.getElementById('fg-color');
  dom.fgColorText = document.getElementById('fg-color-text');
  dom.bgColor = document.getElementById('bg-color');
  dom.bgColorText = document.getElementById('bg-color-text');
  dom.contrastWarning = document.getElementById('contrast-warning');
  dom.sizeInputs = Array.from(document.querySelectorAll('input[name="qr-size"]'));
  dom.errorCorrection = document.getElementById('error-correction');
  dom.margin = document.getElementById('qr-margin');
  dom.marginValue = document.getElementById('margin-value');

  dom.wifiPassword = document.getElementById('wifi-password');
  dom.toggleWifiPassword = document.getElementById('toggle-wifi-password');

  dom.stateEmpty = document.getElementById('state-empty');
  dom.stateLoading = document.getElementById('state-loading');
  dom.stateError = document.getElementById('state-error');
  dom.stateResult = document.getElementById('state-result');
  dom.errorMessage = document.getElementById('error-message');
  dom.retryBtn = document.getElementById('retry-btn');

  dom.canvas = document.getElementById('qr-canvas');
  dom.qrMeta = document.getElementById('qr-meta');
  dom.downloadBtn = document.getElementById('download-btn');
  dom.copyQrBtn = document.getElementById('copy-qr-btn');
  dom.copyContentBtn = document.getElementById('copy-content-btn');

  dom.historyList = document.getElementById('history-list');
  dom.historyEmpty = document.getElementById('history-empty');
  dom.clearHistoryBtn = document.getElementById('clear-history-btn');

  dom.toastContainer = document.getElementById('toast-container');
}

/* ==========================================================================
   Initialization
   ========================================================================== */
function initializeApp() {
  cacheDom();

  // qrcode-generator library defaults to a Latin-1-ish byte mode;
  // switch to UTF-8 so Arabic / Unicode / emoji content encodes correctly.
  if (typeof qrcode !== 'undefined' && qrcode.stringToBytesFuncs && qrcode.stringToBytesFuncs['UTF-8']) {
    qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
  }

  setupTabs();
  setupColorSync();
  setupMarginDisplay();
  setupWifiPasswordToggle();
  setupLiveGeneration();
  setupActions();
  renderHistory();

  dom.form.addEventListener('submit', (e) => {
    e.preventDefault();
    handleGenerateRequest({ silent: false });
  });

  dom.retryBtn.addEventListener('click', () => handleGenerateRequest({ silent: false }));
}

/* ==========================================================================
   Type selector (accessible tabs)
   ========================================================================== */
function setupTabs() {
  dom.tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => switchQRType(tab.dataset.type));

    tab.addEventListener('keydown', (e) => {
      let newIndex = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') newIndex = (index + 1) % dom.tabs.length;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') newIndex = (index - 1 + dom.tabs.length) % dom.tabs.length;
      if (e.key === 'Home') newIndex = 0;
      if (e.key === 'End') newIndex = dom.tabs.length - 1;
      if (newIndex !== null) {
        e.preventDefault();
        dom.tabs[newIndex].focus();
        switchQRType(dom.tabs[newIndex].dataset.type);
      }
    });
  });
}

function switchQRType(type) {
  appState.currentType = type;

  dom.tabs.forEach((tab) => {
    const active = tab.dataset.type === type;
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
  });

  dom.panels.forEach((panel) => {
    panel.hidden = panel.dataset.type !== type;
  });

  clearFormError();
  updatePreview('empty');
}

/* ==========================================================================
   Color customization + contrast checking
   ========================================================================== */
function setupColorSync() {
  syncColorPair(dom.fgColor, dom.fgColorText);
  syncColorPair(dom.bgColor, dom.bgColorText);

  [dom.fgColor, dom.fgColorText, dom.bgColor, dom.bgColorText].forEach((el) => {
    el.addEventListener('input', () => {
      checkContrast();
      scheduleLiveGeneration();
    });
  });

  checkContrast();
}

function syncColorPair(colorInput, textInput) {
  colorInput.addEventListener('input', () => {
    textInput.value = colorInput.value.toUpperCase();
  });
  textInput.addEventListener('input', () => {
    if (isValidHexColor(textInput.value)) {
      colorInput.value = normalizeHex(textInput.value);
    }
  });
  textInput.addEventListener('blur', () => {
    if (!isValidHexColor(textInput.value)) {
      textInput.value = colorInput.value.toUpperCase();
    }
  });
}

function isValidHexColor(value) {
  return /^#?[0-9A-Fa-f]{6}$/.test(value.trim());
}

function normalizeHex(value) {
  const v = value.trim();
  return v.startsWith('#') ? v : `#${v}`;
}

function hexToRgb(hex) {
  const clean = normalizeHex(hex).replace('#', '');
  return {
    r: parseInt(clean.substring(0, 2), 16),
    g: parseInt(clean.substring(2, 4), 16),
    b: parseInt(clean.substring(4, 6), 16)
  };
}

// WCAG-style relative luminance, used as a practical proxy for QR contrast.
function relativeLuminance({ r, g, b }) {
  const channel = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(hexA, hexB) {
  const lumA = relativeLuminance(hexToRgb(hexA));
  const lumB = relativeLuminance(hexToRgb(hexB));
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

function checkContrast() {
  const fg = isValidHexColor(dom.fgColorText.value) ? normalizeHex(dom.fgColorText.value) : QR_CONFIG.defaultForeground;
  const bg = isValidHexColor(dom.bgColorText.value) ? normalizeHex(dom.bgColorText.value) : QR_CONFIG.defaultBackground;
  const ratio = contrastRatio(fg, bg);

  // QR readers need considerably more contrast than body text does.
  const lowContrast = ratio < 3.5;
  dom.contrastWarning.hidden = !lowContrast;
  return !lowContrast;
}

/* ==========================================================================
   Misc customization wiring
   ========================================================================== */
function setupMarginDisplay() {
  dom.margin.addEventListener('input', () => {
    dom.marginValue.textContent = dom.margin.value;
    scheduleLiveGeneration();
  });
  dom.sizeInputs.forEach((input) => input.addEventListener('change', scheduleLiveGeneration));
  dom.errorCorrection.addEventListener('change', scheduleLiveGeneration);
}

function setupWifiPasswordToggle() {
  dom.toggleWifiPassword.addEventListener('click', () => {
    const showing = dom.wifiPassword.type === 'text';
    dom.wifiPassword.type = showing ? 'password' : 'text';
    dom.toggleWifiPassword.textContent = showing ? 'Show' : 'Hide';
    dom.toggleWifiPassword.setAttribute('aria-pressed', String(!showing));
    dom.toggleWifiPassword.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
  });
}

/* ==========================================================================
   Live (debounced) generation as the user types
   ========================================================================== */
let liveTimer = null;

function setupLiveGeneration() {
  const watchedSelectors = [
    '#panel-text textarea',
    '#panel-url input',
    '#panel-email input, #panel-email textarea',
    '#panel-phone input',
    '#panel-wifi input, #panel-wifi select',
    '#panel-sms input, #panel-sms textarea',
    '#panel-contact input'
  ].join(', ');

  document.querySelectorAll(watchedSelectors).forEach((el) => {
    el.addEventListener('input', scheduleLiveGeneration);
    el.addEventListener('change', scheduleLiveGeneration);
  });
}

function scheduleLiveGeneration() {
  clearTimeout(liveTimer);
  liveTimer = setTimeout(() => {
    // Silent live updates: only generate if there's already meaningful input,
    // and never surface validation errors while the user is still typing.
    const data = collectFormData(appState.currentType);
    const validation = validateInput(appState.currentType, data);
    if (validation.valid) {
      handleGenerateRequest({ silent: true });
    } else if (isEffectivelyEmpty(appState.currentType, data)) {
      updatePreview('empty');
    }
  }, QR_CONFIG.debounceMs);
}

function isEffectivelyEmpty(type, data) {
  return Object.values(data).every((v) => !v || String(v).trim() === '');
}

/* ==========================================================================
   Form data collection
   ========================================================================== */
function collectFormData(type) {
  switch (type) {
    case 'text':
      return { text: document.getElementById('text-content').value };

    case 'url':
      return { url: document.getElementById('url-content').value.trim() };

    case 'email':
      return {
        email: document.getElementById('email-address').value.trim(),
        subject: document.getElementById('email-subject').value,
        message: document.getElementById('email-message').value
      };

    case 'phone':
      return { phone: document.getElementById('phone-number').value.trim() };

    case 'wifi':
      return {
        ssid: document.getElementById('wifi-ssid').value,
        password: document.getElementById('wifi-password').value,
        security: document.getElementById('wifi-security').value
      };

    case 'sms':
      return {
        number: document.getElementById('sms-number').value.trim(),
        message: document.getElementById('sms-message').value
      };

    case 'contact':
      return {
        first: document.getElementById('contact-first').value.trim(),
        last: document.getElementById('contact-last').value.trim(),
        org: document.getElementById('contact-org').value.trim(),
        phone: document.getElementById('contact-phone').value.trim(),
        email: document.getElementById('contact-email').value.trim(),
        website: document.getElementById('contact-website').value.trim()
      };

    default:
      return {};
  }
}

/* ==========================================================================
   Validation
   ========================================================================== */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+]?[\d\s().-]{6,20}$/;

function validateInput(type, data) {
  switch (type) {
    case 'text': {
      if (!data.text || !data.text.trim()) {
        return { valid: false, message: 'Please enter something to generate a QR code.' };
      }
      return { valid: true };
    }

    case 'url': {
      if (!data.url) {
        return { valid: false, message: 'Please enter something to generate a QR code.' };
      }
      const normalized = normalizeUrl(data.url);
      if (!isValidUrl(normalized)) {
        return { valid: false, message: 'Please enter a valid website URL.' };
      }
      return { valid: true };
    }

    case 'email': {
      if (!data.email) {
        return { valid: false, message: 'Please enter something to generate a QR code.' };
      }
      if (!EMAIL_RE.test(data.email)) {
        return { valid: false, message: 'Please enter a valid email address.' };
      }
      return { valid: true };
    }

    case 'phone': {
      if (!data.phone) {
        return { valid: false, message: 'Please enter something to generate a QR code.' };
      }
      if (!PHONE_RE.test(data.phone) || data.phone.replace(/\D/g, '').length < 6) {
        return { valid: false, message: 'Please enter a valid phone number.' };
      }
      return { valid: true };
    }

    case 'wifi': {
      if (!data.ssid || !data.ssid.trim()) {
        return { valid: false, message: 'Please enter a Wi-Fi network name (SSID).' };
      }
      if (data.security !== 'nopass' && (!data.password || !data.password.trim())) {
        return { valid: false, message: 'Please enter the Wi-Fi password, or set security to "None".' };
      }
      return { valid: true };
    }

    case 'sms': {
      if (!data.number) {
        return { valid: false, message: 'Please enter something to generate a QR code.' };
      }
      if (!PHONE_RE.test(data.number) || data.number.replace(/\D/g, '').length < 6) {
        return { valid: false, message: 'Please enter a valid phone number.' };
      }
      return { valid: true };
    }

    case 'contact': {
      if (!data.first && !data.last && !data.org) {
        return { valid: false, message: 'Please enter at least a name or organization.' };
      }
      if (data.email && !EMAIL_RE.test(data.email)) {
        return { valid: false, message: 'Please enter a valid email address.' };
      }
      if (data.phone && (!PHONE_RE.test(data.phone) || data.phone.replace(/\D/g, '').length < 6)) {
        return { valid: false, message: 'Please enter a valid phone number.' };
      }
      return { valid: true };
    }

    default:
      return { valid: false, message: 'Please enter something to generate a QR code.' };
  }
}

function normalizeUrl(rawUrl) {
  const trimmed = rawUrl.trim();
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function isValidUrl(candidate) {
  try {
    const url = new URL(candidate);
    if (!/^https?:$/.test(url.protocol)) return false;
    // Require a plausible host with at least one dot, or "localhost".
    return url.hostname === 'localhost' || /\./.test(url.hostname);
  } catch (err) {
    return false;
  }
}

/* ==========================================================================
   Payload builders
   ========================================================================== */
function buildQRPayload(type, data) {
  switch (type) {
    case 'text':
      return data.text;

    case 'url':
      return normalizeUrl(data.url);

    case 'email': {
      const params = [];
      if (data.subject) params.push(`subject=${encodeURIComponent(data.subject)}`);
      if (data.message) params.push(`body=${encodeURIComponent(data.message)}`);
      const query = params.length ? `?${params.join('&')}` : '';
      return `mailto:${encodeURIComponent(data.email).replace(/%40/gi, '@')}${query}`;
    }

    case 'phone':
      return `tel:${sanitizePhoneForUri(data.phone)}`;

    case 'wifi': {
      const security = data.security === 'nopass' ? 'nopass' : data.security;
      const parts = [
        `WIFI:T:${security}`,
        `S:${escapeWifiValue(data.ssid)}`
      ];
      if (security !== 'nopass') {
        parts.push(`P:${escapeWifiValue(data.password)}`);
      }
      parts.push('H:false');
      return `${parts.join(';')};;`;
    }

    case 'sms': {
      const number = sanitizePhoneForUri(data.number);
      return data.message
        ? `SMSTO:${number}:${data.message}`
        : `SMSTO:${number}:`;
    }

    case 'contact': {
      const lines = ['BEGIN:VCARD', 'VERSION:3.0'];
      const first = escapeVCardValue(data.first);
      const last = escapeVCardValue(data.last);
      lines.push(`N:${last};${first};;;`);
      const fullName = [data.first, data.last].filter(Boolean).join(' ') || data.org || 'Contact';
      lines.push(`FN:${escapeVCardValue(fullName)}`);
      if (data.org) lines.push(`ORG:${escapeVCardValue(data.org)}`);
      if (data.phone) lines.push(`TEL;TYPE=CELL:${sanitizePhoneForUri(data.phone)}`);
      if (data.email) lines.push(`EMAIL:${escapeVCardValue(data.email)}`);
      if (data.website) lines.push(`URL:${escapeVCardValue(normalizeUrl(data.website))}`);
      lines.push('END:VCARD');
      return lines.join('\n');
    }

    default:
      return '';
  }
}

function sanitizePhoneForUri(phone) {
  // Keep a leading + if present, strip everything else non-numeric.
  const trimmed = phone.trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  return hasPlus ? `+${digits}` : digits;
}

// Escapes backslash, semicolon, comma and colon per the Wi-Fi QR spec.
function escapeWifiValue(value) {
  return String(value).replace(/([\\;,:"])/g, '\\$1');
}

function escapeVCardValue(value) {
  return String(value).replace(/([\\;,])/g, '\\$1').replace(/\n/g, '\\n');
}

/* ==========================================================================
   Generation pipeline
   ========================================================================== */
function handleGenerateRequest({ silent }) {
  const type = appState.currentType;
  const data = collectFormData(type);
  const validation = validateInput(type, data);

  if (!validation.valid) {
    if (!silent) {
      showFormError(validation.message);
      showToast('Please enter valid information', 'error');
    }
    return;
  }

  clearFormError();
  const payload = buildQRPayload(type, data);
  const options = getCustomizationOptions();

  generateQRCode(payload, options)
    .then((qrInstance) => {
      renderQRCode(qrInstance, options, { type, payload });
      appState.lastPayload = payload;
      appState.lastLabel = buildHistoryLabel(type, data);
      addHistoryEntry(type, appState.lastLabel);
      if (!silent) showToast('QR code generated', 'success');
    })
    .catch((err) => {
      // Log only the error category, never the user's encoded content.
      console.error('QR generation failed:', err && err.code ? err.code : 'UNKNOWN');
      const message = err && err.code === 'TIMEOUT'
        ? 'The QR service is taking too long to respond.\nPlease try again.'
        : err && err.code === 'CAPACITY'
          ? 'This content is too long to encode. Try shortening it or lowering the error correction level.'
          : 'Unable to generate the QR code right now.\nPlease check your connection and try again.';
      showError(message);
      if (!silent) showToast('QR code generation failed', 'error');
    });
}

function getCustomizationOptions() {
  const sizeInput = dom.sizeInputs.find((r) => r.checked);
  return {
    size: sizeInput ? parseInt(sizeInput.value, 10) : QR_CONFIG.defaultSize,
    foreground: isValidHexColor(dom.fgColorText.value) ? normalizeHex(dom.fgColorText.value) : QR_CONFIG.defaultForeground,
    background: isValidHexColor(dom.bgColorText.value) ? normalizeHex(dom.bgColorText.value) : QR_CONFIG.defaultBackground,
    errorCorrection: dom.errorCorrection.value || QR_CONFIG.defaultErrorCorrection,
    margin: Math.max(parseInt(dom.margin.value, 10) || QR_CONFIG.defaultMargin, QR_CONFIG.minMargin)
  };
}

/**
 * Builds the QR matrix for the given payload. Wrapped in a Promise (with a
 * watchdog timeout) so the UI can show a real loading state and recover
 * gracefully if construction ever takes too long or the payload is too
 * large for the QR format to hold.
 */
function generateQRCode(payload, options) {
  const token = ++appState.generationToken;
  showLoading();

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      if (token !== appState.generationToken) return;
      const err = new Error('QR generation timed out');
      err.code = 'TIMEOUT';
      reject(err);
    }, QR_CONFIG.generationTimeoutMs);

    // Defer to the next tick so the loading state has a chance to paint
    // before any heavy synchronous matrix computation runs.
    setTimeout(() => {
      if (token !== appState.generationToken) {
        clearTimeout(timeoutId);
        return;
      }
      try {
        const qr = qrcode(0, options.errorCorrection);
        qr.addData(payload);
        qr.make();
        clearTimeout(timeoutId);
        resolve(qr);
      } catch (err) {
        clearTimeout(timeoutId);
        // The vendored library throws plain strings in some cases rather
        // than Error objects, so normalize before inspecting the message.
        const rawMessage = typeof err === 'string' ? err : (err && err.message) || '';
        const capacityIssue = /overflow|too long|length over/i.test(rawMessage);
        const wrapped = new Error(rawMessage || 'Unknown QR generation error');
        wrapped.code = capacityIssue ? 'CAPACITY' : 'UNKNOWN';
        reject(wrapped);
      }
    }, 30);
  });
}

/* ==========================================================================
   Rendering
   ========================================================================== */
function renderQRCode(qrInstance, options, meta) {
  const moduleCount = qrInstance.getModuleCount();
  const totalModules = moduleCount + options.margin * 2;
  const cellSize = Math.max(1, Math.floor(options.size / totalModules));
  const canvasSize = cellSize * totalModules;

  const canvas = dom.canvas;
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = options.background;
  ctx.fillRect(0, 0, canvasSize, canvasSize);

  ctx.fillStyle = options.foreground;
  for (let row = 0; row < moduleCount; row += 1) {
    for (let col = 0; col < moduleCount; col += 1) {
      if (qrInstance.isDark(row, col)) {
        const x = (col + options.margin) * cellSize;
        const y = (row + options.margin) * cellSize;
        ctx.fillRect(x, y, cellSize, cellSize);
      }
    }
  }

  dom.qrMeta.textContent = `Type: ${typeLabel(meta.type)} · Size: ${canvasSize} × ${canvasSize}`;
  updatePreview('result');
}

function typeLabel(type) {
  const map = {
    text: 'Text', url: 'URL', email: 'Email', phone: 'Phone',
    wifi: 'Wi-Fi', sms: 'SMS', contact: 'Contact'
  };
  return map[type] || type;
}

/* ==========================================================================
   Preview state machine
   ========================================================================== */
function updatePreview(state) {
  dom.stateEmpty.hidden = state !== 'empty';
  dom.stateLoading.hidden = state !== 'loading';
  dom.stateError.hidden = state !== 'error';
  dom.stateResult.hidden = state !== 'result';

  // The Generate button should only be disabled while a generation is
  // actually in flight — every other state re-enables it.
  dom.generateBtn.disabled = state === 'loading';
}

function showLoading() {
  updatePreview('loading');
}

function showError(message) {
  dom.errorMessage.textContent = message;
  updatePreview('error');
}

/* ==========================================================================
   Form error helper
   ========================================================================== */
function showFormError(message) {
  dom.formError.textContent = message;
  dom.formError.hidden = false;
}

function clearFormError() {
  dom.formError.hidden = true;
  dom.formError.textContent = '';
}

/* ==========================================================================
   Actions: download / copy QR / copy content
   ========================================================================== */
function setupActions() {
  dom.downloadBtn.addEventListener('click', downloadQRCode);
  dom.copyQrBtn.addEventListener('click', copyQRCode);
  dom.copyContentBtn.addEventListener('click', copyContent);
  dom.clearHistoryBtn.addEventListener('click', clearHistory);
}

function downloadQRCode() {
  if (!appState.lastPayload) {
    showToast('Generate a QR code first', 'error');
    return;
  }
  try {
    const dateStr = new Date().toISOString().slice(0, 10);
    const link = document.createElement('a');
    link.download = `qr-code-${dateStr}.png`;
    link.href = dom.canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('QR code downloaded', 'success');
  } catch (err) {
    showToast('Download failed — please try again', 'error');
  }
}

function copyQRCode() {
  if (!appState.lastPayload) {
    showToast('Generate a QR code first', 'error');
    return;
  }

  if (!navigator.clipboard || typeof window.ClipboardItem === 'undefined') {
    showToast('Copying images isn\u2019t supported in this browser — try Download instead', 'error');
    return;
  }

  dom.canvas.toBlob((blob) => {
    if (!blob) {
      showToast('Couldn\u2019t copy the QR image — try Download instead', 'error');
      return;
    }
    navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blob })])
      .then(() => showToast('Copied!', 'success'))
      .catch(() => showToast('Couldn\u2019t copy the QR image — try Download instead', 'error'));
  }, 'image/png');
}

function copyContent() {
  if (!appState.lastPayload) {
    showToast('Generate a QR code first', 'error');
    return;
  }

  const fallbackCopy = (text) => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      showToast('Content copied!', 'success');
    } catch (err) {
      showToast('Couldn\u2019t copy content automatically', 'error');
    }
    document.body.removeChild(textarea);
  };

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(appState.lastPayload)
      .then(() => showToast('Content copied!', 'success'))
      .catch(() => fallbackCopy(appState.lastPayload));
  } else {
    fallbackCopy(appState.lastPayload);
  }
}

/* ==========================================================================
   Toast notifications
   ========================================================================== */
function showToast(message, kind = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${kind}`;
  toast.setAttribute('role', 'status');
  toast.textContent = message;
  dom.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-out');
    setTimeout(() => toast.remove(), 220);
  }, QR_CONFIG.toastDurationMs);
}

/* ==========================================================================
   Recent history (safe metadata only — never raw content or passwords)
   ========================================================================== */
function buildHistoryLabel(type, data) {
  switch (type) {
    case 'url': {
      try {
        const host = new URL(normalizeUrl(data.url)).hostname;
        return `URL · ${host}`;
      } catch (err) {
        return 'URL QR';
      }
    }
    case 'wifi':
      return 'Wi-Fi QR (details hidden)';
    case 'email':
      return 'Email QR';
    case 'phone':
      return 'Phone QR';
    case 'sms':
      return 'SMS QR';
    case 'contact':
      return 'Contact QR';
    default:
      return 'Text QR';
  }
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(QR_CONFIG.historyStorageKey);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    return [];
  }
}

function addHistoryEntry(type, label) {
  const history = loadHistory();
  history.unshift({ type, label, time: Date.now() });
  const trimmed = history.slice(0, QR_CONFIG.historyLimit);
  try {
    localStorage.setItem(QR_CONFIG.historyStorageKey, JSON.stringify(trimmed));
  } catch (err) {
    /* localStorage may be unavailable (private browsing etc.) — fail silently */
  }
  renderHistory();
}

function clearHistory() {
  try {
    localStorage.removeItem(QR_CONFIG.historyStorageKey);
  } catch (err) { /* no-op */ }
  renderHistory();
  showToast('History cleared', 'success');
}

const HISTORY_COLORS = {
  text: '#8082A6', url: '#F2921D', email: '#F2C230',
  phone: '#F24F13', wifi: '#8082A6', sms: '#F2921D', contact: '#F24F13'
};

function renderHistory() {
  const history = loadHistory();
  while (dom.historyList.firstChild) {
    dom.historyList.removeChild(dom.historyList.firstChild);
  }

  if (!history.length) {
    const li = document.createElement('li');
    li.className = 'history-empty';
    li.id = 'history-empty';
    li.textContent = 'No QR codes generated yet.';
    dom.historyList.appendChild(li);
    return;
  }

  history.forEach((entry) => {
    const li = document.createElement('li');

    const dot = document.createElement('span');
    dot.className = 'history-dot';
    dot.style.background = HISTORY_COLORS[entry.type] || '#8082A6';
    li.appendChild(dot);

    const label = document.createElement('span');
    label.textContent = entry.label;
    li.appendChild(label);

    const time = document.createElement('span');
    time.className = 'history-time';
    time.textContent = formatRelativeTime(entry.time);
    li.appendChild(time);

    dom.historyList.appendChild(li);
  });
}

function formatRelativeTime(timestamp) {
  const diffMs = Date.now() - timestamp;
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay}d ago`;
}

/* ==========================================================================
   Boot
   ========================================================================== */
document.addEventListener('DOMContentLoaded', initializeApp);
