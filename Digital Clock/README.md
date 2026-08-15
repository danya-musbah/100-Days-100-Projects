# NIGHT CLOCK

A premium, minimalist digital clock for the desktop and mobile web — dark, atmospheric, and accurate to the system clock down to the second.

## Live Demo

[View Digital Clock](https://danya-musbah.github.io/100-Days-100-Projects/Digital%20Clock/)


## Features

- **Real-time digital clock** — always reads from `Date.now()` / `new Date()`, never a manual counter, so it stays accurate even after the tab sleeps or the computer is suspended.
- **12 / 24-hour format** toggle, with the choice persisted between visits.
- **Seconds toggle** — show or hide the seconds readout.
- **Date** — full weekday and date, formatted with `Intl.DateTimeFormat`.
- **Timezone** — detected automatically via `Intl.DateTimeFormat().resolvedOptions().timeZone`, with a graceful "LOCAL TIME" fallback.
- **Dynamic greeting** — a quiet "Good Morning / Afternoon / Evening / Night" label based on the hour (off by default, toggle it on in Settings).
- **Fullscreen wall-clock mode** — enlarges the clock and hides secondary UI for a distraction-free display.
- **Settings panel** — a slide-in panel with custom accessible toggle switches for every display option, plus a one-tap reset.
- **LocalStorage persistence** — all preferences are saved as a single structured object and restored on load, with safe fallback to defaults if the stored data is missing or corrupted.
- **Screen Wake Lock** — optionally keeps the display awake while the clock is open, on browsers that support the API; the option is hidden automatically where it isn't.
- **Fully responsive** — tested from 320px phones up to 2560px displays, with fluid typography via `clamp()`.
- **Accessible** — semantic landmarks, labelled icon buttons, visible focus states, a single low-frequency `aria-live` status region (not updated every second), and full keyboard operability.
- **Keyboard shortcuts** — quick toggles without touching the mouse.
- **Reduced motion support** — respects `prefers-reduced-motion` and disables decorative animation.
- **PWA-ready** — includes a web app manifest and an optional, minimal service worker for offline use.

## Technologies

- HTML5
- CSS3 (custom properties, `clamp()`, gradients, backdrop blur)
- Vanilla JavaScript (ES modules, no build step)
- `Intl.DateTimeFormat`
- LocalStorage
- Fullscreen API
- Screen Wake Lock API

No frameworks, no bundlers, no external runtime dependencies.


## Project structure

```
night-clock/
├── index.html
├── manifest.json
├── README.md
├── css/
│   └── styles.css
├── js/
│   ├── app.js         — entry point, wiring, scheduling
│   ├── clock.js        — time/date formatting, timezone, greeting
│   ├── settings.js      — settings state + change notifications
│   ├── storage.js       — LocalStorage read/write with safe defaults
│   ├── fullscreen.js     — Fullscreen API wrapper
│   ├── wake-lock.js      — Screen Wake Lock wrapper
│   ├── service-worker.js
│   └── ui.js          — DOM references and rendering
└── assets/
    └── favicon.ico
```