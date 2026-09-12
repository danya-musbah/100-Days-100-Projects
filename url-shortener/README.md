# ShortLink

A fast, private, local-first URL shortener. Paste a long link, get a clean one back, and keep track of everything you've shortened — all from a single static page.

Built as a portfolio-quality front-end project: plain HTML, CSS, and JavaScript, no framework, no build step, no server.

## Live Demo

[View ShortLink](https://danya-musbah.github.io/100-Days-100-Projects/url-shortener/)


## Features

- Paste any URL and generate a short link in seconds
- Optional custom alias (`short.ly/your-alias`) with full validation
- Inline validation and error states for both the URL and alias fields
- Animated result card with copy, open, QR code, and share actions
- Real clipboard copy (Clipboard API, with a manual-copy fallback)
- QR code generation for every short link, with PNG download
- Native share sheet support via the Web Share API, with an automatic copy fallback on unsupported browsers
- Recent Links history, saved in `localStorage`, with search and per-item delete
- "Clear history" with a confirmation step — nothing is deleted silently
- Live statistics (links created, links saved, links created today) computed from real local data
- Fully responsive, from 320px phones to large desktop monitors
- Keyboard shortcuts: `Ctrl/Cmd + Enter` to shorten, `Escape` to close modals
- Accessible by default: semantic HTML, labelled fields, ARIA live regions, focus-visible states, and a fully keyboard-operable modal
- Respects `prefers-reduced-motion`

## Tech stack

```text
HTML5
CSS3
Vanilla JavaScript (ES6+)
LocalStorage
Clipboard API
Web Share API
Canvas API (for QR rendering)
```

No external URL-shortening API is called over the network — see **How shortening works** below for why, and how to swap in a real one.

## Usage

1. Paste a long URL into the **Long URL** field.
2. Optionally, enter a **custom alias** — otherwise a random code is generated for you.
3. Click **Shorten URL** (or press `Ctrl/Cmd + Enter`).
4. Use **Copy** to copy the short link, or **Open** to visit the real destination.
5. Click the **QR code** icon to get a scannable code for the link, with a PNG download option.
6. Use **Share** to send the link through your device's native share sheet, where supported.
7. Scroll to **Recent Links** to search, revisit, or delete anything you've created — all stored locally in this browser.

## Project structure

```text
url-shortener/
│
├── index.html          # App markup & structure
│
├── css/
│   └── style.css        # All styling, design tokens, responsive rules
│
├── js/
│   ├── script.js         # Application logic (validation, storage, UI state)
│   └── qrcode.js          # Vendored QR code generator (see Third-party code)
│
├── images/
│   └── favicon.svg       # Inline SVG favicon / brand mark
│
└── README.md
```

## License

This project is provided as-is for portfolio and educational use. The vendored QR code library retains its own MIT License (see **Third-party code** above).
