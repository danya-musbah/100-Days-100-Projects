# Currency Converter

A fully functional, responsive currency converter built with plain HTML5,
CSS3, and vanilla JavaScript — no frameworks, no build step, no npm install.

## Live Demo

[View Currency Converter](https://danya-musbah.github.io/100-Days-100-Projects/currency-converter/)

## Features

- Live exchange rates from a public API (see below) — no hardcoded rates
- Amount input with validation (empty, invalid, zero, oversized values)
- Searchable "From" / "To" currency selectors (search by code or name)
- Swap button that recalculates the result using real rates
- Exchange rate card showing the forward and reverse rate, plus the
  API-supplied "last updated" timestamp
- Manual "Refresh Rates" button and a paused-when-hidden auto-refresh timer
- Client-side caching of rates (`localStorage`) with a staleness window —
  cached data is always labeled as cached, never presented as live
- Graceful handling of network failures, timeouts, HTTP errors, rate
  limiting, and malformed responses, each with a Retry action
- Quick-amount chips (10 / 50 / 100 / 500 / 1000)
- Popular currency pairs (only pairs the API actually supports are shown)
- Conversion history stored in `localStorage`, with a confirmation dialog
  before clearing
- Light/dark theme toggle, stored in `localStorage`
- Responsive layout from 320px phones up to large desktops
- Semantic HTML, labeled form controls, keyboard-operable dropdowns,
  visible focus states, and `aria-live` status regions

## Project structure

```
currency-converter/
├── index.html
├── css/
│   └── style.css
├── js/
│   └── script.js
├── images/
│   └── favicon.svg
└── README.md
```

## The exchange-rate API

This app calls **[open.er-api.com](https://www.exchangerate-api.com/docs/free)**,
a free exchange-rate service that exposes a **public endpoint with no API
key required**:

```
GET https://open.er-api.com/v6/latest/{BASE_CURRENCY}
```
