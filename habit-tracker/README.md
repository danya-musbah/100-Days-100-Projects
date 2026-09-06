# HabitFlow

A premium, fully client-side habit tracker. Create habits, check them off, watch your streaks grow, and see your consistency on a calendar and statistics dashboard — all without an account, a server, or a build step.

## Live Demo

[View Habit Tracker](https://danya-musbah.github.io/100-Days-100-Projects/habit-tracker/)


## Features

- **Full habit CRUD** — create, edit, delete, complete, uncomplete, archive, and restore habits
- **Daily completion** with custom accessible checkbox-style controls (keyboard operable)
- **Streak tracking** — current streak and best-ever streak, calculated from actual scheduled occurrences
- **Completion rates** calculated against real scheduled days, not raw calendar days
- **Weekly goals** for weekly-frequency habits, and weekly/monthly progress for all habits
- **Custom schedules** — pick specific weekdays a habit applies to
- **Calendar view** with month navigation, a completion heatmap, and per-day drill-down
- **Statistics page** — totals, overall completion rate, best streak, most consistent habit, top category, habit performance ranking, and a streak leaderboard
- **Search, filter, and sort** across all your habits
- **Archive / restore** — hide a habit without losing its history
- **Achievements** and one-time streak milestone celebrations (7 / 14 / 30 / 50 / 100 days)
- **Export / import** your data as a JSON backup, with merge or replace on import
- **LocalStorage persistence** with graceful recovery from corrupted or missing data
- **Responsive design**, tested from 320px phones up to large desktops
- **Accessible by design** — semantic HTML, keyboard navigation, visible focus states, ARIA labels, accessible dialogs, and status never conveyed by color alone

## Tech Stack

```text
HTML5
CSS3
Vanilla JavaScript (ES6+)
LocalStorage
Browser APIs (Date, Intl.DateTimeFormat)
```

No frameworks, no build tools, no external UI or icon libraries — every icon is inline SVG.

## Usage

1. **Creating a habit** — click **+ New Habit** (or press `Ctrl/Cmd + N`), fill in a name, optional description, category, frequency, goal, icon, and color, then save.
2. **Completing a habit** — click **Complete** on any habit card scheduled for today. Click it again to undo.
3. **Editing a habit** — use the pencil icon on a habit card; your completion history is always preserved.
4. **Deleting a habit** — use the trash icon; you'll be asked to confirm since this permanently removes its history.
5. **Archiving a habit** — use the archive icon to hide a habit from your active list without losing data; restore it anytime from the **Archived** view.
6. **Tracking streaks** — see each habit's current and best streak on its card and in its detail view (click the habit's icon).
7. **Viewing statistics** — open **Statistics** for totals, completion rate, top habits, and a streak leaderboard.
8. **Using the calendar** — open **Calendar**, navigate months with the arrows, and click any day to see what was completed or missed.
9. **Exporting/importing data** — use **Export Data** in the footer to download a JSON backup, and **Import Data** to restore one (choose to merge with or replace your current data).

## Project Structure

```text
habit-tracker/
│
├── index.html          # Markup for every view, modal, and dialog
│
├── css/
│   └── style.css        # Palette, layout, components, responsive rules
│
├── js/
│   └── script.js         # All application logic (state, CRUD, rendering)
│
├── images/
│   └── favicon.svg
│
└── README.md
```

## License

MIT License — free to use, modify, and distribute.
