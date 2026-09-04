/* ============================================================
   Markdown Previewer — script.js
   Vanilla JS. Uses marked.js (CDN) for parsing and DOMPurify (CDN)
   for sanitizing the rendered HTML before it is inserted into the DOM.
   ============================================================ */

(function () {
  'use strict';

  const STORAGE_KEY = 'markdown-previewer:document';
  const SAVE_DEBOUNCE_MS = 500;

  const DEFAULT_DOC =
`# Welcome to Markdown Previewer

Write **Markdown** on the left and see the rendered result instantly on the right.

## What can you do?

- Write headings
- Format text
- Create lists
- Add [links](https://example.com)
- Add images
- Create tables
- Write code
- Create task lists

### Code Example

\`\`\`javascript
function greet(name) {
    return \`Hello, \${name}!\`;
}

console.log(greet("Markdown"));
\`\`\`

> Markdown makes it easy to create beautiful, structured documents.

## Task List

- [x] Create a Markdown editor
- [x] Add live preview
- [ ] Write something amazing

---

Start writing your own Markdown!
`;

  // ---- state ----
  let els = {};
  let saveTimer = null;
  let isFullscreen = false;

  function qs(id) { return document.getElementById(id); }

  // ============================================================
  // Bootstrapping
  // ============================================================

  function initializeApp() {
    cacheElements();
    configureMarked();
    initializeEditor();
    setupToolbar();
    setupKeyboardShortcuts();
    setupHeaderActions();
    setupFullscreen();
    setupViewToggle();

    loadDocument();
    renderMarkdown();
    updateStatistics();
    syncGutter();
  }

  function cacheElements() {
    els = {
      textarea: qs('editor-textarea'),
      gutterInner: qs('gutterInner'),
      previewContent: qs('previewContent'),
      emptyState: qs('emptyState'),
      previewBody: qs('previewBody'),
      parseStatus: qs('parseStatus'),
      statWords: qs('statWords'),
      statChars: qs('statChars'),
      statLines: qs('statLines'),
      saveStatus: qs('saveStatus'),
      newDocBtn: qs('newDocBtn'),
      clearBtn: qs('clearBtn'),
      exportMenuBtn: qs('exportMenuBtn'),
      exportMenu: qs('exportMenu'),
      downloadMdBtn: qs('downloadMdBtn'),
      exportHtmlBtn: qs('exportHtmlBtn'),
      fullscreenBtn: qs('fullscreenBtn'),
      appShell: document.querySelector('.app-shell'),
      editorPanel: qs('editorPanel'),
      previewPanel: qs('previewPanel'),
      toggleEditView: qs('toggleEditView'),
      togglePreviewView: qs('togglePreviewView'),
    };
  }

  function configureMarked() {
    if (window.marked) {
      marked.setOptions({
        gfm: true,
        breaks: false,
      });
    }
  }

  // ============================================================
  // Editor
  // ============================================================

  function initializeEditor() {
    els.textarea.addEventListener('input', onEditorInput);
    els.textarea.addEventListener('scroll', syncGutterScroll);
  }

  function onEditorInput() {
    renderMarkdown();
    updateStatistics();
    syncGutter();
    queueSave();
  }

  // ============================================================
  // Rendering
  // ============================================================

  function renderMarkdown() {
    const source = els.textarea.value;

    if (!window.marked || !window.DOMPurify) {
      els.emptyState.hidden = true;
      els.previewContent.hidden = false;
      els.previewContent.innerHTML =
        '<div class="md-error">The Markdown renderer didn\u2019t load, so this is showing raw text instead of a formatted preview. ' +
        'Reload the page — if this keeps happening, make sure js/vendor/marked.min.js and js/vendor/purify.min.js ' +
        'were downloaded along with the rest of the project.</div>';
      els.parseStatus.textContent = 'Renderer unavailable';
      return;
    }

    if (source.trim() === '') {
      els.previewContent.innerHTML = '';
      els.previewContent.hidden = true;
      els.emptyState.hidden = false;
      els.parseStatus.textContent = '';
      return;
    }

    els.emptyState.hidden = true;
    els.previewContent.hidden = false;

    try {
      const rawHtml = window.marked ? marked.parse(source) : escapeHtml(source);
      const cleanHtml = sanitizeHTML(rawHtml);
      els.previewContent.innerHTML = cleanHtml;
      postProcessPreview(els.previewContent);
      els.parseStatus.textContent = '';
    } catch (err) {
      els.previewContent.innerHTML =
        '<div class="md-error">Couldn\u2019t render this Markdown. Check for unclosed code fences or malformed syntax.</div>';
      els.parseStatus.textContent = 'Parse error';
    }
  }

  // Sanitize any HTML (from marked, or raw HTML embedded in the Markdown)
  // before it ever touches the DOM.
  function sanitizeHTML(html) {
    if (window.DOMPurify) {
      return DOMPurify.sanitize(html, {
        ADD_ATTR: ['target', 'rel'],
      });
    }
    // Fallback: escape everything if DOMPurify failed to load.
    return escapeHtml(html);
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // After sanitized HTML is in the DOM: harden links, tag task list items,
  // add language labels + copy buttons to code blocks.
  function postProcessPreview(root) {
    // Safe external links
    root.querySelectorAll('a[href]').forEach((a) => {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
    });

    // Task list styling hook
    root.querySelectorAll('li').forEach((li) => {
      const checkbox = li.querySelector(':scope > input[type="checkbox"]');
      if (checkbox) {
        li.classList.add('task-list-item');
        checkbox.classList.add('task-list-item-checkbox');
        checkbox.disabled = false;
        checkbox.addEventListener('change', () => onTaskToggle(checkbox));
      }
    });

    // Code blocks: language label + working copy button
    root.querySelectorAll('pre').forEach((pre) => {
      const codeEl = pre.querySelector('code');
      if (!codeEl) return;

      const langMatch = /language-(\w+)/.exec(codeEl.className || '');
      if (langMatch) {
        const label = document.createElement('span');
        label.className = 'code-lang';
        label.textContent = langMatch[1];
        pre.appendChild(label);
      }

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'copy-btn';
      btn.textContent = 'Copy';
      btn.setAttribute('aria-label', 'Copy code to clipboard');
      btn.addEventListener('click', () => copyCode(codeEl.textContent, btn));
      pre.appendChild(btn);
    });
  }

  function setupCodeCopyButtons() {
    // Copy buttons are (re)attached per-render inside postProcessPreview,
    // since code blocks are recreated on every keystroke.
  }

  async function copyCode(text, btn) {
    try {
      await navigator.clipboard.writeText(text);
      const original = btn.textContent;
      btn.textContent = 'Copied!';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = original;
        btn.classList.remove('copied');
      }, 1600);
    } catch (err) {
      btn.textContent = 'Press Ctrl+C';
      setTimeout(() => { btn.textContent = 'Copy'; }, 1600);
    }
  }

  // Keep rendered checkbox state in sync with the Markdown source when a
  // user clicks a task checkbox directly in the preview.
  function onTaskToggle(checkbox) {
    const allBoxes = Array.from(els.previewContent.querySelectorAll('input[type="checkbox"]'));
    const index = allBoxes.indexOf(checkbox);
    if (index === -1) return;

    const lines = els.textarea.value.split('\n');
    let taskIndex = -1;
    const taskPattern = /^(\s*[-*+]\s+)\[( |x|X)\]/;

    for (let i = 0; i < lines.length; i++) {
      if (taskPattern.test(lines[i])) {
        taskIndex++;
        if (taskIndex === index) {
          lines[i] = lines[i].replace(
            taskPattern,
            (m, prefix) => `${prefix}[${checkbox.checked ? 'x' : ' '}]`
          );
          break;
        }
      }
    }

    els.textarea.value = lines.join('\n');
    renderMarkdown();
    updateStatistics();
    syncGutter();
    queueSave();
  }

  // ============================================================
  // Statistics
  // ============================================================

  function updateStatistics() {
    const text = els.textarea.value;
    const trimmed = text.trim();

    const words = trimmed === '' ? 0 : trimmed.split(/\s+/).length;
    const chars = text.length;
    const lines = text === '' ? 1 : text.split('\n').length;

    els.statWords.textContent = words;
    els.statChars.textContent = chars;
    els.statLines.textContent = lines;
  }

  // ============================================================
  // Line-number gutter
  // ============================================================

  function syncGutter() {
    const lineCount = els.textarea.value.split('\n').length;
    let html = '';
    for (let i = 1; i <= lineCount; i++) {
      html += `<span>${i}</span>`;
    }
    els.gutterInner.innerHTML = html;
    syncGutterScroll();
  }

  function syncGutterScroll() {
    const gutter = qs('gutter');
    if (gutter) gutter.scrollTop = els.textarea.scrollTop;
  }

  // ============================================================
  // Toolbar — Markdown insertion
  // ============================================================

  function setupToolbar() {
    document.querySelectorAll('.tool-btn[data-action]').forEach((btn) => {
      btn.addEventListener('click', () => applyToolbarAction(btn.dataset.action));
    });
  }

  function applyToolbarAction(action) {
    switch (action) {
      case 'bold': wrapSelection('**', '**', 'bold text'); break;
      case 'italic': wrapSelection('*', '*', 'italic text'); break;
      case 'strike': wrapSelection('~~', '~~', 'strikethrough text'); break;
      case 'code': wrapSelection('`', '`', 'code'); break;
      case 'heading': insertLinePrefix('## '); break;
      case 'quote': insertLinePrefix('> '); break;
      case 'ul': insertLinePrefix('- '); break;
      case 'ol': insertOrderedList(); break;
      case 'task': insertLinePrefix('- [ ] '); break;
      case 'link': insertLink(); break;
      case 'image': insertImage(); break;
      case 'codeblock': insertCodeBlock(); break;
      case 'hr': insertBlock('\n---\n'); break;
      default: break;
    }
  }

  function getSelection() {
    const ta = els.textarea;
    return {
      start: ta.selectionStart,
      end: ta.selectionEnd,
      value: ta.value,
      selected: ta.value.slice(ta.selectionStart, ta.selectionEnd),
    };
  }

  function setSelectionAndFocus(newValue, selStart, selEnd) {
    const ta = els.textarea;
    ta.value = newValue;
    ta.focus();
    ta.setSelectionRange(selStart, selEnd);
    onEditorInput();
  }

  function wrapSelection(before, after, placeholder) {
    const { start, end, value, selected } = getSelection();
    const text = selected || placeholder;
    const newValue = value.slice(0, start) + before + text + after + value.slice(end);

    if (selected) {
      setSelectionAndFocus(newValue, start + before.length, start + before.length + text.length);
    } else {
      const selStart = start + before.length;
      setSelectionAndFocus(newValue, selStart, selStart + placeholder.length);
    }
  }

  function insertBlock(text) {
    const { start, value } = getSelection();
    const needsLeadingBreak = start > 0 && value[start - 1] !== '\n';
    const insert = (needsLeadingBreak ? '\n' : '') + text;
    const newValue = value.slice(0, start) + insert + value.slice(start);
    const cursor = start + insert.length;
    setSelectionAndFocus(newValue, cursor, cursor);
  }

  function insertLinePrefix(prefix) {
    const ta = els.textarea;
    const { start, end, value } = getSelection();

    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    let lineEnd = value.indexOf('\n', end);
    if (lineEnd === -1) lineEnd = value.length;

    const block = value.slice(lineStart, lineEnd);
    const lines = block.split('\n').map((line) => {
      if (line.startsWith(prefix)) return line; // avoid double-prefixing
      return prefix + line;
    });
    const newBlock = lines.join('\n');
    const newValue = value.slice(0, lineStart) + newBlock + value.slice(lineEnd);
    const delta = newBlock.length - block.length;

    setSelectionAndFocus(newValue, start + prefix.length, end + delta);
  }

  function insertOrderedList() {
    const { start, end, value } = getSelection();
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    let lineEnd = value.indexOf('\n', end);
    if (lineEnd === -1) lineEnd = value.length;

    const block = value.slice(lineStart, lineEnd);
    const lines = block.split('\n');
    const newLines = lines.map((line, i) => `${i + 1}. ${line}`);
    const newBlock = newLines.join('\n');
    const newValue = value.slice(0, lineStart) + newBlock + value.slice(lineEnd);
    const delta = newBlock.length - block.length;

    setSelectionAndFocus(newValue, start + 3, end + delta);
  }

  function insertLink() {
    const { start, end, value, selected } = getSelection();
    const label = selected || 'link text';
    const snippet = `[${label}](https://)`;
    const newValue = value.slice(0, start) + snippet + value.slice(end);
    const urlStart = start + label.length + 3;
    setSelectionAndFocus(newValue, urlStart, urlStart + 8);
  }

  function insertImage() {
    const { start, end, value, selected } = getSelection();
    const label = selected || 'alt text';
    const snippet = `![${label}](https://)`;
    const newValue = value.slice(0, start) + snippet + value.slice(end);
    const urlStart = start + label.length + 4;
    setSelectionAndFocus(newValue, urlStart, urlStart + 8);
  }

  function insertCodeBlock() {
    const { start, end, value, selected } = getSelection();
    const code = selected || 'your code here';
    const needsLeadingBreak = start > 0 && value[start - 1] !== '\n';
    const snippet = (needsLeadingBreak ? '\n' : '') + '```\n' + code + '\n```\n';
    const newValue = value.slice(0, start) + snippet + value.slice(end);
    const codeStart = start + (needsLeadingBreak ? 1 : 0) + 4;
    setSelectionAndFocus(newValue, codeStart, codeStart + code.length);
  }

  // ============================================================
  // Keyboard shortcuts
  // ============================================================

  function setupKeyboardShortcuts() {
    els.textarea.addEventListener('keydown', (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;

      const key = e.key.toLowerCase();

      if (key === 'b') { e.preventDefault(); applyToolbarAction('bold'); }
      else if (key === 'i') { e.preventDefault(); applyToolbarAction('italic'); }
      else if (key === 'k') { e.preventDefault(); applyToolbarAction('link'); }
      else if (key === 's') { e.preventDefault(); downloadMarkdown(); }
    });
  }

  // ============================================================
  // Header actions: new / clear / export menu / downloads
  // ============================================================

  function setupHeaderActions() {
    els.newDocBtn.addEventListener('click', handleNewDocument);
    els.clearBtn.addEventListener('click', handleClearDocument);

    els.exportMenuBtn.addEventListener('click', toggleExportMenu);
    document.addEventListener('click', (e) => {
      if (!els.exportMenu.hidden &&
          !els.exportMenu.contains(e.target) &&
          e.target !== els.exportMenuBtn && !els.exportMenuBtn.contains(e.target)) {
        closeExportMenu();
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeExportMenu();
    });

    els.downloadMdBtn.addEventListener('click', () => { downloadMarkdown(); closeExportMenu(); });
    els.exportHtmlBtn.addEventListener('click', () => { exportHTML(); closeExportMenu(); });
  }

  function toggleExportMenu() {
    const isHidden = els.exportMenu.hidden;
    els.exportMenu.hidden = !isHidden;
    els.exportMenuBtn.setAttribute('aria-expanded', String(isHidden));
  }
  function closeExportMenu() {
    els.exportMenu.hidden = true;
    els.exportMenuBtn.setAttribute('aria-expanded', 'false');
  }

  function handleNewDocument() {
    if (els.textarea.value.trim() !== '') {
      const ok = window.confirm('Start a new document? Unsaved changes in the current one will be lost.');
      if (!ok) return;
    }
    els.textarea.value = DEFAULT_DOC;
    onEditorInput();
    els.textarea.focus();
  }

  function handleClearDocument() {
    if (els.textarea.value.trim() === '') return;
    const ok = window.confirm('Are you sure you want to clear this document?');
    if (!ok) return;
    els.textarea.value = '';
    onEditorInput();
    els.textarea.focus();
  }

  // ============================================================
  // Persistence (localStorage)
  // ============================================================

  function queueSave() {
    setSaveStatus('saving');
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(saveDocument, SAVE_DEBOUNCE_MS);
  }

  function saveDocument() {
    try {
      window.localStorage.setItem(STORAGE_KEY, els.textarea.value);
      setSaveStatus('saved');
    } catch (err) {
      setSaveStatus('error');
    }
  }

  function loadDocument() {
    let stored = null;
    try {
      stored = window.localStorage.getItem(STORAGE_KEY);
    } catch (err) {
      stored = null;
    }
    els.textarea.value = (stored !== null && stored !== '') ? stored : DEFAULT_DOC;
  }

  function setSaveStatus(state) {
    if (state === 'saving') {
      els.saveStatus.textContent = 'Saving\u2026';
      els.saveStatus.className = 'save-status is-saving';
    } else if (state === 'saved') {
      els.saveStatus.textContent = 'Saved';
      els.saveStatus.className = 'save-status is-saved';
    } else {
      els.saveStatus.textContent = 'Not saved';
      els.saveStatus.className = 'save-status is-saving';
    }
  }

  // ============================================================
  // Downloads / exports
  // ============================================================

  function downloadMarkdown() {
    const blob = new Blob([els.textarea.value], { type: 'text/markdown;charset=utf-8' });
    triggerDownload(blob, 'document.md');
  }

  function exportHTML() {
    const bodyHtml = els.previewContent.innerHTML || '<p></p>';
    const doc = buildStandaloneHTML(bodyHtml);
    const blob = new Blob([doc], { type: 'text/html;charset=utf-8' });
    triggerDownload(blob, 'document.html');
  }

  function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function buildStandaloneHTML(bodyHtml) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Markdown Document</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:760px;margin:40px auto;padding:0 24px;line-height:1.7;color:#4B3B40;background:#F5ECBF;}
  h1,h2,h3,h4,h5,h6{font-family:Georgia,serif;line-height:1.25;margin:1.4em 0 .5em;}
  h1{font-size:2em;border-bottom:1px solid rgba(75,59,64,.14);padding-bottom:.3em;}
  a{color:#B07B7B;}
  blockquote{margin:1em 0;padding:.7em 1.1em;border-left:3px solid #B07B7B;background:#f9f4dc;border-radius:0 6px 6px 0;}
  code{font-family:'SFMono-Regular',Consolas,Menlo,monospace;font-size:.9em;background:rgba(176,123,123,.16);padding:.15em .4em;border-radius:4px;}
  pre{background:#4B3B40;color:#F5ECBF;padding:16px 18px;border-radius:10px;overflow-x:auto;}
  pre code{background:none;padding:0;}
  table{border-collapse:collapse;width:100%;margin:1em 0;}
  th,td{border:1px solid rgba(75,59,64,.14);padding:8px 12px;text-align:left;}
  th{background:#C2DE9B;}
  img{max-width:100%;border-radius:10px;}
  hr{border:none;height:1px;background:rgba(130,115,92,.3);margin:2em 0;}
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
  }

  // ============================================================
  // Fullscreen / focus mode
  // ============================================================

  function setupFullscreen() {
    els.fullscreenBtn.addEventListener('click', toggleFocusMode);
    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement && isFullscreen) {
        exitFocusMode();
      }
    });
  }

  function toggleFocusMode() {
    if (isFullscreen) exitFocusMode();
    else enterFocusMode();
  }

  function enterFocusMode() {
    isFullscreen = true;
    els.appShell.classList.add('is-focus');
    if (els.appShell.requestFullscreen) {
      els.appShell.requestFullscreen().catch(() => {});
    }
  }

  function exitFocusMode() {
    isFullscreen = false;
    els.appShell.classList.remove('is-focus');
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  }

  // ============================================================
  // Mobile Edit | Preview toggle
  // ============================================================

  function setupViewToggle() {
    els.toggleEditView.addEventListener('click', () => setMobileView('edit'));
    els.togglePreviewView.addEventListener('click', () => setMobileView('preview'));
  }

  function setMobileView(view) {
    const editing = view === 'edit';
    els.editorPanel.classList.toggle('is-visible', editing);
    els.previewPanel.classList.toggle('is-visible', !editing);
    els.toggleEditView.classList.toggle('is-active', editing);
    els.toggleEditView.setAttribute('aria-selected', String(editing));
    els.togglePreviewView.classList.toggle('is-active', !editing);
    els.togglePreviewView.setAttribute('aria-selected', String(!editing));
  }

  // default mobile view
  document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setMobileView('edit');
  });
})();
