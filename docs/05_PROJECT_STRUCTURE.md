# Project Structure — CashPilot

Monorepo with two packages: `client` (React) and `server` (NestJS).

The frontend is organized around **pages + widgets + drawers**, not tables + modals.

---

## Root

```
cashpilot/
├── client/                     # React frontend
├── server/                     # NestJS backend
├── biome.json                  # Shared BiomeJS config
├── package.json                # Workspace root
├── tsconfig.base.json          # Shared TS config
└── README.md
```

### `biome.json`

```json
{
  "$schema": "https://biomejs.dev/schemas/2.0.0/schema.json",
  "organizeImports": { "enabled": true },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "correctness": { "noUnusedVariables": "warn", "noUnusedImports": "warn" },
      "suspicious": { "noExplicitAny": "warn" },
      "style": { "useConst": "error" }
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "tab",
    "lineWidth": 100
  }
}
```

---

## Frontend — `client/`

```
client/
├── public/
├── src/
│   ├── main.tsx
│   ├── app.tsx                           # Providers + authenticated shell
│   ├── router.tsx                        # TanStack Router + route tree
│   │
│   ├── api/
│   │   ├── client.ts
│   │   ├── accounts.ts
│   │   ├── advice.ts
│   │   ├── auth.ts
│   │   ├── budgets.ts
│   │   ├── cash-flow.ts
│   │   ├── categories.ts
│   │   ├── dashboard.ts
│   │   ├── forecast.ts
│   │   ├── goals.ts
│   │   ├── investments.ts
│   │   ├── plaid.ts
│   │   ├── recurring.ts
│   │   ├── reports.ts
│   │   ├── settings.ts
│   │   └── transactions.ts
│   │
│   ├── hooks/
│   │   ├── use-accounts.ts
│   │   ├── use-advice.ts
│   │   ├── use-auth.ts
│   │   ├── use-budgets.ts
│   │   ├── use-cash-flow.ts
│   │   ├── use-categories.ts
│   │   ├── use-dashboard.ts
│   │   ├── use-forecast.ts
│   │   ├── use-goals.ts
│   │   ├── use-investments.ts
│   │   ├── use-recurring.ts
│   │   ├── use-reports.ts
│   │   └── use-transactions.ts           # infinite query
│   │
│   ├── pages/
│   │   ├── dashboard.tsx                 # default home
│   │   ├── cash-flow.tsx
│   │   ├── accounts.tsx
│   │   ├── transactions.tsx
│   │   ├── reports.tsx
│   │   ├── budget.tsx
│   │   ├── recurring.tsx
│   │   ├── goals.tsx
│   │   ├── investments.tsx
│   │   ├── forecast.tsx
│   │   ├── settings.tsx
│   │   ├── login.tsx
│   │   └── signup.tsx
│   │
│   ├── components/
│   │   ├── ui/                           # shadcn (button, card, sheet, chart, progress, …)
│   │   │
│   │   ├── layout/
│   │   │   ├── sidebar.tsx               # Primary nav (see PRD order)
│   │   │   ├── header.tsx                # Search, notifications, settings, sidebar toggle
│   │   │   ├── page-layout.tsx           # Sidebar + main + optional right panel
│   │   │   └── page-header.tsx           # Title, sub-tabs, primary orange CTA
│   │   │
│   │   ├── drawers/                      # Right sheets — primary create/edit/detail
│   │   │   ├── transaction-drawer.tsx    # Detail + edit category/notes + add
│   │   │   ├── account-drawer.tsx
│   │   │   ├── budget-category-drawer.tsx
│   │   │   ├── recurring-drawer.tsx
│   │   │   ├── goal-drawer.tsx
│   │   │   ├── forecast-item-drawer.tsx  # Monthly amounts, copy-across
│   │   │   └── category-manager-drawer.tsx
│   │   │
│   │   ├── widgets/                      # Dashboard cards
│   │   │   ├── budget-widget.tsx
│   │   │   ├── net-worth-widget.tsx
│   │   │   ├── spending-widget.tsx
│   │   │   ├── transactions-widget.tsx
│   │   │   ├── recurring-widget.tsx
│   │   │   ├── advice-widget.tsx
│   │   │   └── weekly-recap-widget.tsx
│   │   │
│   │   ├── transactions/
│   │   │   ├── transaction-row.tsx       # Logo, merchant, category, account, amount
│   │   │   └── transaction-feed.tsx      # Date groups + infinite/virtual list
│   │   │
│   │   ├── accounts/
│   │   │   ├── account-row.tsx           # Logo, sparkline, balance, last updated
│   │   │   ├── account-group.tsx         # Collapsible Cash / Credit / …
│   │   │   └── assets-liabilities-panel.tsx
│   │   │
│   │   ├── budget/
│   │   │   ├── budget-group.tsx
│   │   │   ├── budget-row.tsx            # Icon, progress bar, planned/actual/remaining
│   │   │   └── budget-summary-panel.tsx
│   │   │
│   │   ├── goals/
│   │   │   ├── goal-card.tsx
│   │   │   └── goals-summary-panel.tsx
│   │   │
│   │   ├── charts/
│   │   │   ├── area-chart.tsx
│   │   │   ├── comparison-line-chart.tsx
│   │   │   ├── sparkline.tsx
│   │   │   └── stacked-bar.tsx
│   │   │
│   │   ├── month-navigator.tsx
│   │   ├── year-navigator.tsx
│   │   ├── date-range-picker.tsx
│   │   ├── account-scope.tsx
│   │   ├── currency-display.tsx
│   │   ├── merchant-logo.tsx
│   │   ├── confirm-dialog.tsx            # Small modal: disconnect, delete
│   │   └── empty-state.tsx
│   │
│   ├── lib/
│   │   ├── format.ts
│   │   ├── dates.ts
│   │   ├── cn.ts
│   │   └── constants.ts                  # Nav items, widget ids, palette
│   │
│   └── types/
│       └── index.ts
│
├── index.html
├── tailwind.config.ts
├── tsconfig.json
├── vite.config.ts
└── package.json
```

### Key Conventions (Frontend)

1. **One page component per route** — pages compose hooks + widgets/lists; they do not own table chrome.
2. **API layer returns typed data** — each `api/*.ts` file exports async functions that return typed responses.
3. **Hooks wrap TanStack Query** — `useQuery` / `useInfiniteQuery` / `useMutation` with keys, staleTime, and invalidation.
4. **Create/edit/detail live in `components/drawers/`** (shadcn `Sheet`). Confirm-only dialogs use `confirm-dialog.tsx`.
5. **No global state library** — TanStack Query is the server cache; drawer open state is local.
6. **Reuse `transaction-feed`** on Transactions, Cash Flow, and the Dashboard widget (truncated).

---

## Backend — `server/`

```
server/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   │
│   ├── db/
│   │   ├── drizzle.ts
│   │   ├── schema/
│   │   │   ├── index.ts
│   │   │   ├── plaid-item.ts
│   │   │   ├── bank-account.ts
│   │   │   ├── account-balance-snapshot.ts
│   │   │   ├── transaction.ts
│   │   │   ├── category.ts
│   │   │   ├── budget.ts
│   │   │   ├── recurring-item.ts
│   │   │   ├── goal.ts
│   │   │   ├── forecast.ts
│   │   │   └── user-settings.ts
│   │   └── seed.ts
│   │
│   ├── auth/
│   ├── plaid/
│   ├── accounts/                         # Includes net-worth + snapshots
│   ├── transactions/
│   ├── categories/
│   ├── budgets/
│   ├── recurring/
│   ├── goals/
│   ├── dashboard/                        # Composes other services into widget payload
│   ├── reports/
│   ├── forecast/
│   ├── investments/                      # Read-only filter of accounts
│   ├── advice/                           # Deterministic rules, no table
│   ├── settings/
│   ├── export/
│   │
│   └── common/
│       ├── pipes/zod-validation.pipe.ts
│       ├── filters/http-exception.filter.ts
│       ├── decorators/current-user.decorator.ts
│       ├── dto/cursor-pagination.dto.ts
│       ├── crypto.ts
│       └── cents.ts
│
├── drizzle/
├── drizzle.config.ts
├── tsconfig.json
├── nest-cli.json
└── package.json
```

Each domain folder is `*.module.ts` + `*.controller.ts` + `*.service.ts`.

### Key Conventions (Backend)

1. **One NestJS module per domain** — controller + service. No repositories layer (Drizzle is thin enough).
2. **Drizzle directly in services** — inject the Drizzle instance; write queries inline.
3. **Zod for validation** — not `class-validator`. Zod schemas define DTOs and pipe validates.
4. **Auth guard on every controller** except auth and webhook routes.
5. **All services receive `userId`** from the controller (extracted by `@CurrentUser()` decorator). Services never access the request object.
6. **Encryption module** — Plaid access tokens encrypted with AES-256-GCM before storage.
7. **DashboardModule composes** Accounts, Budgets, Transactions, Recurring, Advice — it does not own extra tables.

---

## Shared Types Pattern

Both client and server use the same type definitions. Options:

**Option A (simple):** Define types in `client/src/types/index.ts`, manually keep in sync.
**Option B (shared package):** Create `packages/types/` in the monorepo workspace — both import from it.

Recommended: **Option A** for V1. Add a shared package when the types diverge enough to cause bugs.
