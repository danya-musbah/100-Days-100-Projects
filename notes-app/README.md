# Notes App

A fast, private, fully client-side notes app. No frameworks, no backend — just HTML5, CSS3, vanilla JavaScript, and the browser's LocalStorage API.

---

## Live Demo

[View Notes App](https://danya-musbah.github.io/100-Days-100-Projects/notes-app/)

---

## Features

- Create, edit, delete, pin, and search notes
- Auto-save with a debounced "Saving…/Saved" indicator
- Instant, case-insensitive search across titles and content, with safe highlighting
- Sort by recently updated, recently created, oldest, or title (A–Z / Z–A)
- Responsive layout: multi-column grid on desktop, single column on mobile
- Copy note content to the clipboard
- Live word/character counter
- Keyboard shortcuts: `Ctrl/Cmd+N` new note, `Ctrl/Cmd+F` focus search, `Esc` close editor or dialog
- Accessible: semantic HTML, labeled controls, visible focus states, an accessible confirmation dialog, and live status regions for screen readers

## Project Structure

```
notes-app/
├── index.html        entry point
├── css/style.css      design system + layout
├── js/script.js        app logic + LocalStorage layer
├── images/favicon.svg
└── README.md
```


