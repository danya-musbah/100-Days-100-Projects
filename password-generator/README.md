# Secure Password Generator

A fully client-side password generator built with vanilla HTML, CSS, and
JavaScript. No frameworks, no build step, no backend.

## Live Demo

[View Password Generator](https://danya-musbah.github.io/100-Days-100-Projects/password-generator/)


## Features

- **Cryptographically secure generation** — uses `window.crypto.getRandomValues()`
  exclusively; `Math.random()` is never used.
- **Unbiased random selection** — `getSecureRandomIndex()` uses rejection
  sampling to avoid modulo bias when mapping random bytes to character
  indices.
- **Secure Fisher-Yates shuffle** — after guaranteed characters are picked,
  the full password is shuffled with the same crypto-backed randomness
  (not `array.sort(() => Math.random() - 0.5)`).
- **Guaranteed character categories** — if uppercase, lowercase, numbers,
  and symbols are all selected, the result is guaranteed to contain at
  least one of each.
- **Adjustable length** (8–64) via a synced slider and numeric input.
- **Independent toggles** for uppercase, lowercase, numbers, and symbols.
- **Live validation** — blocks invalid configurations (no character types
  selected, or length shorter than the number of required categories)
  with a clear on-screen message instead of silently generating a bad
  password.
- **Strength meter and entropy estimate** — `estimate ≈ length × log2(pool size)`,
  clearly labeled as an estimate, not a real-world security guarantee.
- **Show/hide toggle**, **copy to clipboard** with a "Copied!" confirmation
  state, and a **regenerate** action.
- **In-memory password history** (last 5) — never written to
  `localStorage`, cookies, `IndexedDB`, or the URL. Clears automatically
  on page reload, and can be cleared manually at any time.
- **Accessible by design** — semantic HTML, labeled controls, visible
  focus states, `aria-live` status announcements, and full keyboard
  operability.
- **Responsive** from 320px mobile screens up through large desktop
  viewports, with no horizontal page overflow.

## Project structure

```
password-generator/
├── index.html
├── css/
│   └── style.css
├── js/
│   └── script.js
├── images/
│   └── favicon.svg
└── README.md
```