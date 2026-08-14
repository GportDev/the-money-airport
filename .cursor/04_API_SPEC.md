# API Specification — CashPilot

**Base URL:** `/api`
**Auth:** All routes (except `/api/auth/*` and `/api/plaid/webhook`) require a valid session cookie.
**Amounts:** All monetary values in **cents** (integer). Frontend converts.
**Dates:** ISO 8601. Date-only fields use `YYYY-MM-DD`.

Endpoints return **widget-ready aggregates and grouped lists**. The client does not rebuild charts from a spreadsheet of cells.

---

## Standard Response Shape

```typescript
// Success
{ data: T }

// Success with cursor pagination (transaction feed)
{ data: T[], meta: { nextCursor: string | null, limit: number } }

// Error
{ error: { code: string, message: string } }
```

---

## Auth — `/api/auth`

BetterAuth handles these routes automatically. Key endpoints:

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/auth/sign-up/email` | `{ email, password, name }` | `{ user, session }` |
| POST | `/auth/sign-in/email` | `{ email, password }` | `{ user, session }` |
| POST | `/auth/sign-in/social` | `{ provider: "google" }` | Redirect |
| POST | `/auth/sign-out` | — | `{ success: true }` |
| GET | `/auth/session` | — | `{ user, session }` or 401 |

---

## Plaid — `/api/plaid`

| Method | Path | Body | Response | Notes |
|--------|------|------|----------|-------|
| POST | `/plaid/create-link-token` | — | `{ linkToken }` | Generate Plaid Link token |
| POST | `/plaid/exchange-token` | `{ publicToken, metadata }` | `{ item, accounts[] }` | Exchange public token, store access token, fetch accounts |
| POST | `/plaid/sync/:itemId` | — | `{ added, modified, removed }` | Manual transaction sync + balance snapshot |
| POST | `/plaid/sync-all` | — | `{ items: number }` | "Refresh all" |
| DELETE | `/plaid/items/:itemId` | — | `{ success }` | Disconnect institution |
| POST | `/plaid/webhook` | Plaid webhook payload | 200 | No auth — verify webhook |

---

## Dashboard — `/api/dashboard`

Single payload for the home widget grid. Honors `dashboard_widgets` visibility; omitted widgets are still computed cheaply or skipped.

| Method | Path | Query | Response |
|--------|------|-------|----------|
| GET | `/dashboard` | `?month=YYYY-MM` (default: current) | `{ data: DashboardPayload }` |

```typescript
interface DashboardPayload {
  greetingName: string;
  budget: {
    groups: { key: "fixed" | "flexible" | "non_monthly"; planned: number; spent: number; remaining: number }[];
  };
  netWorth: {
    current: number;
    change: number;
    changePercent: number; // 0-1
    series: { date: string; value: number }[];
  };
  spending: {
    total: number;
    thisMonth: { day: number; amount: number }[];
    lastMonth: { day: number; amount: number }[];
  };
  transactions: TransactionListItem[]; // most recent ~8
  recurring: {
    remainingDue: number;
    upcoming: RecurringListItem[]; // next ~5
  };
  advice: AdviceCard | null;
  weeklyRecap: { summary: string } | null;
}
```

---

## Accounts — `/api/accounts`

| Method | Path | Query/Body | Response |
|--------|------|-----------|----------|
| GET | `/accounts` | — | `{ data: Account[] }` |
| GET | `/accounts/net-worth` | `?range=1m\|3m\|1y\|ytd` | `{ data: NetWorthResponse }` |
| GET | `/accounts/:id` | — | `{ data: AccountDetail }` |
| POST | `/accounts` | `{ name, type, displayGroup, currentBalance, creditLimit? }` | `{ data: Account }` | Manual account |
| PATCH | `/accounts/:id` | `{ name?, currentBalance?, creditLimit?, isHidden?, isGoalAccount? }` | `{ data: Account }` |
| DELETE | `/accounts/:id` | — | `{ success }` | Manual accounts only |

```typescript
interface Account {
  id: string;
  name: string;
  officialName: string | null;
  displayGroup: "cash" | "credit" | "investment" | "loan" | "vehicle" | "other";
  type: string;
  mask: string | null;
  currentBalance: number;
  availableBalance: number | null;
  creditLimit: number | null;      // utilization = current / limit
  isAsset: boolean;
  institutionName: string | null;
  institutionLogo: string | null;
  lastSyncedAt: string | null;
  source: "plaid" | "manual";
  sparkline: { date: string; value: number }[]; // last ~30 days
}

interface NetWorthResponse {
  current: number;
  change: number;
  changePercent: number;
  series: { date: string; value: number }[];
  assets: { group: string; total: number }[];
  liabilities: { group: string; total: number }[];
}
```

`GET /accounts` is grouped on the client by `displayGroup`. CSV export of the summary uses `/export/accounts`.

---

## Transactions — `/api/transactions`

| Method | Path | Query/Body | Response |
|--------|------|-----------|----------|
| GET | `/transactions` | `?cursor&limit&dateFrom&dateTo&accountId&categoryId&search&pending&sortBy&sortDir` | `{ data: TransactionListItem[], meta }` |
| GET | `/transactions/:id` | — | `{ data: TransactionDetail }` |
| POST | `/transactions` | `{ name, amount, date, categoryId?, bankAccountId?, notes? }` | `{ data: Transaction }` |
| PATCH | `/transactions/:id` | `{ categoryId?, notes? }` | `{ data: Transaction }` |
| PATCH | `/transactions/bulk-categorize` | `{ transactionIds: string[], categoryId: string }` | `{ data: { updated: number } }` |

`limit` default 50. `nextCursor` is an opaque `(date, id)` key. `accountId` and `categoryId` accept repeated params (multi-select).

```typescript
interface TransactionListItem {
  id: string;
  date: string;
  name: string;
  merchantName: string | null;
  merchantLogoUrl: string | null;
  amount: number;
  pending: boolean;
  tags: string[];
  category: { id: string; name: string; icon: string; color: string } | null;
  account: { id: string; name: string; mask: string | null; institutionLogo: string | null } | null;
}

interface TransactionDetail extends TransactionListItem {
  notes: string | null;
  similar: TransactionListItem[]; // same merchant, recent
}
```

The feed is **date-grouped on the client**. The API returns a flat chronological list.

---

## Cash Flow — `/api/cash-flow`

Visual month series — not a running-balance table.

| Method | Path | Query | Response |
|--------|------|-------|----------|
| GET | `/cash-flow` | `?accountId&year&month` | `{ data: CashFlowResponse }` |

```typescript
interface CashFlowResponse {
  summary: {
    totalIncome: number;
    totalExpenses: number;
    netCashFlow: number;
  };
  daily: {
    day: number;           // 1-31
    income: number;
    expenses: number;      // absolute outflow
    net: number;
    runningBalance: number; // optional overlay; all-accounts uses net-worth proxy
  }[];
}
```

Transaction rows under the chart reuse `GET /transactions` with the same `accountId` + month range.

---

## Categories — `/api/categories`

| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/categories` | — | `{ data: Category[] }` |
| POST | `/categories` | `{ name, color, icon, kind, budgetGroup? }` | `{ data: Category }` |
| PATCH | `/categories/:id` | `{ name?, color?, icon?, kind?, budgetGroup? }` | `{ data: Category }` |
| DELETE | `/categories/:id` | — | `{ success }` |

Deleting a category sets all its transactions to `categoryId = null` (Uncategorized).

---

## Budgets — `/api/budgets`

| Method | Path | Query/Body | Response |
|--------|------|-----------|----------|
| GET | `/budgets` | `?year&month` | `{ data: BudgetMonth }` |
| POST | `/budgets` | `{ categoryId, month (YYYY-MM-DD), amount }` | `{ data: Budget }` |
| PATCH | `/budgets/:id` | `{ amount }` | `{ data: Budget }` |
| DELETE | `/budgets/:id` | — | `{ success }` |
| POST | `/budgets/copy-previous` | `{ targetMonth (YYYY-MM-DD) }` | `{ data: Budget[] }` |

```typescript
interface BudgetMonth {
  leftToBudget: number; // income planned − expense planned (or leftover after assigning)
  groups: {
    key: "income" | "fixed" | "flexible" | "non_monthly";
    planned: number;
    actual: number;
    remaining: number;
    categories: BudgetCategoryRow[];
  };
  unbudgeted: BudgetCategoryRow[]; // spend, no plan
}

interface BudgetCategoryRow {
  id: string | null;     // budget id; null if unbudgeted
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  planned: number;
  actual: number;
  remaining: number;
  percentUsed: number;
}
```

Income `remaining` = actual − planned. Expense `remaining` = planned − actual.

---

## Recurring — `/api/recurring`

| Method | Path | Query/Body | Response |
|--------|------|-----------|----------|
| GET | `/recurring` | `?month=YYYY-MM` | `{ data: { remainingDue: number; paid: number; items: RecurringListItem[] } }` |
| POST | `/recurring` | `{ merchantName, amount, cadence, nextDate, bankAccountId?, categoryId? }` | `{ data: RecurringItem }` |
| PATCH | `/recurring/:id` | `{ amount?, cadence?, nextDate?, isActive? }` | `{ data: RecurringItem }` |
| POST | `/recurring/:id/skip` | — | `{ data: RecurringItem }` |
| POST | `/recurring/:id/mark-paid` | `{ date? }` | `{ data: RecurringItem }` |
| POST | `/recurring/detect` | — | `{ data: RecurringListItem[] }` | Suggest from history |
| DELETE | `/recurring/:id` | — | `{ success }` |

```typescript
interface RecurringListItem {
  id: string;
  merchantName: string;
  merchantLogoUrl: string | null;
  amount: number;
  cadence: "weekly" | "monthly" | "yearly";
  nextDate: string;
  daysUntil: number;
  account: { id: string; name: string } | null;
}
```

---

## Goals — `/api/goals`

| Method | Path | Query/Body | Response |
|--------|------|-----------|----------|
| GET | `/goals` | `?type=save_up\|pay_down` | `{ data: { totalCurrent: number; availableForGoals: number; goalAccounts: Account[]; goals: Goal[] } }` |
| POST | `/goals` | `{ name, type, targetAmount, targetDate?, thumbnailUrl?, linkedAccountId? }` | `{ data: Goal }` |
| PATCH | `/goals/:id` | `{ name?, targetAmount?, targetDate?, thumbnailUrl?, linkedAccountId?, sortOrder? }` | `{ data: Goal }` |
| POST | `/goals/allocate` | `{ goalId, fromAccountId, amount }` | `{ data: Goal }` |
| DELETE | `/goals/:id` | — | `{ success }` |

```typescript
interface Goal {
  id: string;
  name: string;
  type: "save_up" | "pay_down";
  thumbnailUrl: string | null;
  targetAmount: number;
  currentAmount: number;
  targetDate: string | null;
  status: "on_track" | "at_risk";
  percentComplete: number;
}
```

---

## Investments — `/api/investments`

Thin read over accounts in `displayGroup = investment`.

| Method | Path | Query | Response |
|--------|------|-------|----------|
| GET | `/investments` | `?range=1m\|3m\|1y` | `{ data: { total: number; change: number; allocation: { accountId, name, value }[]; accounts: Account[] } }` |

No trade endpoints.

---

## Advice — `/api/advice`

Deterministic rules. No persistence.

| Method | Path | Response |
|--------|------|----------|
| GET | `/advice` | `{ data: AdviceCard[] }` |

```typescript
interface AdviceCard {
  id: string;
  title: string;
  why: string;
  href: string;          // /goals, /budget, /accounts
  progress?: { current: number; target: number };
}
```

V1 rules: emergency fund below a threshold, credit utilization > 30%, any budget group over 100%.

---

## Reports — `/api/reports`

| Method | Path | Query | Response |
|--------|------|-------|----------|
| GET | `/reports/spending-by-category` | `?dateFrom&dateTo` | `{ data: { categoryName, color, icon, total }[] }` |
| GET | `/reports/income-vs-expenses` | `?dateFrom&dateTo` | `{ data: { month, income, expenses }[] }` |
| GET | `/reports/cash-flow-trend` | `?dateFrom&dateTo` | `{ data: { month, net }[] }` |
| GET | `/reports/top-categories` | `?dateFrom&dateTo&limit=5` | `{ data: { categoryName, icon, total }[] }` |
| GET | `/reports/balance-history` | `?dateFrom&dateTo&accountId?` | `{ data: { date, accountId, balance }[] }` |

Click-through uses `GET /transactions` with category + date filters in a drawer — no separate modal payload.

---

## Forecast — `/api/forecast`

### Sections

| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/forecast/sections` | `?year` | `{ data: ForecastSectionFull[] }` |
| POST | `/forecast/sections` | `{ name, type }` | `{ data: ForecastSection }` |
| PATCH | `/forecast/sections/:id` | `{ name?, sortOrder? }` | `{ data: ForecastSection }` |
| DELETE | `/forecast/sections/:id` | — | `{ success }` |

### Rows

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/forecast/rows` | `{ sectionId, name, dayOfMonth?, defaultAmount? }` | `{ data: ForecastRow }` |
| PATCH | `/forecast/rows/:id` | `{ name?, dayOfMonth?, sortOrder? }` | `{ data: ForecastRow }` |
| PUT | `/forecast/rows/:id/amounts` | `{ year, amounts: Record<number, number>, copyToAll?: boolean }` | `{ data: ForecastRow }` |
| DELETE | `/forecast/rows/:id` | — | `{ success }` |

`amounts` is month (1-12) → cents. The drawer sends this instead of per-cell PUTs. `copyToAll` writes the same amount to every month.

### Full Year Response

```typescript
interface ForecastSectionFull {
  id: string;
  name: string;
  type: "revenue" | "savings" | "fixed_expense" | "variable_expense";
  rows: {
    id: string;
    name: string;
    dayOfMonth: number | null;
    typicalMonthly: number;
    sparkline: number[]; // 12 values
    cells: Record<number, { amount: number; isActual: boolean }>;
  }[];
  totals: Record<number, number>;
}
```

### Summary

| Method | Path | Query | Response |
|--------|------|-------|----------|
| GET | `/forecast/summary` | `?year` | `{ data: ForecastSummary }` |

```typescript
interface ForecastSummary {
  cashFlow: Record<number, number>;
  checkingBalance: Record<number, number>;
  creditCardTotal: Record<number, number>;
  savingsTotal: Record<number, number>;
  fixedExpensesTotal: Record<number, number>;
  variableExpensesTotal: Record<number, number>;
  projectedBalanceSeries: { month: number; value: number }[];
}
```

---

## Settings — `/api/settings`

| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/settings` | — | `{ data: UserSettings }` |
| PATCH | `/settings` | `{ currency?, dashboardWidgets?, budgetCopyForward? }` | `{ data: UserSettings }` |

---

## Export — `/api/export`

| Method | Path | Query | Response |
|--------|------|-------|----------|
| GET | `/export/transactions` | `?dateFrom&dateTo&format=csv` | CSV file download |
| GET | `/export/accounts` | `?format=csv` | CSV of accounts + asset/liability totals |
