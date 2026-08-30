'use strict';

/* =========================================================
   NOTES APP — vanilla JS, LocalStorage only.
   Code map:
     Storage layer  -> loadNotes, saveNotes
     Data ops       -> createNote, updateNote, deleteNoteById, togglePin
     Derived data   -> getVisibleNotes (search + sort)
     Rendering      -> renderList, renderNoteCard, renderEmptyState
     Editor         -> openEditor, closeEditor, scheduleAutoSave
     Utilities      -> formatDate, debounce, showToast, escapeForMatch
     Dialog         -> confirmDelete
     Wiring         -> event listeners + keyboard shortcuts
   ========================================================= */

const STORAGE_KEY = 'notesApp_notes';
const PREVIEW_LIMIT = 140;

/** @typedef {{id:string,title:string,content:string,createdAt:string,updatedAt:string,pinned:boolean}} Note */

/** @type {Note[]} */
let notes = [];
let currentEditId = null;
let searchQuery = '';
let sortKey = 'updated-desc';
let autoSaveTimer = null;
let pendingDeleteId = null;

/* ----------------------- DOM refs ----------------------- */
const notesGrid = document.getElementById('notes-grid');
const emptyState = document.getElementById('empty-state');
const resultsStatus = document.getElementById('results-status');
const allNotesCount = document.getElementById('all-notes-count');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search');
const sortSelect = document.getElementById('sort-select');

const listView = document.getElementById('list-view');
const editorView = document.getElementById('editor-view');
const newNoteBtn = document.getElementById('new-note-btn');
const emptyNewNoteBtn = document.getElementById('empty-new-note-btn');
const backBtn = document.getElementById('back-btn');
const saveStatus = document.getElementById('save-status');

const titleInput = document.getElementById('note-title-input');
const contentInput = document.getElementById('note-content-input');
const wordCharCount = document.getElementById('word-char-count');
const pinBtn = document.getElementById('pin-btn');
const pinBtnLabel = document.getElementById('pin-btn-label');
const copyBtn = document.getElementById('copy-btn');
const deleteBtn = document.getElementById('delete-btn');

const confirmDialog = document.getElementById('confirm-dialog');
const confirmCancelBtn = document.getElementById('confirm-cancel');
const confirmDeleteBtn = document.getElementById('confirm-delete');

const toastRegion = document.getElementById('toast-region');

/* ===================================================================
   STORAGE LAYER
   =================================================================== */

function loadNotes() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('Corrupted notes data');
    // Basic shape validation so a corrupted entry cannot crash rendering.
    return parsed.filter(n => n && typeof n.id === 'string' && typeof n.title === 'string')
      .map(n => ({
        id: n.id,
        title: n.title || '',
        content: typeof n.content === 'string' ? n.content : '',
        createdAt: n.createdAt || new Date().toISOString(),
        updatedAt: n.updatedAt || n.createdAt || new Date().toISOString(),
        pinned: !!n.pinned
      }));
  } catch (err) {
    console.error('Failed to parse notes from LocalStorage:', err);
    showToast('Could not read saved notes — starting fresh');
    return [];
  }
}

function saveNotes() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    return true;
  } catch (err) {
    console.error('Failed to save notes to LocalStorage:', err);
    showToast('Could not save — storage may be full');
    return false;
  }
}

function generateId() {
  return `note_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

/* ===================================================================
   DATA OPERATIONS
   =================================================================== */

function createNote() {
  const now = new Date().toISOString();
  /** @type {Note} */
  const note = { id: generateId(), title: '', content: '', createdAt: now, updatedAt: now, pinned: false };
  notes.unshift(note);
  saveNotes();
  refreshCounts();
  openEditor(note.id, { isNew: true });
}

function updateNote(id, fields) {
  const note = notes.find(n => n.id === id);
  if (!note) return;
  Object.assign(note, fields, { updatedAt: new Date().toISOString() });
  saveNotes();
}

function deleteNoteById(id) {
  notes = notes.filter(n => n.id !== id);
  saveNotes();
  refreshCounts();
}

function togglePin(id) {
  const note = notes.find(n => n.id === id);
  if (!note) return;
  note.pinned = !note.pinned;
  note.updatedAt = new Date().toISOString();
  saveNotes();
  updatePinButton(note);
  renderList();
}

/* ===================================================================
   DERIVED DATA — search + sort
   =================================================================== */

function getVisibleNotes() {
  const q = searchQuery.trim().toLowerCase();
  let list = notes;
  if (q) {
    list = notes.filter(n =>
      n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
    );
  }
  const sorted = [...list].sort((a, b) => {
    switch (sortKey) {
      case 'created-desc': return new Date(b.createdAt) - new Date(a.createdAt);
      case 'created-asc': return new Date(a.createdAt) - new Date(b.createdAt);
      case 'az': return a.title.localeCompare(b.title);
      case 'za': return b.title.localeCompare(a.title);
      case 'updated-desc':
      default: return new Date(b.updatedAt) - new Date(a.updatedAt);
    }
  });
  // Pinned notes float to the top, preserving the chosen sort within each group.
  const pinned = sorted.filter(n => n.pinned);
  const rest = sorted.filter(n => !n.pinned);
  return [...pinned, ...rest];
}

/* ===================================================================
   RENDERING
   =================================================================== */

function refreshCounts() {
  allNotesCount.textContent = String(notes.length);
}

function renderList() {
  const visible = getVisibleNotes();
  notesGrid.innerHTML = '';

  const isSearching = searchQuery.trim().length > 0;

  if (notes.length === 0) {
    emptyState.hidden = false;
    notesGrid.hidden = true;
    document.getElementById('empty-title').textContent = 'No notes yet';
    document.getElementById('empty-message').textContent = 'Capture your first idea and keep everything organized.';
    document.getElementById('empty-new-note-btn').hidden = false;
    resultsStatus.textContent = '0 Notes';
    refreshCounts();
    return;
  }

  if (isSearching && visible.length === 0) {
    emptyState.hidden = false;
    notesGrid.hidden = true;
    document.getElementById('empty-title').textContent = 'No notes found';
    document.getElementById('empty-message').textContent = 'Try a different keyword.';
    document.getElementById('empty-new-note-btn').hidden = true;
    resultsStatus.textContent = 'No notes found';
    refreshCounts();
    return;
  }

  emptyState.hidden = true;
  notesGrid.hidden = false;

  const frag = document.createDocumentFragment();
  visible.forEach(note => frag.appendChild(renderNoteCard(note, searchQuery.trim())));
  notesGrid.appendChild(frag);

  if (isSearching) {
    resultsStatus.textContent = `${visible.length} ${visible.length === 1 ? 'note' : 'notes'} found`;
  } else {
    resultsStatus.textContent = `${notes.length} ${notes.length === 1 ? 'Note' : 'Notes'}`;
  }
  refreshCounts();
}

/**
 * Safely builds highlighted text as DOM nodes (never innerHTML with raw
 * user/query text) so search highlighting cannot introduce XSS.
 */
function appendHighlighted(container, text, query) {
  if (!query) {
    container.appendChild(document.createTextNode(text));
    return;
  }
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  let cursor = 0;
  let idx = lowerText.indexOf(lowerQuery, cursor);
  if (idx === -1) {
    container.appendChild(document.createTextNode(text));
    return;
  }
  while (idx !== -1) {
    if (idx > cursor) container.appendChild(document.createTextNode(text.slice(cursor, idx)));
    const mark = document.createElement('mark');
    mark.textContent = text.slice(idx, idx + query.length);
    container.appendChild(mark);
    cursor = idx + query.length;
    idx = lowerText.indexOf(lowerQuery, cursor);
  }
  if (cursor < text.length) container.appendChild(document.createTextNode(text.slice(cursor)));
}

function renderNoteCard(note, query) {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'note-card' + (note.pinned ? ' is-pinned' : '');
  card.setAttribute('aria-label', `Open note: ${note.title || 'Untitled note'}`);
  card.addEventListener('click', () => openEditor(note.id));

  if (note.pinned) {
    const pin = document.createElement('span');
    pin.className = 'pin-badge';
    pin.setAttribute('aria-hidden', 'true');
    card.appendChild(pin);
  }

  const title = document.createElement('h3');
  title.className = 'note-card-title';
  appendHighlighted(title, note.title || 'Untitled note', query);
  card.appendChild(title);

  const preview = document.createElement('p');
  preview.className = 'note-card-preview';
  const previewText = note.content.length > PREVIEW_LIMIT
    ? note.content.slice(0, PREVIEW_LIMIT).trim() + '…'
    : note.content;
  appendHighlighted(preview, previewText || 'No additional text', query);
  card.appendChild(preview);

  const meta = document.createElement('p');
  meta.className = 'note-card-meta';
  meta.textContent = `Updated: ${formatDate(note.updatedAt)}`;
  card.appendChild(meta);

  return card;
}

/* ===================================================================
   EDITOR
   =================================================================== */

function openEditor(id, opts = {}) {
  const note = notes.find(n => n.id === id);
  if (!note) return;
  currentEditId = id;

  titleInput.value = note.title;
  contentInput.value = note.content;
  updatePinButton(note);
  updateCounter();
  setSaveStatus('saved');

  listView.hidden = true;
  editorView.hidden = false;

  window.setTimeout(() => {
    if (opts.isNew) titleInput.focus();
    else titleInput.focus({ preventScroll: true });
  }, 0);
}

function closeEditor() {
  flushAutoSave();
  currentEditId = null;
  editorView.hidden = true;
  listView.hidden = false;
  renderList();
}

function updatePinButton(note) {
  const pinned = !!note.pinned;
  pinBtn.setAttribute('aria-pressed', String(pinned));
  pinBtnLabel.textContent = pinned ? 'Pinned' : 'Pin';
}

function updateCounter() {
  const text = contentInput.value;
  const chars = text.length;
  const words = text.trim().length ? text.trim().split(/\s+/).length : 0;
  wordCharCount.textContent = `${chars} character${chars === 1 ? '' : 's'} · ${words} word${words === 1 ? '' : 's'}`;
}

function setSaveStatus(state) {
  if (state === 'saving') {
    saveStatus.textContent = 'Saving...';
    saveStatus.classList.add('is-saving');
  } else {
    saveStatus.textContent = 'Saved';
    saveStatus.classList.remove('is-saving');
  }
}

function scheduleAutoSave() {
  if (!currentEditId) return;
  setSaveStatus('saving');
  clearTimeout(autoSaveTimer);
  autoSaveTimer = window.setTimeout(() => {
    persistEditorFields();
  }, 500);
}

function flushAutoSave() {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = null;
    persistEditorFields();
  }
}

function persistEditorFields() {
  if (!currentEditId) return;
  updateNote(currentEditId, { title: titleInput.value, content: contentInput.value });
  setSaveStatus('saved');
}

/* ===================================================================
   UTILITIES
   =================================================================== */

function formatDate(isoString) {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / 86400000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function debounce(fn, delay) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

let toastCounter = 0;
function showToast(message) {
  const id = ++toastCounter;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  toast.dataset.toastId = String(id);
  toastRegion.appendChild(toast);

  window.setTimeout(() => {
    toast.classList.add('is-leaving');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, 2200);
}

/* ===================================================================
   DELETE CONFIRMATION DIALOG
   =================================================================== */

function requestDelete(id) {
  pendingDeleteId = id;
  if (typeof confirmDialog.showModal === 'function') {
    confirmDialog.showModal();
  } else {
    // Fallback for browsers without <dialog> support.
    if (window.confirm('Delete this note? This action cannot be undone.')) {
      performPendingDelete();
    }
  }
}

function performPendingDelete() {
  if (!pendingDeleteId) return;
  const wasInEditor = currentEditId === pendingDeleteId;
  deleteNoteById(pendingDeleteId);
  pendingDeleteId = null;
  showToast('Note deleted');
  if (wasInEditor) {
    currentEditId = null;
    editorView.hidden = true;
    listView.hidden = false;
  }
  renderList();
}

confirmCancelBtn.addEventListener('click', () => {
  pendingDeleteId = null;
  confirmDialog.close();
});
confirmDeleteBtn.addEventListener('click', () => {
  confirmDialog.close();
  performPendingDelete();
});
confirmDialog.addEventListener('cancel', () => { pendingDeleteId = null; });
confirmDialog.addEventListener('click', (e) => {
  // Click on the backdrop (the dialog element itself, outside its content box) cancels.
  const rect = confirmDialog.getBoundingClientRect();
  const inside = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
  if (!inside) confirmDialog.close();
});

/* ===================================================================
   WIRING
   =================================================================== */

newNoteBtn.addEventListener('click', createNote);
emptyNewNoteBtn.addEventListener('click', createNote);
backBtn.addEventListener('click', closeEditor);

titleInput.addEventListener('input', scheduleAutoSave);
contentInput.addEventListener('input', () => { updateCounter(); scheduleAutoSave(); });

pinBtn.addEventListener('click', () => {
  if (!currentEditId) return;
  togglePin(currentEditId);
});

copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(contentInput.value);
    showToast('Copied!');
  } catch (err) {
    console.error('Clipboard copy failed:', err);
    // Fallback: select the textarea content so the user can copy manually.
    contentInput.focus();
    contentInput.select();
    showToast('Press Ctrl/Cmd+C to copy');
  }
});

deleteBtn.addEventListener('click', () => {
  if (currentEditId) requestDelete(currentEditId);
});

const debouncedSearch = debounce((value) => {
  searchQuery = value;
  clearSearchBtn.hidden = value.length === 0;
  renderList();
}, 150);

searchInput.addEventListener('input', (e) => debouncedSearch(e.target.value));

clearSearchBtn.addEventListener('click', () => {
  searchInput.value = '';
  searchQuery = '';
  clearSearchBtn.hidden = true;
  renderList();
  searchInput.focus();
});

sortSelect.addEventListener('change', (e) => {
  sortKey = e.target.value;
  renderList();
});

document.getElementById('all-notes-btn').addEventListener('click', () => {
  searchInput.value = '';
  searchQuery = '';
  clearSearchBtn.hidden = true;
  renderList();
});

/* ---- keyboard shortcuts ---- */
document.addEventListener('keydown', (e) => {
  const cmdOrCtrl = e.metaKey || e.ctrlKey;

  if (cmdOrCtrl && e.key.toLowerCase() === 'n') {
    e.preventDefault();
    createNote();
    return;
  }

  if (cmdOrCtrl && e.key.toLowerCase() === 'f') {
    // Only hijack this shortcut when we are not already inside the editor's
    // own text fields, so normal text editing is never interrupted.
    if (document.activeElement !== titleInput && document.activeElement !== contentInput) {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
    }
    return;
  }

  if (e.key === 'Escape') {
    if (confirmDialog.open) {
      return; // <dialog> handles its own Escape-to-cancel behavior.
    }
    if (!editorView.hidden) {
      closeEditor();
    }
  }
});

// Flush any pending autosave before the page unloads.
window.addEventListener('beforeunload', () => {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
    persistEditorFields();
  }
});

/* ===================================================================
   INIT
   =================================================================== */

function init() {
  notes = loadNotes();
  refreshCounts();
  renderList();
}

init();
