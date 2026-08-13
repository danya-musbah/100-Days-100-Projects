'use strict';

/* ==========================================================================
   HEARTH — Application JavaScript
   Sections: Config, State, Storage, Task CRUD, Filtering/Search/Sorting,
             Rendering, Statistics, Modal, Form Handling, Authentication,
             Event Listeners, Initialization
   ========================================================================== */

/* ============================== CONFIG ================================== */

// To enable Google Sign-In, replace this with your own OAuth 2.0 Client ID
// from https://console.cloud.google.com/apis/credentials.
// See README.md for full setup instructions. Leave blank to keep the
// Google button hidden — the rest of the app works fully without it.
const GOOGLE_CLIENT_ID = '';

const STORAGE_KEY = 'hearth.tasks.v1';
const AUTH_STORAGE_KEY = 'hearth.auth.v1';

/* =============================== STATE =================================== */

const state = {
  tasks: [],
  filter: 'all',        // 'all' | 'active' | 'completed'
  search: '',
  sort: 'newest',        // 'newest' | 'oldest' | 'dueDate' | 'priority'
  user: null,            // { name, email, picture } | null
};

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };

/* ============================== STORAGE ================================== */

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((t) => t && typeof t === 'object')
      .map(sanitizeTask)
      .filter(Boolean);
  } catch (err) {
    console.warn('Hearth: could not read saved tasks, starting fresh.', err);
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
  } catch (err) {
    console.warn('Hearth: could not save tasks.', err);
    announce('Your tasks could not be saved. Storage may be full or unavailable.');
  }
}

function sanitizeTask(raw) {
  try {
    const id = typeof raw.id === 'string' && raw.id ? raw.id : createId();
    const title = typeof raw.title === 'string' ? raw.title.slice(0, 120) : '';
    if (!title.trim()) return null;
    return {
      id,
      title,
      description: typeof raw.description === 'string' ? raw.description.slice(0, 500) : '',
      completed: Boolean(raw.completed),
      priority: ['low', 'medium', 'high'].includes(raw.priority) ? raw.priority : 'medium',
      category: ['personal', 'work', 'study', 'shopping', 'other'].includes(raw.category) ? raw.category : 'personal',
      dueDate: isValidDateString(raw.dueDate) ? raw.dueDate : null,
      createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
      updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function isValidDateString(value) {
  if (!value || typeof value !== 'string') return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
}

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

/* ============================== TASK CRUD ================================= */

function addTask(data) {
  const now = new Date().toISOString();
  const task = {
    id: createId(),
    title: data.title.trim(),
    description: data.description.trim(),
    completed: false,
    priority: data.priority,
    category: data.category,
    dueDate: data.dueDate || null,
    createdAt: now,
    updatedAt: now,
  };
  state.tasks.unshift(task);
  saveTasks();
  return task;
}

function updateTask(id, data) {
  const task = state.tasks.find((t) => t.id === id);
  if (!task) return null;
  task.title = data.title.trim();
  task.description = data.description.trim();
  task.priority = data.priority;
  task.category = data.category;
  task.dueDate = data.dueDate || null;
  task.updatedAt = new Date().toISOString();
  saveTasks();
  return task;
}

function deleteTask(id) {
  state.tasks = state.tasks.filter((t) => t.id !== id);
  saveTasks();
}

function toggleTask(id) {
  const task = state.tasks.find((t) => t.id === id);
  if (!task) return;
  task.completed = !task.completed;
  task.updatedAt = new Date().toISOString();
  saveTasks();
}

/* ======================= FILTERING / SEARCHING / SORTING ================= */

function getVisibleTasks() {
  let list = state.tasks.slice();

  if (state.filter === 'active') list = list.filter((t) => !t.completed);
  if (state.filter === 'completed') list = list.filter((t) => t.completed);

  const q = state.search.trim().toLowerCase();
  if (q) {
    list = list.filter((t) =>
      t.title.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q)
    );
  }

  list.sort((a, b) => {
    switch (state.sort) {
      case 'oldest':
        return new Date(a.createdAt) - new Date(b.createdAt);
      case 'dueDate': {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      }
      case 'priority':
        return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      case 'newest':
      default:
        return new Date(b.createdAt) - new Date(a.createdAt);
    }
  });

  return list;
}

/* ================================ RENDERING =============================== */

const els = {};

function cacheEls() {
  els.taskList = document.getElementById('taskList');
  els.emptyState = document.getElementById('emptyState');
  els.emptyTitle = document.getElementById('emptyTitle');
  els.emptyBody = document.getElementById('emptyBody');
  els.emptyStateAddBtn = document.getElementById('emptyStateAddBtn');
  els.taskCardTemplate = document.getElementById('taskCardTemplate');

  els.searchInput = document.getElementById('searchInput');
  els.filterTabs = Array.from(document.querySelectorAll('.filter-tab'));
  els.sortSelect = document.getElementById('sortSelect');

  els.statTotal = document.getElementById('statTotal');
  els.statActive = document.getElementById('statActive');
  els.statCompleted = document.getElementById('statCompleted');
  els.statDueToday = document.getElementById('statDueToday');

  els.fabAddBtn = document.getElementById('fabAddBtn');

  els.taskModalOverlay = document.getElementById('taskModalOverlay');
  els.taskModalTitle = document.getElementById('taskModalTitle');
  els.taskForm = document.getElementById('taskForm');
  els.taskId = document.getElementById('taskId');
  els.taskTitle = document.getElementById('taskTitle');
  els.taskTitleError = document.getElementById('taskTitleError');
  els.taskDescription = document.getElementById('taskDescription');
  els.taskDueDate = document.getElementById('taskDueDate');
  els.taskPriority = document.getElementById('taskPriority');
  els.taskCategory = document.getElementById('taskCategory');
  els.closeTaskModalBtn = document.getElementById('closeTaskModalBtn');
  els.cancelTaskBtn = document.getElementById('cancelTaskBtn');

  els.deleteModalOverlay = document.getElementById('deleteModalOverlay');
  els.cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
  els.confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

  els.googleSignInBtn = document.getElementById('googleSignInBtn');
  els.accountSignedIn = document.getElementById('accountSignedIn');
  els.accountAvatar = document.getElementById('accountAvatar');
  els.accountName = document.getElementById('accountName');
  els.signOutBtn = document.getElementById('signOutBtn');

  els.srLive = document.getElementById('srLive');
}

function render() {
  renderTaskList();
  renderStats();
}

function renderTaskList() {
  const visible = getVisibleTasks();
  els.taskList.innerHTML = '';

  if (state.tasks.length === 0) {
    showEmptyState('first-visit');
    return;
  }
  if (visible.length === 0) {
    showEmptyState(state.filter === 'completed' ? 'no-completed' : 'no-results');
    return;
  }
  els.emptyState.hidden = true;

  const fragment = document.createDocumentFragment();
  visible.forEach((task) => fragment.appendChild(buildTaskCard(task)));
  els.taskList.appendChild(fragment);
}

function showEmptyState(kind) {
  els.emptyState.hidden = false;
  els.emptyStateAddBtn.hidden = false;

  if (kind === 'first-visit') {
    els.emptyTitle.textContent = 'Nothing on the hearth yet';
    els.emptyBody.textContent = 'Add a task to get the day going.';
  } else if (kind === 'no-results') {
    els.emptyTitle.textContent = 'No tasks found';
    els.emptyBody.textContent = 'Try a different search or filter.';
    els.emptyStateAddBtn.hidden = true;
  } else if (kind === 'no-completed') {
    els.emptyTitle.textContent = 'Nothing finished yet';
    els.emptyBody.textContent = "Completed tasks will show up here once you check something off.";
    els.emptyStateAddBtn.hidden = true;
  }
}

function buildTaskCard(task) {
  const node = els.taskCardTemplate.content.firstElementChild.cloneNode(true);
  node.dataset.id = task.id;
  node.classList.toggle('is-completed', task.completed);

  const checkBtn = node.querySelector('.task-check');
  checkBtn.setAttribute('aria-pressed', String(task.completed));
  checkBtn.setAttribute('aria-label', task.completed ? `Mark "${task.title}" as not completed` : `Mark "${task.title}" as completed`);

  node.querySelector('.task-title').textContent = task.title;
  node.querySelector('.task-description').textContent = task.description;

  const priorityBadge = node.querySelector('.badge-priority');
  priorityBadge.textContent = capitalize(task.priority) + ' priority';
  priorityBadge.classList.add(`priority-${task.priority}`);

  const categoryBadge = node.querySelector('.badge-category');
  categoryBadge.textContent = capitalize(task.category);

  const dueBadge = node.querySelector('.badge-due');
  applyDueBadge(dueBadge, task);

  node.querySelector('.task-edit').setAttribute('aria-label', `Edit "${task.title}"`);
  node.querySelector('.task-delete').setAttribute('aria-label', `Delete "${task.title}"`);

  return node;
}

function applyDueBadge(el, task) {
  if (!task.dueDate) {
    el.textContent = '';
    return;
  }
  const { label, state: dueState } = describeDueDate(task.dueDate, task.completed);
  el.textContent = label;
  el.classList.remove('is-overdue', 'is-today');
  if (dueState === 'overdue') el.classList.add('is-overdue');
  if (dueState === 'today') el.classList.add('is-today');
}

function describeDueDate(dueDateStr, completed) {
  const due = new Date(dueDateStr + 'T00:00:00');
  const today = startOfToday();
  const diffDays = Math.round((due - today) / 86400000);

  if (!completed && diffDays < 0) return { label: 'Overdue', state: 'overdue' };
  if (diffDays === 0) return { label: 'Due today', state: 'today' };
  if (diffDays === 1) return { label: 'Due tomorrow', state: 'upcoming' };
  if (diffDays > 1 && diffDays <= 7) return { label: `Due in ${diffDays} days`, state: 'upcoming' };
  return { label: `Due ${due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`, state: 'upcoming' };
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function renderStats() {
  const total = state.tasks.length;
  const completed = state.tasks.filter((t) => t.completed).length;
  const active = total - completed;
  const today = startOfToday();
  const dueToday = state.tasks.filter((t) => {
    if (!t.dueDate || t.completed) return false;
    const due = new Date(t.dueDate + 'T00:00:00');
    return due.getTime() === today.getTime();
  }).length;

  els.statTotal.textContent = String(total);
  els.statActive.textContent = String(active);
  els.statCompleted.textContent = String(completed);
  els.statDueToday.textContent = String(dueToday);
}

function announce(msg) {
  if (els.srLive) els.srLive.textContent = msg;
}

/* ================================= MODAL =================================== */

let deleteTargetId = null;
let lastFocusedEl = null;

function openTaskModal(task) {
  lastFocusedEl = document.activeElement;
  const isEdit = Boolean(task);
  els.taskModalTitle.textContent = isEdit ? 'Edit Task' : 'Add Task';
  document.getElementById('saveTaskBtn').textContent = isEdit ? 'Save Changes' : 'Save Task';

  els.taskId.value = isEdit ? task.id : '';
  els.taskTitle.value = isEdit ? task.title : '';
  els.taskDescription.value = isEdit ? task.description : '';
  els.taskDueDate.value = isEdit ? (task.dueDate || '') : '';
  els.taskPriority.value = isEdit ? task.priority : 'medium';
  els.taskCategory.value = isEdit ? task.category : 'personal';

  clearFieldError();
  els.taskModalOverlay.hidden = false;
  document.body.style.overflow = 'hidden';
  window.setTimeout(() => els.taskTitle.focus(), 50);
}

function closeTaskModal() {
  els.taskModalOverlay.hidden = true;
  document.body.style.overflow = '';
  if (lastFocusedEl) lastFocusedEl.focus();
}

function clearFieldError() {
  els.taskTitleError.hidden = true;
  els.taskTitle.closest('.field').classList.remove('has-error');
}

function openDeleteModal(id) {
  lastFocusedEl = document.activeElement;
  deleteTargetId = id;
  els.deleteModalOverlay.hidden = false;
  document.body.style.overflow = 'hidden';
  window.setTimeout(() => els.confirmDeleteBtn.focus(), 50);
}

function closeDeleteModal() {
  els.deleteModalOverlay.hidden = true;
  document.body.style.overflow = '';
  deleteTargetId = null;
  if (lastFocusedEl) lastFocusedEl.focus();
}

/* ============================== FORM HANDLING =============================== */

function handleTaskFormSubmit(e) {
  e.preventDefault();
  const title = els.taskTitle.value;

  if (!title.trim()) {
    els.taskTitleError.hidden = false;
    els.taskTitle.closest('.field').classList.add('has-error');
    els.taskTitle.focus();
    return;
  }

  const data = {
    title,
    description: els.taskDescription.value,
    dueDate: els.taskDueDate.value || null,
    priority: els.taskPriority.value,
    category: els.taskCategory.value,
  };

  const id = els.taskId.value;
  if (id) {
    updateTask(id, data);
    announce(`Task "${data.title}" updated.`);
  } else {
    addTask(data);
    announce(`Task "${data.title}" added.`);
  }

  closeTaskModal();
  render();
}

/* ============================== AUTHENTICATION =============================== */

function loadAuth() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && typeof parsed.name === 'string') return parsed;
    return null;
  } catch {
    return null;
  }
}

function saveAuth(user) {
  try {
    if (user) localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    else localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (err) {
    console.warn('Hearth: could not persist sign-in state.', err);
  }
}

function renderAccountArea() {
  if (state.user) {
    els.googleSignInBtn.hidden = true;
    els.accountSignedIn.hidden = false;
    els.accountName.textContent = state.user.name;
    els.accountAvatar.src = state.user.picture || '';
    els.accountAvatar.alt = state.user.name;
  } else {
    els.accountSignedIn.hidden = true;
    els.googleSignInBtn.hidden = !GOOGLE_CLIENT_ID;
  }
}

function decodeGoogleCredential(credential) {
  try {
    const payloadBase64 = credential.split('.')[1];
    const json = decodeURIComponent(
      atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'))
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')
    );
    return JSON.parse(json);
  } catch (err) {
    console.warn('Hearth: could not read Google credential.', err);
    return null;
  }
}

function handleGoogleCredentialResponse(response) {
  const payload = decodeGoogleCredential(response.credential);
  if (!payload) return;
  state.user = {
    name: payload.name || payload.email || 'Signed in',
    email: payload.email || '',
    picture: payload.picture || '',
  };
  saveAuth(state.user);
  renderAccountArea();
  announce(`Signed in as ${state.user.name}.`);
}

function initGoogleSignIn() {
  if (!GOOGLE_CLIENT_ID) return; // Google Sign-In not configured — app works fully without it.

  const start = () => {
    if (!window.google || !window.google.accounts || !window.google.accounts.id) {
      window.setTimeout(start, 200);
      return;
    }
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleCredentialResponse,
      auto_select: false,
    });
    els.googleSignInBtn.hidden = Boolean(state.user);
  };
  start();
}

function handleGoogleSignInClick() {
  if (!GOOGLE_CLIENT_ID) return;
  if (window.google && window.google.accounts && window.google.accounts.id) {
    window.google.accounts.id.prompt();
  }
}

function handleSignOut() {
  state.user = null;
  saveAuth(null);
  if (window.google && window.google.accounts && window.google.accounts.id) {
    try { window.google.accounts.id.disableAutoSelect(); } catch { /* no-op */ }
  }
  renderAccountArea();
  announce('Signed out.');
}

/* ============================== EVENT LISTENERS =============================== */

function bindEvents() {
  els.fabAddBtn.addEventListener('click', () => openTaskModal(null));
  els.emptyStateAddBtn.addEventListener('click', () => openTaskModal(null));

  els.closeTaskModalBtn.addEventListener('click', closeTaskModal);
  els.cancelTaskBtn.addEventListener('click', closeTaskModal);
  els.taskModalOverlay.addEventListener('click', (e) => {
    if (e.target === els.taskModalOverlay) closeTaskModal();
  });
  els.taskForm.addEventListener('submit', handleTaskFormSubmit);
  els.taskTitle.addEventListener('input', clearFieldError);

  els.cancelDeleteBtn.addEventListener('click', closeDeleteModal);
  els.deleteModalOverlay.addEventListener('click', (e) => {
    if (e.target === els.deleteModalOverlay) closeDeleteModal();
  });
  els.confirmDeleteBtn.addEventListener('click', () => {
    if (deleteTargetId) {
      const card = els.taskList.querySelector(`[data-id="${CSS.escape(deleteTargetId)}"]`);
      const idToDelete = deleteTargetId;
      closeDeleteModal();
      if (card) {
        card.classList.add('is-removing');
        window.setTimeout(() => {
          deleteTask(idToDelete);
          announce('Task deleted.');
          render();
        }, 170);
      } else {
        deleteTask(idToDelete);
        render();
      }
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!els.taskModalOverlay.hidden) closeTaskModal();
    if (!els.deleteModalOverlay.hidden) closeDeleteModal();
  });

  els.taskList.addEventListener('click', (e) => {
    const card = e.target.closest('.task-card');
    if (!card) return;
    const id = card.dataset.id;

    if (e.target.closest('.task-check')) {
      toggleTask(id);
      render();
      return;
    }
    if (e.target.closest('.task-edit')) {
      const task = state.tasks.find((t) => t.id === id);
      if (task) openTaskModal(task);
      return;
    }
    if (e.target.closest('.task-delete')) {
      openDeleteModal(id);
      return;
    }
  });

  let searchDebounce;
  els.searchInput.addEventListener('input', () => {
    window.clearTimeout(searchDebounce);
    searchDebounce = window.setTimeout(() => {
      state.search = els.searchInput.value;
      renderTaskList();
    }, 120);
  });

  els.filterTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      state.filter = tab.dataset.filter;
      els.filterTabs.forEach((t) => {
        t.classList.toggle('is-active', t === tab);
        t.setAttribute('aria-selected', String(t === tab));
      });
      renderTaskList();
    });
  });

  els.sortSelect.addEventListener('change', () => {
    state.sort = els.sortSelect.value;
    renderTaskList();
  });

  els.googleSignInBtn.addEventListener('click', handleGoogleSignInClick);
  els.signOutBtn.addEventListener('click', handleSignOut);
}

/* ================================ INITIALIZATION =============================== */

function init() {
  cacheEls();
  state.tasks = loadTasks();
  state.user = loadAuth();

  bindEvents();
  renderAccountArea();
  initGoogleSignIn();
  render();
}


document.addEventListener('DOMContentLoaded', init);