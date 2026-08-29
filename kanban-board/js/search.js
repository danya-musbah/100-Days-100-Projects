/* ==========================================================================
   search.js — real-time search across task fields
   ========================================================================== */
(function (global) {
  'use strict';

  function matchesSearch(task, query) {
    if (!query) return true;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const haystacks = [
      task.title,
      task.description,
      task.assignee,
      task.priority,
      ...(task.labels || []),
    ].filter(Boolean).map((s) => String(s).toLowerCase());
    return haystacks.some((h) => h.includes(q));
  }

  global.KanbanSearch = { matchesSearch };
})(window);
