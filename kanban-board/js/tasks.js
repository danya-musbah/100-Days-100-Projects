/* ==========================================================================
   tasks.js — task creation, editing, deletion, movement
   ========================================================================== */
(function (global) {
  'use strict';

  function createTask(store, fields) {
    store.snapshot();
    const now = KanbanUtils.nowISO();
    const columnTasks = store.getTasksForColumn(fields.columnId);
    const task = {
      id: KanbanUtils.uid('task'),
      columnId: fields.columnId,
      title: fields.title.trim(),
      description: (fields.description || '').trim(),
      priority: fields.priority || 'medium',
      labels: fields.labels || [],
      dueDate: fields.dueDate || null,
      dueTime: fields.dueTime || null,
      assignee: (fields.assignee || '').trim() || null,
      checklist: fields.checklist || [],
      position: columnTasks.length,
      createdAt: now,
      updatedAt: now,
    };
    store.data.tasks.push(task);
    store.touchBoard();
    store.emit('data:changed', { reason: 'task:create', taskId: task.id });
    return task;
  }

  function updateTask(store, taskId, fields) {
    const task = store.getTask(taskId);
    if (!task) return null;
    store.snapshot();
    const movingColumn = fields.columnId && fields.columnId !== task.columnId;
    Object.assign(task, {
      title: fields.title !== undefined ? fields.title.trim() : task.title,
      description: fields.description !== undefined ? fields.description.trim() : task.description,
      priority: fields.priority !== undefined ? fields.priority : task.priority,
      labels: fields.labels !== undefined ? fields.labels : task.labels,
      dueDate: fields.dueDate !== undefined ? (fields.dueDate || null) : task.dueDate,
      dueTime: fields.dueTime !== undefined ? (fields.dueTime || null) : task.dueTime,
      assignee: fields.assignee !== undefined ? ((fields.assignee || '').trim() || null) : task.assignee,
      checklist: fields.checklist !== undefined ? fields.checklist : task.checklist,
    });
    if (movingColumn) {
      const destTasks = store.getTasksForColumn(fields.columnId);
      task.columnId = fields.columnId;
      task.position = destTasks.length;
    }
    task.updatedAt = KanbanUtils.nowISO();
    store.touchBoard();
    store.emit('data:changed', { reason: 'task:update', taskId });
    return task;
  }

  function deleteTask(store, taskId) {
    const idx = store.data.tasks.findIndex((t) => t.id === taskId);
    if (idx === -1) return false;
    store.snapshot();
    const [removed] = store.data.tasks.splice(idx, 1);
    reindexColumn(store, removed.columnId);
    store.touchBoard();
    store.emit('data:changed', { reason: 'task:delete', taskId });
    return true;
  }

  function reindexColumn(store, columnId) {
    const tasks = store.getTasksForColumn(columnId);
    tasks.forEach((t, i) => { t.position = i; });
  }

  /** Move task to a column at a specific index (0-based). */
  function moveTask(store, taskId, destColumnId, destIndex) {
    const task = store.getTask(taskId);
    if (!task) return false;
    store.snapshot();
    const srcColumnId = task.columnId;

    // Remove from source ordering conceptually, recompute after
    task.columnId = destColumnId;

    const destTasks = store.getTasksForColumn(destColumnId).filter((t) => t.id !== taskId);
    const clampedIndex = KanbanUtils.clamp(destIndex, 0, destTasks.length);
    destTasks.splice(clampedIndex, 0, task);
    destTasks.forEach((t, i) => { t.position = i; });

    if (srcColumnId !== destColumnId) reindexColumn(store, srcColumnId);

    task.updatedAt = KanbanUtils.nowISO();
    store.touchBoard();
    store.emit('data:changed', { reason: 'task:move', taskId, silent: true });
    return true;
  }

  function moveTaskStep(store, taskId, direction) {
    const task = store.getTask(taskId);
    if (!task) return false;
    const idx = KanbanUtils.clamp(task.position + direction, 0, Infinity);
    return moveTask(store, taskId, task.columnId, idx);
  }

  function toggleChecklistItem(store, taskId, itemId) {
    const task = store.getTask(taskId);
    if (!task) return;
    const item = (task.checklist || []).find((c) => c.id === itemId);
    if (!item) return;
    store.snapshot();
    item.done = !item.done;
    task.updatedAt = KanbanUtils.nowISO();
    store.touchBoard();
    store.emit('data:changed', { reason: 'task:checklist' });
  }

  function checklistProgress(task) {
    const items = task.checklist || [];
    if (!items.length) return null;
    const done = items.filter((i) => i.done).length;
    return { done, total: items.length, pct: Math.round((done / items.length) * 100) };
  }

  global.KanbanTasks = {
    createTask, updateTask, deleteTask, moveTask, moveTaskStep,
    toggleChecklistItem, checklistProgress, reindexColumn,
  };
})(window);
