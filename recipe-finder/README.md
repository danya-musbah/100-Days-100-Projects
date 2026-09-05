# Recipe Finder

A premium, fully functional recipe discovery web app built with plain HTML, CSS, and JavaScript. Search real recipes by name or ingredient, browse by category and cuisine, save favorites, and read full step-by-step instructions — no framework, no build step.

## Features

- **Live recipe search** against a real API, with an ingredient-search fallback when a name search returns nothing
- **Category filtering** (pills, populated dynamically from the API's own category list)
- **Cuisine filtering** and **Vegetarian / Vegan dietary filtering** via a mobile-friendly filter drawer
- **Sorting** by relevance, Name A–Z, or Name Z–A
- **Search suggestions** as you type, drawn from real recipe names plus a small seed list, fully keyboard-navigable
- **Recent searches**, saved to `localStorage`, one click to repeat
- **Recipe details** in a modal: image, category/cuisine/tag chips, a checkable ingredient list, and numbered instructions
- **Favorites**, persisted in `localStorage` and reflected instantly in the header counter and Favorites view
- **Share Recipe** (native Web Share API where supported, clipboard-copy fallback elsewhere) and **Copy Ingredients**
- **Load More** pagination that appends results without duplicating cards
- **Responsive design** from 320px phones to large desktop monitors, including a bottom-sheet-style filter drawer and full-screen recipe modal on mobile
- **Accessible by default**: semantic landmarks, ARIA labels on every icon-only control, keyboard-operable search/suggestions/modal/drawer, visible focus states, `Escape`-to-close, and `prefers-reduced-motion` support

## Screenshots

_Add a screenshot after running the app locally:_

```markdown
![Recipe Finder](images/screenshot.png)
```

## Tech Stack

```text
HTML5
CSS3
Vanilla JavaScript (ES6+)
REST API / Fetch API
LocalStorage
Web Share API
```

No React, Vue, Angular, Bootstrap, Tailwind, or jQuery is used anywhere in this project.

## API

This app uses **[TheMealDB](https://www.themealdb.com/api.php)**, a free, keyless, CORS-enabled recipe API — a good fit for a frontend-only build with no backend or secrets to manage.

Endpoints used:

| Purpose | Endpoint |
|---|---|
| Full recipe corpus (loaded once at startup, then filtered client-side) | `GET /search.php?s=` (empty query returns the full public dataset) |
| Name search | `GET /search.php?s={query}` |
| Ingredient search (fallback when a name search finds nothing) | `GET /filter.php?i={ingredient}` |
| Recipe details | `GET /lookup.php?i={id}` (skipped when full details are already cached from search/corpus) |
| Category list | `GET /categories.php` |
| Cuisine (area) list | `GET /list.php?a=list` |

**Configuration:** none required. TheMealDB's test tier (key `1`) needs no signup and no API key to store or expose, so there's nothing to configure and nothing that could leak into the repository.

**Rate limits / attribution:** TheMealDB's free tier is meant for development and moderate use, not high-traffic production; recipe data and images are provided by TheMealDB.

**A note on scope:** the brief's example category, cuisine, and dietary lists (e.g. "Lunch", "Healthy", "Mediterranean", "Gluten-Free") don't all correspond to real, filterable fields in TheMealDB. To avoid shipping filters that silently do nothing, this build fetches the *actual* categories and cuisines from the API and only exposes **Vegetarian** and **Vegan** as dietary filters, since those are the only diet-type values TheMealDB actually supports as categories. Similarly, no star ratings, cook times, servings, or difficulty levels are shown anywhere, because the API doesn't return that data — nothing on screen is invented.

## Installation

No build tools or package manager are required.

1. Download or clone this folder.
2. Open `index.html` directly in a browser, **or** serve it locally (recommended, so relative fetches and the URL search-state feature behave exactly like a deployed site):

   ```bash
   cd recipe-finder
   python3 -m http.server 8000
   # then open http://localhost:8000
   ```

## Configuration

Nothing to configure — see **API** above.

## Usage

1. Type a dish, ingredient, or cuisine into the search bar (or tap a suggestion) and press **Search**.
2. Narrow results with the category pills or the **Filters** drawer (cuisine, dietary).
3. Click any recipe card to open full details, ingredients, and instructions.
4. Tap the heart to save a recipe — find it later under **Favorites**.
5. From a recipe's detail view, use **Share Recipe** or **Copy Ingredients**.

## Project Structure

```text
recipe-finder/
│
├── index.html          # markup for all views (home, favorites, modal, filter drawer)
├── css/
│   └── style.css        # design tokens + all component/layout/responsive styles
├── js/
│   └── script.js         # API layer, state, rendering, and all interactivity
├── images/
│   └── favicon.svg
└── README.md
```

## Security

- No API key is used or stored — TheMealDB's public test tier requires none.
- Recipe data (names, instructions, ingredient text) is inserted via explicit escaping, never `innerHTML`'d verbatim from the API, to avoid injecting unsanitized third-party content.
- External links (original recipe source, YouTube video) always open with `target="_blank" rel="noopener noreferrer"`.
- All user data (favorites, recent searches) stays in the browser's `localStorage` — nothing is sent to a server. Malformed/corrupted stored data is caught and reset rather than crashing the app.

## License

MIT — see below.

```text
MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files, to deal in the Software
without restriction, including without limitation the rights to use, copy,
modify, merge, publish, distribute, sublicense, and/or sell copies of the
Software, subject to the standard MIT license conditions.
```
