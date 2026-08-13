'use strict';

/* ==========================================================
   STATE
   ========================================================== */
const state = {
  currentValue: '0',      // string currently shown on the big display
  previousValue: null,    // number awaiting an operator (current paren level)
  operator: null,         // pending operator for the current paren level
  overwrite: true,        // true => next digit press starts a fresh number
  errorState: false,

  parenStack: [],         // stack of { previousValue, operator } for '(' groups

  lastOperator: null,     // for repeated "=" presses
  lastOperand: null,

  scientificMode: false,
  angleMode: 'DEG'        // 'DEG' | 'RAD'
};

const MAX_SIGNIFICANT_DIGITS = 10;
const EXP_UPPER_BOUND = 1e15;
const EXP_LOWER_BOUND = 1e-9;

/* ==========================================================
   DOM REFERENCES
   ========================================================== */
const calculatorEl = document.getElementById('calculator');
const displayEl = document.getElementById('display');
const expressionEl = document.getElementById('expressionLine');
const keypadEl = document.getElementById('keypad');
const scientificGridEl = document.getElementById('scientificGrid');
const sciToggleEl = document.getElementById('sciToggle');
const degRadToggleEl = document.getElementById('degRadToggle');
const backspaceBtn = document.getElementById('backspaceBtn');

/* ==========================================================
   NUMBER FORMATTING
   ========================================================== */

// Removes floating point artifacts and caps precision.
function cleanFloat(num) {
  if (!isFinite(num)) return num;
  if (num === 0) return 0;
  const precised = parseFloat(num.toPrecision(MAX_SIGNIFICANT_DIGITS));
  return precised;
}

// Formats a raw numeric value for the big display, including thousands separators.
function formatForDisplay(value) {
  if (value === 'Error') return 'Error';

  const num = typeof value === 'number' ? value : parseFloat(value);
  if (!isFinite(num)) return 'Error';

  const abs = Math.abs(num);
  if (abs !== 0 && (abs >= EXP_UPPER_BOUND || abs < EXP_LOWER_BOUND)) {
    return num.toExponential(6);
  }

  const cleaned = cleanFloat(num);
  const parts = cleaned.toString().split('.');
  const intPart = parts[0];
  const decPart = parts[1];

  const negative = intPart.startsWith('-');
  const intDigits = negative ? intPart.slice(1) : intPart;
  const withCommas = intDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  let result = (negative ? '-' : '') + withCommas;
  if (decPart !== undefined) result += '.' + decPart;
  return result;
}

// Formats the live "typing" buffer (keeps trailing decimal points / zeros the user typed).
function formatTypingBuffer(raw) {
  if (raw === 'Error') return 'Error';
  const negative = raw.startsWith('-');
  const body = negative ? raw.slice(1) : raw;
  const [intPart, decPart] = body.split('.');
  const withCommas = (intPart || '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  let result = (negative ? '-' : '') + withCommas;
  if (decPart !== undefined) result += '.' + decPart;
  return result;
}

// Some computed results end up as native JS exponential strings (e.g. "1e+21" or
// "1e-9"). Route those through a consistent exponential display format instead of
// showing the raw JS string or breaking the comma-grouping logic.
function formatDisplayValue(raw) {
  if (raw === 'Error') return 'Error';
  if (/e/i.test(raw)) {
    const num = parseFloat(raw);
    return isFinite(num) ? num.toExponential(6) : 'Error';
  }
  return formatTypingBuffer(raw);
}

/* ==========================================================
   DISPLAY RENDERING
   ========================================================== */
function updateDisplay() {
  const shown = state.errorState
    ? 'Error'
    : formatDisplayValue(state.currentValue);

  displayEl.textContent = shown;
  displayEl.classList.toggle('is-error', state.errorState);
  displayEl.classList.toggle('is-long', shown.replace(/[,\-]/g, '').length > 9);

  expressionEl.textContent = buildExpressionPreview() || '\u00A0';

  // Highlight the active operator key
  document.querySelectorAll('.key-operator[data-op]').forEach((btn) => {
    btn.classList.toggle('is-active', !state.errorState && state.operator === btn.dataset.op);
  });
}

// Builds a small breadcrumb line like "12 + ( 3 ×" shown above the main number.
function buildExpressionPreview() {
  const segments = [];
  state.parenStack.forEach((frame) => {
    if (frame.previousValue !== null) segments.push(formatForDisplay(frame.previousValue));
    if (frame.operator) segments.push(frame.operator);
    segments.push('(');
  });
  if (state.previousValue !== null) segments.push(formatForDisplay(state.previousValue));
  if (state.operator) segments.push(state.operator);
  return segments.join(' ');
}

/* ==========================================================
   CORE INPUT HANDLERS
   ========================================================== */
function inputDigit(digit) {
  if (state.errorState) clearCalculator();

  if (state.overwrite) {
    state.currentValue = digit;
    state.overwrite = false;
  } else {
    if (state.currentValue === '0') {
      state.currentValue = digit;
    } else if (state.currentValue.replace('-', '').replace('.', '').length < 15) {
      state.currentValue += digit;
    }
  }
  updateDisplay();
}

function inputDecimal() {
  if (state.errorState) clearCalculator();

  if (state.overwrite) {
    state.currentValue = '0.';
    state.overwrite = false;
    updateDisplay();
    return;
  }
  if (!state.currentValue.includes('.')) {
    state.currentValue += '.';
    updateDisplay();
  }
}

function deleteLastDigit() {
  if (state.errorState) {
    clearCalculator();
    return;
  }
  if (state.overwrite) return; // nothing "typed" yet to delete

  if (state.currentValue.length <= 1 || (state.currentValue.length === 2 && state.currentValue.startsWith('-'))) {
    state.currentValue = '0';
    state.overwrite = true;
  } else {
    state.currentValue = state.currentValue.slice(0, -1);
  }
  updateDisplay();
}

function toggleSign() {
  if (state.errorState) return;
  if (state.currentValue === '0') return;
  state.currentValue = state.currentValue.startsWith('-')
    ? state.currentValue.slice(1)
    : '-' + state.currentValue;
  updateDisplay();
}

function calculatePercentage() {
  if (state.errorState) return;
  const current = parseFloat(state.currentValue);

  let result;
  if (state.operator && state.previousValue !== null) {
    // e.g. 200 + 10%  ->  10% of 200
    result = (state.previousValue * current) / 100;
  } else {
    result = current / 100;
  }
  state.currentValue = cleanFloat(result).toString();
  state.overwrite = true;
  updateDisplay();
}

function clearCalculator() {
  state.currentValue = '0';
  state.previousValue = null;
  state.operator = null;
  state.overwrite = true;
  state.errorState = false;
  state.parenStack = [];
  state.lastOperator = null;
  state.lastOperand = null;
  updateDisplay();
}

/* ==========================================================
   BINARY OPERATIONS
   ========================================================== */
function performCalculation(a, operator, b) {
  switch (operator) {
    case '+': return a + b;
    case '−': return a - b;
    case '×': return a * b;
    case '÷': return b === 0 ? NaN : a / b;
    case '^': return Math.pow(a, b);
    default: return b;
  }
}

function handleOperator(op) {
  if (state.errorState) return;
  const inputValue = parseFloat(state.currentValue);

  if (state.operator !== null && !state.overwrite) {
    const result = performCalculation(state.previousValue, state.operator, inputValue);
    if (!isFinite(result)) {
      triggerError();
      return;
    }
    state.previousValue = cleanFloat(result);
    state.currentValue = state.previousValue.toString();
  } else {
    state.previousValue = inputValue;
  }

  state.operator = op;
  state.overwrite = true;
  updateDisplay();
}

function calculate() {
  if (state.errorState) return;

  // Auto-close any still-open parentheses before resolving the final result.
  while (state.parenStack.length > 0) {
    closeParenthesis();
    if (state.errorState) return;
  }

  const inputValue = parseFloat(state.currentValue);

  let result;
  if (state.operator !== null) {
    result = performCalculation(state.previousValue, state.operator, inputValue);
    state.lastOperator = state.operator;
    state.lastOperand = inputValue;
  } else if (state.lastOperator !== null) {
    // Repeated "=" press: re-apply the last operation.
    result = performCalculation(inputValue, state.lastOperator, state.lastOperand);
  } else {
    result = inputValue;
  }

  if (!isFinite(result)) {
    triggerError();
    return;
  }

  state.previousValue = null;
  state.operator = null;
  state.currentValue = cleanFloat(result).toString();
  state.overwrite = true;
  updateDisplay();
}

function triggerError() {
  state.errorState = true;
  state.currentValue = 'Error';
  state.previousValue = null;
  state.operator = null;
  state.parenStack = [];
  state.overwrite = true;
  updateDisplay();
}

/* ==========================================================
   PARENTHESES (stack-based grouping)
   ========================================================== */
function openParenthesis() {
  if (state.errorState) clearCalculator();
  state.parenStack.push({ previousValue: state.previousValue, operator: state.operator });
  state.previousValue = null;
  state.operator = null;
  state.currentValue = '0';
  state.overwrite = true;
  updateDisplay();
}

function closeParenthesis() {
  if (state.errorState || state.parenStack.length === 0) return;

  const inputValue = parseFloat(state.currentValue);
  let innerResult;
  if (state.operator !== null) {
    innerResult = performCalculation(state.previousValue, state.operator, inputValue);
  } else {
    innerResult = inputValue;
  }
  if (!isFinite(innerResult)) {
    triggerError();
    return;
  }
  innerResult = cleanFloat(innerResult);

  const outer = state.parenStack.pop();
  if (outer.operator !== null) {
    const combined = performCalculation(outer.previousValue, outer.operator, innerResult);
    if (!isFinite(combined)) {
      triggerError();
      return;
    }
    state.previousValue = null;
    state.operator = null;
    state.currentValue = cleanFloat(combined).toString();
  } else {
    state.previousValue = null;
    state.operator = null;
    state.currentValue = innerResult.toString();
  }
  state.overwrite = true;
  updateDisplay();
}

/* ==========================================================
   SCIENTIFIC FUNCTIONS
   ========================================================== */
function toDegreesAwareRadians(value) {
  return state.angleMode === 'DEG' ? (value * Math.PI) / 180 : value;
}

function fromRadiansToAngleMode(value) {
  return state.angleMode === 'DEG' ? (value * 180) / Math.PI : value;
}

function handleScientificOperation(fn) {
  if (state.errorState) clearCalculator();

  if (fn === 'lparen') { openParenthesis(); return; }
  if (fn === 'rparen') { closeParenthesis(); return; }
  if (fn === 'pi') { insertConstant(Math.PI); return; }
  if (fn === 'e') { insertConstant(Math.E); return; }
  if (fn === 'pow') { handleOperator('^'); return; }

  const current = parseFloat(state.currentValue);
  let result;

  switch (fn) {
    case 'sin': result = Math.sin(toDegreesAwareRadians(current)); break;
    case 'cos': result = Math.cos(toDegreesAwareRadians(current)); break;
    case 'tan': result = Math.tan(toDegreesAwareRadians(current)); break;
    case 'asin': result = fromRadiansToAngleMode(Math.asin(current)); break;
    case 'acos': result = fromRadiansToAngleMode(Math.acos(current)); break;
    case 'atan': result = fromRadiansToAngleMode(Math.atan(current)); break;
    case 'ln': result = Math.log(current); break;
    case 'log': result = Math.log10(current); break;
    case 'sqrt': result = Math.sqrt(current); break;
    case 'square': result = Math.pow(current, 2); break;
    default: return;
  }

  if (!isFinite(result)) {
    triggerError();
    return;
  }

  state.currentValue = cleanFloat(result).toString();
  state.overwrite = true;
  updateDisplay();
}

function insertConstant(value) {
  state.currentValue = cleanFloat(value).toString();
  state.overwrite = true;
  updateDisplay();
}

/* ==========================================================
   SCIENTIFIC MODE / ANGLE MODE TOGGLES
   ========================================================== */
function toggleScientificMode() {
  state.scientificMode = !state.scientificMode;
  calculatorEl.classList.toggle('has-sci', state.scientificMode);
  scientificGridEl.hidden = !state.scientificMode;
  degRadToggleEl.hidden = !state.scientificMode;
  sciToggleEl.setAttribute('aria-pressed', String(state.scientificMode));
}

function setAngleMode(mode) {
  state.angleMode = mode;
  degRadToggleEl.querySelectorAll('.deg-rad-btn').forEach((btn) => {
    const active = btn.dataset.mode === mode;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', String(active));
  });
}

/* ==========================================================
   EVENT WIRING
   ========================================================== */
keypadEl.addEventListener('click', (event) => {
  const btn = event.target.closest('.key');
  if (!btn) return;

  if (btn.dataset.digit !== undefined) {
    inputDigit(btn.dataset.digit);
    return;
  }
  if (btn.dataset.op !== undefined) {
    handleOperator(btn.dataset.op);
    return;
  }
  switch (btn.dataset.action) {
    case 'clear': clearCalculator(); break;
    case 'sign': toggleSign(); break;
    case 'percent': calculatePercentage(); break;
    case 'decimal': inputDecimal(); break;
    case 'equals': calculate(); break;
  }
});

scientificGridEl.addEventListener('click', (event) => {
  const btn = event.target.closest('.key-sci');
  if (!btn || btn.dataset.sci === 'none') return;
  handleScientificOperation(btn.dataset.sci);
});

sciToggleEl.addEventListener('click', toggleScientificMode);

degRadToggleEl.addEventListener('click', (event) => {
  const btn = event.target.closest('.deg-rad-btn');
  if (!btn) return;
  setAngleMode(btn.dataset.mode);
});

backspaceBtn.addEventListener('click', deleteLastDigit);

/* ==========================================================
   KEYBOARD SUPPORT
   ========================================================== */
function handleKeyboard(event) {
  const key = event.key;

  if (key >= '0' && key <= '9') {
    inputDigit(key);
    return;
  }

  switch (key) {
    case '.': inputDecimal(); break;
    case '+': handleOperator('+'); break;
    case '-': handleOperator('−'); break;
    case '*': handleOperator('×'); break;
    case '/': event.preventDefault(); handleOperator('÷'); break;
    case '%': calculatePercentage(); break;
    case '(': handleScientificOperation('lparen'); break;
    case ')': handleScientificOperation('rparen'); break;
    case '^': handleOperator('^'); break;
    case 'Enter':
    case '=': event.preventDefault(); calculate(); break;
    case 'Backspace': deleteLastDigit(); break;
    case 'Escape': clearCalculator(); break;
    default: return;
  }
}

document.addEventListener('keydown', handleKeyboard);

/* ==========================================================
   INIT
   ========================================================== */
updateDisplay();
