# GitHub Analytics

Turn GitHub activity into meaningful insights.

GitHub Analytics is a client-side dashboard that takes any public GitHub username and transforms their profile, repositories, and public activity into an interactive, visual analytics experience — powered entirely by the official GitHub REST API and vanilla JavaScript.

## Live Demo

[View GitHub Analytics](https://danya-musbah.github.io/100-Days-100-Projects/github-analytics/)

## Features

- **Profile & Metrics** — GitHub profile details, key statistics, languages, stars, forks, and repository activity.
- **Repository Analytics** — repository types, activity, commit trends, top repositories, and activity scores.
- **Activity Timeline** — recent public GitHub events with human-readable descriptions.
- **Insights** — dynamic observations generated from real repository data.
- **Search & Filters** — search, language filters, sorting, and pagination.
- **Caching & Settings** — 5-minute API caching, recent profiles, customizable display settings, and cache controls.
- **Export & Sharing** — export analysis as JSON/CSV and share profiles via URL parameters.
- **API Monitoring** — real-time GitHub API rate-limit status.
- **Responsive & Accessible** — mobile-friendly design, semantic HTML, ARIA support, keyboard navigation, and reduced-motion support.

## Tech Stack

```
HTML5
CSS3
Vanilla JavaScript
GitHub REST API
SVG
LocalStorage
Browser APIs
```

No frameworks, no build step, no external chart libraries — every visualization is hand-built with native SVG and CSS.

## Project Structure

```
github-analytics/
├── index.html
├── favicon.svg
├── README.md
├── css/
│   └── styles.css
├── js/
│   ├── app.js          — initialization & event wiring
│   ├── github-api.js   — all GitHub REST API requests & error handling
│   ├── analytics.js     — pure data transforms: totals, distributions, scoring, insights
│   ├── charts.js         — SVG/CSS chart rendering
│   ├── storage.js        — LocalStorage: recent searches, cache, preferences
│   └── ui.js               — DOM rendering for every view and state
└── assets/
```

## API

GitHub Analytics uses the public, unauthenticated GitHub REST API (`https://api.github.com`):

- `GET /users/{username}` — profile
- `GET /users/{username}/repos` — repositories (paginated, up to 500)
- `GET /users/{username}/events/public` — recent public activity
- `GET /repos/{owner}/{repo}/languages` — per-repository language bytes (sampled across the most recently pushed repositories to conserve rate limit)
- `GET /repos/{owner}/{repo}/stats/commit_activity` — weekly commit activity for the top-ranked repository

No API token, secret, or backend is required or used. Only read-only, public endpoints are called.


## Keyboard Shortcuts / Interactions

- **Enter** in either search field submits the analysis.
- **Escape** closes the Settings panel.
- All interactive elements (search, filters, sort, buttons, chart legends) are reachable and operable via keyboard, with visible focus states.

## Data Integrity

GitHub Analytics never fabricates data. If a metric isn't available from the API (for example, commit statistics still being computed by GitHub, or missing profile fields), the affected section shows an honest "not available" message rather than an invented value.
