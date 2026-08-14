# Implementation Guide — CashPilot

## Build Order

Execute phases sequentially. Each phase results in a working, testable slice. The product is a **widget dashboard** from Phase 4 onward — do not build spreadsheet tables as an intermediate UI.

---

### Phase 0 — Scaffolding (Day 1)

```
1. Init monorepo with pnpm workspaces
2. Scaffold client: Vite + React + TS + TailwindCSS + shadcn/ui (Card, Sheet, Progress)
3. Scaffold server: NestJS CLI + Drizzle + PostgreSQL connection
4. Configure BiomeJS at root (single biome.json, both packages inherit)
5. Set up TanStack Router with placeholder pages for every nav item
6. Build layout shell: sidebar (PRD order), header chrome, page-layout with optional right panel
7. Verify: both apps start, database connects, linter runs, nav switches pages
```

**Deliverable:** Empty shell. Default route is Dashboard. Sidebar: Dashboard, Cash Flow, Accounts, Transactions, Reports, Budget, Recurring, Goals, Investments, Forecasting. Footer: profile.

---

### Phase 1 — Auth (Days 2-3)

```
1. Set up BetterAuth in NestJS (server/src/auth/)
2. Create auth tables via BetterAuth auto-migration
3. Build login + signup pages (client)
4. Implement AuthGuard (server) + protected route wrapper (client)
5. Profile menu in sidebar footer (logout) + settings gear in header
6. Verify: sign up → login → see dashboard → logout
```

**Key code:**

```typescript
// server/src/auth/auth.service.ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: { enabled: true },
  socialProviders: { google: { clientId: "...", clientSecret: "..." } },
});
```

```typescript
// server/src/auth/auth.guard.ts
@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) throw new UnauthorizedException();
    req.user = session.user;
    return true;
  }
}
```

---

### Phase 2 — Plaid + Accounts page (Days 4-7)

```
1. Create plaid_item, bank_account, account_balance_snapshot tables
2. Build PlaidModule (create-link-token, exchange-token, sync, sync-all, webhook)
3. Integrate Plaid Link (react-plaid-link) from Accounts [+ Add account]
4. Manual account create (vehicles, cash, property)
5. Accounts page: net-worth hero + chart, grouped rows with sparklines, last updated
6. Right panel: assets vs liabilities stacked bars
7. Snapshot upsert on every sync
8. Verify: connect sandbox → grouped accounts → chart moves after sync
```

**Plaid sandbox credentials:** Use `user_good` / `pass_good` for testing.

Net worth = sum(assets) − sum(liabilities) from `bank_account.current_balance` and `is_asset`. Series comes from summing snapshots per day.

---

### Phase 3 — Categories + Transaction feed (Days 8-11)

```
1. Create category + transaction tables (kind, budget_group, merchant_logo_url)
2. Seed default categories on user creation
3. Build TransactionsModule (cursor list, CRUD, bulk categorize)
4. Normalize Plaid amounts on ingest (flip sign)
5. Transactions page: date-grouped feed, infinite scroll, filters in URL
6. Transaction drawer (detail + edit category/notes + add)
7. Category manager drawer
8. Bulk categorize
9. Verify: feed groups by date → filter → change category in drawer → bulk assign
```

**Amount normalization (critical):**

```typescript
// server/src/plaid/plaid.service.ts — during transaction sync
function normalizePlaidTransaction(plaidTx: PlaidTransaction) {
  return {
    name: plaidTx.name,
    // Plaid: positive = debit (expense), negative = credit (income)
    // Our convention: positive = income, negative = expense
    amount: Math.round(plaidTx.amount * -100), // flip sign + convert to cents
    date: plaidTx.date,
    merchantName: plaidTx.merchant_name,
    merchantLogoUrl: plaidTx.logo_url ?? null,
    pending: plaidTx.pending,
  };
}
```

Do **not** ship a sortable data-grid as the Transactions UI.

---

### Phase 4 — Dashboard (Days 12-13)

```
1. Build DashboardModule composing accounts, budgets (stub zeros until Phase 6),
   transactions, recurring (empty until Phase 7), advice
2. GET /dashboard payload
3. Widget grid + Customize (persist dashboard_widgets on user_settings)
4. Net worth, spending comparison, recent transactions, weekly recap widgets
5. Verify: home shows cards; customize hides a widget; deep-links work
```

Budget / Recurring / Advice widgets can render empty or placeholder until their phases land.

---

### Phase 5 — Cash Flow (Days 14-15)

```
1. GET /cash-flow: daily income/expenses + optional running-balance series
2. Cash Flow page: KPI cards, chart, reused transaction-feed
3. Account scope + month navigator
4. Verify: chart matches month totals; overlay is a line, not a Balance column
```

```sql
SELECT
  EXTRACT(DAY FROM t.date)::int AS day,
  COALESCE(SUM(t.amount) FILTER (WHERE t.amount > 0), 0) AS income,
  COALESCE(ABS(SUM(t.amount) FILTER (WHERE t.amount < 0)), 0) AS expenses
FROM transaction t
WHERE t.user_id = :userId
  AND t.date >= :monthStart AND t.date <= :monthEnd
  AND (:accountId::uuid IS NULL OR t.bank_account_id = :accountId)
GROUP BY 1
ORDER BY 1;
```

---

### Phase 6 — Budgets (Days 16-18)

```
1. Create budget table
2. GET /budgets returns grouped BudgetMonth (income / fixed / flexible / non_monthly)
3. Budget page: collapsible groups, progress bars, right summary panel
4. Budget category drawer; copy-previous-month
5. Wire Dashboard budget widget
6. Verify: set planned → bars update; overage is red; left-to-budget matches panel
```

```sql
SELECT
  b.id, b.amount AS planned, c.name, c.icon, c.color, c.kind, c.budget_group,
  COALESCE(SUM(t.amount) FILTER (WHERE c.kind = 'income' AND t.amount > 0), 0)
    + COALESCE(ABS(SUM(t.amount) FILTER (WHERE c.kind = 'expense' AND t.amount < 0)), 0)
    AS actual
FROM category c
LEFT JOIN budget b ON b.category_id = c.id AND b.user_id = c.user_id AND b.month = :monthStart
LEFT JOIN transaction t ON t.category_id = c.id
  AND t.user_id = c.user_id
  AND t.date >= :monthStart AND t.date <= :monthEnd
WHERE c.user_id = :userId
GROUP BY b.id, c.id;
```

---

### Phase 7 — Recurring + Goals (Days 19-21)

```
1. recurring_item + goal + goal_allocation tables
2. Recurring list, detect-from-history, mark paid / skip, drawer
3. Goals: save-up / pay-down cards, allocate-funds drawer, right panel
4. Wire Dashboard recurring + advice widgets (advice uses goals + utilization + budget)
5. Verify: upcoming bill countdown; allocate increases current_amount without a bank transfer
```

---

### Phase 8 — Reports + Investments (Days 22-24)

```
1. ReportsModule aggregation queries
2. Reports page: date range + chart cards; click → transaction drawer
3. Investments page: filter displayGroup=investment, allocation chart, sparklines
4. Verify: range changes charts; investment empty-state if none connected
```

---

### Phase 9 — Forecasting (Days 25-28)

```
1. forecast_section, forecast_row, forecast_cell tables
2. ForecastModule: CRUD + summary series
3. Page: summary cards, projected-balance chart, collapsible item cards with sparklines
4. Forecast item drawer (monthly amounts + copy-to-all) — not a 12-column grid
5. Actuals overlay for past months
6. Verify: edit in drawer → chart updates; past months marked actual
```

**Actuals merge logic:**

```typescript
// server/src/forecast/forecast.service.ts
async getFullYear(userId: string, year: number) {
  const sections = await this.getSections(userId, year);
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  for (const section of sections) {
    for (const row of section.rows) {
      for (let month = 1; month <= 12; month++) {
        if (year < currentYear || (year === currentYear && month < currentMonth)) {
          const actual = await this.getActualForRow(userId, row, year, month);
          if (actual !== null) {
            row.cells[month] = { amount: actual, isActual: true };
          }
        }
      }
    }
  }
  return sections;
}
```

---

### Phase 10 — Polish (Days 29-31)

```
1. Skeleton cards/lists on every page
2. Empty states with a single primary CTA
3. Toasts, error boundary, retry
4. Responsive: stack right panel under main at 1024px; icon-rail at 375px
5. Export CSV (transactions + accounts)
6. Dark mode tokens (palette in SCREEN_SPECS)
7. Settings page (profile, categories, dashboard widgets, budget copy-forward)
```

AI Assistant (PRD F14) is deferred unless explicitly pulled into a later slice.

---

## Key Code Patterns

### API Client (Frontend)

```typescript
// client/src/api/client.ts
const API_URL = import.meta.env.VITE_API_URL;

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Request failed");
  }
  const json = await res.json();
  return json.data;
}
```

### React Query Hook Pattern

```typescript
// client/src/hooks/use-transactions.ts
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as txApi from "../api/transactions";

export function useTransactions(filters: TransactionFilters) {
  return useInfiniteQuery({
    queryKey: ["transactions", filters],
    queryFn: ({ pageParam }) => txApi.getTransactions({ ...filters, cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.meta.nextCursor,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: txApi.updateTransaction,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["cash-flow"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["budgets"] });
    },
  });
}
```

### Drawer Pattern

```tsx
// All create/edit/detail use shadcn Sheet. Confirm-only uses Dialog.
function TransactionsPage() {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <>
      <TransactionFeed onRowClick={(tx) => setOpenId(tx.id)} />
      <TransactionDrawer
        transactionId={openId}
        open={!!openId}
        onClose={() => setOpenId(null)}
      />
    </>
  );
}
```

### NestJS Controller Pattern

```typescript
// server/src/transactions/transactions.controller.ts
@Controller("transactions")
@UseGuards(AuthGuard)
export class TransactionsController {
  constructor(private readonly service: TransactionsService) {}

  @Get()
  async list(@CurrentUser() user: AuthUser, @Query() query: ListTransactionsDto) {
    return { data: await this.service.list(user.id, query) };
  }

  @Patch(":id")
  async update(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() body: UpdateTransactionDto,
  ) {
    return { data: await this.service.update(user.id, id, body) };
  }
}
```

### Cents Formatting (Frontend)

```typescript
// client/src/lib/format.ts
export function formatCents(cents: number): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(dollars);
}

export function formatCentsWithSign(cents: number): string {
  const formatted = formatCents(Math.abs(cents));
  return cents < 0 ? `-${formatted}` : formatted;
}

export function formatIncome(cents: number): string {
  const formatted = formatCents(Math.abs(cents));
  return cents > 0 ? `+${formatted}` : formatted;
}
```
