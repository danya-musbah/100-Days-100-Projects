/* ==========================================================================
   ui.js — rendering & DOM updates
   ========================================================================== */
(function (global) {
  'use strict';

  const { escapeHTML, formatDateShort, formatDateLong, getDueStatus, initials } = KanbanUtils;

  let store = null;
  let editingTaskId = null; // null = creating a new task
  let checklistDraft = [];  // working checklist array while task modal is open
  let labelsDraft = [];     // working labels array while task modal is open
  let activeColumnMenuId = null;

  function init(appStore) {
    store = appStore;
  }

  /* ======================= BOARD RENDER ======================= */

  function getVisibleTasks(columnId) {
    let tasks = store.getTasksForColumn(columnId);
    tasks = tasks.filter((t) => KanbanFilters.matchesFilters(store, t));

    const query = store.search.trim();
    const hasQuery = query.length > 0;

    tasks = sortTasks(tasks, store.sort);

    return tasks.map((t) => ({ task: t, matches: !hasQuery || KanbanSearch.matchesSearch(t, query), dimmed: hasQuery && !KanbanSearch.matchesSearch(t, query) }));
  }

  function sortTasks(tasks, sortKey) {
    const arr = [...tasks];
    switch (sortKey) {
      case 'priority': {
        const order = { urgent: 0, high: 1, medium: 2, low: 3 };
        arr.sort((a, b) => order[a.priority] - order[b.priority]);
        return arr;
      }
      case 'dueDate':
        arr.sort((a, b) => {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return a.dueDate.localeCompare(b.dueDate);
        });
        return arr;
      case 'createdAt':
        arr.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        return arr;
      case 'alphabetical':
        arr.sort((a, b) => a.title.localeCompare(b.title));
        return arr;
      case 'manual':
      default:
        arr.sort((a, b) => a.position - b.position);
        return arr;
    }
  }

  function renderBoard() {
    const container = document.getElementById('board-columns');
    if (!container) return;
    const columns = store.getColumns();
    const isManual = store.sort === 'manual';

    container.innerHTML = columns.map((col) => renderColumn(col, isManual)).join('');
    renderStats();
    renderDynamicFilterChips();
    syncFilterChipStates();
    syncSortRadio();
  }

  function renderColumn(col, isManual) {
    const visible = getVisibleTasks(col.id);
    const totalInColumn = store.getTasksForColumn(col.id).length;

    const cardsHTML = visible.length
      ? visible.map(({ task, dimmed }) => renderTaskCard(task, dimmed)).join('')
      : `<div class="column-empty">
           <div class="empty-icon" aria-hidden="true">🗂️</div>
           <p>${totalInColumn === 0 ? 'No tasks here' : 'No tasks match your search/filters'}</p>
           <button class="btn btn-ghost btn-sm add-task-in-column" data-column-id="${escapeHTML(col.id)}" type="button">+ Add Task</button>
         </div>`;

    return `
    <section class="column" data-column-id="${escapeHTML(col.id)}" aria-label="${escapeHTML(col.title)} column">
      <header class="column-header">
        <input class="column-title-input" data-column-id="${escapeHTML(col.id)}" value="${escapeHTML(col.title)}" aria-label="Rename ${escapeHTML(col.title)} column" maxlength="40">
        <span class="column-count" aria-label="${totalInColumn} tasks">${totalInColumn}</span>
        <div class="column-header-actions">
          <button class="icon-btn column-menu-btn" data-column-id="${escapeHTML(col.id)}" aria-label="Column menu for ${escapeHTML(col.title)}" aria-haspopup="true">⋮</button>
        </div>
      </header>
      <div class="column-body" data-column-id="${escapeHTML(col.id)}" role="list" aria-label="${escapeHTML(col.title)} tasks">
        ${cardsHTML}
      </div>
      <footer class="column-footer">
        <button class="btn btn-ghost btn-block add-task-in-column" data-column-id="${escapeHTML(col.id)}" type="button">+ Add Task</button>
      </footer>
    </section>`;
  }

  function priorityLabel(p) {
    return { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' }[p] || p;
  }

  function dueBadgeHTML(task, isCompleted) {
    if (!task.dueDate) return '';
    const status = getDueStatus(task.dueDate, isCompleted);
    const text = {
      overdue: `Overdue · ${formatDateShort(task.dueDate)}`,
      today: 'Due today',
      upcoming: formatDateShort(task.dueDate),
      completed: `Done · ${formatDateShort(task.dueDate)}`,
    }[status];
    const icon = { overdue: '⚠', today: '⏰', upcoming: '📅', completed: '✓' }[status];
    return `<span class="due-badge due-${status}">${icon} ${escapeHTML(text)}</span>`;
  }

  function renderTaskCard(task, dimmed) {
    const isCompleted = store.isTaskCompleted(task);
    const progress = KanbanTasks.checklistProgress(task);
    const labelsHTML = (task.labels || []).map((l) => `<span class="badge badge-label">${escapeHTML(l)}</span>`).join('');
    const dueHTML = dueBadgeHTML(task, isCompleted);
    const assigneeHTML = task.assignee
      ? `<span class="assignee-chip" title="${escapeHTML(task.assignee)}" aria-label="Assigned to ${escapeHTML(task.assignee)}">${escapeHTML(initials(task.assignee))}</span>`
      : '';
    const checklistHTML = progress
      ? `<span class="checklist-progress" aria-label="Checklist ${progress.done} of ${progress.total} complete">☑ ${progress.done}/${progress.total}<span class="mini-bar"><span style="width:${progress.pct}%"></span></span></span>`
      : '<span></span>';

    const classes = ['task-card'];
    if (dimmed) classes.push('search-dim'); else if (store.search.trim()) classes.push('search-match');

    return `
    <article class="${classes.join(' ')}" draggable="true" tabindex="0" role="listitem"
      data-task-id="${escapeHTML(task.id)}"
      aria-label="${escapeHTML(task.title)}, priority ${priorityLabel(task.priority)}${task.dueDate ? ', due ' + escapeHTML(formatDateShort(task.dueDate)) : ''}">
      <span class="task-priority-bar priority-bar-${escapeHTML(task.priority)}" style="background:var(${priorityColorVar(task.priority)})" aria-hidden="true"></span>
      <div class="task-card-top">
        <h3 class="task-title">${escapeHTML(task.title)}</h3>
        <button class="task-card-menu-btn" data-task-id="${escapeHTML(task.id)}" aria-label="More options for ${escapeHTML(task.title)}">⋮</button>
      </div>
      ${task.description ? `<p class="task-desc">${escapeHTML(task.description)}</p>` : ''}
      <div class="task-meta-row">
        <span class="badge priority-${escapeHTML(task.priority)}">${priorityLabel(task.priority)}</span>
        ${labelsHTML}
        ${dueHTML}
      </div>
      <div class="task-footer-row">
        ${checklistHTML}
        ${assigneeHTML}
      </div>
    </article>`;
  }

  function priorityColorVar(p) {
    return { low: '--lime', medium: '--yellow', high: '--green', urgent: '--urgent' }[p] || '--teal';
  }

  /* ======================= STATISTICS ======================= */

  function renderStats() {
    const stats = KanbanStats.computeStats(store);
    document.getElementById('stat-total').textContent = stats.total;
    document.getElementById('stat-todo').textContent = stats.todo;
    document.getElementById('stat-inprogress').textContent = stats.inProgress;
    document.getElementById('stat-review').textContent = stats.review;
    document.getElementById('stat-completed').textContent = stats.completed;
    document.getElementById('stat-overdue').textContent = stats.overdue;
    document.getElementById('stat-highpriority').textContent = stats.highPriority;

    const bar = document.getElementById('progress-bar');
    const fill = document.getElementById('progress-fill');
    const label = document.getElementById('progress-label');
    if (stats.total === 0) {
      fill.style.width = '0%';
      bar.setAttribute('aria-valuenow', '0');
      label.textContent = 'No tasks yet';
    } else {
      fill.style.width = `${stats.completionRate}%`;
      bar.setAttribute('aria-valuenow', String(stats.completionRate));
      label.textContent = `${stats.completionRate}% complete · ${stats.completed}/${stats.total} tasks`;
    }
  }

  /* ======================= FILTER PANEL ======================= */

  function renderDynamicFilterChips() {
    const labelWrap = document.getElementById('filter-labels');
    labelWrap.innerHTML = store.labelPool.map((l) => `<button class="chip" data-value="${escapeHTML(l)}">${escapeHTML(l)}</button>`).join('');

    const colWrap = document.getElementById('filter-column');
    colWrap.innerHTML = store.getColumns().map((c) => `<button class="chip" data-value="${escapeHTML(c.id)}">${escapeHTML(c.title)}</button>`).join('');
  }

  function syncFilterChipStates() {
    document.querySelectorAll('#filters-panel .chip-row').forEach((row) => {
      const key = row.dataset.filter;
      const activeValues = store.filters[key] || [];
      row.querySelectorAll('.chip').forEach((chip) => {
        chip.classList.toggle('active', activeValues.includes(chip.dataset.value));
      });
    });
    const count = KanbanFilters.countActiveFilters(store);
    const badge = document.getElementById('filter-count');
    badge.hidden = count === 0;
    badge.textContent = String(count);
  }

  function syncSortRadio() {
    const radio = document.querySelector(`#sort-options input[value="${store.sort}"]`);
    if (radio) radio.checked = true;
  }

  /* ======================= TASK MODAL (create/edit) ======================= */

  function populateColumnSelect(selectEl, selectedId) {
    selectEl.innerHTML = store.getColumns().map((c) => `<option value="${escapeHTML(c.id)}">${escapeHTML(c.title)}</option>`).join('');
    if (selectedId) selectEl.value = selectedId;
  }

  function renderLabelPicker() {
    const wrap = document.getElementById('task-labels-picker');
    wrap.innerHTML = store.labelPool.map((l) => {
      const active = labelsDraft.includes(l);
      return `<button type="button" class="chip${active ? ' active' : ''}" data-label="${escapeHTML(l)}">${escapeHTML(l)}</button>`;
    }).join('');
    wrap.querySelectorAll('.chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const l = chip.dataset.label;
        if (labelsDraft.includes(l)) labelsDraft = labelsDraft.filter((x) => x !== l);
        else labelsDraft.push(l);
        renderLabelPicker();
      });
    });
  }

  function renderChecklistEditor() {
    const wrap = document.getElementById('checklist-editor');
    if (!checklistDraft.length) {
      wrap.innerHTML = `<p class="form-hint">No checklist items yet.</p>`;
      return;
    }
    wrap.innerHTML = checklistDraft.map((item) => `
      <div class="checklist-item-row${item.done ? ' done' : ''}" data-item-id="${escapeHTML(item.id)}">
        <input type="checkbox" ${item.done ? 'checked' : ''} data-role="toggle" aria-label="Mark ${escapeHTML(item.text)} done">
        <input type="text" value="${escapeHTML(item.text)}" data-role="text" maxlength="120" aria-label="Checklist item text">
        <button type="button" class="checklist-item-remove" data-role="remove" aria-label="Remove item">&times;</button>
      </div>`).join('');

    wrap.querySelectorAll('.checklist-item-row').forEach((row) => {
      const id = row.dataset.itemId;
      row.querySelector('[data-role="toggle"]').addEventListener('change', (e) => {
        const item = checklistDraft.find((i) => i.id === id);
        if (item) item.done = e.target.checked;
        row.classList.toggle('done', e.target.checked);
      });
      row.querySelector('[data-role="text"]').addEventListener('input', (e) => {
        const item = checklistDraft.find((i) => i.id === id);
        if (item) item.text = e.target.value;
      });
      row.querySelector('[data-role="remove"]').addEventListener('click', () => {
        checklistDraft = checklistDraft.filter((i) => i.id !== id);
        renderChecklistEditor();
      });
    });
  }

  function openTaskModal({ mode, task = null, columnId = null }) {
    editingTaskId = mode === 'edit' && task ? task.id : null;
    const overlay = document.getElementById('task-modal-overlay');
    const title = document.getElementById('task-modal-title');
    const form = document.getElementById('task-form');
    form.reset();

    populateColumnSelect(document.getElementById('task-column'), (task && task.columnId) || columnId || store.getColumns()[0]?.id);

    if (mode === 'edit' && task) {
      title.textContent = 'Edit Task';
      document.getElementById('task-title').value = task.title;
      document.getElementById('task-description').value = task.description || '';
      document.getElementById('task-priority').value = task.priority;
      document.getElementById('task-due-date').value = task.dueDate || '';
      document.getElementById('task-due-time').value = task.dueTime || '';
      document.getElementById('task-assignee').value = task.assignee || '';
      labelsDraft = [...(task.labels || [])];
      checklistDraft = (task.checklist || []).map((c) => ({ ...c }));
      document.getElementById('task-delete-btn').hidden = false;
      const metaInfo = document.getElementById('task-meta-info');
      metaInfo.hidden = false;
      document.getElementById('task-created-info').textContent = `Created ${formatDateLong(task.createdAt)}`;
      document.getElementById('task-updated-info').textContent = `Updated ${formatDateLong(task.updatedAt)}`;
    } else {
      title.textContent = 'New Task';
      labelsDraft = [];
      checklistDraft = [];
      document.getElementById('task-delete-btn').hidden = true;
      document.getElementById('task-meta-info').hidden = true;
    }

    renderLabelPicker();
    renderChecklistEditor();
    KanbanModal.open(overlay, { focusSelector: '#task-title' });
  }

  function closeTaskModal() {
    KanbanModal.close(document.getElementById('task-modal-overlay'));
    editingTaskId = null;
  }

  function getTaskFormData() {
    const form = document.getElementById('task-form');
    const fd = new FormData(form);
    return {
      title: fd.get('title') || '',
      description: fd.get('description') || '',
      priority: fd.get('priority') || 'medium',
      columnId: fd.get('columnId'),
      dueDate: fd.get('dueDate') || null,
      dueTime: fd.get('dueTime') || null,
      assignee: fd.get('assignee') || '',
      labels: [...labelsDraft],
      checklist: checklistDraft.filter((c) => c.text.trim()).map((c) => ({ ...c, text: c.text.trim() })),
    };
  }

  /* ======================= TASK DETAIL MODAL ======================= */

  function openDetailModal(task) {
    const overlay = document.getElementById('detail-modal-overlay');
    document.getElementById('detail-modal-title').textContent = task.title;
    const isCompleted = store.isTaskCompleted(task);
    const col = store.getColumn(task.columnId);
    const progress = KanbanTasks.checklistProgress(task);

    const checklistHTML = (task.checklist || []).length
      ? `<div class="progress-track" style="margin-bottom:8px;"><div class="progress-fill" style="width:${progress.pct}%"></div></div>
         <p class="form-hint">${progress.done} / ${progress.total} completed</p>` +
        task.checklist.map((item) => `
          <label class="detail-checklist-row${item.done ? ' done' : ''}">
            <input type="checkbox" data-checklist-toggle="${escapeHTML(item.id)}" ${item.done ? 'checked' : ''}>
            <span>${escapeHTML(item.text)}</span>
          </label>`).join('')
      : '<p class="form-hint">No checklist items.</p>';

    const body = document.getElementById('detail-modal-body');
    body.innerHTML = `
      <div class="detail-section">
        <h3>Description</h3>
        <p class="detail-desc">${task.description ? escapeHTML(task.description) : '<em>No description provided.</em>'}</p>
      </div>
      <div class="detail-section">
        <h3>Overview</h3>
        <div class="task-meta-row" style="margin-bottom:0;">
          <span class="badge priority-${escapeHTML(task.priority)}">${priorityLabel(task.priority)}</span>
          ${(task.labels || []).map((l) => `<span class="badge badge-label">${escapeHTML(l)}</span>`).join('')}
          ${dueBadgeHTML(task, isCompleted)}
        </div>
      </div>
      <div class="detail-section">
        <h3>Checklist</h3>
        ${checklistHTML}
      </div>
      <div class="detail-section">
        <h3>Details</h3>
        <div class="detail-meta-grid">
          <div><span>Column</span>${escapeHTML(col ? col.title : '—')}</div>
          <div><span>Assignee</span>${task.assignee ? escapeHTML(task.assignee) : '—'}</div>
          <div><span>Created</span>${escapeHTML(formatDateLong(task.createdAt))}</div>
          <div><span>Updated</span>${escapeHTML(formatDateLong(task.updatedAt))}</div>
        </div>
      </div>`;

    body.querySelectorAll('[data-checklist-toggle]').forEach((cb) => {
      cb.addEventListener('change', () => {
        KanbanTasks.toggleChecklistItem(store, task.id, cb.dataset.checklistToggle);
        store.emit('board:rerender');
        store.emit('board:saveNeeded');
        openDetailModal(store.getTask(task.id));
      });
    });

    document.getElementById('detail-edit-btn').onclick = () => {
      closeDetailModal();
      openTaskModal({ mode: 'edit', task: store.getTask(task.id) });
    };
    document.getElementById('detail-delete-btn').onclick = () => {
      requestDeleteTask(task.id, () => closeDetailModal());
    };

    KanbanModal.open(overlay, { focusSelector: '#detail-close-btn' });
  }

  function closeDetailModal() {
    KanbanModal.close(document.getElementById('detail-modal-overlay'));
  }

  /* ======================= DELETE FLOWS ======================= */

  async function requestDeleteTask(taskId, onDeleted) {
    const task = store.getTask(taskId);
    if (!task) return;
    if (store.data.settings.confirmBeforeDelete) {
      const { confirmed } = await KanbanModal.confirmDialog({
        title: 'Delete task?',
        message: `Are you sure you want to delete "${task.title}"? This cannot be undone.`,
        confirmLabel: 'Delete',
      });
      if (!confirmed) return;
    }
    KanbanTasks.deleteTask(store, taskId);
    store.emit('board:rerender');
    store.emit('board:saveNeeded');
    KanbanToast.success('Task deleted');
    if (onDeleted) onDeleted();
  }

  async function requestDeleteColumn(columnId) {
    const col = store.getColumn(columnId);
    if (!col) return;
    const tasksIn = store.getTasksForColumn(columnId);
    const otherColumns = store.getColumns().filter((c) => c.id !== columnId);

    if (!tasksIn.length) {
      const { confirmed } = await KanbanModal.confirmDialog({
        title: 'Delete column?',
        message: `Delete the empty column "${col.title}"?`,
        confirmLabel: 'Delete',
      });
      if (!confirmed) return;
      KanbanColumns.deleteColumn(store, columnId, { deleteTasks: true });
      finishColumnDelete(col.title);
      return;
    }

    if (!otherColumns.length) {
      const { confirmed } = await KanbanModal.confirmDialog({
        title: 'Delete column and its tasks?',
        message: `"${col.title}" has ${tasksIn.length} task(s) and there are no other columns to move them to. Deleting will permanently remove ${tasksIn.length} task(s).`,
        confirmLabel: 'Delete Tasks',
      });
      if (!confirmed) return;
      KanbanColumns.deleteColumn(store, columnId, { deleteTasks: true });
      finishColumnDelete(col.title);
      return;
    }

    const optionsHTML = otherColumns.map((c) => `<option value="${escapeHTML(c.id)}">${escapeHTML(c.title)}</option>`).join('');
    const extraHTML = `
      <label for="move-tasks-select">Move ${tasksIn.length} task(s) to:</label>
      <select id="move-tasks-select">${optionsHTML}<option value="__delete__">🗑 Delete these tasks instead</option></select>`;

    const { confirmed, extraEl } = await KanbanModal.confirmDialog({
      title: 'Delete column?',
      message: `"${col.title}" contains ${tasksIn.length} task(s). Choose what to do with them before deleting the column.`,
      confirmLabel: 'Delete Column',
      extraHTML,
    });
    if (!confirmed) return;
    const select = extraEl.querySelector('#move-tasks-select');
    const destination = select ? select.value : otherColumns[0].id;

    if (destination === '__delete__') {
      KanbanColumns.deleteColumn(store, columnId, { deleteTasks: true });
    } else {
      KanbanColumns.deleteColumn(store, columnId, { moveTasksTo: destination });
    }
    finishColumnDelete(col.title);
  }

  function finishColumnDelete(title) {
    store.emit('board:rerender');
    store.emit('board:saveNeeded');
    KanbanToast.success(`Column "${title}" deleted`);
  }

  /* ======================= COLUMN MENU POPOVER ======================= */

  function openColumnMenu(btn, columnId) {
    activeColumnMenuId = columnId;
    const panel = document.getElementById('column-menu-panel');
    const rect = btn.getBoundingClientRect();
    panel.style.top = `${rect.bottom + 6}px`;
    panel.style.left = `${Math.max(8, rect.right - 180)}px`;
    panel.style.right = 'auto';
    KanbanModal.openPopover(panel, btn);
  }

  /* ======================= COLUMN MODAL ======================= */

  let editingColumnId = null;

  function openColumnModal(mode, col = null) {
    editingColumnId = mode === 'edit' && col ? col.id : null;
    document.getElementById('column-modal-title').textContent = mode === 'edit' ? 'Rename Column' : 'Add Column';
    document.getElementById('column-title-input').value = col ? col.title : '';
    document.getElementById('column-save-btn').textContent = mode === 'edit' ? 'Save' : 'Add Column';
    KanbanModal.open(document.getElementById('column-modal-overlay'), { focusSelector: '#column-title-input' });
  }

  function addLabelToDraft(label) {
    const clean = String(label).trim();
    if (!clean) return;
    store.addLabel(clean);
    if (!labelsDraft.includes(clean)) labelsDraft.push(clean);
    renderLabelPicker();
  }

  function addChecklistItemToDraft(text) {
    const clean = String(text).trim();
    if (!clean) return;
    checklistDraft.push({ id: KanbanUtils.uid('chk'), text: clean, done: false });
    renderChecklistEditor();
  }

  global.KanbanUI = {
    init, renderBoard, renderStats,
    openTaskModal, closeTaskModal, getTaskFormData,
    openDetailModal, closeDetailModal,
    requestDeleteTask, requestDeleteColumn,
    openColumnMenu, openColumnModal,
    addLabelToDraft, addChecklistItemToDraft,
    getEditingTaskId: () => editingTaskId,
    getEditingColumnId: () => editingColumnId,
    getActiveColumnMenuId: () => activeColumnMenuId,
  };
})(window);
