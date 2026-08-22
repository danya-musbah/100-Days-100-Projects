# Parks Platform | منتزهات

An integrated Arabic (RTL) platform for exploring amusement parks and booking tickets, featuring separate dashboards for Park Managers and the Platform Super Admin.
A Software Engineering graduation project — a complete serverless frontend architecture with a ready-to-expand Flask backend.

---

## Live Demo

[View Parks Platform](https://danya-musbah.github.io/100-Days-100-Projects/parks-platform/)

---

## Project Concept

### The Problem
There is no unified digital platform in Libya that allows families to explore amusement parks, view available rides, services, prices, and book tickets electronically without the need for physical visits or phone calls.

### The Solution
**Parks Platform** is a web-based solution that aggregates all this information into one place: browse, compare, and book e-tickets in a few clicks. It includes two independent dashboards: one giving each park autonomy to manage its content, and another for the Super Admin to maintain general oversight without interfering in operational details.

---

## User Roles & Permissions

| Role | Responsibility |
|---|---|
| **Visitor** | Searching, planning, and booking tickets |
| **Park Admin** | Managing their specific park only: rides, services, pricing, bookings, and status |
| **Super Admin** | Managing parks and park managers only — no involvement in operational content |

Permissions are strictly constrained based on the project requirements; there is no overlap in functionality between roles.

---

## Key Features

- **Browsing & Search**: Search and filter parks (by city, status, rating, price).
- **Park Details**: Detailed pages with tabs for Rides, Services, and Tickets/Booking.
- **Booking Flow**: Ticket selection → Date → Quantity → Instant Summary → Confirmation.
- **E-Tickets**: Digital tickets with a mock QR code, printable.
- **My Bookings**: Manage upcoming, past, and cancelled bookings (Soft cancel).
- **Authentication**: Login and account creation with session simulation via LocalStorage.
- **Park Admin Dashboard**: Statistics, full CRUD for rides and services, pricing management, booking views, and status updates.
- **Super Admin Dashboard**: General statistics, CRUD for parks, and management of park managers linked to their respective parks.
- **Responsiveness**: Fully responsive (Mobile-first) design from 320px to large screens.
- **UI/UX**: Skeleton loaders, empty states, Toast notifications, Modals, and form validation.
- **Accessibility**: Semantic HTML, form labels, alt text for images, high color contrast, clear focus-visible states, and `prefers-reduced-motion` support.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5 + CSS3 + Vanilla JavaScript (No frameworks) |
| Backend (Initial) | Python + Flask |
| Data Source | Static JSON files + LocalStorage |

**Note**: There is no reliance on React, Vue, Angular, Next.js, Bootstrap, Tailwind, jQuery, npm, or external databases in this version.

---

## Project Structure

```
parks-platform/
├── index.html                  ← Main entry point
├── parks.html
├── park-details.html
├── login.html
├── register.html
├── profile.html
├── my-bookings.html
├── ticket.html
│
├── admin/                      ← Park Admin Dashboard
│   ├── park-dashboard.html
│   ├── park-settings.html
│   ├── rides.html
│   ├── services.html
│   ├── tickets.html
│   └── bookings.html
│
├── super-admin/                ← Super Admin Dashboard
│   ├── dashboard.html
│   ├── parks.html
│   ├── managers.html
│   └── statistics.html
│
├── css/
│   ├── main.css                ← Design tokens and base styles
│   ├── components.css          ← Navbar/Footer/Buttons/Cards/Modals/Toasts
│   ├── pages.css                ← Page-specific styles
│   ├── dashboard.css            ← Dashboards styles
│   └── responsive.css           ← Responsiveness tweaks
│
├── js/
│   ├── data.js                  ← Mock data (source: data/*.json)
│   ├── storage.js                ← Data Access Layer
│   ├── components.js             ← Shared components (Navbar/Footer/Toast/Modal/Icons)
│   ├── auth.js                   ← Login/Account/Session management
│   ├── app.js                    ← Home page logic
│   ├── parks.js                  ← Search and filtering
│   ├── park-details.js           ← Details and booking logic
│   ├── bookings.js               ← My bookings page
│   ├── ticket.js                 ← E-ticket and mock QR code
│   ├── park-admin.js             ← Park Admin logic
│   └── super-admin.js            ← Super Admin logic
│
├── data/                        ← Static data (JSON) — Single source of truth
│   ├── parks.json
│   ├── rides.json
│   ├── services.json
│   ├── tickets.json
│   ├── bookings.json
│   ├── users.json
│   └── admins.json
│
├── backend/                     ← Initial Flask API (Optional in this version)
│   ├── app.py
│   ├── routes/parks_routes.py
│   └── services/data_service.py
│
├── assets/
│   ├── images/                  ← Mock SVG images for parks and rides
│   └── icons/
│
└── README.md
```

---

## Demo Accounts

| Role | Email | Password |
|---|---|---|
| Visitor | `visitor@example.com` | `123456` |
| Park Admin | `admin@funworld.demo` | `123456` |
| Super Admin | `superadmin@platform.demo` | `123456` |

> You can also create a new visitor account from the `register.html` page.

---

## Important Notes on Data & Security

- **Static Data**: Currently sourced from JSON files in `data/` and loaded as JavaScript variables (`js/data.js`) to avoid CORS restrictions when opened directly via `file://`. Add/Edit/Delete operations from dashboards are saved to **LocalStorage** only (in the current browser), and do not modify the original JSON files.
- **Future Database**: The structure is designed so that the `storage.js` layer can be replaced with real `fetch()` calls to a Flask API connected to PostgreSQL or Supabase, without needing to rebuild any HTML pages.
- **Authentication**: The current authentication is a frontend simulation using LocalStorage and is not secure for production use. When connecting to a real database, **Authorization must be enforced on the server-side (Flask)**, not just relying on frontend checks.
- **QR Code**: The QR code on the e-ticket is a **mock** for demonstration purposes and is not a scan-able code.

---

## Future Improvements

- Integrate a real database (PostgreSQL / Supabase) instead of JSON/LocalStorage.
- Enable full Flask API routes (POST/PUT/DELETE) connected to the frontend.
- Implement a robust server-side authentication and authorization system (JWT/Sessions).
- Add a real electronic payment system.
- Implement a visitor review and rating system.
- Add email/SMS notifications for booking confirmations.
- Implement real QR code generation for scanning at entry gates.

---

## Testing Core Scenarios

- **Visitor**: Home → Parks → Select Park → Rides/Services → Select Ticket & Date → Confirm Booking → View QR → Booking appears in "My Bookings" → Cancel booking.
- **Park Admin**: Login → Dashboard → Edit Park Info → Add/Edit Ride → Update Prices → View Bookings → Update Park Status.
- **Super Admin**: Login → Dashboard → Add Park → Add Park Admin → Link Admin to Park → View General Statistics.

---

© 2026 Parks Platform | منتزهات — Graduation Project Demo.
