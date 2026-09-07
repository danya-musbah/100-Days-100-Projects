# Expense Tracker

A premium, fully-functional personal expense tracker built with plain HTML, CSS, and JavaScript. It runs entirely in the browser — no build tools, no frameworks, no backend — and persists all data locally using `localStorage`.

## Live Demo

[View Expense Tracker](https://danya-musbah.github.io/100-Days-100-Projects/expense-tracker/)


## Features

- **Full CRUD** — create, read, update, and delete expenses with immediate UI updates and no page reloads.
- **LocalStorage persistence** — expenses and your currency preference survive page refreshes. Corrupted or invalid stored data is detected and handled gracefully instead of crashing the app.
- **Client-side validation** — every field (name, amount, category, date) is validated with inline error messages; no reliance on native browser validation alone.
- **Search** — case-insensitive search across expense name, category, notes, and payment method.
- **Filters** — filter by category, payment method, and date range (today, this week, this month, this year, or a custom range). All filters and search combine together, and can be cleared with one click.
- **Sorting** — newest, oldest, amount (high→low / low→high), and name (A–Z / Z–A).
- **Dashboard statistics** — total spend, this month's spend, transaction count, and average expense, all calculated live from actual stored data (never hardcoded).
- **Spending chart** — a dependency-free bar chart (built with plain HTML/CSS) showing spend over the last 4 weeks, computed from real expense dates.
- **Category breakdown** — horizontal progress bars showing real spend and percentage per category.
- **Spending insights** — plain-language insights generated dynamically from your data (top category, average, largest expense, monthly count). Shows a helpful placeholder if you don't have enough data yet.
- **Largest expense card** — automatically finds and displays your biggest recorded expense.
- **Responsive design** — desktop table view converts to touch-friendly cards on mobile; tested from 320px up to large desktop screens.
- **Accessible by design** — semantic HTML, labeled form fields, ARIA attributes on dialogs, visible focus states, keyboard-operable dialogs (Escape to close, focus trapping, focus restoration), and screen-reader-friendly toast notifications.
- **Keyboard shortcuts** — `Ctrl/Cmd + N` opens "Add Expense"; `Escape` closes any open dialog.
- **Toast notifications** — non-blocking success/error feedback, including an **Undo** action after deleting an expense.
- **Confirmations before destructive actions** — deleting an expense or clearing all data always requires explicit confirmation.
- **Currency selector** — choose USD, EUR, GBP, or LYD. This only changes how amounts are *displayed and formatted* using `Intl.NumberFormat` — it never converts amounts between currencies, so no misleading converted values are ever shown.
- **Export** — download your data as `expenses.json` or `expenses.csv` (properly escaped for commas, quotes, and newlines).
- **Import** — import a previously exported JSON file, with full validation, and a choice to **merge** with or **replace** your existing data.

## Tech Stack

- HTML5
- CSS3 (custom properties, no framework)
- Vanilla JavaScript (ES6+)
- `localStorage` Web API
- `Intl.NumberFormat` for currency formatting
- Native `Date` API

No React, Vue, Angular, Svelte, Bootstrap, Tailwind, jQuery, Material UI, or any chart/icon library is used.

## Usage

1. **Add an expense** — click "+ Add Expense" (header, empty state, or the mobile floating button), fill in the form, and submit.
2. **Edit an expense** — click the edit icon/button on any row or card, update the fields, and save.
3. **Delete an expense** — click the delete icon/button, confirm in the dialog. You can undo immediately from the toast that appears.
4. **Search** — type into the search box to filter by name, category, notes, or payment method.
5. **Filter** — click "Filters" to reveal category, payment method, and date-range filters (including a custom range).
6. **Sort** — choose a sort order from the Filters panel.
7. **View statistics** — the dashboard cards, chart, category breakdown, and insights update automatically from your real data.
8. **Export data** — use "Export JSON" or "Export CSV" in the Transactions panel.
9. **Import data** — use "Import" to select a previously exported JSON file, then choose to merge or replace.

## Project Structure

```
expense-tracker/
│
├── index.html          # Markup and app shell
├── css/
│   └── style.css       # All styling (custom properties, layout, responsive rules)
├── js/
│   └── script.js       # Application logic (CRUD, storage, rendering, filters, etc.)
├── images/
│   └── favicon.svg      # App icon
└── README.md
```

## License

MIT License — free to use, modify, and distribute.
