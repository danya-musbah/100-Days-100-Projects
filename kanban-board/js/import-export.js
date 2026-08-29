/* ==========================================================================
   import-export.js — JSON export / import with validation
   ========================================================================== */
(function (global) {
  'use strict';

  function exportBoard(store) {
    const payload = JSON.stringify(store.data, null, 2);
    const safeName = (store.data.board.name || 'kanban-board').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    KanbanUtils.download(`${safeName || 'kanban-board'}.json`, payload, 'application/json');
    return true;
  }

  /**
   * Validate a parsed JSON object against the expected board shape.
   * Returns { valid: boolean, error?: string, data?: object }
   */
  function validateBoardData(obj) {
    if (!KanbanUtils.isPlainObject(obj)) return { valid: false, error: 'File does not contain a JSON object.' };
    if (!KanbanUtils.isPlainObject(obj.board)) return { valid: false, error: 'Missing "board" section.' };
    if (!Array.isArray(obj.columns) || !obj.columns.length) return { valid: false, error: 'Missing or empty "columns" array.' };
    if (!Array.isArray(obj.tasks)) return { valid: false, error: 'Missing "tasks" array.' };

    for (const col of obj.columns) {
      if (!col || typeof col.id !== 'string' || typeof col.title !== 'string') {
        return { valid: false, error: 'One or more columns are missing an id or title.' };
      }
    }

    const columnIds = new Set(obj.columns.map((c) => c.id));
    const cleanTasks = [];
    for (const t of obj.tasks) {
      if (!t || typeof t.id !== 'string' || typeof t.title !== 'string' || typeof t.columnId !== 'string') {
        return { valid: false, error: 'One or more tasks are missing required fields (id, title, columnId).' };
      }
      if (!columnIds.has(t.columnId)) {
        return { valid: false, error: `Task "${t.title}" references an unknown column.` };
      }
      cleanTasks.push({
        id: t.id,
        columnId: t.columnId,
        title: String(t.title).slice(0, 200),
        description: typeof t.description === 'string' ? t.description.slice(0, 2000) : '',
        priority: ['low', 'medium', 'high', 'urgent'].includes(t.priority) ? t.priority : 'medium',
        labels: Array.isArray(t.labels) ? t.labels.filter((l) => typeof l === 'string').slice(0, 20) : [],
        dueDate: typeof t.dueDate === 'string' ? t.dueDate : null,
        dueTime: typeof t.dueTime === 'string' ? t.dueTime : null,
        assignee: typeof t.assignee === 'string' ? t.assignee : null,
        checklist: Array.isArray(t.checklist) ? t.checklist.filter((c) => c && typeof c.text === 'string').map((c) => ({
          id: typeof c.id === 'string' ? c.id : KanbanUtils.uid('chk'),
          text: String(c.text).slice(0, 200),
          done: !!c.done,
        })) : [],
        position: typeof t.position === 'number' ? t.position : 0,
        createdAt: typeof t.createdAt === 'string' ? t.createdAt : KanbanUtils.nowISO(),
        updatedAt: typeof t.updatedAt === 'string' ? t.updatedAt : KanbanUtils.nowISO(),
      });
    }

    const cleanColumns = obj.columns.map((c, i) => ({
      id: c.id, title: String(c.title).slice(0, 60), position: typeof c.position === 'number' ? c.position : i,
    }));

    const cleanData = {
      board: {
        id: typeof obj.board.id === 'string' ? obj.board.id : 'default-board',
        name: typeof obj.board.name === 'string' ? obj.board.name.slice(0, 80) : 'My Kanban Board',
        createdAt: typeof obj.board.createdAt === 'string' ? obj.board.createdAt : KanbanUtils.nowISO(),
        updatedAt: KanbanUtils.nowISO(),
      },
      columns: cleanColumns,
      tasks: cleanTasks,
      settings: KanbanUtils.isPlainObject(obj.settings) ? { ...KanbanState.DEFAULT_SETTINGS, ...obj.settings } : { ...KanbanState.DEFAULT_SETTINGS },
    };

    return { valid: true, data: cleanData };
  }

  function readFileAsJSON(file) {
    return new Promise((resolve, reject) => {
      if (!file) { reject(new Error('No file selected.')); return; }
      if (file.type && file.type !== 'application/json' && !file.name.endsWith('.json')) {
        reject(new Error('Please select a .json file.'));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result);
          resolve(parsed);
        } catch (e) {
          reject(new Error('The file is not valid JSON.'));
        }
      };
      reader.onerror = () => reject(new Error('Could not read the file.'));
      reader.readAsText(file);
    });
  }

  global.KanbanImportExport = { exportBoard, validateBoardData, readFileAsJSON };
})(window);
