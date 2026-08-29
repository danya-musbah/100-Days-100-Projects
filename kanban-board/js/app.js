/* ==========================================================================
   app.js — application bootstrap & event wiring
   ========================================================================== */
(function () {
  'use strict';

  const store = new KanbanState.Store();
  let saveTimer = null;
  let serverAvailable = false;

  /* ======================= INIT ======================= */

  async function init() {
    KanbanUI.init(store);

    const savedSettings = safeParse(localStorage.getItem('kanban.settings.v1'));
    if (savedSettings) store.data.settings = { ...KanbanState.DEFAULT_SETTINGS, ...savedSettings };

    await loadInitialData();

    KanbanSettings.applySettings(store.data.settings);
    KanbanSettings.populateSettingsForm(store.data.settings);

    KanbanDragDrop.init(store);
    KanbanTouchDrag.init(store);

    wireHeader();
    wireSidebar();
    wireMobileActionBar();
    wireTaskModal();
    wireColumnModal();
    wireDetailModal();
    wireColumnMenuPopover();
    wireSettingsModal();
    wireImportModal();
    wireCommandMenu();
    wireFilterPanel();
    wireSortPanel();
    wireBoardDelegation();
    wireKeyboardShortcuts();

    store.addEventListener('data:changed', onDataChanged);
    store.addEventListener('board:rerender', () => KanbanUI.renderBoard());
    store.addEventListener('board:saveNeeded', scheduleSave);

    KanbanUI.renderBoard();
    updateStorageStatus();
    registerServiceWorker();
  }

  function registerServiceWorker() {
    // Optional PWA support. Silently does nothing on file:// or unsupported browsers.
    if ('serviceWorker' in navigator && (location.protocol === 'http:' || location.protocol === 'https:')) {
      navigator.serviceWorker.register('service-worker.js').catch(() => { /* non-critical */ });
    }
  }

  function safeParse(json) {
    try { return json ? JSON.parse(json) : null; } catch (e) { return null; }
  }

  async function loadInitialData() {
    if (store.data.settings.storageMode === 'server') {
      serverAvailable = await KanbanStorage.pingServer();
      if (serverAvailable) {
        const serverData = await KanbanStorage.loadServer();
        if (serverData) { store.setData(serverData, { silent: true }); return; }
      }
    }
    const local = KanbanStorage.loadLocal();
    if (local) {
      store.setData(local, { silent: true });
    } else {
      store.setData(KanbanState.emptyBoard(), { silent: true });
    }
  }

  /* ======================= SAVE / PERSISTENCE ======================= */

  function onDataChanged(e) {
    KanbanUI.renderBoard();
    scheduleSave();
  }

  function scheduleSave() {
    setSaveStatus('saving');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(doSave, 350);
  }

  async function doSave() {
    const mode = store.data.settings.storageMode;
    let ok = false;
    if (mode === 'server') {
      ok = serverAvailable && await KanbanStorage.saveServer(store.data);
      if (!ok) {
        // graceful fallback
        KanbanStorage.saveLocal(store.data);
        if (serverAvailable) {
          serverAvailable = false;
          KanbanToast.warning('Python server unavailable — switched to local storage');
        }
      }
    } else {
      ok = KanbanStorage.saveLocal(store.data);
    }
    localStorage.setItem('kanban.settings.v1', JSON.stringify(store.data.settings));
    setSaveStatus(ok ? 'saved' : 'offline');
    updateStorageStatus();
  }

  function setSaveStatus(state) {
    const dot = document.getElementById('storage-status-dot');
    const text = document.getElementById('storage-status-text');
    if (state === 'saving') {
      dot.className = 'status-dot saving';
      text.textContent = 'Saving…';
    } else if (state === 'offline') {
      dot.className = 'status-dot offline';
      text.textContent = 'Storage unavailable — changes not saved';
    } else {
      updateStorageStatus();
    }
  }

  function updateStorageStatus() {
    const dot = document.getElementById('storage-status-dot');
    const text = document.getElementById('storage-status-text');
    const mode = store.data.settings.storageMode;
    if (mode === 'server' && serverAvailable) {
      dot.className = 'status-dot';
      text.textContent = 'Python server connected';
    } else if (mode === 'server' && !serverAvailable) {
      dot.className = 'status-dot offline';
      text.textContent = 'Server unavailable — local storage active';
    } else if (!KanbanStorage.localStorageAvailable) {
      dot.className = 'status-dot offline';
      text.textContent = 'Local storage unavailable';
    } else {
      dot.className = 'status-dot';
      text.textContent = 'Local storage active';
    }
  }

  /* ======================= HEADER ======================= */

  function wireHeader() {
    document.getElementById('board-name-input').addEventListener('change', (e) => {
      store.data.board.name = e.target.value.trim() || 'My Kanban Board';
      store.touchBoard();
      scheduleSave();
    });

    const searchInput = document.getElementById('search-input');
    const searchClear = document.getElementById('search-clear');
    const onSearch = KanbanUtils.debounce((val) => {
      store.search = val;
      KanbanUI.renderBoard();
    }, 150);
    searchInput.addEventListener('input', (e) => {
      searchClear.hidden = !e.target.value;
      onSearch(e.target.value);
    });
    searchClear.addEventListener('click', () => {
      searchInput.value = '';
      searchClear.hidden = true;
      store.search = '';
      KanbanUI.renderBoard();
      searchInput.focus();
    });

    document.getElementById('add-task-btn').addEventListener('click', () => KanbanUI.openTaskModal({ mode: 'create' }));

    document.getElementById('filters-btn').addEventListener('click', (e) => {
      KanbanModal.openPopover(document.getElementById('filters-panel'), e.currentTarget);
    });
    document.getElementById('sort-btn').addEventListener('click', (e) => {
      KanbanModal.openPopover(document.getElementById('sort-panel'), e.currentTarget);
    });

    document.getElementById('theme-toggle-btn').addEventListener('click', () => {
      store.data.settings.theme = store.data.settings.theme === 'dark' ? 'light' : 'dark';
      KanbanSettings.applySettings(store.data.settings);
      KanbanSettings.populateSettingsForm(store.data.settings);
      scheduleSave();
    });

    document.getElementById('settings-btn').addEventListener('click', () => {
      KanbanSettings.populateSettingsForm(store.data.settings);
      KanbanModal.open(document.getElementById('settings-modal-overlay'));
    });

    document.getElementById('command-menu-btn').addEventListener('click', openCommandMenu);

    document.getElementById('mobile-menu-btn').addEventListener('click', (e) => {
      const sidebar = document.getElementById('app-sidebar');
      const isOpen = sidebar.classList.toggle('open');
      e.currentTarget.setAttribute('aria-expanded', String(isOpen));
    });
  }

  /* ======================= SIDEBAR ======================= */

  function wireSidebar() {
    document.getElementById('load-demo-btn').addEventListener('click', loadDemo);
    document.getElementById('add-column-btn').addEventListener('click', () => KanbanUI.openColumnModal('create'));
    document.getElementById('export-btn').addEventListener('click', () => {
      KanbanImportExport.exportBoard(store);
      KanbanToast.success('Board exported');
    });
    document.getElementById('import-btn').addEventListener('click', () => {
      document.getElementById('import-error-msg').hidden = true;
      document.getElementById('import-file-input').value = '';
      document.getElementById('import-confirm-btn').disabled = true;
      KanbanModal.open(document.getElementById('import-modal-overlay'));
    });
    document.getElementById('reset-board-btn').addEventListener('click', resetBoardFlow);
  }

  async function loadDemo() {
    const { confirmed } = await KanbanModal.confirmDialog({
      title: 'Load demo board?',
      message: 'This will replace your current board with sample tasks. Your current data will be lost unless exported first.',
      confirmLabel: 'Load Demo',
      danger: false,
    });
    if (!confirmed) return;
    try {
      const res = await fetch('data/demo-board.json');
      const demo = await res.json();
      applyFreshBoard(demo);
      KanbanToast.success('Demo board loaded');
    } catch (e) {
      applyFreshBoard(buildInlineDemo());
      KanbanToast.success('Demo board loaded');
    }
  }

  function applyFreshBoard(data) {
    data.board.updatedAt = KanbanUtils.nowISO();
    store.setData(data);
    store.filters = { priority: [], labels: [], columnId: [], due: [], status: [] };
    store.search = '';
    document.getElementById('search-input').value = '';
    document.getElementById('search-clear').hidden = true;
    KanbanUI.renderBoard();
    scheduleSave();
  }

  function buildInlineDemo() {
    // Fallback demo data if data/demo-board.json can't be fetched (e.g. file:// without a server).
    const now = KanbanUtils.nowISO();
    const cols = [
      { id: 'todo', title: 'To Do', position: 0 },
      { id: 'in-progress', title: 'In Progress', position: 1 },
      { id: 'review', title: 'Review', position: 2 },
      { id: 'done', title: 'Done', position: 3 },
    ];
    const mk = (i, columnId, title, priority, labels, dueDate, checklist) => ({
      id: `demo-${i}`, columnId, title, description: '', priority, labels,
      dueDate, dueTime: null, assignee: ['Mara T.', 'Devon K.', 'Priya S.'][i % 3],
      checklist: checklist || [], position: i, createdAt: now, updatedAt: now,
    });
    const tasks = [
      mk(0, 'todo', 'Design landing page', 'high', ['Design', 'Frontend'], null, []),
      mk(1, 'todo', 'Research authentication', 'medium', ['Research'], null, []),
      mk(2, 'todo', 'Write project documentation', 'low', ['Design'], null, []),
      mk(3, 'in-progress', 'Build dashboard', 'urgent', ['Frontend', 'Feature'], null, []),
      mk(4, 'in-progress', 'Implement search', 'medium', ['Feature'], null, []),
      mk(5, 'review', 'Test responsive layout', 'high', ['Bug'], null, []),
      mk(6, 'review', 'Review API integration', 'medium', ['Backend'], null, []),
      mk(7, 'done', 'Create project structure', 'low', ['Backend'], null, []),
      mk(8, 'done', 'Implement navigation', 'medium', ['Frontend'], null, []),
    ];
    return { board: { id: 'default-board', name: 'Product Launch Board', createdAt: now, updatedAt: now }, columns: cols, tasks, settings: { ...KanbanState.DEFAULT_SETTINGS } };
  }

  async function resetBoardFlow() {
    const extraHTML = `
      <label for="reset-choice">Reset to:</label>
      <select id="reset-choice">
        <option value="empty">Empty board</option>
        <option value="demo">Demo board</option>
      </select>`;
    const { confirmed, extraEl } = await KanbanModal.confirmDialog({
      title: 'Reset board?',
      message: 'This replaces all columns and tasks. This cannot be undone.',
      confirmLabel: 'Reset',
      extraHTML,
    });
    if (!confirmed) return;
    const choice = extraEl.querySelector('#reset-choice').value;
    if (choice === 'demo') {
      try {
        const res = await fetch('data/demo-board.json');
        applyFreshBoard(await res.json());
      } catch (e) {
        applyFreshBoard(buildInlineDemo());
      }
    } else {
      applyFreshBoard(KanbanState.emptyBoard());
    }
    KanbanToast.success('Board reset');
  }

  /* ======================= MOBILE ACTION BAR ======================= */

  function wireMobileActionBar() {
    document.getElementById('mab-search').addEventListener('click', () => document.getElementById('search-input').focus());
    document.getElementById('mab-filter').addEventListener('click', (e) => KanbanModal.openPopover(document.getElementById('filters-panel'), document.getElementById('filters-btn')));
    document.getElementById('mab-add').addEventListener('click', () => KanbanUI.openTaskModal({ mode: 'create' }));
    document.getElementById('mab-stats').addEventListener('click', () => {
      const sidebar = document.getElementById('app-sidebar');
      sidebar.classList.add('open');
    });
    document.getElementById('mab-menu').addEventListener('click', () => {
      document.getElementById('app-sidebar').classList.toggle('open');
    });
  }

  /* ======================= TASK MODAL ======================= */

  function wireTaskModal() {
    const overlay = document.getElementById('task-modal-overlay');
    document.getElementById('task-modal-close').addEventListener('click', KanbanUI.closeTaskModal);
    document.getElementById('task-cancel-btn').addEventListener('click', KanbanUI.closeTaskModal);

    document.getElementById('task-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const fields = KanbanUI.getTaskFormData();
      if (!fields.title.trim()) {
        KanbanToast.error('Task title is required');
        document.getElementById('task-title').focus();
        return;
      }
      const editingId = KanbanUI.getEditingTaskId();
      if (editingId) {
        KanbanTasks.updateTask(store, editingId, fields);
        KanbanToast.success('Task updated');
      } else {
        KanbanTasks.createTask(store, fields);
        KanbanToast.success('Task created');
      }
      KanbanUI.closeTaskModal();
    });

    document.getElementById('task-delete-btn').addEventListener('click', () => {
      const editingId = KanbanUI.getEditingTaskId();
      if (editingId) KanbanUI.requestDeleteTask(editingId, KanbanUI.closeTaskModal);
    });

    document.getElementById('new-label-btn').addEventListener('click', addCustomLabel);
    document.getElementById('new-label-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); addCustomLabel(); }
    });

    document.getElementById('new-checklist-btn').addEventListener('click', addChecklistItem);
    document.getElementById('new-checklist-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); addChecklistItem(); }
    });
  }

  function addCustomLabel() {
    const input = document.getElementById('new-label-input');
    const val = input.value.trim();
    if (!val) return;
    KanbanUI.addLabelToDraft(val);
    input.value = '';
  }

  function addChecklistItem() {
    const input = document.getElementById('new-checklist-input');
    const val = input.value.trim();
    if (!val) return;
    KanbanUI.addChecklistItemToDraft(val);
    input.value = '';
  }

  /* ======================= COLUMN MODAL ======================= */

  function wireColumnModal() {
    document.getElementById('column-modal-close').addEventListener('click', () => KanbanModal.close(document.getElementById('column-modal-overlay')));
    document.getElementById('column-cancel-btn').addEventListener('click', () => KanbanModal.close(document.getElementById('column-modal-overlay')));

    document.getElementById('column-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const title = document.getElementById('column-title-input').value.trim();
      if (!title) return;
      const editingId = KanbanUI.getEditingColumnId();
      if (editingId) {
        KanbanColumns.renameColumn(store, editingId, title);
        KanbanToast.success('Column renamed');
      } else {
        KanbanColumns.createColumn(store, title);
        KanbanToast.success('Column added');
      }
      KanbanModal.close(document.getElementById('column-modal-overlay'));
    });
  }

  /* ======================= TASK DETAIL MODAL ======================= */

  function wireDetailModal() {
    const overlay = document.getElementById('detail-modal-overlay');
    document.getElementById('detail-modal-close').addEventListener('click', () => KanbanUI.closeDetailModal());
    document.getElementById('detail-close-btn').addEventListener('click', () => KanbanUI.closeDetailModal());
  }

  /* ======================= COLUMN MENU POPOVER ======================= */

  function wireColumnMenuPopover() {
    document.getElementById('col-menu-rename').addEventListener('click', () => {
      const id = KanbanUI.getActiveColumnMenuId();
      const col = store.getColumn(id);
      KanbanModal.closePopover(document.getElementById('column-menu-panel'));
      if (col) KanbanUI.openColumnModal('edit', col);
    });
    document.getElementById('col-menu-move-left').addEventListener('click', () => {
      const id = KanbanUI.getActiveColumnMenuId();
      KanbanModal.closePopover(document.getElementById('column-menu-panel'));
      if (KanbanColumns.moveColumn(store, id, -1)) KanbanUI.renderBoard();
    });
    document.getElementById('col-menu-move-right').addEventListener('click', () => {
      const id = KanbanUI.getActiveColumnMenuId();
      KanbanModal.closePopover(document.getElementById('column-menu-panel'));
      if (KanbanColumns.moveColumn(store, id, 1)) KanbanUI.renderBoard();
    });
    document.getElementById('col-menu-delete').addEventListener('click', () => {
      const id = KanbanUI.getActiveColumnMenuId();
      KanbanModal.closePopover(document.getElementById('column-menu-panel'));
      KanbanUI.requestDeleteColumn(id);
    });
  }

  /* ======================= SETTINGS MODAL ======================= */

  function wireSettingsModal() {
    document.getElementById('settings-modal-close').addEventListener('click', () => KanbanModal.close(document.getElementById('settings-modal-overlay')));
    document.getElementById('settings-done-btn').addEventListener('click', () => KanbanModal.close(document.getElementById('settings-modal-overlay')));

    document.getElementById('setting-theme').addEventListener('change', (e) => {
      store.data.settings.theme = e.target.value;
      KanbanSettings.applySettings(store.data.settings);
      scheduleSave();
    });
    document.getElementById('setting-storage-mode').addEventListener('change', async (e) => {
      store.data.settings.storageMode = e.target.value;
      if (e.target.value === 'server') {
        serverAvailable = await KanbanStorage.pingServer();
        if (!serverAvailable) KanbanToast.warning('Python server not detected — will use local storage');
      }
      updateStorageStatus();
      scheduleSave();
    });
    document.getElementById('setting-confirm-delete').addEventListener('change', (e) => {
      store.data.settings.confirmBeforeDelete = e.target.checked;
      scheduleSave();
    });
    document.getElementById('setting-animations').addEventListener('change', (e) => {
      store.data.settings.animations = e.target.checked;
      KanbanSettings.applySettings(store.data.settings);
      scheduleSave();
    });
    document.getElementById('setting-compact-mode').addEventListener('change', (e) => {
      store.data.settings.compactMode = e.target.checked;
      KanbanSettings.applySettings(store.data.settings);
      scheduleSave();
    });

    document.getElementById('reset-settings-btn').addEventListener('click', () => {
      store.data.settings = { ...KanbanState.DEFAULT_SETTINGS };
      KanbanSettings.applySettings(store.data.settings);
      KanbanSettings.populateSettingsForm(store.data.settings);
      scheduleSave();
      KanbanToast.success('Settings reset');
    });

    document.getElementById('clear-local-data-btn').addEventListener('click', async () => {
      const { confirmed } = await KanbanModal.confirmDialog({
        title: 'Clear local data?',
        message: 'This removes all boards and settings stored in this browser. This cannot be undone.',
        confirmLabel: 'Clear Data',
      });
      if (!confirmed) return;
      KanbanStorage.clearLocal();
      applyFreshBoard(KanbanState.emptyBoard());
      KanbanToast.success('Local data cleared');
    });
  }

  /* ======================= IMPORT MODAL ======================= */

  function wireImportModal() {
    document.getElementById('import-modal-close').addEventListener('click', () => KanbanModal.close(document.getElementById('import-modal-overlay')));
    document.getElementById('import-cancel-btn').addEventListener('click', () => KanbanModal.close(document.getElementById('import-modal-overlay')));

    const fileInput = document.getElementById('import-file-input');
    const confirmBtn = document.getElementById('import-confirm-btn');
    const errorMsg = document.getElementById('import-error-msg');
    let pendingData = null;

    fileInput.addEventListener('change', async () => {
      errorMsg.hidden = true;
      pendingData = null;
      confirmBtn.disabled = true;
      const file = fileInput.files[0];
      if (!file) return;
      try {
        const parsed = await KanbanImportExport.readFileAsJSON(file);
        const result = KanbanImportExport.validateBoardData(parsed);
        if (!result.valid) {
          errorMsg.textContent = result.error;
          errorMsg.hidden = false;
          return;
        }
        pendingData = result.data;
        confirmBtn.disabled = false;
      } catch (e) {
        errorMsg.textContent = e.message || 'Could not read file.';
        errorMsg.hidden = false;
      }
    });

    confirmBtn.addEventListener('click', () => {
      if (!pendingData) return;
      applyFreshBoard(pendingData);
      KanbanModal.close(document.getElementById('import-modal-overlay'));
      KanbanToast.success('Board imported');
      pendingData = null;
    });
  }

  /* ======================= FILTER PANEL ======================= */

  function wireFilterPanel() {
    document.getElementById('filters-panel').addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      const row = chip.closest('.chip-row');
      const key = row.dataset.filter;
      const val = chip.dataset.value;
      const list = store.filters[key];
      if (list.includes(val)) store.filters[key] = list.filter((v) => v !== val);
      else list.push(val);
      KanbanUI.renderBoard();
    });
    document.getElementById('clear-filters-btn').addEventListener('click', () => {
      KanbanFilters.clearFilters(store);
      KanbanUI.renderBoard();
    });
  }

  /* ======================= SORT PANEL ======================= */

  function wireSortPanel() {
    document.getElementById('sort-options').addEventListener('change', (e) => {
      if (e.target.name === 'sort') {
        store.sort = e.target.value;
        KanbanUI.renderBoard();
      }
    });
  }

  /* ======================= BOARD DELEGATION ======================= */

  function wireBoardDelegation() {
    const board = document.getElementById('board-columns');

    board.addEventListener('click', (e) => {
      const addBtn = e.target.closest('.add-task-in-column');
      if (addBtn) { KanbanUI.openTaskModal({ mode: 'create', columnId: addBtn.dataset.columnId }); return; }

      const menuBtn = e.target.closest('.column-menu-btn');
      if (menuBtn) { KanbanUI.openColumnMenu(menuBtn, menuBtn.dataset.columnId); return; }

      const cardMenuBtn = e.target.closest('.task-card-menu-btn');
      if (cardMenuBtn) {
        e.stopPropagation();
        const task = store.getTask(cardMenuBtn.dataset.taskId);
        if (task) KanbanUI.openTaskModal({ mode: 'edit', task });
        return;
      }

      const card = e.target.closest('.task-card');
      if (card) {
        const task = store.getTask(card.dataset.taskId);
        if (task) KanbanUI.openDetailModal(task);
      }
    });

    board.addEventListener('keydown', (e) => {
      const card = e.target.closest('.task-card');
      if (card && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        const task = store.getTask(card.dataset.taskId);
        if (task) KanbanUI.openDetailModal(task);
      }
    });

    board.addEventListener('change', (e) => {
      const titleInput = e.target.closest('.column-title-input');
      if (titleInput) {
        const ok = KanbanColumns.renameColumn(store, titleInput.dataset.columnId, titleInput.value);
        if (!ok) KanbanUI.renderBoard(); // revert to previous value
      }
    });
  }

  /* ======================= COMMAND MENU ======================= */

  const COMMANDS = [
    { label: 'Create Task', shortcut: 'N', action: () => KanbanUI.openTaskModal({ mode: 'create' }) },
    { label: 'Search Tasks', shortcut: '/', action: () => document.getElementById('search-input').focus() },
    { label: 'Clear Filters', action: () => { KanbanFilters.clearFilters(store); KanbanUI.renderBoard(); } },
    { label: 'Toggle Theme', action: () => document.getElementById('theme-toggle-btn').click() },
    { label: 'Export Board', action: () => { KanbanImportExport.exportBoard(store); KanbanToast.success('Board exported'); } },
    { label: 'Import Board', action: () => document.getElementById('import-btn').click() },
    { label: 'Reset Board', action: () => resetBoardFlow() },
    { label: 'Open Settings', action: () => document.getElementById('settings-btn').click() },
    { label: 'Add Column', action: () => KanbanUI.openColumnModal('create') },
    { label: 'Load Demo Board', action: () => loadDemo() },
    { label: 'Undo', shortcut: 'Ctrl+Z', action: () => performUndo() },
    { label: 'Redo', shortcut: 'Ctrl+Shift+Z', action: () => performRedo() },
  ];

  function wireCommandMenu() {
    const overlay = document.getElementById('command-menu-overlay');
    const input = document.getElementById('command-input');
    const list = document.getElementById('command-list');
    let activeIndex = 0;
    let filtered = COMMANDS;

    function render() {
      list.innerHTML = filtered.map((c, i) => `
        <li data-index="${i}" class="${i === activeIndex ? 'active' : ''}">
          <span>${KanbanUtils.escapeHTML(c.label)}</span>
          ${c.shortcut ? `<kbd>${KanbanUtils.escapeHTML(c.shortcut)}</kbd>` : ''}
        </li>`).join('');
    }

    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      filtered = COMMANDS.filter((c) => c.label.toLowerCase().includes(q));
      activeIndex = 0;
      render();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); activeIndex = Math.min(activeIndex + 1, filtered.length - 1); render(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); activeIndex = Math.max(activeIndex - 1, 0); render(); }
      else if (e.key === 'Enter') { e.preventDefault(); runActive(); }
    });

    list.addEventListener('click', (e) => {
      const li = e.target.closest('li');
      if (!li) return;
      activeIndex = Number(li.dataset.index);
      runActive();
    });

    function runActive() {
      const cmd = filtered[activeIndex];
      if (!cmd) return;
      KanbanModal.close(overlay);
      cmd.action();
    }

    overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) KanbanModal.close(overlay); });

    window.__openCommandMenu = () => {
      input.value = '';
      filtered = COMMANDS;
      activeIndex = 0;
      render();
      KanbanModal.open(overlay, { focusSelector: '#command-input' });
    };
  }

  function openCommandMenu() { window.__openCommandMenu(); }

  /* ======================= KEYBOARD SHORTCUTS ======================= */

  function wireKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      const tag = (e.target.tagName || '').toLowerCase();
      const typing = tag === 'input' || tag === 'textarea' || e.target.isContentEditable;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault(); openCommandMenu(); return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault(); doSave(); KanbanToast.success('Board saved'); return;
      }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault(); performUndo(); return;
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault(); performRedo(); return;
      }
      if (typing) return;

      if (e.key === 'n' || e.key === 'N') { KanbanUI.openTaskModal({ mode: 'create' }); }
      else if (e.key === '/') { e.preventDefault(); document.getElementById('search-input').focus(); }
    });
  }

  function performUndo() {
    if (store.undo()) { KanbanUI.renderBoard(); scheduleSave(); KanbanToast.success('Undid last change'); }
    else KanbanToast.warning('Nothing to undo');
  }
  function performRedo() {
    if (store.redo()) { KanbanUI.renderBoard(); scheduleSave(); KanbanToast.success('Redid change'); }
    else KanbanToast.warning('Nothing to redo');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
