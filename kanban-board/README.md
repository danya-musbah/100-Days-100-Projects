# Kanban Board

**Drag & Drop Task Management** — a fully functional, framework-free kanban board with a dark cyberpunk-neon visual identity.

---

## Live Demo

[View Kanban Board](https://danya-musbah.github.io/100-Days-100-Projects/kanban-board/)

---

## Overview

Kanban Board is a real, working task-management app — not a mockup. You can create boards, drag tasks between columns, edit and prioritize them, attach labels and due dates, track checklists, search and filter in real time, and export/import your data as JSON. It runs entirely in the browser using `localStorage`, with an **optional** Python standard-library server for server-side JSON persistence.

## Features

- Multiple columns (To Do / In Progress / Review / Done by default) — fully customizable
- Create, edit, delete, and detail-view tasks
- Native HTML5 drag & drop: reorder within a column, or move between columns
- Long-press "move mode" for touch devices (up / down / move-to-column)
- Priorities (Low / Medium / High / Urgent), custom labels, due dates with status (upcoming / due today / overdue / completed)
- Checklists with live progress bars
- Real-time search across title, description, labels, and assignee
- Combinable filters (priority, label, column, due date, status) + sorting (manual, priority, due date, created date, alphabetical)
- Live board statistics + overall progress bar
- Column management: create, rename, delete (with "move tasks first" safeguard), reorder
- Import / export board as JSON, with validation and graceful error handling
- Undo / redo, keyboard shortcuts, and a command palette (`Ctrl/Cmd+K`)
- Dark neon theme (default) and a light theme, plus a compact density mode
- Fully responsive, from 320px phones to large desktops
- Accessible: semantic HTML, ARIA labels, keyboard navigation, focus states, `prefers-reduced-motion` support
- Works completely offline after first load; optional installable PWA shell

## Technology Stack

- **Frontend:** HTML5, CSS3 (custom properties, no preprocessor), vanilla JavaScript (ES6+, no build step)
- **Backend (optional):** Python 3 standard library only (`http.server`, `json`, `pathlib`, `urllib`, `datetime`) — no Flask/Django/FastAPI
- **No frameworks** of any kind (no React/Vue/Angular/Svelte, no Bootstrap/Tailwind/jQuery, no Express/Node)
- **No external APIs, API keys, or paid services**

## Project Structure

```
kanban-board/
├── index.html                 # Main entry point — open this file
├── manifest.json               # Optional PWA manifest
├── service-worker.js           # Optional offline cache
├── css/
│   ├── style.css               # Variables, background, layout, cards
│   ├── components.css          # Modals, toasts, popovers, forms
│   └── responsive.css          # Breakpoints, mobile action bar, compact mode
├── js/
│   ├── utils.js                 # id/escape/date helpers
│   ├── state.js                 # Central store (EventTarget-based)
│   ├── storage.js               # localStorage + optional server I/O
│   ├── tasks.js                 # Task CRUD + move logic
│   ├── columns.js               # Column CRUD + reorder logic
│   ├── search.js                # Search matching
│   ├── filters.js                # Filter matching
│   ├── statistics.js             # Stats computation
│   ├── drag-drop.js              # Native HTML5 DnD (desktop)
│   ├── touch-drag.js             # Long-press move menu (mobile)
│   ├── import-export.js          # JSON export/import + validation
│   ├── settings.js                # Theme/compact/animation application
│   ├── modal.js                   # Modal/popover/confirm-dialog engine
│   ├── toast.js                    # Toast notifications
│   ├── ui.js                        # Rendering (columns, cards, modals)
│   └── app.js                        # Bootstrap & event wiring
├── python/
│   └── server.py                # Optional stdlib-only HTTP server
├── data/
│   ├── board.json                # Server-mode persisted board (auto-created)
│   └── demo-board.json           # Sample data used by "Load Demo Board"
├── assets/icons/favicon.svg
└── README.md
```

## Data Model

```jsonc
{
  "board": { "id": "default-board", "name": "My Kanban Board", "createdAt": "...", "updatedAt": "..." },
  "columns": [ { "id": "todo", "title": "To Do", "position": 0 } ],
  "tasks": [
    {
      "id": "task-abc123",
      "columnId": "todo",
      "title": "Design landing page",
      "description": "...",
      "priority": "high",
      "labels": ["Design", "Frontend"],
      "dueDate": "2026-09-05",
      "dueTime": null,
      "assignee": "Mara T.",
      "checklist": [ { "id": "c1", "text": "Wireframe hero", "done": true } ],
      "position": 0,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "settings": { "theme": "dark", "storageMode": "local", "confirmBeforeDelete": true, "animations": true, "compactMode": false }
}
```