# Շուկա · Shuka

An Amazon-style marketplace for Armenia: anyone can register, sell products and buy from several sellers in one cart. Payment is cash on delivery; prices are in AMD. The interface is in Armenian and English.

- **Frontend:** React + Vite (`client/`), hosted on Netlify
- **Backend:** Node.js + Express REST API (`server/`), hosted on Render
- **Database:** one SQLite file (better-sqlite3) in WAL mode with foreign keys on and a 5 s busy timeout

## Run locally (one command)

Needs Node.js 22 or newer.

```bash
npm run setup      # installs everything (first time only)
npm run seed       # creates the database with demo data (first time only)
npm run dev        # API on :3000 + web app on http://localhost:5173
```

Demo accounts, all with the password `shuka1234`:

| Email | Role |
|---|---|
| `aram@shuka.test` | seller (Ararat Tech) |
| `ani@shuka.test` | seller (Gyumri Crafts) |
| `davit@shuka.test` | seller (Sevan Market) |
| `lilit@shuka.test` | buyer |
| `narek@shuka.test` | buyer |

Other scripts: `npm run seed:reset` (wipe and re-seed), `npm run migrate`, `npm run backup`, `npm run build` then `npm start` (one process serving both API and built frontend on :3000).

## Break-it tests

With the server running:

```bash
npm run test:breakit                                   # against localhost:3000
BASE_URL=https://your-site.netlify.app npm run test:breakit   # against the live site
```

They cover the 9 tests in the brief: 30 parallel checkouts for 3 units, double click, price change, old order after edit, other people's orders, illegal status moves, cancel returns stock, foreign keys, and bad uploads. Two extra tests cover reviews and permissions.

## How the hard parts are solved

| Problem | Where |
|---|---|
| Overselling | `server/src/routes/orders.js`: one `BEGIN IMMEDIATE` transaction, `UPDATE … SET stock = stock - ? WHERE id = ? AND stock >= ?` with a changed-row check; any failure rolls back the whole order (409) |
| "Database is locked" | `server/src/db.js`: WAL, `busy_timeout = 5000`, short transactions (no uploads inside) |
| Prices change after purchase | title and unit price copied into `order_items`, address into `orders`; checkout stops with `PRICE_CHANGED` if the cart price differs |
| One cart, many sellers | one `orders` row → one `seller_orders` row per seller, each with its own status and history |
| Illegal status changes | `server/src/lifecycle.js`: the single list of allowed moves, everything else is 409; each move adds a `status_history` row (insert-only via triggers) |
| Other people's data | every query is scoped, e.g. `WHERE id = ? AND seller_id = ?` |
| Double checkout | a random request key from the page; `orders.request_key` is UNIQUE and a repeat returns the existing order |
| Broken references | `PRAGMA foreign_keys = ON` on every connection; products are unpublished, never deleted (`ON DELETE RESTRICT`) |
| Images | `server/src/images.js`: type and size checked (by real content, not by name), resized with sharp to a 400 px thumbnail and a 1200 px large WebP, stored in `uploads/`, only the path in SQLite |

Schema: `server/migrations/001_init.sql` (10 STRICT tables, money as INTEGER dram, ISO-8601 dates). Migrations are tracked with `PRAGMA user_version`.

## Deploy

1. **Backend (Render):** New → Blueprint → choose this repository → Apply. `render.yaml` creates the `shuka-api` web service with a generated `SESSION_SECRET`.
2. **Frontend (Netlify):** import the same repository. `netlify.toml` builds `client/` and proxies `/api/*` and `/uploads/*` to `https://shuka-api.onrender.com` (change it if your Render URL differs).

Secrets live only in environment variables. A daily backup is written with `VACUUM INTO` to `DATA_DIR/backups` (last 7 kept).

**Note on the free Render plan:** it has no persistent disk, so the database and uploads are reset (and the demo data re-created) on every deploy or restart, and the server sleeps after 15 minutes without visits (the first request then takes up to a minute). To keep data, use a paid instance with a disk at `/var/data` and set `DATA_DIR=/var/data` (see `render.yaml`).
