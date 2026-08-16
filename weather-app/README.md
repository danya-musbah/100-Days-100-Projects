# SkyCast

**Your weather, beautifully presented.**

A premium, dependency-free weather app: current conditions, an hourly scroller, a 7-day outlook, and a UI whose entire palette and background animation change with the sky — golden and glowing when it's sunny, dark and starlit at night, dramatic with lightning flashes during a storm.

## Live Demo

[View Weather App](https://danya-musbah.github.io/100-Days-100-Projects/weather-app/)

---

## Features

- **Current weather** — temperature, condition, feels-like, and today's high/low
- **Hourly forecast** — next 24 hours, horizontally scrollable on mobile
- **7-day forecast** — daily high/low with a min–max range bar
- **Conditions grid** — humidity, wind, pressure, visibility, UV index, sunrise, sunset
- **Search** — type-ahead city search with debounced lookups and up to 6 saved recent cities
- **Geolocation** — "Use My Location" button with clear handling of denied permission, unsupported browsers, and timeouts
- **Weather-reactive theming** — six palettes (Sunny, Cloudy, Rain, Storm, Snow, Night) applied automatically from the live condition, with a smooth 0.5–0.6s transition
- **Background animation** — floating clouds, falling rain, drifting snow, lightning flashes, twinkling stars, and a sun glow pulse — all lightweight CSS/SVG, and all disabled under `prefers-reduced-motion`
- **Settings** — °C/°F toggle, notification opt-in, location-permission note
- **LocalStorage persistence** — recent cities, last viewed location, and preferred unit survive a refresh
- **Offline resilience** — the last successful forecast for a location is cached and shown (with a clear banner) if a later request fails; a small service worker caches the app shell so the interface itself loads offline
- **Installable PWA** — manifest + service worker, so it can be added to a phone's home screen
- **Accessible by default** — semantic landmarks, labelled controls, visible focus states, `aria-live` status updates, and a skip link

---

## Color themes

| Theme | Trigger | Feeling |
|---|---|---|
| ☀️ Sunny | Clear / mostly clear, daytime | Warm, bright, golden |
| ☁️ Cloudy | Partly cloudy, overcast, fog | Soft, calm, minimal |
| 🌧 Rain | Drizzle, rain, rain showers | Fresh, cool, atmospheric |
| ⛈ Storm | Thunderstorm, with or without hail | Dramatic, elegant |
| ❄ Snow | Snow, snow grains, snow showers | Clean, minimal, soft |
| 🌙 Night | Clear or cloudy sky after sunset | Premium, dark, elegant |

Rain, storm, and snow keep their own identity at night too — only the "calm sky" categories (sunny/cloudy) hand off to the Night palette after dark, since a starry night sky reads more true than a dimmed sunny one.

---

## Project structure

```text
weather-app/
│
├── index.html
├── manifest.json
├── sw.js
├── config.js
├── README.md
│
├── css/
│   └── styles.css
│
├── js/
│   ├── weather.js       # weather-code → theme/label/icon mapping (pure)
│   ├── storage.js        # localStorage read/write helpers
│   ├── geolocation.js     # Promise wrapper around navigator.geolocation
│   ├── api.js             # Open-Meteo fetch + offline cache
│   ├── theme.js            # applies palette + builds animated background
│   ├── ui.js                # all DOM rendering
│   └── app.js                 # orchestration / event wiring
│
└── assets/
    └── icon.svg
```
