# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev       # Vite frontend dev server (HMR)
npm run server    # Express backend on port 5000

# Production
npm run build     # Vite production build → dist/
npm run preview   # Preview the built app locally

# Code quality
npm run lint      # ESLint

# Tests (integration, run individually)
node tests/<suite>.test.js
```

Both frontend and backend must run simultaneously for local development. The frontend at Vite's default port proxies API calls to `http://localhost:5000` (set via `VITE_API_URL` in `.env`).

## Architecture

Full-stack SPA: React 19 + Vite (frontend) backed by Node.js/Express + MongoDB Atlas (backend). Dual deployment targets: local Express server (`server/index.js`) and Vercel serverless (`api/index.js`, which reuses the same routes with connection pooling).

### Frontend (`src/`)

- **Entry:** `main.jsx` → `App.jsx` (React Router v7 routing)
- **API client:** `src/lib/api.js` — centralized module with 100+ endpoint functions; all server calls go through here
- **Auth:** `src/lib/repAuth.js` + localStorage key `ct_user`; role-based (superuser, admin, sales-rep, data-entry)
- **Pages:** `src/pages/` — 43 components organized by domain: `admin/`, `sales/`, `customers/`, `invoices/`, `commissions/`, `items/`, `events/`, `airfeetpo/`, `pilot/`, `reports/`
- **Layout:** `src/layouts/` — `MainLayout` wraps all authenticated pages (sidebar + top header)
- **Styling:** Bootstrap 5.3 + Bootstrap Icons + `src/index.css` (global overrides)
- **State:** React hooks only — no Redux or Context API; no global store

### Backend (`server/`)

- **Entry:** `server/index.js` — mounts all route files, connects MongoDB, sets CORS and 50 MB JSON limit
- **Routes:** `server/routes/` — 25+ route files, one per domain, all follow REST conventions
- **Models:** `server/models/` — 15 Mongoose schemas; key ones: `User`, `SalesRep`, `Customer`, `Invoice`, `Commission`, `Event`
- **Email:** Nodemailer via Gmail SMTP (env: `SMTP_HOST`, credentials in `.env`)
- **File uploads:** Multer (`uploads/customer_po/`, `uploads/pilot_programs/`)
- **Backups:** Automated MongoDB backup scheduler (`server/routes/backups.js`)

### Vercel serverless (`api/`)

`api/index.js` wraps the Express app for Vercel Functions. The `vercel.json` rewrites all `/api/*` traffic here and falls back to `/index.html` for the SPA. Function timeout is 30 s.

### Data models

Core collections (MongoDB, db name `523`): `app_user`, `sales_rep`, `customer`, `invoice`, `commission`, `event`, `product_item`, `product_size`, `product_group`, `product_style`, `item_size_map`, `airfeet_po`, `pilot_program`, `backup`, `backup_settings`, `user_access`, `user_activity`, `user_level`, `privilege`.

### Testing

Integration test suites live in `tests/`. Each file is a standalone Node.js ES module that hits the running API. Run them individually: `node tests/invoices.test.js`. No test runner framework is used.

### Key libraries

| Purpose | Library |
|---|---|
| Charts | Chart.js |
| Rich text | CKEditor 5 |
| Notifications | react-hot-toast |
| CSV export | `src/lib/exportCSV.js` (custom) |

## Environment

Copy `.env` for local development:

```
VITE_API_URL=http://localhost:5000/api
MONGO_URI=<MongoDB Atlas URI>
SMTP_HOST=smtp.gmail.com
SMTP_USER=...
SMTP_PASS=...
```

Vercel environment variables are managed separately via the Vercel dashboard or `vercel env`.
