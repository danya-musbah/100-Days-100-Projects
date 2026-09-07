'use strict';

/* =========================================================
   Expense Tracker — Application Logic
   ========================================================= */

const STORAGE_KEY = 'expenseTracker_expenses';
const CURRENCY_KEY = 'expenseTracker_currency';

const CATEGORY_META = {
  Food:          { color: '#A230A4', icon: 'M12 2c1 3 3 4 3 7a3 3 0 1 1-6 0c0-3 2-4 3-7zm0 12v8m-4-4h8' },
  Transport:     { color: '#290087', icon: 'M5 17h14M6 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm12 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM4 17V9l2-5h12l2 5v8' },
  Shopping:      { color: '#A230A4', icon: 'M6 7h12l1 13H5L6 7zm3 0V5a3 3 0 1 1 6 0v2' },
  Bills:         { color: '#290087', icon: 'M6 2h12v20l-3-2-3 2-3-2-3 2V2z' },
  Entertainment: { color: '#A230A4', icon: 'M4 5h16v11H4z M9 20h6' },
  Health:        { color: '#290087', icon: 'M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z' },
  Education:     { color: '#A230A4', icon: 'M12 3l10 5-10 5L2 8l10-5zM6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5' },
  Travel:        { color: '#290087', icon: 'M3 12l18-7-7 18-2-8-9-3z' },
  Other:         { color: '#5a4a9a', icon: 'M6 12h.01M12 12h.01M18 12h.01' },
};
const CATEGORIES = Object.keys(CATEGORY_META);
const PAYMENT_METHODS = ['Cash', 'Credit Card', 'Debit Card', 'Bank Transfer', 'Other'];
const CURRENCY_LOCALES = {
  USD: { locale: 'en-US', currency: 'USD' },
  EUR: { locale: 'de-DE', currency: 'EUR' },
  GBP: { locale: 'en-GB', currency: 'GBP' },
  LYD: { locale: 'ar-LY', currency: 'LYD' },
};

/* ---------------------------------------------------------
   State
   --------------------------------------------------------- */
let expenses = [];
let currentCurrency = 'USD';
let editingId = null;
let pendingDeleteId = null;
let pendingClearAll = false;
let lastDeletedExpense = null;
let lastDeletedIndex = null;
let pendingImportPayload = null;

const state = {
  search: '',
  category: 'all',
  payment: 'all',
  dateRange: 'all',
  dateFrom: '',
  dateTo: '',
  sort: 'newest',
};

/* ---------------------------------------------------------
   Utilities
   --------------------------------------------------------- */
function generateExpenseId() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'exp_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
}

function todayLocalISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Parse a "YYYY-MM-DD" string into a local Date at midnight (avoids UTC shift bugs)
function parseLocalDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(dateStr) {
  try {
    const d = parseLocalDate(dateStr);
    const today = parseLocalDate(todayLocalISO());
    const diffDays = Math.round((today - d) / 86400000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatCurrency(amount) {
  const cfg = CURRENCY_LOCALES[currentCurrency] || CURRENCY_LOCALES.USD;
  try {
    return new Intl.NumberFormat(cfg.locale, {
      style: 'currency',
      currency: cfg.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function isSameWeek(dateStr, refDate) {
  const d = parseLocalDate(dateStr);
  const start = new Date(refDate);
  const day = start.getDay(); // 0=Sun
  start.setDate(start.getDate() - day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return d >= start && d < end;
}

/* ---------------------------------------------------------
   Persistence
   --------------------------------------------------------- */
function loadExpenses() {
  let raw;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    expenses = [];
    return;
  }
  if (!raw) { expenses = []; return; }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('not an array');
    expenses = parsed.map(normalizeExpense).filter(Boolean);
  } catch {
    expenses = [];
    showToast('! Stored data was corrupted and has been reset.', 'error');
  }
}

function normalizeExpense(item) {
  if (!item || typeof item !== 'object') return null;
  const amount = Number(item.amount);
  if (!item.name || !Number.isFinite(amount) || amount <= 0) return null;
  if (!item.date || isNaN(parseLocalDate(String(item.date)).getTime())) return null;
  return {
    id: item.id ? String(item.id) : generateExpenseId(),
    name: String(item.name).trim().slice(0, 80),
    amount: Math.round(amount * 100) / 100,
    category: CATEGORIES.includes(item.category) ? item.category : 'Other',
    date: String(item.date).slice(0, 10),
    paymentMethod: PAYMENT_METHODS.includes(item.paymentMethod) ? item.paymentMethod : 'Other',
    notes: item.notes ? String(item.notes).slice(0, 300) : '',
    createdAt: item.createdAt || new Date().toISOString(),
  };
}

function saveExpenses() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
    return true;
  } catch {
    showToast('Your browser could not save this expense. Please check your storage settings and try again.', 'error');
    return false;
  }
}

function loadCurrency() {
  try {
    const c = localStorage.getItem(CURRENCY_KEY);
    if (c && CURRENCY_LOCALES[c]) currentCurrency = c;
  } catch { /* ignore */ }
}

function saveCurrency() {
  try { localStorage.setItem(CURRENCY_KEY, currentCurrency); } catch { /* ignore */ }
}

/* ---------------------------------------------------------
   CRUD
   --------------------------------------------------------- */
function createExpense(data) {
  const expense = {
    id: generateExpenseId(),
    name: data.name.trim(),
    amount: Math.round(Number(data.amount) * 100) / 100,
    category: data.category,
    date: data.date,
    paymentMethod: data.paymentMethod,
    notes: data.notes ? data.notes.trim() : '',
    createdAt: new Date().toISOString(),
  };
  expenses.unshift(expense);
  if (!saveExpenses()) { expenses.shift(); return null; }
  return expense;
}

function updateExpense(id, data) {
  const idx = expenses.findIndex(e => e.id === id);
  if (idx === -1) return null;
  const prev = expenses[idx];
  const updated = {
    ...prev,
    name: data.name.trim(),
    amount: Math.round(Number(data.amount) * 100) / 100,
    category: data.category,
    date: data.date,
    paymentMethod: data.paymentMethod,
    notes: data.notes ? data.notes.trim() : '',
  };
  expenses[idx] = updated;
  if (!saveExpenses()) { expenses[idx] = prev; return null; }
  return updated;
}

function deleteExpenseById(id) {
  const idx = expenses.findIndex(e => e.id === id);
  if (idx === -1) return false;
  lastDeletedExpense = expenses[idx];
  lastDeletedIndex = idx;
  expenses.splice(idx, 1);
  if (!saveExpenses()) {
    expenses.splice(idx, 0, lastDeletedExpense);
    return false;
  }
  return true;
}

function undoDelete() {
  if (!lastDeletedExpense) return;
  expenses.splice(lastDeletedIndex, 0, lastDeletedExpense);
  saveExpenses();
  lastDeletedExpense = null;
  lastDeletedIndex = null;
  updateUI();
  showToast('Expense restored');
}

function clearAllExpenses() {
  expenses = [];
  saveExpenses();
  updateUI();
}

/* ---------------------------------------------------------
   Validation
   --------------------------------------------------------- */
function validateExpense(data) {
  const errors = {};
  const name = (data.name || '').trim();
  if (!name) errors.name = 'Expense name is required.';
  else if (name.length > 80) errors.name = 'Name is too long (max 80 characters).';

  const amountStr = String(data.amount ?? '').trim();
  const amount = Number(amountStr);
  if (!amountStr) errors.amount = 'Amount is required.';
  else if (!Number.isFinite(amount)) errors.amount = 'Amount must be a number.';
  else if (amount <= 0) errors.amount = 'Amount must be greater than zero.';
  else if (amount > 100000000) errors.amount = 'Amount is unreasonably large.';

  if (!data.category || !CATEGORIES.includes(data.category)) errors.category = 'Please select a category.';

  if (!data.date) errors.date = 'Date is required.';
  else if (isNaN(parseLocalDate(data.date).getTime())) errors.date = 'Please enter a valid date.';

  return errors;
}

/* ---------------------------------------------------------
   Filtering / Search / Sorting
   --------------------------------------------------------- */
function getFilteredExpenses() {
  const now = new Date();
  let list = expenses.slice();

  if (state.search.trim()) {
    const q = state.search.trim().toLowerCase();
    list = list.filter(e =>
      e.name.toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q) ||
      (e.notes || '').toLowerCase().includes(q) ||
      e.paymentMethod.toLowerCase().includes(q)
    );
  }

  if (state.category !== 'all') {
    list = list.filter(e => e.category === state.category);
  }

  if (state.payment !== 'all') {
    list = list.filter(e => e.paymentMethod === state.payment);
  }

  if (state.dateRange !== 'all') {
    list = list.filter(e => {
      const d = parseLocalDate(e.date);
      if (state.dateRange === 'today') {
        return e.date === todayLocalISO();
      }
      if (state.dateRange === 'week') {
        return isSameWeek(e.date, now);
      }
      if (state.dateRange === 'month') {
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      }
      if (state.dateRange === 'year') {
        return d.getFullYear() === now.getFullYear();
      }
      if (state.dateRange === 'custom') {
        if (state.dateFrom && e.date < state.dateFrom) return false;
        if (state.dateTo && e.date > state.dateTo) return false;
        return true;
      }
      return true;
    });
  }

  list.sort((a, b) => {
    switch (state.sort) {
      case 'oldest': return a.date === b.date ? a.createdAt.localeCompare(b.createdAt) : a.date.localeCompare(b.date);
      case 'amount-desc': return b.amount - a.amount;
      case 'amount-asc': return a.amount - b.amount;
      case 'name-asc': return a.name.localeCompare(b.name);
      case 'name-desc': return b.name.localeCompare(a.name);
      case 'newest':
      default: return a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date);
    }
  });

  return list;
}

function hasActiveFilters() {
  return state.search.trim() !== '' || state.category !== 'all' || state.payment !== 'all' ||
    state.dateRange !== 'all' || state.sort !== 'newest';
}

/* ---------------------------------------------------------
   Statistics
   --------------------------------------------------------- */
function calculateStatistics() {
  const now = new Date();
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const monthTotal = calculateMonthlyTotal(now);
  const weekTotal = calculateWeeklyTotal(now);
  const avg = calculateAverageExpense();
  const largest = findLargestExpense();
  return { total, monthTotal, weekTotal, avg, largest, count: expenses.length };
}

function calculateMonthlyTotal(refDate = new Date()) {
  return expenses
    .filter(e => {
      const d = parseLocalDate(e.date);
      return d.getFullYear() === refDate.getFullYear() && d.getMonth() === refDate.getMonth();
    })
    .reduce((s, e) => s + e.amount, 0);
}

function calculateWeeklyTotal(refDate = new Date()) {
  return expenses.filter(e => isSameWeek(e.date, refDate)).reduce((s, e) => s + e.amount, 0);
}

function calculateAverageExpense() {
  if (expenses.length === 0) return 0;
  return expenses.reduce((s, e) => s + e.amount, 0) / expenses.length;
}

function findLargestExpense() {
  if (expenses.length === 0) return null;
  return expenses.reduce((max, e) => (e.amount > max.amount ? e : max), expenses[0]);
}

function calculateCategoryTotals() {
  const totals = {};
  CATEGORIES.forEach(c => totals[c] = 0);
  expenses.forEach(e => { totals[e.category] = (totals[e.category] || 0) + e.amount; });
  const total = Object.values(totals).reduce((s, v) => s + v, 0);
  return Object.entries(totals)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([category, value]) => ({ category, value, pct: total ? (value / total) * 100 : 0 }));
}

/* ---------------------------------------------------------
   Insights
   --------------------------------------------------------- */
function generateInsights() {
  const insights = [];
  if (expenses.length < 3) {
    return ['Add a few expenses to unlock spending insights.'];
  }
  const now = new Date();
  const catTotals = calculateCategoryTotals();
  const monthExpenses = expenses.filter(e => {
    const d = parseLocalDate(e.date);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });

  if (catTotals.length) {
    insights.push(`You spent most on ${catTotals[0].category} this month, totaling ${formatCurrency(catTotals[0].value)}.`);
  }
  insights.push(`Your average expense is ${formatCurrency(calculateAverageExpense())}.`);
  const largest = findLargestExpense();
  if (largest) {
    insights.push(`Your largest expense was ${largest.category} at ${formatCurrency(largest.amount)}.`);
  }
  insights.push(`You recorded ${monthExpenses.length} expense${monthExpenses.length === 1 ? '' : 's'} this month.`);
  return insights;
}

/* ---------------------------------------------------------
   Rendering
   --------------------------------------------------------- */
function catIconSvg(category, size = 14) {
  const meta = CATEGORY_META[category] || CATEGORY_META.Other;
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="${meta.icon}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function renderGreeting() {
  const hour = new Date().getHours();
  const el = document.getElementById('greeting');
  let text = 'Good evening';
  if (hour < 12) text = 'Good morning';
  else if (hour < 18) text = 'Good afternoon';
  el.textContent = text;
}

function renderSummaryCards(stats) {
  document.getElementById('statTotal').textContent = formatCurrency(stats.total);
  document.getElementById('statMonth').textContent = formatCurrency(stats.monthTotal);
  document.getElementById('statCount').textContent = stats.count;
  document.getElementById('statAverage').textContent = formatCurrency(stats.avg);
}

function renderLargestExpense(stats) {
  const container = document.getElementById('largestExpense');
  if (!stats.largest) {
    container.innerHTML = '<p class="empty-inline">No expenses yet.</p>';
    return;
  }
  const e = stats.largest;
  container.innerHTML = `
    <p class="le-amount">${formatCurrency(e.amount)}</p>
    <p class="le-name">${escapeHtml(e.name)}</p>
    <p class="le-meta">${escapeHtml(e.category)} · ${formatDate(e.date)}</p>
  `;
}

function renderInsights() {
  const list = document.getElementById('insightsList');
  const insights = generateInsights();
  list.innerHTML = insights.map(text => `
    <li>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      <span>${escapeHtml(text)}</span>
    </li>
  `).join('');
}

function renderCategoryBreakdown() {
  const container = document.getElementById('categoryBreakdown');
  const data = calculateCategoryTotals();
  if (!data.length) {
    container.innerHTML = '<p class="empty-inline">No spending data yet.</p>';
    return;
  }
  container.innerHTML = data.map(({ category, value, pct }) => {
    const meta = CATEGORY_META[category] || CATEGORY_META.Other;
    return `
      <div class="category-row">
        <div class="category-row-top">
          <span class="cat-name">
            <span class="cat-icon-dot" style="background:${meta.color}">${catIconSvg(category, 13)}</span>
            ${escapeHtml(category)}
          </span>
          <span class="cat-amount">${formatCurrency(value)} · ${pct.toFixed(0)}%</span>
        </div>
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
      </div>
    `;
  }).join('');
}

function renderChart() {
  const container = document.getElementById('chartContainer');
  if (expenses.length === 0) {
    container.innerHTML = '<p class="chart-empty">Add expenses to see your spending trend here.</p>';
    return;
  }
  // Last 4 weeks (including current), Sunday-start weeks
  const now = new Date();
  const weeks = [];
  for (let i = 3; i >= 0; i--) {
    const start = new Date(now);
    start.setDate(start.getDate() - start.getDay() - i * 7);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const total = expenses.reduce((s, e) => {
      const d = parseLocalDate(e.date);
      return (d >= start && d < end) ? s + e.amount : s;
    }, 0);
    weeks.push({ label: `W${4 - i}`, total });
  }
  const max = Math.max(...weeks.map(w => w.total), 1);
  container.innerHTML = weeks.map(w => `
    <div class="chart-bar-group">
      <span class="chart-bar-value">${w.total > 0 ? formatCurrency(w.total) : ''}</span>
      <div class="chart-bar" style="height:${Math.max((w.total / max) * 100, 2)}%"></div>
      <span class="chart-bar-label">${w.label}</span>
    </div>
  `).join('');
}

function renderExpenseTable(list) {
  const tbody = document.getElementById('expenseTableBody');
  tbody.innerHTML = list.map(e => {
    const meta = CATEGORY_META[e.category] || CATEGORY_META.Other;
    return `
    <tr data-id="${e.id}">
      <td>${formatDate(e.date)}</td>
      <td>
        <div class="cell-name-wrap">
          <span class="cat-icon-dot" style="background:${meta.color}">${catIconSvg(e.category)}</span>
          <div>
            <div class="cell-expense-name">${escapeHtml(e.name)}</div>
            ${e.notes ? `<div class="expense-card-meta">${escapeHtml(e.notes)}</div>` : ''}
          </div>
        </div>
      </td>
      <td><span class="category-badge">${escapeHtml(e.category)}</span></td>
      <td>${escapeHtml(e.paymentMethod)}</td>
      <td class="cell-amount">${formatCurrency(e.amount)}</td>
      <td>
        <div class="row-actions">
          <button type="button" class="edit-btn" data-id="${e.id}" aria-label="Edit ${escapeHtml(e.name)}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 20h4l11-11-4-4L4 16v4z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <button type="button" class="delete-btn" data-id="${e.id}" aria-label="Delete ${escapeHtml(e.name)}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function renderExpenseCards(list) {
  const ul = document.getElementById('expenseCardList');
  ul.innerHTML = list.map(e => `
    <li class="expense-card" data-id="${e.id}">
      <div class="expense-card-top">
        <div>
          <div class="expense-card-name">${escapeHtml(e.name)}</div>
          <div class="expense-card-meta">${escapeHtml(e.category)} · ${formatDate(e.date)}</div>
        </div>
        <div class="expense-card-amount">${formatCurrency(e.amount)}</div>
      </div>
      <div class="expense-card-bottom">
        <span class="expense-card-payment">${escapeHtml(e.paymentMethod)}</span>
        <div class="expense-card-actions">
          <button type="button" class="edit-btn" data-id="${e.id}">Edit</button>
          <button type="button" class="delete-btn" data-id="${e.id}">Delete</button>
        </div>
      </div>
    </li>
  `).join('');
}

function renderExpenses() {
  const list = getFilteredExpenses();
  renderExpenseTable(list);
  renderExpenseCards(list);

  const resultsCount = document.getElementById('resultsCount');
  const emptyState = document.getElementById('emptyState');
  const noResultsState = document.getElementById('noResultsState');
  const tableWrap = document.querySelector('.table-wrap');
  const cardList = document.getElementById('expenseCardList');

  document.getElementById('clearFiltersBtn').hidden = !hasActiveFilters();

  if (expenses.length === 0) {
    emptyState.hidden = false;
    noResultsState.hidden = true;
    tableWrap.style.display = 'none';
    cardList.style.display = 'none';
    resultsCount.textContent = 'Showing 0 expenses';
    return;
  }

  emptyState.hidden = true;

  if (list.length === 0) {
    noResultsState.hidden = false;
    tableWrap.style.display = 'none';
    cardList.style.display = 'none';
  } else {
    noResultsState.hidden = true;
    tableWrap.style.display = '';
    cardList.style.display = '';
  }
  resultsCount.textContent = `Showing ${list.length} expense${list.length === 1 ? '' : 's'}`;
}

function renderDashboard() {
  const stats = calculateStatistics();
  renderSummaryCards(stats);
  renderLargestExpense(stats);
  renderInsights();
  renderCategoryBreakdown();
  renderChart();
}

function updateUI() {
  renderDashboard();
  renderExpenses();
}

/* ---------------------------------------------------------
   Toasts
   --------------------------------------------------------- */
function showToast(message, type = 'success', options = {}) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast' + (type === 'error' ? ' toast-error' : '');
  toast.setAttribute('role', 'status');

  const text = document.createElement('span');
  text.textContent = message;
  toast.appendChild(text);

  if (options.undo) {
    const undoBtn = document.createElement('button');
    undoBtn.className = 'toast-undo';
    undoBtn.type = 'button';
    undoBtn.textContent = 'Undo';
    undoBtn.addEventListener('click', () => {
      options.undo();
      toast.remove();
    });
    toast.appendChild(undoBtn);
  }

  container.appendChild(toast);
  const timeout = setTimeout(() => {
    toast.classList.add('toast-out');
    setTimeout(() => toast.remove(), 200);
  }, options.duration || 4000);

  toast.addEventListener('click', (e) => {
    if (e.target === toast) {
      clearTimeout(timeout);
      toast.remove();
    }
  });
}

/* ---------------------------------------------------------
   Modal (Add/Edit)
   --------------------------------------------------------- */
const modalBackdrop = document.getElementById('modalBackdrop');
const expenseModal = document.getElementById('expenseModal');
const expenseForm = document.getElementById('expenseForm');
let lastFocusedElement = null;

function openAddExpenseModal() {
  editingId = null;
  document.getElementById('modalTitle').textContent = 'Add Expense';
  document.getElementById('submitExpenseBtn').textContent = 'Add Expense';
  resetForm();
  document.getElementById('expenseDate').value = todayLocalISO();
  openModal();
}

function openEditExpenseModal(id) {
  const expense = expenses.find(e => e.id === id);
  if (!expense) return;
  editingId = id;
  document.getElementById('modalTitle').textContent = 'Edit Expense';
  document.getElementById('submitExpenseBtn').textContent = 'Save Changes';
  resetForm();
  document.getElementById('expenseId').value = expense.id;
  document.getElementById('expenseName').value = expense.name;
  document.getElementById('expenseAmount').value = expense.amount;
  document.getElementById('expenseCategory').value = expense.category;
  document.getElementById('expenseDate').value = expense.date;
  document.getElementById('expensePayment').value = expense.paymentMethod;
  document.getElementById('expenseNotes').value = expense.notes || '';
  openModal();
}

function openModal() {
  lastFocusedElement = document.activeElement;
  modalBackdrop.hidden = false;
  expenseModal.hidden = false;
  document.body.style.overflow = 'hidden';
  setTimeout(() => document.getElementById('expenseName').focus(), 30);
}

function closeModal() {
  modalBackdrop.hidden = true;
  expenseModal.hidden = true;
  document.body.style.overflow = '';
  editingId = null;
  if (lastFocusedElement) lastFocusedElement.focus();
}

function resetForm() {
  expenseForm.reset();
  document.getElementById('expenseId').value = '';
  ['expenseName', 'expenseAmount', 'expenseCategory', 'expenseDate'].forEach(id => {
    document.getElementById(id).closest('.form-field').classList.remove('has-error');
  });
  ['expenseNameError', 'expenseAmountError', 'expenseCategoryError', 'expenseDateError'].forEach(id => {
    document.getElementById(id).textContent = '';
  });
}

function displayFormErrors(errors) {
  const map = {
    name: ['expenseName', 'expenseNameError'],
    amount: ['expenseAmount', 'expenseAmountError'],
    category: ['expenseCategory', 'expenseCategoryError'],
    date: ['expenseDate', 'expenseDateError'],
  };
  Object.entries(map).forEach(([key, [inputId, errId]]) => {
    const field = document.getElementById(inputId).closest('.form-field');
    const errEl = document.getElementById(errId);
    if (errors[key]) {
      field.classList.add('has-error');
      errEl.textContent = errors[key];
    } else {
      field.classList.remove('has-error');
      errEl.textContent = '';
    }
  });
}

function handleFormSubmit(e) {
  e.preventDefault();
  const data = {
    name: document.getElementById('expenseName').value,
    amount: document.getElementById('expenseAmount').value,
    category: document.getElementById('expenseCategory').value,
    date: document.getElementById('expenseDate').value,
    paymentMethod: document.getElementById('expensePayment').value,
    notes: document.getElementById('expenseNotes').value,
  };

  const errors = validateExpense(data);
  displayFormErrors(errors);
  if (Object.keys(errors).length > 0) {
    const firstErrorField = Object.keys(errors)[0];
    const map = { name: 'expenseName', amount: 'expenseAmount', category: 'expenseCategory', date: 'expenseDate' };
    document.getElementById(map[firstErrorField]).focus();
    return;
  }

  if (editingId) {
    const result = updateExpense(editingId, data);
    if (result) {
      closeModal();
      updateUI();
      showToast('✓ Expense updated');
    }
  } else {
    const result = createExpense(data);
    if (result) {
      closeModal();
      updateUI();
      showToast('✓ Expense added successfully');
    }
  }
}

/* ---------------------------------------------------------
   Confirm dialog (delete / clear all)
   --------------------------------------------------------- */
const confirmBackdrop = document.getElementById('confirmBackdrop');
const confirmModal = document.getElementById('confirmModal');

function openDeleteConfirm(id) {
  const expense = expenses.find(e => e.id === id);
  if (!expense) return;
  pendingDeleteId = id;
  pendingClearAll = false;
  document.getElementById('confirmTitle').textContent = 'Delete expense?';
  document.getElementById('confirmMessage').textContent =
    `Are you sure you want to delete "${expense.name}"? This action cannot be undone.`;
  document.getElementById('confirmActionBtn').textContent = 'Delete';
  showConfirmModal();
}

function openClearAllConfirm() {
  if (expenses.length === 0) return;
  pendingClearAll = true;
  pendingDeleteId = null;
  document.getElementById('confirmTitle').textContent = 'Clear all expenses?';
  document.getElementById('confirmMessage').textContent =
    'This will permanently remove all locally stored expense data.';
  document.getElementById('confirmActionBtn').textContent = 'Clear All';
  showConfirmModal();
}

function showConfirmModal() {
  lastFocusedElement = document.activeElement;
  confirmBackdrop.hidden = false;
  confirmModal.hidden = false;
  document.body.style.overflow = 'hidden';
  setTimeout(() => document.getElementById('confirmActionBtn').focus(), 30);
}

function closeConfirmModal() {
  confirmBackdrop.hidden = true;
  confirmModal.hidden = true;
  document.body.style.overflow = '';
  pendingDeleteId = null;
  pendingClearAll = false;
  if (lastFocusedElement) lastFocusedElement.focus();
}

function handleConfirmAction() {
  if (pendingClearAll) {
    clearAllExpenses();
    closeConfirmModal();
    showToast('✓ All expenses cleared');
    return;
  }
  if (pendingDeleteId) {
    const id = pendingDeleteId;
    const deleted = deleteExpenseById(id);
    closeConfirmModal();
    if (deleted) {
      updateUI();
      showToast('✓ Expense deleted', 'success', { undo: undoDelete, duration: 6000 });
    }
  }
}

/* ---------------------------------------------------------
   Import dialog
   --------------------------------------------------------- */
const importBackdrop = document.getElementById('importBackdrop');
const importModal = document.getElementById('importModal');

function openImportModal(payload) {
  pendingImportPayload = payload;
  document.getElementById('importCount').textContent = payload.length;
  importBackdrop.hidden = false;
  importModal.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeImportModal() {
  importBackdrop.hidden = true;
  importModal.hidden = true;
  document.body.style.overflow = '';
  pendingImportPayload = null;
  document.getElementById('importFileInput').value = '';
}

/* ---------------------------------------------------------
   Export / Import
   --------------------------------------------------------- */
function downloadFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportJSON() {
  if (expenses.length === 0) {
    showToast('No expenses to export', 'error');
    return;
  }
  downloadFile('expenses.json', JSON.stringify(expenses, null, 2), 'application/json');
  showToast('✓ Exported expenses.json');
}

function csvEscape(value) {
  const str = String(value ?? '');
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function exportCSV() {
  if (expenses.length === 0) {
    showToast('No expenses to export', 'error');
    return;
  }
  const headers = ['id', 'name', 'amount', 'category', 'date', 'paymentMethod', 'notes', 'createdAt'];
  const rows = [headers.join(',')];
  expenses.forEach(e => {
    rows.push(headers.map(h => csvEscape(e[h])).join(','));
  });
  downloadFile('expenses.csv', rows.join('\n'), 'text/csv');
  showToast('✓ Exported expenses.csv');
}

function handleImportFile(file) {
  if (!file) return;
  if (!file.name.toLowerCase().endsWith('.json') && file.type !== 'application/json') {
    showToast('! Please select a valid JSON file', 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!Array.isArray(parsed)) throw new Error('Invalid format');
      const normalized = parsed.map(normalizeExpense).filter(Boolean);
      if (normalized.length === 0) {
        showToast('! No valid expenses found in file', 'error');
        return;
      }
      openImportModal(normalized);
    } catch {
      showToast('! Could not read that file. Please check it is valid JSON.', 'error');
    }
  };
  reader.onerror = () => showToast('! Could not read that file.', 'error');
  reader.readAsText(file);
}

function performImport(mode) {
  if (!pendingImportPayload) return;
  if (mode === 'replace') {
    expenses = pendingImportPayload.map(e => ({ ...e, id: e.id || generateExpenseId() }));
  } else {
    const existingIds = new Set(expenses.map(e => e.id));
    const toAdd = pendingImportPayload.map(e => {
      if (existingIds.has(e.id)) return { ...e, id: generateExpenseId() };
      return e;
    });
    expenses = [...toAdd, ...expenses];
  }
  const count = pendingImportPayload.length;
  saveExpenses();
  updateUI();
  closeImportModal();
  showToast(`✓ Imported ${count} expense${count === 1 ? '' : 's'} successfully`);
}

/* ---------------------------------------------------------
   Filters UI wiring
   --------------------------------------------------------- */
function clearFilters() {
  state.search = '';
  state.category = 'all';
  state.payment = 'all';
  state.dateRange = 'all';
  state.dateFrom = '';
  state.dateTo = '';
  state.sort = 'newest';
  document.getElementById('searchInput').value = '';
  document.getElementById('filterCategory').value = 'all';
  document.getElementById('filterPayment').value = 'all';
  document.getElementById('filterDate').value = 'all';
  document.getElementById('filterDateFrom').value = '';
  document.getElementById('filterDateTo').value = '';
  document.getElementById('sortBy').value = 'newest';
  document.getElementById('customDateFields').hidden = true;
  renderExpenses();
}

/* ---------------------------------------------------------
   Event delegation for row actions
   --------------------------------------------------------- */
function handleListClick(e) {
  const editBtn = e.target.closest('.edit-btn');
  const deleteBtn = e.target.closest('.delete-btn');
  if (editBtn) openEditExpenseModal(editBtn.dataset.id);
  else if (deleteBtn) openDeleteConfirm(deleteBtn.dataset.id);
}

/* ---------------------------------------------------------
   Init
   --------------------------------------------------------- */
function initializeApp() {
  loadCurrency();
  loadExpenses();
  document.getElementById('currencySelect').value = currentCurrency;
  renderGreeting();
  updateUI();
  bindEvents();
}

function bindEvents() {
  // Add expense triggers
  document.getElementById('openAddExpenseBtn').addEventListener('click', openAddExpenseModal);
  document.getElementById('emptyStateAddBtn').addEventListener('click', openAddExpenseModal);
  document.getElementById('fabAddBtn').addEventListener('click', openAddExpenseModal);

  // Modal
  document.getElementById('closeModalBtn').addEventListener('click', closeModal);
  document.getElementById('cancelFormBtn').addEventListener('click', closeModal);
  modalBackdrop.addEventListener('click', closeModal);
  expenseForm.addEventListener('submit', handleFormSubmit);

  // Confirm dialog
  document.getElementById('confirmCancelBtn').addEventListener('click', closeConfirmModal);
  confirmBackdrop.addEventListener('click', closeConfirmModal);
  document.getElementById('confirmActionBtn').addEventListener('click', handleConfirmAction);

  // Clear all
  document.getElementById('clearAllBtn').addEventListener('click', openClearAllConfirm);

  // Import dialog
  document.getElementById('importCancelBtn').addEventListener('click', closeImportModal);
  importBackdrop.addEventListener('click', closeImportModal);
  document.getElementById('importMergeBtn').addEventListener('click', () => performImport('merge'));
  document.getElementById('importReplaceBtn').addEventListener('click', () => performImport('replace'));

  // Export/import
  document.getElementById('exportJsonBtn').addEventListener('click', exportJSON);
  document.getElementById('exportCsvBtn').addEventListener('click', exportCSV);
  document.getElementById('importFileInput').addEventListener('change', (e) => {
    handleImportFile(e.target.files[0]);
  });

  // List actions (event delegation)
  document.getElementById('expenseTableBody').addEventListener('click', handleListClick);
  document.getElementById('expenseCardList').addEventListener('click', handleListClick);

  // Search
  let searchDebounce;
  document.getElementById('searchInput').addEventListener('input', (e) => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      state.search = e.target.value;
      renderExpenses();
    }, 150);
  });

  // Filter toggle
  const filterToggleBtn = document.getElementById('filterToggleBtn');
  const filterPanel = document.getElementById('filterPanel');
  filterToggleBtn.addEventListener('click', () => {
    const isHidden = filterPanel.hidden;
    filterPanel.hidden = !isHidden;
    filterToggleBtn.setAttribute('aria-expanded', String(isHidden));
  });

  document.getElementById('filterCategory').addEventListener('change', (e) => {
    state.category = e.target.value; renderExpenses();
  });
  document.getElementById('filterPayment').addEventListener('change', (e) => {
    state.payment = e.target.value; renderExpenses();
  });
  document.getElementById('filterDate').addEventListener('change', (e) => {
    state.dateRange = e.target.value;
    document.getElementById('customDateFields').hidden = state.dateRange !== 'custom';
    renderExpenses();
  });
  document.getElementById('filterDateFrom').addEventListener('change', (e) => {
    state.dateFrom = e.target.value; renderExpenses();
  });
  document.getElementById('filterDateTo').addEventListener('change', (e) => {
    state.dateTo = e.target.value; renderExpenses();
  });
  document.getElementById('sortBy').addEventListener('change', (e) => {
    state.sort = e.target.value; renderExpenses();
  });
  document.getElementById('clearFiltersBtn').addEventListener('click', clearFilters);

  // Currency
  document.getElementById('currencySelect').addEventListener('change', (e) => {
    currentCurrency = e.target.value;
    saveCurrency();
    updateUI();
  });

  // Mobile menu
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileNav = document.getElementById('mobileNav');
  mobileMenuBtn.addEventListener('click', () => {
    const isOpen = mobileNav.dataset.open === 'true';
    mobileNav.hidden = isOpen;
    mobileNav.dataset.open = String(!isOpen);
    mobileMenuBtn.setAttribute('aria-expanded', String(!isOpen));
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
      e.preventDefault();
      openAddExpenseModal();
    }
    if (e.key === 'Escape') {
      if (!expenseModal.hidden) closeModal();
      else if (!confirmModal.hidden) closeConfirmModal();
      else if (!importModal.hidden) closeImportModal();
    }
  });

  // Basic focus trap for modals
  [expenseModal, confirmModal, importModal].forEach(modal => {
    modal.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const focusable = modal.querySelectorAll('button, input, select, textarea, a[href]');
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', initializeApp);
