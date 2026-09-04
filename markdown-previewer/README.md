## Markdown Previewer

A calm, editorial workspace for writing Markdown and watching it render live, side by side. Built as a fully working, single-page tool — no build step, no framework, just HTML, CSS, and JavaScript.

## Live Demo

[View Markdown Previewer](https://danya-musbah.github.io/100-Days-100-Projects/markdown-previewer/)


## Features

- **Live preview** — the right panel re-renders as you type, with no lag on typical documents
- **Full Markdown support** — headings (H1–H6), bold/italic/bold-italic, strikethrough, inline code, ordered/unordered/nested lists, links, images, blockquotes, fenced code blocks with language labels, tables, horizontal rules, and GitHub-style task lists
- **Interactive task lists** — checking a box in the preview updates the `- [ ]` / `- [x]` markers in the source
- **Copy-to-clipboard** on every code block, with a confirming "Copied!" state
- **Formatting toolbar** — one-click insertion for bold, italic, strikethrough, headings, links, images, quotes, lists, task lists, inline code, code blocks, and rules; wraps a selection or inserts a smart placeholder and positions the cursor
- **Keyboard shortcuts** — `Ctrl/Cmd+B` bold, `Ctrl/Cmd+I` italic, `Ctrl/Cmd+K` link, `Ctrl/Cmd+S` download the Markdown file
- **Live statistics** — word, character, and line counts, updated on every keystroke
- **Line-number gutter** synced to the editor's scroll position
- **Auto-save** to `localStorage`, with a subtle "Saving… / Saved" indicator; your document is restored automatically on reload
- **New document** and **Clear**, both with a confirmation prompt when there's unsaved content, so nothing is lost by accident
- **Download Markdown** — saves the raw source as `document.md` via the Blob API
- **Export as HTML** — saves the rendered result as a standalone, styled `document.html` that opens correctly with no dependencies
- **Fullscreen focus mode** — hides the chrome and expands the editor and preview for distraction-free writing
- **Responsive, two-view layout** — side-by-side panels on wider screens; a stacked layout with an Edit / Preview toggle on mobile, tested from 320px up
- **Sanitized rendering** — Markdown is treated as untrusted input; any HTML it produces is sanitized before it's inserted into the page, so raw `<script>` tags and inline event handlers are stripped

## Tech Stack

```text
HTML5
CSS3
Vanilla JavaScript (ES6+)
localStorage (persistence)
Blob + File download APIs
Fullscreen API
```

**External dependencies (bundled locally, no CDN):**

- [marked.js](https://marked.js.org/) v12.0.2 — Markdown parsing (`js/vendor/marked.min.js`)
- [DOMPurify](https://github.com/cure53/DOMPurify) v3.1.5 — sanitizes the HTML that `marked` produces before it's written into the page, so the preview can't be used to run arbitrary scripts (`js/vendor/purify.min.js`)

Both files ship inside `js/vendor/` and are loaded with plain `<script>` tags — no CDN, no network request, no build step. This also means the app works fully offline. Everything else — the editor, toolbar, statistics, persistence, exports, and layout — is hand-written vanilla JS.

## Project Structure

```text
markdown-previewer/
│
├── index.html          # App shell, header, toolbar, editor + preview panels
│
├── css/
│   └── style.css        # All styling — palette, layout, typography, responsive rules
│
├── js/
│   ├── script.js          # Editor logic, parsing/rendering, toolbar, shortcuts,
│   │                        persistence, exports, fullscreen mode
│   └── vendor/
│       ├── marked.min.js   # Markdown parser (bundled, no CDN)
│       └── purify.min.js   # HTML sanitizer (bundled, no CDN)
│
├── images/
│   └── favicon.svg       # App icon
│
└── README.md
```

`script.js` is organized into clearly named functions — `initializeApp`, `initializeEditor`, `renderMarkdown`, `updateStatistics`, `setupToolbar`, `setupKeyboardShortcuts`, `saveDocument`, `loadDocument`, `downloadMarkdown`, `exportHTML`, `setupFullscreen`, `sanitizeHTML`, and related helpers — rather than one large script.

## License

Released under the [MIT License](https://opensource.org/licenses/MIT). Free to use, modify, and distribute.
