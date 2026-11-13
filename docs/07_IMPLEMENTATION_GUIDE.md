# Implementation Guide — Money Airport

## Build Order

Execute phases sequentially. Each phase results in a working, testable slice. The product is a **widget dashboard** from Phase 4 onward — do not build spreadsheet tables as an intermediate UI.

---

### Phase 0 — Scaffolding (Day 1)

```
1. Init monorepo with pnpm workspaces
2. Scaffold client: Vite + React + TS + TailwindCSS + shadcn/ui (Card, Sheet, Progress)
3. Scaffold server: NestJS CLI + Drizzle + PostgreSQL connection
4. Configure BiomeJS at root (single biome.json, both packages inherit)
5. Set up React Router with placeholder pages for every nav item
6. Build layout shell: sidebar (PRD order), header chrome, page-layout with optional right panel
7. Verify: both apps start, database connects, linter runs, nav switches pages
```

**Deliverable:** Empty shell. Default route is Dashboard. Sidebar: Dashboard, Cash Flow, Accounts, Transactions, Reports, Budget, Recurring, Goals, Investments, Forecasting. Footer: profile.

---

### Phase 1 — Auth + Billing stub (Days 2-3)

```
1. Set up BetterAuth in NestJS (server/src/auth/)
2. Create auth tables via BetterAuth auto-migration
3. Build login + signup pages (client)
4. Implement AuthGuard (server) + protected route wrapper (client)
5. Profile menu in sidebar footer (logout, Free chip) + settings gear in header
6. BillingModule: create Stripe Customer + $0 Subscription after signup; retry on next session if Stripe failed; `/billing/webhook`
7. Verify: sign up → login → see dashboard → logout. Stripe IDs may be null; login still works.
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
1. Create plaid_item, bank_account, account_balance_snapshot, fx_rate tables
2. Build PlaidModule (create-link-token, exchange-token, sync, sync-all, webhook)
3. Integrate Plaid Link (react-plaid-link) from Accounts [+ Add account]
4. Manual account create (vehicles, cash, property) with currency
5. Accounts page: net-worth hero + chart, grouped rows with sparklines, last updated
6. Right panel: assets vs liabilities stacked bars (Base currency; latest FX)
7. Snapshot upsert on every sync (native cents). Disconnect keeps history.
8. FxModule: cache Frankfurter rates; omit unofficial currencies from totals
9. Verify: connect sandbox → grouped accounts → chart moves after sync
```

**Plaid sandbox credentials:** Use `user_good` / `pass_good` for testing.

Net worth = sum(visible assets) − sum(visible liabilities), each converted to Base at the latest rate, from `bank_account.current_balance` and `is_asset`. Series comes from summing snapshots per day then converting at that day's rate.

---

### Phase 3 — Categories + Transaction feed (Days 8-11)

```
1. Create category + transaction tables (kind, budget_group, merchant_logo_url)
2. Seed default categories on user creation
3. Build TransactionsModule (cursor list, CRUD, bulk categorize)
4. Normalize Plaid amounts on ingest (flip sign); assign Uncategorized then map PFC primary; pair Transfers
5. Transactions page: date-grouped feed, infinite scroll, filters in URL
6. Transaction drawer (detail + edit category/notes/transfer toggle + add)
7. Category manager drawer (Uncategorized cannot be deleted)
8. Bulk categorize
9. Verify: feed groups by date → filter → change category in drawer → bulk assign; internal pair tagged transfer
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
    isoCurrencyCode: plaidTx.iso_currency_code ?? "USD",
    plaidPfcPrimary: plaidTx.personal_finance_category?.primary ?? null,
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
   transactions, recurring (empty until Phase 7)
2. GET /dashboard payload
3. Widget grid + Customize (persist dashboard_widgets on user_settings)
4. Net worth, spending comparison, recent transactions, recurring widgets
5. Verify: home shows cards; customize hides a widget; deep-links work
```

Budget / Recurring widgets can render empty or placeholder until their phases land.

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
  AND NOT (t.tags && ARRAY['transfer','savings_transfer']::text[])
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
  AND NOT (t.tags && ARRAY['transfer','savings_transfer']::text[])
WHERE c.user_id = :userId
GROUP BY b.id, c.id;
```

---

### Phase 7 — Recurring + Goals (Days 19-21)

Split in two. **7a Goals** (steps 1 without `recurring_item`, 3, 4, 5, and the Goals half of 7) ships
first. **7b Recurring** (`recurring_item`, steps 2 and 6) follows.

```
1. recurring_item + goal + goal_account + goal_fund_entry tables; goal.funding + host_bank_account_id
2. Recurring list, detect-from-history, mark paid / skip (no Transaction insert), drawer
3. Goals: save-up / pay-down cards, Edit accounts drawer, right panel of associated BankAccounts
4. Funds: Fund funding in the goal drawer, Fund drawer with entries, Unassigned on host + right panel,
   "Assign to Fund" in the Transaction drawer, interest split after sync (pro rata by month-start balance)
5. APY field on savings/investment account drawers
6. Wire Dashboard recurring widget
7. Verify: associating a BankAccount updates Goal progress (real balances, FX to Base);
   three Funds on one host sum correctly, Unassigned goes negative with a warning,
   an interest Transaction splits into entries that add up to the cent
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

### Phase 9 — Forecasting: Year + Month (Days 25-30)

Built without Recurring (7b): no `recurring_item_id` column, no **Add from recurring**, and Actuals match by Category only. Those land with 7b.

```
1. forecast_section, forecast_row (+ bank_account_id, goal_id), forecast_cell, forecast_one_off tables;
   user_settings.safety_buffer / payback_day / debt_strategy; bank_account.in_cash_plan
2. ForecastModule: CRUD, One-offs, One-off matching after sync
3. ProjectionService v1: day-by-day Operating cash from plan rows (day_of_month), One-offs,
   card-paid rows into card balances, card payments on due day (Payment rule, no Statements yet:
   use current balance), savings deposits into Funds, APY growth. Unit-test with fixed fixtures.
4. Year tab: summary cards, projected-balance chart with buffer line + shortfall callout,
   collapsible item cards with sparklines, One-offs per section
5. Forecast item drawer (monthly Plan amounts + copy-to-all, pay-from, Fund) — not a 12-column grid
6. Month tab: daily chart, low point, date-grouped items with balance after
7. One-shot Add from categories / Add from recurring
8. Actuals overlay for past months (computed at read; RecurringItem merchant match else Category)
9. Verify: edit Plan in drawer → chart updates; a row paid from a card moves the cash hit to the
   card's due date; a day under the buffer shows as a shortfall; past months show Plan and Actual
```

---

### Phase 10 — Debt plan: cards, loans, Payback (Days 31-36)

F12.25 (dedupe rows counted in Debt) waits for Recurring (7b). The account drawer's loan section links **View payoff** to the Debt tab, where the Loan payoff drawer opens from the loan card.

```
1. bank_account card-term columns (apr_bps, statement_close_day, payment_due_day, payment_rule,
   fixed_payment, overridden_fields, in_debt_plan, debt_priority); card_statement; loan_terms
2. Plaid: add optional_products [liabilities] to Link; /liabilities/get on sync → Statements,
   Card terms, loan_terms (respect overridden_fields). Sandbox: user_good has credit + loan liabilities
3. Account drawer: credit section (Statement, current period spend, Card terms form, Statement
   periods navigator, manual Statement), loan section (Loan terms form), toggles
4. AmortizationService: scheduled payment, schedule, extra-payment scenarios (+$0…$300, custom),
   months saved, interest saved. Unit-test against a known schedule (e.g. $32,605.50, 7%, 75 mo → $538/mo)
5. ProjectionService v2: Statements drive card payments; Projected interest; loan payments from the
   schedule; Payback on payback day (lowest cash until next income − buffer), Debt plan order
   (avalanche / snowball / custom), spillover; computed Debt section; F12.25 dedupe
6. Debt tab: hero, strategy/buffer/payback-day controls, stacked-bar chart, liability cards with drag
   order, Loan payoff drawer
7. Goals Pay down: payoff month from the Debt plan
8. Verify: Payback never takes cash below the buffer on any day until the next income; Payback
   past the last card spills to a balance-only BRL loan at the latest rate; changing strategy
   reorders and changes the debt-free month; a User-set APR survives a Plaid sync
```

**Payback rule (reference):**

```typescript
// server/src/forecast/projection.service.ts
// cash: projected Operating cash by day, before Payback, for this month and next
function paybackAmount(cash: DayBalance[], paybackDay: string, nextIncomeDay: string, buffer: number, payableDebt: number) {
  const window = cash.filter((d) => d.date >= paybackDay && d.date < nextIncomeDay);
  const low = Math.min(...window.map((d) => d.value));
  return Math.min(Math.max(0, low - buffer), payableDebt);
}

function allocate(amount: number, plan: Liability[]) {
  // plan is already in Debt plan order; balances are after scheduled payments
  const split: { id: string; amount: number }[] = [];
  let left = amount;
  for (const l of plan) {
    if (left <= 0) break;
    const take = Math.min(left, l.balanceAfterScheduled);
    if (take > 0) split.push({ id: l.id, amount: take });
    left -= take;
  }
  return { split, leftover: left }; // leftover stays in Operating cash
}
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
          row.cells[month] = {
            plan: row.cells[month]?.amount ?? 0,
            actual,
          };
        }
      }
    }
  }
  return sections;
}
```

---

### Phase 11 — Polish (Days 37-39)

```
1. Skeleton cards/lists on every page
2. Empty states with a single primary CTA
3. Toasts, error boundary, retry
4. Responsive: stack right panel under main at 1024px; icon-rail at 375px
5. Export CSV (transactions + accounts)
6. Dark mode tokens (palette in SCREEN_SPECS)
7. Settings page (profile, categories, dashboard widgets, budget copy-forward, base currency, Plan)
```

AI Assistant, Advice, Weekly Recap, remittance/tax calculators, spreadsheet/CSV import, and payroll audit are out of V1.

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
export function formatCents(cents: number, currency = "USD"): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(dollars);
}

export function formatCentsWithSign(cents: number, currency = "USD"): string {
  const formatted = formatCents(Math.abs(cents), currency);
  return cents < 0 ? `-${formatted}` : formatted;
}

export function formatIncome(cents: number, currency = "USD"): string {
  const formatted = formatCents(Math.abs(cents), currency);
  return cents > 0 ? `+${formatted}` : formatted;
}
```
