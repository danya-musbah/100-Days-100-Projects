/* ==========================================================================
   statistics.js — board statistics computation
   ========================================================================== */
(function (global) {
  'use strict';

  function computeStats(store) {
    const tasks = store.data.tasks;
    const cols = store.getColumns();
    const total = tasks.length;

    const byColumn = {};
    cols.forEach((c) => { byColumn[c.id] = 0; });
    tasks.forEach((t) => { if (byColumn[t.columnId] !== undefined) byColumn[t.columnId]++; });

    const lastCol = cols[cols.length - 1];
    const completed = lastCol ? byColumn[lastCol.id] || 0 : 0;

    let overdue = 0;
    let highPriority = 0;
    tasks.forEach((t) => {
      const isCompleted = store.isTaskCompleted(t);
      const status = KanbanUtils.getDueStatus(t.dueDate, isCompleted);
      if (status === 'overdue') overdue++;
      if (t.priority === 'high' || t.priority === 'urgent') highPriority++;
    });

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Best-effort mapping to the classic 4-stage labels for the sidebar summary.
    const findByGuess = (keywords) => cols.find((c) => keywords.some((k) => c.title.toLowerCase().includes(k)));
    const todoCol = findByGuess(['to do', 'todo', 'backlog']) || cols[0];
    const progressCol = findByGuess(['progress', 'doing']) || cols[1];
    const reviewCol = findByGuess(['review', 'qa', 'test']) || cols[2];

    return {
      total,
      todo: todoCol ? byColumn[todoCol.id] || 0 : 0,
      inProgress: progressCol ? byColumn[progressCol.id] || 0 : 0,
      review: reviewCol ? byColumn[reviewCol.id] || 0 : 0,
      completed,
      overdue,
      highPriority,
      completionRate,
      byColumn,
    };
  }

  global.KanbanStats = { computeStats };
})(window);
