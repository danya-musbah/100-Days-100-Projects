/* ==========================================================================
   columns.js — column creation, rename, delete, reorder
   ========================================================================== */
(function (global) {
  'use strict';

  function createColumn(store, title) {
    store.snapshot();
    const cols = store.getColumns();
    const col = { id: KanbanUtils.uid('col'), title: title.trim(), position: cols.length };
    store.data.columns.push(col);
    store.touchBoard();
    store.emit('data:changed', { reason: 'column:create' });
    return col;
  }

  function renameColumn(store, columnId, title) {
    const col = store.getColumn(columnId);
    if (!col) return false;
    const clean = title.trim();
    if (!clean) return false;
    store.snapshot();
    col.title = clean;
    store.touchBoard();
    store.emit('data:changed', { reason: 'column:rename' });
    return true;
  }

  /**
   * Delete a column. If it has tasks, caller must supply moveTasksTo (a column id)
   * or explicitly pass deleteTasks:true to remove them.
   */
  function deleteColumn(store, columnId, { moveTasksTo = null, deleteTasks = false } = {}) {
    const col = store.getColumn(columnId);
    if (!col) return false;
    store.snapshot();
    const tasksInColumn = store.data.tasks.filter((t) => t.columnId === columnId);

    if (tasksInColumn.length) {
      if (moveTasksTo) {
        const destTasks = store.getTasksForColumn(moveTasksTo);
        let pos = destTasks.length;
        tasksInColumn.forEach((t) => { t.columnId = moveTasksTo; t.position = pos++; });
      } else if (deleteTasks) {
        store.data.tasks = store.data.tasks.filter((t) => t.columnId !== columnId);
      } else {
        // Should not happen if UI enforces confirmation, but guard anyway.
        store.history.pop();
        return false;
      }
    }

    store.data.columns = store.data.columns.filter((c) => c.id !== columnId);
    store.getColumns().forEach((c, i) => { c.position = i; });
    store.touchBoard();
    store.emit('data:changed', { reason: 'column:delete' });
    return true;
  }

  function moveColumn(store, columnId, direction) {
    const cols = store.getColumns();
    const idx = cols.findIndex((c) => c.id === columnId);
    if (idx === -1) return false;
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= cols.length) return false;
    store.snapshot();
    const a = cols[idx];
    const b = cols[swapIdx];
    const tmp = a.position;
    a.position = b.position;
    b.position = tmp;
    store.touchBoard();
    store.emit('data:changed', { reason: 'column:reorder' });
    return true;
  }

  global.KanbanColumns = { createColumn, renameColumn, deleteColumn, moveColumn };
})(window);
