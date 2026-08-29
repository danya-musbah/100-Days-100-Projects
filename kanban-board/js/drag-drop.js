/* ==========================================================================
   drag-drop.js — native HTML5 Drag & Drop (desktop)
   Uses event delegation on the board container so it survives re-renders.
   ========================================================================== */
(function (global) {
  'use strict';

  let store = null;
  let draggedTaskId = null;
  let placeholderEl = null;

  function init(appStore) {
    store = appStore;
    const board = document.getElementById('board-columns');
    if (!board) return;

    board.addEventListener('dragstart', onDragStart);
    board.addEventListener('dragend', onDragEnd);
    board.addEventListener('dragover', onDragOver);
    board.addEventListener('dragleave', onDragLeave);
    board.addEventListener('drop', onDrop);
  }

  function createPlaceholder() {
    const el = document.createElement('div');
    el.className = 'drop-placeholder';
    el.setAttribute('aria-hidden', 'true');
    return el;
  }

  function onDragStart(e) {
    const card = e.target.closest('.task-card');
    if (!card) return;
    draggedTaskId = card.dataset.taskId;
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', draggedTaskId); } catch (err) { /* Safari quirk */ }

    placeholderEl = createPlaceholder();
    placeholderEl.style.minHeight = `${card.offsetHeight}px`;
  }

  function onDragEnd(e) {
    const card = e.target.closest('.task-card');
    if (card) card.classList.remove('dragging');
    document.querySelectorAll('.column-body.drag-over').forEach((el) => el.classList.remove('drag-over'));
    if (placeholderEl && placeholderEl.parentNode) placeholderEl.parentNode.removeChild(placeholderEl);
    placeholderEl = null;
    draggedTaskId = null;
  }

  function onDragOver(e) {
    const body = e.target.closest('.column-body');
    if (!body || !draggedTaskId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    body.classList.add('drag-over');

    const afterEl = getDragAfterElement(body, e.clientY);
    if (!placeholderEl) placeholderEl = createPlaceholder();
    if (afterEl == null) {
      body.appendChild(placeholderEl);
    } else {
      body.insertBefore(placeholderEl, afterEl);
    }
  }

  function onDragLeave(e) {
    const body = e.target.closest('.column-body');
    if (body && !body.contains(e.relatedTarget)) {
      body.classList.remove('drag-over');
    }
  }

  function getDragAfterElement(container, y) {
    const cards = Array.from(container.querySelectorAll('.task-card:not(.dragging)'));
    let closest = { offset: Number.NEGATIVE_INFINITY, element: null };
    for (const card of cards) {
      const box = card.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        closest = { offset, element: card };
      }
    }
    return closest.element;
  }

  function onDrop(e) {
    const body = e.target.closest('.column-body');
    if (!body || !draggedTaskId) return;
    e.preventDefault();
    body.classList.remove('drag-over');

    const destColumnId = body.dataset.columnId;
    const cardsNow = Array.from(body.children).filter((el) => el.classList.contains('task-card') || el === placeholderEl);
    let destIndex = cardsNow.indexOf(placeholderEl);
    if (destIndex === -1) {
      destIndex = cardsNow.filter((el) => el.classList.contains('task-card')).length;
    } else {
      destIndex = cardsNow.slice(0, destIndex).filter((el) => el.classList.contains('task-card')).length;
    }

    if (placeholderEl && placeholderEl.parentNode) placeholderEl.parentNode.removeChild(placeholderEl);

    const taskId = draggedTaskId;
    draggedTaskId = null;

    const task = store.getTask(taskId);
    if (!task) return;
    const movedColumns = task.columnId !== destColumnId;
    KanbanTasks.moveTask(store, taskId, destColumnId, destIndex);
    store.emit('board:rerender');
    store.emit('board:saveNeeded');
    if (movedColumns) {
      const destCol = store.getColumn(destColumnId);
      KanbanToast.success(`Task moved to ${destCol ? destCol.title : 'column'}`);
    }
  }

  global.KanbanDragDrop = { init };
})(window);
