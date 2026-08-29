/* ==========================================================================
   state.js — centralized application state (vanilla JS, event-driven)
   ========================================================================== */
(function (global) {
  'use strict';

  const DEFAULT_LABEL_POOL = [
    'Frontend', 'Backend', 'Bug', 'Feature', 'Research', 'Design', 'Important', 'Personal',
  ];

  const DEFAULT_SETTINGS = {
    theme: 'dark',
    storageMode: 'local',
    confirmBeforeDelete: true,
    animations: true,
    compactMode: false,
  };

  function emptyBoard() {
    const now = KanbanUtils.nowISO();
    return {
      board: { id: 'default-board', name: 'My Kanban Board', createdAt: now, updatedAt: now },
      columns: [
        { id: 'todo', title: 'To Do', position: 0 },
        { id: 'in-progress', title: 'In Progress', position: 1 },
        { id: 'review', title: 'Review', position: 2 },
        { id: 'done', title: 'Done', position: 3 },
      ],
      tasks: [],
      settings: { ...DEFAULT_SETTINGS },
    };
  }

  class Store extends EventTarget {
    constructor() {
      super();
      this.data = emptyBoard();
      this.labelPool = [...DEFAULT_LABEL_POOL];
      this.filters = { priority: [], labels: [], columnId: [], due: [], status: [] };
      this.search = '';
      this.sort = 'manual';
      this.doneColumnId = 'done'; // heuristic: last column, or one literally named 'done'
      this.history = []; // undo stack of snapshots
      this.future = []; // redo stack
      this.maxHistory = 40;
    }

    emit(name, detail) {
      this.dispatchEvent(new CustomEvent(name, { detail }));
    }

    /** Replace entire dataset (e.g. from storage load or import). Does not push undo. */
    setData(data, opts = {}) {
      this.data = data;
      this._collectLabels();
      if (!opts.silent) this.emit('data:changed', { reason: opts.reason || 'load' });
    }

    _collectLabels() {
      const found = new Set(DEFAULT_LABEL_POOL);
      this.data.tasks.forEach((t) => (t.labels || []).forEach((l) => found.add(l)));
      this.labelPool = Array.from(found);
    }

    /** Snapshot current data onto the undo stack before a mutation. */
    snapshot() {
      this.history.push(JSON.stringify(this.data));
      if (this.history.length > this.maxHistory) this.history.shift();
      this.future = [];
    }

    undo() {
      if (!this.history.length) return false;
      this.future.push(JSON.stringify(this.data));
      const prev = this.history.pop();
      this.data = JSON.parse(prev);
      this._collectLabels();
      this.emit('data:changed', { reason: 'undo' });
      return true;
    }

    redo() {
      if (!this.future.length) return false;
      this.history.push(JSON.stringify(this.data));
      const next = this.future.pop();
      this.data = JSON.parse(next);
      this._collectLabels();
      this.emit('data:changed', { reason: 'redo' });
      return true;
    }

    touchBoard() {
      this.data.board.updatedAt = KanbanUtils.nowISO();
    }

    getColumns() {
      return [...this.data.columns].sort((a, b) => a.position - b.position);
    }

    getColumn(id) {
      return this.data.columns.find((c) => c.id === id);
    }

    getTasksForColumn(columnId) {
      return this.data.tasks
        .filter((t) => t.columnId === columnId)
        .sort((a, b) => a.position - b.position);
    }

    getTask(id) {
      return this.data.tasks.find((t) => t.id === id);
    }

    isTaskCompleted(task) {
      const cols = this.getColumns();
      if (!cols.length) return false;
      const last = cols[cols.length - 1];
      return task.columnId === last.id;
    }

    addLabel(label) {
      const clean = String(label).trim();
      if (!clean) return false;
      if (this.labelPool.includes(clean)) return false;
      this.labelPool.push(clean);
      return true;
    }
  }

  global.KanbanState = {
    Store,
    emptyBoard,
    DEFAULT_SETTINGS,
    DEFAULT_LABEL_POOL,
  };
})(window);
