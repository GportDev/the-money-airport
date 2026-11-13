# API Specification — Money Airport

**Base URL:** `/api`
**Auth:** All routes (except `/api/auth/*`, `/api/plaid/webhook`, and `/api/billing/webhook`) require a valid session cookie.
**Amounts:** Request/response KPI totals are **Base** cents (integer). Transaction rows include native `amount` + `isoCurrencyCode`. Frontend converts for display.
**Dates:** ISO 8601. Date-only fields use `YYYY-MM-DD`.
**Transfers:** Totals on dashboard spending, budgets, cash-flow, and reports income/expense **exclude** `transfer` / `savings_transfer` tags. Pending **counts**.

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
| POST | `/plaid/sync/:itemId` | — | `{ ok, skipped, added, modified, removed }` | Manual transaction sync + balance snapshot |
| POST | `/plaid/sync-all` | — | `{ items: number }` | "Refresh all" |
| DELETE | `/plaid/items/:itemId` | — | `{ success }` | Disconnect: keep history, status `disconnected` |
| POST | `/plaid/webhook` | Plaid webhook payload | 200 | No auth — verify webhook |

---

## Dashboard — `/api/dashboard`

Single payload for the home widget grid. Honors `dashboard_widgets` visibility; omitted widgets are still computed cheaply or skipped.

| Method | Path | Query | Response |
|--------|------|-------|----------|
| GET | `/dashboard` | `?month=YYYY-MM` (default: current UTC month), `?netWorthRange` (`1m`, `3m`, `1y`, or `ytd`; default `1m`) | `{ data: DashboardPayload }` |

```typescript
interface DashboardPayload {
  month: string;          // YYYY-MM
  baseCurrency: string;
  greetingName: string;   // first word of the User's name
  hasAccounts: boolean;   // false: the client shows the Connect an account empty state
  widgets: { id: WidgetId; visible: boolean; order: number }[];
  // Each widget below is null when the User hid it; hidden widgets are not computed.
  budget: {
    hasBudget: boolean;   // false until the month has at least one plan; planned is then 0
    groups: { key: "fixed" | "flexible" | "non_monthly"; planned: number; spent: number; remaining: number }[];
  } | null;
  netWorth: {
    range: "1m" | "3m" | "1y" | "ytd";
    current: number;
    change: number;
    changePercent: number; // 0-1
    series: { date: string; value: number }[];
  } | null;
  spending: {
    total: number;                                 // month to date
    thisMonth: { day: number; amount: number }[];  // running total, through today
    lastMonth: { day: number; amount: number }[];  // running total, whole month
  } | null;
  transactions: TransactionListItem[] | null; // most recent 8
  recurring: {
    remainingDue: number;
    upcoming: RecurringListItem[]; // next ~5; empty until Recurring (Phase 7)
  } | null;
}
```

- Budget `spent` is net of refunds per budget group (expense categories only), Transfers excluded, Pending counted, in Base currency.
- Spending uses the same gross outflow as Cash Flow `expenses` (Transfers excluded).

---

## Accounts — `/api/accounts`

| Method | Path | Query/Body | Response |
|--------|------|-----------|----------|
| GET | `/accounts` | — | `{ data: Account[] }` |
| GET | `/accounts/net-worth` | `?range=1m\|3m\|1y\|ytd` | `{ data: NetWorthResponse }` |
| GET | `/accounts/:id` | — | `{ data: AccountDetail }` |
| POST | `/accounts` | `{ name, type, displayGroup, currentBalance, creditLimit? }` | `{ data: Account }` | Manual account |
| PATCH | `/accounts/:id` | `{ name?, currentBalance?, creditLimit?, isHidden?, apyBps? (0–100000, null clears), inCashPlan?, inDebtPlan?, debtPriority?, aprBps?, apyBps?, statementCloseDay?, paymentDueDay?, paymentRule?, fixedPayment? }` | `{ data: Account }` | Card-term fields set here are added to `overriddenFields` |
| DELETE | `/accounts/:id` | — | `{ success }` | Manual accounts only |
| GET | `/accounts/:id/statements` | `?periodEnd?` (default latest) | `{ data: StatementPeriod }` | Credit only. Transactions grouped by Statement period |
| POST | `/accounts/:id/statements` | `{ periodStart, periodEnd, statementBalance, minimumPayment?, dueDate? }` | `{ data: CardStatement }` | Manual Statement |
| PUT | `/accounts/:id/loan-terms` | `{ principal?, termMonths?, firstPaymentDate?, paymentDay?, scheduledPayment?, extraPayment? }` | `{ data: LoanTerms }` | Loan only |
| GET | `/accounts/:id/amortization` | `?extra=<cents>` | `{ data: Amortization }` | Loan only; computed |

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
  isoCurrencyCode: string;
  isHidden: boolean;
  inCashPlan: boolean;
  inDebtPlan: boolean;
  aprBps: number | null;
  apyBps: number | null;
  sparkline: { date: string; value: number }[]; // last ~30 days, native
  card: CardSummary | null;   // credit only
  loan: LoanTerms | null;     // loan only
  funds: { goalId: string; name: string; balance: number }[]; // host only
  unassigned: number | null;  // host only: balance − sum(funds), native
}

interface CardSummary {
  statementCloseDay: number | null;
  paymentDueDay: number | null;
  paymentRule: "statement_balance" | "new_charges" | "minimum" | "fixed";
  fixedPayment: number | null;
  latestStatement: CardStatement | null;
  currentPeriodSpend: number;      // native, since latest periodEnd
  projectedInterest: number;       // native, next period
  utilization: number | null;      // 0..1
  overriddenFields: string[];
}

interface CardStatement {
  id: string;
  periodStart: string;
  periodEnd: string;
  statementBalance: number;
  minimumPayment: number | null;
  dueDate: string | null;
  source: "plaid" | "manual";
}

interface StatementPeriod {
  statement: CardStatement | null; // null = current open period
  periodStart: string;
  periodEnd: string;
  total: number;
  previousPeriodEnd: string | null;
  nextPeriodEnd: string | null;
  transactions: TransactionListItem[]; // client groups by date, like the feed
}

interface LoanTerms {
  principal: number | null;
  termMonths: number | null;
  firstPaymentDate: string | null;
  paymentDay: number | null;
  scheduledPayment: number | null; // stored or computed
  extraPayment: number;
  source: "plaid" | "manual";
}

interface Amortization {
  basePayment: number;
  baseTotalInterest: number;
  basePayoffDate: string;
  scenarios: {                     // extra = 0, 5000, 10000 … 30000, plus ?extra
    extra: number;
    payment: number;
    payoffMonths: number;
    monthsSaved: number;
    totalInterest: number;
    interestSaved: number;
  }[];
  schedule: {                      // for the requested extra (default: stored extraPayment)
    period: number;
    date: string;
    beginningBalance: number;
    payment: number;
    interest: number;
    principal: number;
    extra: number;
    endingBalance: number;
  }[];
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
| GET | `/transactions` | `?cursor&limit&dateFrom&dateTo&accountId&categoryId&search&pending&amountMin&amountMax&sortDir` | `{ data: TransactionListItem[], meta }` |
| GET | `/transactions/:id` | — | `{ data: TransactionDetail }` |
| POST | `/transactions` | `{ name, amount, date, categoryId?, bankAccountId?, notes? }` | `{ data: Transaction }` |
| PATCH | `/transactions/:id` | `{ categoryId?, notes?, tags?, name?, amount?, date?, bankAccountId? }` | `{ data: TransactionDetail }` |
| PATCH | `/transactions/bulk-categorize` | `{ transactionIds: string[], categoryId: string }` | `{ data: { updated: number } }` |
| DELETE | `/transactions/:id` | — | `{ data: { success } }` |

`limit` default 50, max 200. `nextCursor` is an opaque `(date, id)` key; the feed sorts by date (`sortDir` `desc` default). `accountId` and `categoryId` accept repeated params (multi-select). `amountMin` / `amountMax` compare absolute cents. `search` matches name, merchant, and notes.

`name`, `amount`, `date`, and `bankAccountId` change only on manual Transactions, and only manual Transactions can be deleted (400 otherwise). Setting `categoryId` locks the Category against later syncs; setting `tags` locks the transfer flag against automatic pairing. A Transfer whose Category is Savings Transfer is stored as `savings_transfer`.

```typescript
interface TransactionListItem {
  id: string;
  date: string;
  name: string;
  merchantName: string | null;
  merchantLogoUrl: string | null;
  amount: number; // native cents
  isoCurrencyCode: string;
  pending: boolean;
  isManual: boolean;
  tags: string[];
  category: { id: string; name: string; icon: string; color: string } | null;
  account: { id: string; name: string; mask: string | null; institutionLogo: string | null } | null;
}

interface TransactionDetail extends TransactionListItem {
  notes: string | null;
  plaidPfcPrimary: string | null;
  similar: TransactionListItem[]; // same merchant, recent
}
```

The feed is **date-grouped on the client**. The API returns a flat chronological list.

---

## Cash Flow — `/api/cash-flow`

Visual month series — not a running-balance table.

| Method | Path | Query | Response |
|--------|------|-------|----------|
| GET | `/cash-flow` | `?accountId&year&month` (year and month default to the current UTC month) | `{ data: CashFlowResponse }` |

```typescript
interface CashFlowResponse {
  year: number;
  month: number;
  baseCurrency: string;
  accountId: string | null;
  runningBalanceKind: "net_worth" | "balance" | "owed";
  summary: {
    totalIncome: number;   // Base currency, Transfers excluded, Pending counted
    totalExpenses: number; // absolute outflow
    netCashFlow: number;
  };
  daily: {
    day: number;           // 1-31, one row per day of the month
    date: string;          // YYYY-MM-DD
    income: number;
    expenses: number;      // absolute outflow
    net: number;
    runningBalance: number | null; // end of day; null after today
  }[];
  omittedCurrencies: string[]; // no FX rate into Base currency; left out
}
```

- Income and expenses convert at each day's FX rate (latest rate for future-dated rows).
- `runningBalance` walks back from today's balances: value(day) = current balance − every later Transaction on that BankAccount, Transfers included (they move balances). Converted at the latest rate.
  - No `accountId`: `net_worth`, visible BankAccounts, assets minus liabilities.
  - Asset `accountId`: `balance`. Credit or loan `accountId`: `owed` (positive).
- An `accountId` the User does not own returns 404.

Transaction rows under the chart reuse `GET /transactions` with the same `accountId` + month range.

---

## Categories — `/api/categories`

| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/categories` | — | `{ data: Category[] }` |
| POST | `/categories` | `{ name, color, icon, kind, budgetGroup? }` | `{ data: Category }` |
| PATCH | `/categories/:id` | `{ name?, color?, icon?, kind?, budgetGroup? }` | `{ data: Category }` |
| DELETE | `/categories/:id` | — | `{ success }` |

Deleting a category reassigns its transactions to Uncategorized. Uncategorized cannot be deleted.

---

## Budgets — `/api/budgets`

| Method | Path | Query/Body | Response |
|--------|------|-----------|----------|
| GET | `/budgets` | `?year&month` (default: current UTC month) | `{ data: BudgetMonth }` |
| POST | `/budgets` | `{ categoryId, month (YYYY-MM-01), amount }` | `{ data: Budget }` (201) |
| PATCH | `/budgets/:id` | `{ amount }` | `{ data: Budget }` |
| DELETE | `/budgets/:id` | — | `{ data: { success: true } }` |
| POST | `/budgets/copy-previous` | `{ targetMonth (YYYY-MM-01) }` | `{ data: Budget[] }` (201) |

```typescript
interface Budget {
  id: string;
  categoryId: string;
  month: string;  // YYYY-MM-01
  amount: number; // planned, Base currency cents
}

interface BudgetMonth {
  month: string;         // YYYY-MM
  baseCurrency: string;
  leftToBudget: number;  // income planned − expense planned
  groups: {              // always 4, in this order: income, fixed, flexible, non_monthly
    key: "income" | "fixed" | "flexible" | "non_monthly";
    planned: number;     // planned Categories only
    actual: number;      // every Category in the group, planned or not (matches the Dashboard widget)
    remaining: number;
    categories: BudgetCategoryRow[]; // planned Categories only
  }[];
  unbudgeted: BudgetCategoryRow[]; // every Category with no plan this month, biggest actual first
  omittedCurrencies: string[];     // no FX rate into Base currency; left out of actuals
}

interface BudgetCategoryRow {
  id: string | null;     // budget id; null if unbudgeted
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  group: "income" | "fixed" | "flexible" | "non_monthly";
  planned: number;
  actual: number;
  remaining: number;
  percentUsed: number;   // actual / planned (0-1+); 0 when nothing is planned
}
```

- Income `remaining` = actual − planned. Expense `remaining` = planned − actual.
- `actual` is net of refunds per Category, floored at 0, Transfers excluded, Pending counted, converted into Base currency at each day's FX rate (latest rate as fallback).
- `amount` is an integer from 0 to 2,000,000,000 cents. `month` / `targetMonth` must be the first day of a month; anything else returns 400.
- POST on a Category that already has a plan that month replaces its amount (upsert). A `categoryId` the User does not own returns 404; so do PATCH and DELETE on another User's Budget.
- `copy-previous` copies the previous month's plans into Categories with no plan in the target month. Existing plans are kept. Returns only the created rows (`[]` when there was nothing to copy).
- Copy-forward (`budgetCopyForward` in Settings): GET on the current or a later month with no plans copies the latest earlier month that has plans. Past months never auto-fill. No rollover.
- Deleting a Category deletes its Budgets.

---

## Recurring — `/api/recurring`

| Method | Path | Query/Body | Response |
|--------|------|-----------|----------|
| GET | `/recurring` | `?month=YYYY-MM` | `{ data: { remainingDue: number; paid: number; items: RecurringListItem[] } }` |
| POST | `/recurring` | `{ merchantName, amount, cadence, nextDate, bankAccountId?, categoryId? }` | `{ data: RecurringItem }` |
| PATCH | `/recurring/:id` | `{ amount?, cadence?, nextDate?, isActive? }` | `{ data: RecurringItem }` |
| POST | `/recurring/:id/skip` | — | `{ data: RecurringItem }` |
| POST | `/recurring/:id/mark-paid` | `{ date? }` | `{ data: RecurringItem }` | Advances schedule only; no Transaction |
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
| GET | `/goals` | `?type=save_up\|pay_down` | `{ data: { totalCurrent: number; baseCurrency: string; goals: Goal[]; hosts: FundHost[] } }` | `hosts` lists every Fund host regardless of `type` |
| POST | `/goals` | `{ name, type, targetAmount, targetDate?, icon?, color?, funding?, hostBankAccountId? }` | `{ data: Goal }` | `funding: "fund"` requires `hostBankAccountId` (visible asset, not in a Goal association) |
| PATCH | `/goals/:id` | `{ name?, targetAmount?, targetDate?, icon?, color?, sortOrder? }` | `{ data: Goal }` |
| PUT | `/goals/:id/accounts` | `{ bankAccountIds: string[] }` | `{ data: Goal }` | Accounts funding only. Save-up: many assets. Pay-down: 0–1 liability. Move if exclusive conflict. Refuse Fund hosts. |
| GET | `/goals/:id/entries` | `?cursor` | `{ data: FundEntry[]; nextCursor }` | Fund only, newest first |
| POST | `/goals/:id/entries` | `{ date, amount, kind, note? }` or `{ transactionId, note? }` | `{ data: FundEntry }` | Manual: deposit/interest > 0, withdrawal < 0. From a Transaction: it must be on the host and in no other entry; date, amount, and kind (by sign) come from it |
| DELETE | `/goals/:id/entries/:entryId` | — | `{ success }` | |
| DELETE | `/goals/:id` | — | `{ success }` |

```typescript
interface Goal {
  id: string;
  name: string;
  type: "save_up" | "pay_down";
  funding: "accounts" | "fund";
  icon: string;
  color: string;
  thumbnailUrl: string | null;
  targetAmount: number;
  currentAmount: number; // computed
  targetDate: string | null;
  status: "on_track" | "at_risk";
  percentComplete: number;
  sortOrder: number;
  accounts: { id: string; name: string; mask: string | null; currentBalance: number; isoCurrencyCode: string }[]; // accounts funding, visible only
  host: { id: string; name: string; isoCurrencyCode: string; unassigned: number } | null; // fund funding
  fundBalance: number | null;        // fund funding: native host cents
  payoffMonth: string | null;        // pay-down: from the Debt plan
}

interface FundHost {
  id: string;
  name: string;
  isoCurrencyCode: string;
  balance: number;                   // native
  unassigned: number;                // balance − sum(funds), native
  funds: { goalId: string; name: string; balance: number }[];
}

interface FundEntry {
  id: string;
  date: string;
  amount: number;          // native host cents, signed
  kind: "deposit" | "withdrawal" | "interest";
  transactionId: string | null;
  note: string | null;
  balanceAfter: number;    // computed running Fund balance
}
```

The Transaction drawer's "Assign to Fund" calls `POST /goals/:id/entries` with `transactionId`. `GET /transactions/:id` returns `fundEntry: { id, goalId, goalName } | null` for the deposit or withdrawal made from it.

Errors: 400 for invalid bodies, a Fund with no host, `fund` on a pay-down Goal, associating a hidden, wrong-side, or host BankAccount, a second pay-down liability, entries on an accounts Goal, and a Transaction off the host or already used. 404 for another User's Goal, BankAccount, or Transaction. `payoffMonth` (pay-down) is the associated liability's payoff month from the Debt plan (24-month horizon); null when it is not paid off within it.

---

## Investments — `/api/investments`

Thin read over visible accounts in `displayGroup = investment`. Hidden ones are left out.

| Method | Path | Query | Response |
|--------|------|-------|----------|
| GET | `/investments` | `?range=1m\|3m\|1y` (default `1m`; anything else → 400) | `{ data: InvestmentsResponse }` |

```typescript
interface InvestmentsResponse {
  range: "1m" | "3m" | "1y";
  baseCurrency: string;
  total: number;          // Base cents, sum of current balances
  change: number;         // Base cents moved since the range start
  changePercent: number;  // change / start total (0 when the start total is 0)
  allocation: { accountId: string; name: string; value: number }[]; // Base cents, largest first
  accounts: (Account & {
    value: number | null; // current balance in Base cents; null when no FX rate
    change: number;       // native cents since the range start
  })[];                   // largest first; `sparkline` covers the range (native, daily)
  omittedCurrencies: string[];
}
```

The range starts 29 / 89 / 364 days before today. An account's start balance is its last snapshot on or before that day, else its earliest snapshot in the range, else its current balance (no history = no change). No trade or holdings endpoints.

---

## Reports — `/api/reports`

Every route takes `?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD` (required, real dates, 1970–2100, `dateFrom ≤ dateTo`, at most 5 years; otherwise 400). Totals are Base cents, converted at each day's FX rate (latest when the day has none); a currency with no rate is left out and listed in `omittedCurrencies`. Transfers are excluded, Pending counts.

| Method | Path | Extra query | Response |
|--------|------|-------------|----------|
| GET | `/reports/spending-by-category` | — | `{ data: { baseCurrency, omittedCurrencies, categories: CategoryTotal[] } }` |
| GET | `/reports/top-categories` | `limit=1..20` (default 5) | same shape, first `limit` rows |
| GET | `/reports/income-vs-expenses` | — | `{ data: { baseCurrency, omittedCurrencies, months: { month, income, expenses }[] } }` |
| GET | `/reports/cash-flow-trend` | — | `{ data: { baseCurrency, omittedCurrencies, months: { month, net }[] } }` |
| GET | `/reports/balance-history` | `accountId?` (owned, else 404) | `{ data: BalanceHistory }` |

```typescript
interface CategoryTotal {
  categoryId: string;
  categoryName: string;
  color: string;
  icon: string;
  total: number; // spend net of refunds, > 0
}

interface BalanceHistory {
  baseCurrency: string;
  omittedCurrencies: string[];
  accounts: { accountId: string; name: string; isAsset: boolean }[];
  points: { date: string; accountId: string; balance: number }[]; // by date
}
```

- **Spending / top categories** follow Budget actuals: expense-kind Categories, net of refunds, Categories that net to ≤ 0 are left out, largest first.
- **Income vs expenses / cash-flow trend** follow Cash Flow: a positive amount is income, a negative one is an expense. One row per `YYYY-MM` the range touches (zeros included); partial months count only the days in range. `net = income − expenses`.
- **Balance history**: visible BankAccounts (or the one `accountId`, hidden or not), one point per day from `account_balance_snapshot`, carried forward from the latest snapshot on or before that day; days before an account's first snapshot are left out. Converted at the latest rate. Liabilities read as the amount owed.

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
| POST | `/forecast/rows` | `{ sectionId, name, dayOfMonth?, defaultAmount?, categoryId?, recurringItemId?, bankAccountId?, goalId? }` | `{ data: ForecastRow }` |
| PATCH | `/forecast/rows/:id` | `{ name?, dayOfMonth?, sortOrder?, categoryId?, recurringItemId?, bankAccountId?, goalId? }` | `{ data: ForecastRow }` | `bankAccountId` null = Operating cash; `goalId` savings rows only, must be a Fund |
| POST | `/forecast/rows/from-categories` | `{ year }` | `{ data: ForecastRow[] }` | One-shot seed; skip Uncategorized and existing category links |
| POST | `/forecast/rows/from-recurring` | `{ year }` | `{ data: ForecastRow[] }` | Skip RecurringItems already linked |
| PUT | `/forecast/rows/:id/amounts` | `{ year, amounts: Record<number, number>, copyToAll?: boolean }` | `{ data: ForecastRow }` |
| DELETE | `/forecast/rows/:id` | — | `{ success }` |

`amounts` is month (1-12) → cents. The drawer sends this instead of per-cell PUTs. `copyToAll` writes the same amount to every month.

### One-offs

| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/forecast/one-offs` | `?year&status?` | `{ data: OneOff[] }` |
| POST | `/forecast/one-offs` | `{ sectionId, name, date, amount, bankAccountId?, categoryId?, goalId? }` | `{ data: OneOff }` |
| PATCH | `/forecast/one-offs/:id` | `{ name?, date?, amount?, bankAccountId?, categoryId?, goalId?, status?, matchedTransactionId? }` | `{ data: OneOff }` |
| DELETE | `/forecast/one-offs/:id` | — | `{ success }` |

```typescript
interface OneOff {
  id: string;
  sectionId: string;
  name: string;
  date: string;
  amount: number;           // Base cents, signed
  bankAccountId: string | null;
  categoryId: string | null;
  goalId: string | null;
  status: "expected" | "done" | "cancelled";
  matchedTransactionId: string | null;
}
```

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
    categoryId: string | null;
    recurringItemId: string | null;
    bankAccountId: string | null;   // pay-from; null = Operating cash
    goalId: string | null;          // Fund target (savings rows)
    countedInDebt: boolean;         // F12.25: excluded from totals
    typicalMonthly: number;
    sparkline: number[]; // 12 plan values
    cells: Record<number, { plan: number; actual: number | null }>;
  }[];
  oneOffs: OneOff[];
  totals: Record<number, number>;
}

// Computed Debt section, returned alongside the stored sections
interface ForecastDebtSection {
  type: "debt";
  rows: {
    bankAccountId: string;
    name: string;
    kind: "card_payment" | "loan_payment";
    cells: Record<number, { scheduled: number; payback: number; actual: number | null }>;
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
  operatingCash: Record<number, number>;     // month-end
  lowPoint: Record<number, { date: string; value: number }>;
  shortfalls: { date: string; short: number }[];
  creditCardTotal: Record<number, number>;
  savingsTotal: Record<number, number>;      // includes Funds and APY growth
  fixedExpensesTotal: Record<number, number>;
  variableExpensesTotal: Record<number, number>;
  debtPaymentsTotal: Record<number, number>; // scheduled + Payback
  paybackTotal: Record<number, number>;
  debtTotal: Record<number, number>;
  projectedBalanceSeries: { month: number; value: number }[];
}
```

### Month (daily projection)

| Method | Path | Query | Response |
|--------|------|-------|----------|
| GET | `/forecast/month` | `?year&month` | `{ data: ForecastMonth }` |

```typescript
interface ForecastMonth {
  safetyBuffer: number;
  openingBalance: number;
  series: { date: string; value: number; projected: boolean }[]; // one point per day
  lowPoint: { date: string; value: number };
  shortfalls: { date: string; short: number }[];
  days: {
    date: string;
    net: number;
    balanceAfter: number;
    items: {
      kind: "revenue" | "fixed" | "variable" | "savings" | "one_off" | "card_payment" | "loan_payment" | "payback";
      name: string;
      amount: number;                   // Base cents, signed
      sourceId: string | null;          // forecast_row / one_off / bank_account id
      split?: { bankAccountId: string; name: string; amount: number }[]; // payback spillover
    }[];
  }[];
}
```

### Debt plan

| Method | Path | Body / Query | Response |
|--------|------|------|----------|
| GET | `/forecast/debt` | `?months=24` | `{ data: DebtPlan }` |
| PUT | `/forecast/debt/order` | `{ bankAccountIds: string[] }` | `{ data: DebtPlan }` | Sets `debt_priority` and switches strategy to `custom` |

```typescript
interface DebtPlan {
  strategy: "avalanche" | "snowball" | "custom";
  safetyBuffer: number;
  paybackDay: number | null;
  totalDebt: number;                 // Base
  debtFreeMonth: string | null;      // YYYY-MM, null if never within range
  projectedInterest12m: number;
  utilization: number | null;
  liabilities: {
    account: Account;
    share: number;                   // balance / totalDebt
    scheduledPayment: number;        // this month, Base
    payback: number;                 // this month, Base
    projectedInterest: number;       // next period, Base
    payoffMonth: string | null;
  }[];
  series: { month: string; balances: Record<string, number>; payback: number }[];
}
```

| GET | `/forecast/debt/section` | `?year` | `{ data: ForecastDebtSection }` | The Year tab's read-only Debt section, kept apart from `/forecast/sections` so that list stays the stored sections |

`DebtPlan` also returns `notInPlan: { account }[]` (liabilities with "in debt plan" off) and `baseCurrency`.

Projection assumptions the engine makes where Plaid gives nothing:
- A card with no due day (and no Statement due date) has no scheduled payment; it only grows and takes Payback.
- With only a due day known, the Statement closes 25 days before it.
- A future Statement's minimum is 1% of the balance plus that period's interest, at least $25, never more than the balance. The latest Statement uses its real minimum.
- For the latest Statement, `new_charges` pays the full Statement (its period spend is unknown).
- Payback's window ends the day before the next revenue item or positive One-off; with none in range, it runs to the end of the range.

Engine rules are PRD F12.14–F12.19. One service (`ProjectionService`) computes the day-by-day run; `summary`, `month`, `sections` (Debt section), and `debt` all read it, so numbers always agree.

---

## Settings — `/api/settings`

| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/settings` | — | `{ data: UserSettings }` |
| PATCH | `/settings` | `{ currency?, dashboardWidgets?, budgetCopyForward?, safetyBuffer?, paybackDay?, debtStrategy? }` | `{ data: UserSettings }` |

- `currency` (official ISO code, uppercase), `dashboardWidgets`, `budgetCopyForward`, `safetyBuffer` (Base cents, 0 or more), `paybackDay` (1-31, null = last day), `debtStrategy`. Unknown keys return 400.
- `dashboardWidgets` is normalized on save and read: unknown ids and duplicates are rejected or dropped, missing widgets are appended visible, and `order` is renumbered from 0.

---

## Billing — `/api/billing`

| Method | Path | Body | Response | Notes |
|--------|------|------|----------|-------|
| GET | `/billing` | — | `{ data: { status, priceId, stripeCustomerId } }` | Null IDs until Stripe retry succeeds |
| POST | `/billing/webhook` | Stripe payload | 200 | No auth — verify signature |

V1: Free $0 Subscription. No Checkout. Customer Portal and paid Prices are later.

---

## Export — `/api/export`

| Method | Path | Query | Response |
|--------|------|-------|----------|
| GET | `/export/transactions` | `?dateFrom&dateTo&format=csv` | CSV file download |
| GET | `/export/accounts` | `?format=csv` | CSV of accounts + asset/liability totals |
