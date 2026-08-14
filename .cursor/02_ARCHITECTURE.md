# Technical Architecture — CashPilot

## 1. Stack Decisions

### Frontend
| Choice | Rationale |
|--------|-----------|
| **React 19 + TypeScript** | Type safety, ecosystem maturity |
| **Vite** | Fast dev server, clean build |
| **TailwindCSS 4** | Utility-first, no CSS files |
| **shadcn/ui + Radix UI** | Accessible, composable primitives (Sheet for drawers, Card for widgets) |
| **TanStack Query v5** | Server state management, caching, optimistic updates |
| **TanStack Router** | Type-safe routing, search params as state |
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
│  React + TanStack Router + TanStack Query            │
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
│  └── AdviceModule (deterministic rules)              │
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
```

The UI is a widget/list/chart shell. The backend does not model spreadsheets. List screens consume cursor-paginated feeds; dashboard and account charts consume pre-aggregated series (daily snapshots, category rollups).

---

## 3. Authentication Flow

```
1. User → POST /api/auth/signup (email, password)
2. BetterAuth creates user + session → sets HTTP-only cookie
3. All subsequent requests include cookie → BetterAuth middleware validates
4. Plaid Link: Frontend gets link_token from backend → user completes Link →
   frontend sends public_token → backend exchanges for access_token → stored encrypted
```

---

## 4. Plaid Integration Flow

```
Connect Account:
1. POST /api/plaid/create-link-token → { link_token }
2. Frontend opens Plaid Link with token
3. User authenticates with bank
4. Plaid Link returns public_token + metadata
5. POST /api/plaid/exchange-token → backend exchanges for access_token
6. Backend fetches accounts → stores in DB (including institution logo when available)
7. Backend fetches initial transactions (last 90 days) and writes opening balance snapshots

Ongoing Sync:
1. Plaid webhook hits POST /api/plaid/webhook
2. Backend calls /transactions/sync with cursor
3. New/modified/removed transactions upserted/deleted
4. Current balances updated; a daily row is upserted into account_balance_snapshot
5. Manual: POST /api/plaid/sync/:itemId (or "Refresh all") triggers the same flow
```

Manual accounts (vehicles, property, cash) skip Plaid. They are created via `POST /api/accounts` and participate in net worth only.

---

## 5. Key Technical Decisions

### State Management
- **Server state:** TanStack Query (all API data)
- **Client state:** React `useState`/`useReducer` for UI state (drawer open, selected filters, widget customize mode)
- **URL state:** TanStack Router search params for filters, date range, selected month/year, account scope
- **No Redux/Zustand** — TanStack Query eliminates the need

### API Design
- REST with consistent conventions (see API_SPEC.md)
- Transaction feed uses **cursor pagination** (`?cursor&limit`), not page numbers
- Dashboard, net worth, cash flow, and reports return **pre-aggregated series** so the client does not recompute charts from raw ledgers
- All monetary values stored as **integers (cents)** — displayed as dollars in frontend
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

---

## 7. Environment Variables

```env
# Backend
DATABASE_URL=postgresql://user:pass@host:5432/cashpilot
BETTER_AUTH_SECRET=random-32-char-string
BETTER_AUTH_URL=http://localhost:3000
PLAID_CLIENT_ID=xxx
PLAID_SECRET=xxx
PLAID_ENV=sandbox  # sandbox | development | production
ENCRYPTION_KEY=random-32-char-hex  # for Plaid access tokens

# Frontend
VITE_API_URL=http://localhost:3000/api
```
