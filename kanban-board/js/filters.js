/* ==========================================================================
   filters.js — combinable task filters
   ========================================================================== */
(function (global) {
  'use strict';

  function matchesFilters(store, task) {
    const f = store.filters;
    const isCompleted = store.isTaskCompleted(task);

    if (f.priority.length && !f.priority.includes(task.priority)) return false;
    if (f.labels.length && !(task.labels || []).some((l) => f.labels.includes(l))) return false;
    if (f.columnId.length && !f.columnId.includes(task.columnId)) return false;

    if (f.due.length) {
      const status = KanbanUtils.getDueStatus(task.dueDate, isCompleted);
      const dueBucket = task.dueDate ? status : 'none';
      const okDue = f.due.some((val) => {
        if (val === 'none') return !task.dueDate;
        return dueBucket === val;
      });
      if (!okDue) return false;
    }

    if (f.status.length) {
      const okStatus = f.status.some((val) => (val === 'completed' ? isCompleted : !isCompleted));
      if (!okStatus) return false;
    }

    return true;
  }

  function countActiveFilters(store) {
    const f = store.filters;
    return f.priority.length + f.labels.length + f.columnId.length + f.due.length + f.status.length;
  }

  function clearFilters(store) {
    store.filters = { priority: [], labels: [], columnId: [], due: [], status: [] };
  }

  global.KanbanFilters = { matchesFilters, countActiveFilters, clearFilters };
})(window);
