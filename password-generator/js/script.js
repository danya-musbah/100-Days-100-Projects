'use strict';

/**
 * Secure Password Generator
 * All randomness is sourced from window.crypto.getRandomValues().
 * Nothing here uses Math.random(), timestamps, or any predictable seed.
 * No network requests are made and no password is persisted to disk.
 */

// ---------------------------------------------------------------------------
// Character sets
// ---------------------------------------------------------------------------

const CHAR_SETS = {
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lower: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  // Curated symbol set: avoids characters that are visually ambiguous
  // or that commonly break naive parsers, while staying broad enough
  // for strong entropy.
  symbols: '!@#$%^&*()-_=+[]{};:,.<>?/~'
};

const MAX_HISTORY = 5;

// ---------------------------------------------------------------------------
// DOM references
// ---------------------------------------------------------------------------

const els = {
  passwordDisplay: document.getElementById('passwordDisplay'),
  passwordText: document.getElementById('passwordText'),
  copyBtn: document.getElementById('copyBtn'),
  toggleVisibilityBtn: document.getElementById('toggleVisibilityBtn'),
  regenerateBtn: document.getElementById('regenerateBtn'),
  liveStatus: document.getElementById('liveStatus'),

  strengthBar: document.getElementById('strengthBar'),
  strengthLabel: document.getElementById('strengthLabel'),
  entropyText: document.getElementById('entropyText'),

  lengthSlider: document.getElementById('lengthSlider'),
  lengthNumber: document.getElementById('lengthNumber'),
  lengthValue: document.getElementById('lengthValue'),

  optUpper: document.getElementById('optUpper'),
  optLower: document.getElementById('optLower'),
  optNumbers: document.getElementById('optNumbers'),
  optSymbols: document.getElementById('optSymbols'),

  validationMessage: document.getElementById('validationMessage'),
  generateBtn: document.getElementById('generateBtn'),

  historyList: document.getElementById('historyList'),
  clearHistoryBtn: document.getElementById('clearHistoryBtn'),

  toastContainer: document.getElementById('toastContainer')
};

// In-memory only. Never written to localStorage, cookies, IndexedDB, or a URL.
let passwordHistory = [];
let currentPassword = '';
let isMasked = true;

// ---------------------------------------------------------------------------
// Crypto availability check
// ---------------------------------------------------------------------------

const cryptoAvailable = !!(window.crypto && window.crypto.getRandomValues);

// ---------------------------------------------------------------------------
// Secure random helpers
// ---------------------------------------------------------------------------

/**
 * Returns a cryptographically secure random integer in [0, maxExclusive).
 * Uses rejection sampling to eliminate modulo bias.
 */
function getSecureRandomIndex(maxExclusive) {
  if (!cryptoAvailable) {
    throw new Error('Web Crypto API unavailable');
  }
  if (maxExclusive <= 0) {
    throw new Error('maxExclusive must be > 0');
  }

  // Smallest number of bytes that can represent maxExclusive - 1.
  const bytesNeeded = Math.ceil(Math.log2(maxExclusive) / 8) || 1;
  const maxValidRange = Math.floor(256 ** bytesNeeded / maxExclusive) * maxExclusive;

  const buffer = new Uint8Array(bytesNeeded);

  while (true) {
    window.crypto.getRandomValues(buffer);

    let value = 0;
    for (let i = 0; i < bytesNeeded; i++) {
      value = value * 256 + buffer[i];
    }

    // Reject values that would introduce modulo bias.
    if (value < maxValidRange) {
      return value % maxExclusive;
    }
    // Otherwise loop and draw fresh bytes.
  }
}

/**
 * Cryptographically secure Fisher-Yates shuffle (in place).
 */
function shuffleSecurely(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = getSecureRandomIndex(i + 1);
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// ---------------------------------------------------------------------------
// Option / validation helpers
// ---------------------------------------------------------------------------

function getSelectedCategories() {
  const categories = [];
  if (els.optUpper.checked) categories.push({ key: 'upper', chars: CHAR_SETS.upper });
  if (els.optLower.checked) categories.push({ key: 'lower', chars: CHAR_SETS.lower });
  if (els.optNumbers.checked) categories.push({ key: 'numbers', chars: CHAR_SETS.numbers });
  if (els.optSymbols.checked) categories.push({ key: 'symbols', chars: CHAR_SETS.symbols });
  return categories;
}

function getLength() {
  let val = parseInt(els.lengthSlider.value, 10);
  if (Number.isNaN(val)) val = 16;
  return Math.min(64, Math.max(8, val));
}

/**
 * Validates the current configuration.
 * Returns { valid: boolean, message: string }
 */
function validateOptions() {
  const categories = getSelectedCategories();
  const length = getLength();

  if (categories.length === 0) {
    return { valid: false, message: 'Select at least one character type.' };
  }

  if (length < categories.length) {
    return {
      valid: false,
      message: `Password length must be at least ${categories.length} to include every selected character type.`
    };
  }

  return { valid: true, message: '' };
}

function setValidationMessage(message) {
  els.validationMessage.textContent = message;
  els.generateBtn.disabled = !!message;
  els.generateBtn.style.opacity = message ? '0.55' : '1';
  els.generateBtn.style.cursor = message ? 'not-allowed' : 'pointer';
}

// ---------------------------------------------------------------------------
// Password generation
// ---------------------------------------------------------------------------

function generatePassword() {
  if (!cryptoAvailable) {
    showToast('Secure randomness is unavailable in this browser.', 'error');
    return null;
  }

  const validation = validateOptions();
  if (!validation.valid) {
    setValidationMessage(validation.message);
    announce(validation.message);
    return null;
  }
  setValidationMessage('');

  const categories = getSelectedCategories();
  const length = getLength();
  const fullPool = categories.map((c) => c.chars).join('');

  const passwordChars = [];

  // Guarantee at least one character from each selected category.
  categories.forEach((category) => {
    const idx = getSecureRandomIndex(category.chars.length);
    passwordChars.push(category.chars[idx]);
  });

  // Fill the remainder from the full combined pool.
  for (let i = passwordChars.length; i < length; i++) {
    const idx = getSecureRandomIndex(fullPool.length);
    passwordChars.push(fullPool[idx]);
  }

  // Securely shuffle so guaranteed characters aren't predictably placed.
  shuffleSecurely(passwordChars);

  return passwordChars.join('');
}

// ---------------------------------------------------------------------------
// Strength + entropy
// ---------------------------------------------------------------------------

function calculatePoolSize() {
  let pool = 0;
  if (els.optUpper.checked) pool += CHAR_SETS.upper.length;
  if (els.optLower.checked) pool += CHAR_SETS.lower.length;
  if (els.optNumbers.checked) pool += CHAR_SETS.numbers.length;
  if (els.optSymbols.checked) pool += CHAR_SETS.symbols.length;
  return pool;
}

function calculateEntropy(length, poolSize) {
  if (poolSize <= 0) return 0;
  return length * Math.log2(poolSize);
}

/**
 * Returns { level: 1-5, label: string }
 * This is an estimate based on length and character variety only —
 * not a guarantee of real-world crackability.
 */
function calculateStrength(length, categoryCount, entropyBits) {
  let score = 0;

  if (length >= 8) score += 1;
  if (length >= 12) score += 1;
  if (length >= 16) score += 1;
  if (length >= 24) score += 1;

  if (categoryCount >= 2) score += 1;
  if (categoryCount >= 3) score += 1;
  if (categoryCount >= 4) score += 1;

  if (entropyBits >= 60) score += 1;
  if (entropyBits >= 90) score += 1;

  // Normalize the raw 0-9 score to a 1-5 level.
  const level = Math.max(1, Math.min(5, Math.ceil(score / 1.8)));

  const labels = {
    1: 'Very Weak',
    2: 'Weak',
    3: 'Medium',
    4: 'Strong',
    5: 'Very Strong'
  };

  return { level, label: labels[level] };
}

function updateStrengthUI() {
  const length = getLength();
  const categories = getSelectedCategories();
  const poolSize = calculatePoolSize();
  const entropy = calculateEntropy(length, poolSize);
  const { level, label } = categories.length > 0
    ? calculateStrength(length, categories.length, entropy)
    : { level: 0, label: '—' };

  els.strengthBar.setAttribute('data-level', String(level));
  els.strengthBar.setAttribute('aria-valuenow', String(level));
  els.strengthLabel.textContent = label;
  els.entropyText.textContent = categories.length > 0
    ? `Estimated Entropy: ${Math.round(entropy)} bits (estimate)`
    : 'Estimated Entropy: — bits (estimate)';
}

// ---------------------------------------------------------------------------
// UI rendering
// ---------------------------------------------------------------------------

function renderPassword(password) {
  currentPassword = password;
  els.passwordText.textContent = password || '\u00A0';
  updateStrengthUI();
}

function updateLengthUI() {
  const length = getLength();
  els.lengthSlider.value = String(length);
  els.lengthNumber.value = String(length);
  els.lengthValue.textContent = String(length);

  const min = Number(els.lengthSlider.min);
  const max = Number(els.lengthSlider.max);
  const pct = ((length - min) / (max - min)) * 100;
  els.lengthSlider.style.setProperty('--fill', `${pct}%`);
}

function announce(message) {
  els.liveStatus.textContent = message;
}

function showToast(message, type) {
  const toast = document.createElement('div');
  toast.className = 'toast' + (type === 'error' ? ' toast-error' : '');
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
  toast.textContent = message;
  els.toastContainer.appendChild(toast);
  window.setTimeout(() => {
    toast.remove();
  }, 3000);
}

// ---------------------------------------------------------------------------
// History (in-memory only — never persisted)
// ---------------------------------------------------------------------------

function addToHistory(password) {
  passwordHistory.unshift(password);
  if (passwordHistory.length > MAX_HISTORY) {
    passwordHistory = passwordHistory.slice(0, MAX_HISTORY);
  }
  renderHistory();
}

function renderHistory() {
  els.historyList.innerHTML = '';
  passwordHistory.forEach((pw) => {
    const li = document.createElement('li');
    li.className = 'history-item';

    const span = document.createElement('span');
    span.className = 'hist-pw';
    span.textContent = pw;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'hist-copy';
    btn.textContent = 'Copy';
    btn.addEventListener('click', () => copyText(pw, btn));

    li.appendChild(span);
    li.appendChild(btn);
    els.historyList.appendChild(li);
  });
}

function clearHistory() {
  passwordHistory = [];
  renderHistory();
  announce('Password history cleared.');
}

// ---------------------------------------------------------------------------
// Clipboard
// ---------------------------------------------------------------------------

async function copyText(text, buttonEl) {
  if (!text) return;

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      // Fallback for browsers without the async Clipboard API.
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (!ok) throw new Error('execCommand copy failed');
    }

    const original = buttonEl.textContent;
    buttonEl.textContent = 'Copied!';
    buttonEl.classList.add('copied');
    announce('Password copied to clipboard.');
    window.setTimeout(() => {
      buttonEl.textContent = original;
      buttonEl.classList.remove('copied');
    }, 1500);
  } catch (err) {
    showToast('Could not copy password. Please copy it manually.', 'error');
  }
}

function copyPassword() {
  copyText(currentPassword, els.copyBtn);
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

function handleGenerateClick() {
  const password = generatePassword();
  if (!password) return;
  renderPassword(password);
  addToHistory(password);
  announce('New password generated.');

  els.regenerateBtn.classList.add('spinning');
  window.setTimeout(() => els.regenerateBtn.classList.remove('spinning'), 500);
}

function handleLengthSliderInput() {
  els.lengthNumber.value = els.lengthSlider.value;
  els.lengthValue.textContent = els.lengthSlider.value;
  updateLengthUI();
  refreshValidationAndStrength();
}

function handleLengthNumberInput() {
  let val = parseInt(els.lengthNumber.value, 10);
  if (Number.isNaN(val)) return;
  val = Math.min(64, Math.max(8, val));
  els.lengthSlider.value = String(val);
  updateLengthUI();
  refreshValidationAndStrength();
}

function handleLengthNumberBlur() {
  updateLengthUI();
}

function handleOptionChange() {
  refreshValidationAndStrength();
}

function refreshValidationAndStrength() {
  const validation = validateOptions();
  setValidationMessage(validation.valid ? '' : validation.message);
  updateStrengthUI();
}

function toggleVisibility() {
  isMasked = !isMasked;
  els.passwordDisplay.classList.toggle('masked', isMasked);

  const eyeOpen = els.toggleVisibilityBtn.querySelector('.eye-open');
  const eyeClosed = els.toggleVisibilityBtn.querySelector('.eye-closed');
  eyeOpen.hidden = isMasked;
  eyeClosed.hidden = !isMasked;

  els.toggleVisibilityBtn.setAttribute('aria-pressed', String(!isMasked));
  els.toggleVisibilityBtn.setAttribute('aria-label', isMasked ? 'Show password' : 'Hide password');
  els.toggleVisibilityBtn.title = isMasked ? 'Show password' : 'Hide password';
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

function init() {
  if (!cryptoAvailable) {
    setValidationMessage('');
    els.generateBtn.disabled = true;
    els.generateBtn.style.opacity = '0.55';
    showToast('This browser does not support the Web Crypto API required for secure generation.', 'error');
    els.passwordText.textContent = 'Unavailable';
    return;
  }

  updateLengthUI();
  refreshValidationAndStrength();

  els.generateBtn.addEventListener('click', handleGenerateClick);
  els.regenerateBtn.addEventListener('click', handleGenerateClick);
  els.copyBtn.addEventListener('click', copyPassword);
  els.toggleVisibilityBtn.addEventListener('click', toggleVisibility);

  els.lengthSlider.addEventListener('input', handleLengthSliderInput);
  els.lengthNumber.addEventListener('input', handleLengthNumberInput);
  els.lengthNumber.addEventListener('blur', handleLengthNumberBlur);

  [els.optUpper, els.optLower, els.optNumbers, els.optSymbols].forEach((el) => {
    el.addEventListener('change', handleOptionChange);
  });

  els.clearHistoryBtn.addEventListener('click', clearHistory);

  // Start masked by default; reveal is opt-in via the eye toggle.
  els.passwordDisplay.classList.add('masked');

  // Generate an initial password on load.
  handleGenerateClick();
}

document.addEventListener('DOMContentLoaded', init);
