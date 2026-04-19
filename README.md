# Procurement App

A full-stack Philippine Government procurement management system built on [Bun](https://bun.sh) + [Hono](https://hono.dev), backed by MySQL, with server-rendered HTML views styled using Tailwind CSS. Compliant with RA 9184 (Government Procurement Reform Act).

## Features

- **PPMP** — Project Procurement Management Plan creation and approval workflow
- **APP** — Annual Procurement Plan linked to PPMP items
- **Projects** — Full procurement lifecycle (18 statuses from DRAFT → COMPLETED) with milestone tracking
- **BAC** — Bids and Awards Committee management: committees, members, secretariat, TWGs, and resolutions with vote recording
- **Bids** — Bid submission, line items, evaluation, and disqualification
- **Suppliers** — Registry with blacklisting/unblacklisting and bid history
- **Awards** — Notice of Award (issue, accept, PhilGEPS posting) and Notice to Proceed issuance
- **Dashboard** — KPI summary and recent project activity

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | [Bun](https://bun.sh) |
| Web framework | [Hono](https://hono.dev) v4 |
| Database | MySQL (via mysql2) |
| Styling | Tailwind CSS (CDN, flat design) |
| Language | TypeScript (strict) |

## Prerequisites

- [Bun](https://bun.sh) ≥ 1.0
- MySQL 8.x server running locally or remotely

## Setup

**1. Install dependencies**
```sh
bun install
```

**2. Configure environment**

Copy the example env file and fill in your values:
```sh
cp .env.example .env
```

`.env.example`:
```
DATABASE_URL=mysql://root:your_password@localhost:3306/procurement_db
PORT=3000
```

**3. Initialise the database**

Creates the schema and seeds reference data (3 sample procuring entities):
```sh
bun run db:init
```

**4. Start the dev server**
```sh
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---|---|
| `bun run dev` | Start with hot reload |
| `bun run start` | Start in production mode |
| `bun run db:init` | Apply schema and seed data |

## Project Structure

```
src/
├── index.ts            # Entry point, route mounting
├── db/
│   ├── index.ts        # Connection pool + query helpers
│   ├── init.ts         # Schema runner
│   └── schema.sql      # Full MySQL schema (21 tables)
├── routes/
│   ├── dashboard.ts
│   ├── ppmp.ts
│   ├── app-plan.ts
│   ├── projects.ts
│   ├── suppliers.ts
│   ├── bids.ts
│   ├── bac.ts
│   └── awards.ts
└── views/
    ├── layout.ts       # HTML shell with sidebar navigation
    └── components.ts   # Reusable UI component functions
procurement-types.ts    # RA 9184 TypeScript type definitions
```
