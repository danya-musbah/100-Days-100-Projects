# QR Code Generator

A fully functional, responsive QR Code Generator built with plain **HTML5, CSS3, and vanilla JavaScript** — no frameworks, no build step, no backend.

## Live Demo

[View QR Code Generator](https://danya-musbah.github.io/100-Days-100-Projects/qr-code-generator/)


## Features

- 7 QR types: **Text, URL, Email, Phone, Wi-Fi, SMS, Contact (vCard)**
- Live preview that updates as you type (debounced) plus a manual **Generate** button
- Full validation per type, with clear inline error messages
- Customization: foreground/background color (with a contrast warning), size (256 / 512 / 1024 px), error-correction level (L/M/Q/H), and quiet-zone margin
- **Download PNG**, **Copy QR Code** (Clipboard API, with a graceful fallback message on unsupported browsers), and **Copy Content**
- Loading, error (with **Try Again**), and empty preview states — the preview area is never left blank without explanation
- A lightweight "Recent" history stored in `localStorage` — **only the QR type and a safe label are stored, never raw content or Wi-Fi passwords**, and it can be cleared at any time
- Fully responsive from 320px phones to large desktops, two-column desktop layout that collapses to one column on mobile
- Accessible: semantic HTML, labeled fields, keyboard-navigable tabs (arrow keys/Home/End), visible focus states, `aria-live` status/error regions

## Project structure

```
qr-code-generator/
│
├── index.html          Entry point — open this file
├── css/
│   └── style.css       All styling (palette, layout, responsive rules)
├── js/
│   ├── qrcode.lib.js   Vendored MIT-licensed QR matrix library (no dependencies)
│   └── script.js       Application logic
├── images/
│   └── favicon.svg     Custom SVG favicon
└── README.md
```
