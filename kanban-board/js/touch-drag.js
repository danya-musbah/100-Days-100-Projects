/* ==========================================================================
   touch-drag.js — mobile-friendly move mode (long press -> move menu)
   Complements (does not replace) native HTML5 DnD, since dnd on touch
   devices is unreliable across browsers.
   ========================================================================== */
(function (global) {
  'use strict';

  let store = null;
  let pressTimer = null;
  let pressTaskId = null;
  let longPressFired = false;
  let startX = 0;
  let startY = 0;
  const LONG_PRESS_MS = 480;
  const MOVE_TOLERANCE = 10;

  function init(appStore) {
    store = appStore;
    const board = document.getElementById('board-columns');
    if (!board) return;

    board.addEventListener('touchstart', onTouchStart, { passive: true });
    board.addEventListener('touchmove', onTouchMove, { passive: true });
    board.addEventListener('touchend', onTouchEnd);
    board.addEventListener('touchcancel', onTouchCancel);

    document.getElementById('move-up-btn').addEventListener('click', () => {
      if (!pressTaskId) return;
      KanbanTasks.moveTaskStep(store, pressTaskId, -1);
      store.emit('board:rerender');
      store.emit('board:saveNeeded');
    });
    document.getElementById('move-down-btn').addEventListener('click', () => {
      if (!pressTaskId) return;
      KanbanTasks.moveTaskStep(store, pressTaskId, 1);
      store.emit('board:rerender');
      store.emit('board:saveNeeded');
    });
    document.getElementById('move-menu-close').addEventListener('click', closeMenu);
  }

  function onTouchStart(e) {
    const card = e.target.closest('.task-card');
    if (!card) return;
    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    longPressFired = false;
    pressTaskId = card.dataset.taskId;

    pressTimer = setTimeout(() => {
      longPressFired = true;
      card.classList.add('drag-touch-active');
      if (navigator.vibrate) navigator.vibrate(12);
      openMoveMenu(pressTaskId);
      card.classList.remove('drag-touch-active');
    }, LONG_PRESS_MS);
  }

  function onTouchMove(e) {
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - startX);
    const dy = Math.abs(touch.clientY - startY);
    if (dx > MOVE_TOLERANCE || dy > MOVE_TOLERANCE) {
      clearTimeout(pressTimer);
    }
  }

  function onTouchEnd(e) {
    clearTimeout(pressTimer);
    // If a long press just opened the menu, swallow the resulting click/tap
    // so it doesn't also trigger the card's normal "open details" handler.
    if (longPressFired) {
      e.preventDefault();
    }
  }

  function onTouchCancel() {
    clearTimeout(pressTimer);
  }

  function openMoveMenu(taskId) {
    const task = store.getTask(taskId);
    if (!task) return;
    const overlay = document.getElementById('move-menu-overlay');
    const title = document.getElementById('move-menu-title');
    const list = document.getElementById('move-column-list');
    title.textContent = `Move "${task.title}"`;
    list.innerHTML = '';
    store.getColumns().forEach((col) => {
      const btn = document.createElement('button');
      btn.className = 'chip' + (col.id === task.columnId ? ' active' : '');
      btn.textContent = col.title;
      btn.addEventListener('click', () => {
        KanbanTasks.moveTask(store, taskId, col.id, store.getTasksForColumn(col.id).length);
        store.emit('board:rerender');
        store.emit('board:saveNeeded');
        KanbanToast.success(`Task moved to ${col.title}`);
        closeMenu();
      });
      list.appendChild(btn);
    });
    KanbanModal.open(overlay, { focusSelector: '#move-up-btn' });
  }

  function closeMenu() {
    KanbanModal.close(document.getElementById('move-menu-overlay'));
    pressTaskId = null;
  }

  global.KanbanTouchDrag = { init };
})(window);
