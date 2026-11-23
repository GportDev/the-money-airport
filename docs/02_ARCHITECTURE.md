# Technical Architecture — Money Airport

## 1. Stack Decisions

### Frontend
| Choice | Rationale |
|--------|-----------|
| **React 19 + TypeScript** | Type safety, ecosystem maturity |
| **Vite** | Fast dev server, clean build |
| **TailwindCSS 4** | Utility-first, no CSS files |
| **shadcn/ui + Radix UI** | Accessible, composable primitives (Sheet for drawers, Card for widgets) |
| **TanStack Query v5** | Server state management, caching, optimistic updates |
| **React Router 7** | Nested layouts, search params as URL state |
| **TanStack Virtual** | Infinite/virtual lists for the transaction feed |
| **Recharts** | Charts, sparklines, and stacked bars across Dashboard, Accounts, Cash Flow, Reports, Forecasting |
| **BiomeJS** | Linter + formatter (replaces ESLint + Prettier) |

### Backend
| Choice | Rationale |
|--------|-----------|
| **NestJS** | Structured, decorator-based, great for APIs |
| **BetterAuth** | Modern auth library, session-based, works with any framework |
| **Drizzle ORM** | Type-safe SQL, no magic, great migrations |
| **PostgreSQL 16** | See database decision below |
| **Plaid Node SDK** | Official SDK for bank connections |
| **Stripe Node SDK** | Billing: Customer + Subscription (not Connect) |

### Database Decision: PostgreSQL

**Why PostgreSQL over MongoDB or Datomic:**

| Factor | PostgreSQL | MongoDB | Datomic |
|--------|-----------|---------|---------|
| Financial data integrity | ACID ✅ | Eventual consistency ❌ | ACID ✅ |
| Aggregation queries | Excellent (GROUP BY, window functions) | Aggregation pipeline (verbose) | Datalog (steep learning curve) |
| Time-series queries | Native date functions, partitioning | Acceptable | Excellent (built-in time travel) |
| Ecosystem / NestJS support | First-class (Drizzle, TypeORM, Prisma) | Good (Mongoose) | Minimal (Clojure-first) |
| Operational complexity | Low (managed services everywhere) | Low | High (Datomic Cloud or self-host) |
| Auth library support | BetterAuth native adapter | BetterAuth adapter | None |
| Learning curve | Already known ✅ | Already known ✅ | Significant (Datalog, Clojure) |

**Verdict:** PostgreSQL is the clear winner. It handles transactions (financial and database), aggregations, and time-series data natively. Drizzle ORM gives type-safe queries with zero runtime overhead. A single Postgres instance handles both app data and auth.

> Datomic's immutable history is compelling for audit trails, but PostgreSQL achieves the same with a simple `audit_log` table and triggers — without the operational overhead or Clojure dependency.

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────┐
│                     Frontend                         │
│  React + React Router + TanStack Query               │
│  shadcn/ui (Card, Sheet) + TailwindCSS + Recharts    │
│  Port: 5173 (dev)                                    │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP (REST JSON)
                       ▼
┌─────────────────────────────────────────────────────┐
│                     Backend                          │
│  NestJS                                              │
│  ├── AuthModule (BetterAuth)                         │
│  ├── PlaidModule (Plaid SDK + webhooks)              │
│  ├── AccountsModule (net worth, snapshots, manual)   │
│  ├── TransactionsModule                              │
│  ├── CategoriesModule                                │
│  ├── BudgetsModule                                   │
│  ├── RecurringModule                                 │
│  ├── GoalsModule                                     │
│  ├── DashboardModule (widget aggregates)             │
│  ├── ForecastModule                                  │
│  ├── ReportsModule                                   │
│  ├── BillingModule (Stripe Customer + Subscription)  │
│  └── FxModule (daily rates cache)                    │
│  Port: 3000                                          │
└──────────────────────┬──────────────────────────────┘
                       │ Drizzle ORM
                       ▼
┌─────────────────────────────────────────────────────┐
│              PostgreSQL 16                           │
│  ├── auth schema (BetterAuth tables)                 │
│  ├── public schema (app tables)                      │
│  └── Extensions: uuid-ossp, pg_trgm                  │
└─────────────────────────────────────────────────────┘
                       ▲
                       │ Webhooks
┌──────────────────────┴──────────────────────────────┐
│                   Plaid API                          │
│  Link Token → Access Token → Transactions            │
└─────────────────────────────────────────────────────┘
                       ▲
                       │ Webhooks
┌──────────────────────┴──────────────────────────────┐
│                   Stripe API                         │
│  Customer + Subscription (Free / $0 Price)           │
└─────────────────────────────────────────────────────┘
```

The UI is a widget/list/chart shell. The backend does not model spreadsheets. List screens consume cursor-paginated feeds; dashboard and account charts consume pre-aggregated series (daily snapshots, category rollups).

---

## 3. Authentication Flow

```
1. User → POST /api/auth/signup (email, password)
2. BetterAuth creates user + session → sets HTTP-only cookie
3. BillingModule tries to create Stripe Customer + $0 Subscription (retry later if Stripe is down — never block login)
4. All subsequent requests include cookie → BetterAuth middleware validates
5. Plaid Link: Frontend gets link_token from backend → user completes Link →
   frontend sends public_token → backend exchanges for access_token → stored encrypted
```

---

## 4. Plaid Integration Flow

```
Connect Account:
1. POST /api/plaid/create-link-token → { link_token }
   products: [transactions]; optional_products: [liabilities]
   (Link never fails when an institution lacks Liabilities)
2. Frontend opens Plaid Link with token
3. User authenticates with bank
4. Plaid Link returns public_token + metadata
5. POST /api/plaid/exchange-token → backend exchanges for access_token
6. Backend fetches accounts → stores in DB (including institution logo when available)
7. Backend pulls initial transactions via /transactions/sync (up to 24 months, `days_requested: 730`), writes today's balance snapshot, and rebuilds estimated past snapshots (see Ongoing Sync step 4)

Ongoing Sync:
1. Plaid webhook hits POST /api/plaid/webhook. The raw body is kept and the `Plaid-Verification`
   JWT is checked (ES256 key from /webhook_verification_key/get, `iat` under 5 minutes,
   `request_body_sha256` matches the body). Unverified requests get 400.
2. Backend calls /transactions/sync with cursor
3. New/modified/removed transactions upserted/deleted
4. Current balances updated; a daily row is upserted into account_balance_snapshot. For cash and
   credit BankAccounts, estimated rows (`is_estimated`) are rebuilt for every day from the day before
   the earliest posted, non-manual transaction up to the earliest synced snapshot, walking back from
   that snapshot through the transactions. Pending transactions are ignored. Investment and loan
   BankAccounts get no estimates.
5. If the item has Liabilities: /liabilities/get → upsert card_statement (latest Statement),
   Card terms (APR, limit) and loan_terms (principal, rate, term, next payment),
   skipping any field in bank_account.overridden_fields
6. Post-sync jobs: Transfer pairing, One-off matching, Fund interest split
7. Manual: POST /api/plaid/sync/:itemId (or "Refresh all") triggers the same flow
```

Manual accounts (vehicles, property, cash, personal loans) skip Plaid. They are created via `POST /api/accounts` and take User-entered Card terms, Statements, Loan terms, and APY.

**Projection engine:** `ProjectionService` (ForecastModule) runs the day-by-day plan (PRD F12.14–F12.19) in memory per request from plan rows, One-offs, Card terms, Statements, Loan terms, Funds, and settings. Nothing it computes is stored. Year summary, Month, Debt section, and Debt plan all call it, so they always agree. A year at daily resolution for ~20 accounts is small enough to compute per request; cache per User for 60s keyed on a plan-version counter bumped by any write.

---

## 5. Key Technical Decisions

### State Management
- **Server state:** TanStack Query (all API data)
- **Client state:** React `useState`/`useReducer` for UI state (drawer open, selected filters, widget customize mode)
- **URL state:** React Router `useSearchParams` for filters, date range, selected month/year, account scope
- **No Redux/Zustand** — TanStack Query eliminates the need

### API Design
- REST with consistent conventions (see API_SPEC.md)
- Transaction feed uses **cursor pagination** (`?cursor&limit`), not page numbers
- Dashboard, net worth, cash flow, and reports return **pre-aggregated series** so the client does not recompute charts from raw ledgers
- All monetary values stored as **integers (cents)** in the BankAccount’s ISO currency — displayed in native on rows; KPIs in Base currency
- Dates stored as ISO 8601 strings, displayed in user's timezone

### UI Composition
- **Cards** for widgets and summary KPIs
- **Grouped lists** (by date or account type) with icons — not data grids
- **Right Sheet (drawer)** for create/edit/detail; small Dialog only for confirms
- **Recharts** for area/line/bar/sparkline; CSS progress bars for budget/goals

### Error Handling
- Backend: NestJS exception filters → consistent JSON error shape
- Frontend: TanStack Query `onError` → toast notifications
- Global React error boundary for unrecoverable errors

### Caching Strategy
- TanStack Query `staleTime: 5 * 60 * 1000` (5 min) for transactions, dashboard, cash flow
- `staleTime: 30 * 60 * 1000` (30 min) for categories, accounts, goals, recurring
- Invalidate related keys on mutation (e.g. categorize → transactions + dashboard + budgets + cash-flow)

---

## 6. Deployment (Recommended)

| Component | Service |
|-----------|---------|
| Frontend | Vercel or Cloudflare Pages |
| Backend | Railway, Render, or Fly.io |
| Database | Neon (serverless Postgres) or Supabase Postgres |
| Plaid | Plaid Dashboard (sandbox → production) |
| Stripe | Stripe Dashboard (test → live); Billing, not Connect |
| FX | Frankfurter (`api.frankfurter.dev`) daily rates cached in `fx_rate` |

### Free single-user setup: Neon + Render + Vercel

The browser only talks to the Vercel origin. `client/vercel.json` rewrites `/api/*` to the Render API, so the auth cookie stays first-party (`sameSite: lax` would drop it across domains) and CORS never triggers.

1. **Neon.** Create a project, copy the direct (non-pooled) connection string. From your machine run `DATABASE_URL='<neon url>' pnpm db:push` once, and again after each schema change.
2. **Render.** New → Blueprint, pick this repo. `render.yaml` defines the `the-money-airport` free web service. It builds with `pnpm --filter server build:prod` (`server/scripts/build.ts`), which transpiles file by file: `nest build` loads the Stripe and Plaid typings and needs ~550 MB of heap, more than the free instance's 512 MB. Fill in the env vars:
   - `DATABASE_URL`: the Neon URL.
   - `BETTER_AUTH_URL` and `CLIENT_URL`: the Vercel URL, e.g. `https://money-airport.vercel.app`. An `https://` `BETTER_AUTH_URL` turns on secure cookies.
   - `BETTER_AUTH_SECRET`: `openssl rand -base64 32`. `ENCRYPTION_KEY`: `openssl rand -hex 32`. Never reuse local values.
   - `ALLOWED_EMAILS`: your Google email. Any other address is refused at account creation.
   - `DISABLE_EMAIL_SIGNUP`: `true` (preset). Email is not verified, so open password sign-up would let anyone claim an allowed address before its owner signs in with Google.
   - `PLAID_WEBHOOK_URL`: `https://the-money-airport.onrender.com/api/plaid/webhook`.
   - Plaid, Stripe, and Google keys as needed.
3. **Vercel.** Import the repo, Root Directory `client`, framework Vite. Set `VITE_API_URL=/api`. If Render gave the service a different hostname, update the destination in `client/vercel.json`.
4. If Google sign-in is on, add `https://<vercel url>/api/auth/callback/google` as an authorized redirect URI.

Free tier trade-offs: Render sleeps after 15 min idle (first request takes ~30–60 s); Neon suspends compute when idle and wakes in about a second.

---

## 7. Environment Variables

```env
# Backend
DATABASE_URL=postgresql://user:pass@host:5432/money_airport
BETTER_AUTH_SECRET=random-32-char-string
BETTER_AUTH_URL=http://localhost:3000
CLIENT_URL=http://localhost:5173  # origin the browser loads the app from
ALLOWED_EMAILS=you@gmail.com  # optional; only these emails can create accounts
DISABLE_EMAIL_SIGNUP=true  # optional; Google becomes the only sign-up path
PORT=3000  # optional; hosts like Render set it
PLAID_CLIENT_ID=xxx
PLAID_SECRET=xxx
PLAID_ENV=sandbox  # sandbox | production (Plaid retired Development)
PLAID_WEBHOOK_URL=https://api.example.com/api/plaid/webhook  # optional; set on new link tokens
ENCRYPTION_KEY=random-32-char-hex  # for Plaid access tokens
STRIPE_SECRET_KEY=rk_test_xxx  # restricted key preferred over sk_
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_FREE=price_xxx  # $0 recurring Price on Product "Free"

# Frontend
VITE_API_URL=http://localhost:3000/api
```
