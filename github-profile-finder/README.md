# GitScope — GitHub Developer DNA Observatory

GitScope turns a public GitHub profile into an interactive _Developer DNA
Observatory_. Instead of a conventional profile card and repo list, it maps a
developer's public repositories, languages, topics, and activity into a set
of original visualizations — an orbiting observatory, a Developer DNA radar,
a Language Orbit, a Repository Universe, an Activity Pulse, a Project
Evolution timeline, a Topic Galaxy, and a Community Footprint ring — all
built from real data returned by the GitHub REST API.

## Live Demo

[View GitScope](https://danya-musbah.github.io/100-Days-100-Projects/github-profile-finder/)

## Features

- GitHub profile search with username validation, normalization (`@user` → `user`) and helpful inline errors
- **Developer Observatory** — an orbital map linking to each analysis section
- **Developer DNA** — a custom SVG radar chart across 7 transparent, formula-based dimensions
- **Language DNA** — animated language distribution bars plus a **Language Orbit** SVG visualization
- **Repository Universe** — repositories rendered as orbiting "planets" (size ≈ stars, distance ≈ recency, color ≈ language)
- **Repository Explorer** — searchable, filterable, sortable repository grid with pagination ("Load more"), fork/archived badges, and a detail modal
- **Project Radar** — switch repository sorting between Most Popular / Recent / Active / Starred / Forked
- **Activity Pulse** — recent public GitHub events, plus a **Developer Rhythm** SVG chart and evidence-based rhythm insights
- **Project Evolution** — a chronological repository timeline, **Then vs Now** comparison, and a language-based **Developer Evolution** narrative
- **Topic Galaxy** — repository topics sized by frequency; click a topic to filter the Repository Explorer
- **Community Footprint** — an SVG "impact ring" plus a **Star Map** of top starred repositories (log-scaled)
- **Compare Developers** — side-by-side metrics and an overlaid Developer DNA radar for two usernames
- Search history, favorites, and settings — all stored locally
- Shareable, deep-linkable URLs (`?user=username`) with back/forward support
- LocalStorage caching with manual refresh, JSON export, and print-friendly mode
- Responsive, accessible, and reduced-motion aware from 320px to 4K

## Tech Stack

```
HTML5
CSS3
Vanilla JavaScript (ES6+)
GitHub REST API
SVG (hand-built visualizations)
LocalStorage
Browser APIs (Fetch, Web Share, History, Clipboard, matchMedia)
```

No frameworks, no build step, no external charting or CSS libraries. Open
`index.html` in a browser (or serve the folder with any static file server)
and it works.

## Project Structure

```
github-profile-finder/
│
├── index.html
├── css/
│   └── style.css
├── js/
│   └── script.js
├── images/
│   └── favicon.svg
└── README.md
```

## How It Works

```
Search
  ↓
Fetch public GitHub data (user, repositories, languages, events)
  ↓
Normalize data (handle missing fields, partial failures, pagination)
  ↓
Analyze observable signals (Analyzer module)
  ↓
Build visualizations (hand-written SVG, no charting library)
  ↓
Render the Developer Observatory
```

## Privacy

- GitScope never asks for a GitHub password, token, or any credential.
- Only **public** GitHub data is requested — private repositories are never
  accessed and cannot be seen by this application.
- Search history, favorites, and settings are stored only in your browser's
  `localStorage`, never transmitted anywhere.
- No analytics, tracking, or advertising.

## Limitations

- **Developer DNA, signals, and the one-line snapshot are descriptive, not
  evaluative.** They summarize observable public metadata (repository
  counts, languages, stars, forks, timestamps) — they are not measures of
  skill, intelligence, personality, seniority, or professional ability.
- Public event history from the GitHub Events API is limited to the very
  recent past; the Activity Pulse and Developer Rhythm clearly label when
  they fall back to repository update recency instead.
- Unauthenticated API rate limits can affect availability, especially for
  profiles with many repositories or during heavy testing.
- Comparisons between two developers reflect public GitHub metrics only and
  never rank or judge who is "better."

## License

MIT License. GitHub profile and repository data belongs to GitHub and its
respective users; GitScope only visualizes what the public API returns.
