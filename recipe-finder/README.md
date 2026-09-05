# Recipe Finder

A premium, fully functional recipe discovery web app built with plain HTML, CSS, and JavaScript. Search real recipes by name or ingredient, browse by category and cuisine, save favorites, and read full step-by-step instructions — no framework, no build step.

## Live Demo

[View Recipe Finder](https://danya-musbah.github.io/100-Days-100-Projects/recipe-finder/)

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
