# Product Requirements Document — Money Airport

## 1. Overview

Money Airport is a personal finance management app that connects to bank accounts via Plaid and gives a clear, visual picture of monthly cash flow, transactions, budgets, accounts, goals, recurring bills, reports, and forecasting — in the User’s Base currency.

**Core philosophy:** Money Airport is a widget-based SaaS dashboard, not a spreadsheet. Every screen is a card/list/chart layout with generous whitespace, merchant and category icons, and progress visualization. Primary actions use a right-side drawer. The main navigation lives in a persistent left sidebar. Domain language is in `CONTEXT.md`.

**Visual language:** Light theme, white cards with soft gray borders and rounded corners. Orange is the primary accent (CTAs, active tabs, progress). Green = on track / income / positive change. Red = over budget / overage. Charts, sparklines, and progress bars communicate status before raw numbers.

---

## 2. Users

Single-user app with authentication (future multi-user household support possible). The user has multiple bank accounts (checking, savings, credit cards, investments, loans, vehicles) and wants full visibility into where money goes — at a glance, not in a grid.

---

## 3. Product Shell

### Layout

```
┌────────────┬─────────────────────────────────────────────┬──────────────┐
│            │  Page title    tabs          [actions] [+]  │              │
│  Logo      ├─────────────────────────────────────────────┤  Optional    │
│            │                                             │  right       │
│  Nav       │           Main content                      │  summary     │
│            │           (cards / lists / charts)          │  panel       │
│            │                                             │  (contextual)│
│  ────────  │                                             │              │
│  Free      │                                             │              │
│  AI Assist │                                             │              │
│  Help      │                                             │              │
│  Profile   │                                             │              │
└────────────┴─────────────────────────────────────────────┴──────────────┘
```

- **Left sidebar:** Icon + label nav. Active item has a tinted background and accent border. Collapses to icon-only.
- **Top chrome:** Search, notifications, settings, sidebar toggle. Page title + sub-tabs in the content header. Primary orange CTA on the right (e.g. `+ Add account`).
- **Right summary panel:** Present on Accounts, Budget, and Goals. Hidden on Dashboard and Transactions.
- **No spreadsheet chrome:** No dense cell grids, no click-to-edit cells, no column-letter headers. Data is cards, grouped lists, and charts.

### Navigation (sidebar, top to bottom)

1. **Dashboard** (default/home)
2. **Cash Flow**
3. **Accounts**
4. **Transactions**
5. **Reports**
6. **Budget**
7. **Recurring**
8. **Goals**
9. **Investments**
10. **Forecasting**

**Sidebar footer:** user profile and a **Free** chip (not Trial).

---

## 4. Feature Set

### F1 — Authentication

| ID | Requirement |
|----|-------------|
| F1.1 | Email + password sign-up/login via BetterAuth |
| F1.2 | OAuth with Google |
| F1.3 | Session persistence with secure HTTP-only cookies |
| F1.4 | Password reset flow |
| F1.5 | After signup, create a Stripe Customer and a $0 Subscription without blocking login. Sidebar shows Free. |

### F2 — Bank Account Connection (Plaid)

| ID | Requirement |
|----|-------------|
| F2.1 | Connect checking, savings, credit card, loan, and investment accounts via Plaid Link |
| F2.2 | Manual accounts supported (vehicles, property, cash) for net-worth completeness |
| F2.3 | Automatic daily transaction sync via Plaid webhook |
| F2.4 | Manual "Refresh all" / "Sync Now" |
| F2.5 | Handle Plaid Link token refresh when connection expires |
| F2.6 | Disconnect / reconnect. Disconnect keeps history (item status `disconnected`; BankAccounts and Transactions remain). Reconnect resumes sync. |
| F2.7 | Show last-updated timestamp per account (e.g. "9 hours ago") |
| F2.8 | `is_hidden` excludes a BankAccount from net worth, Budget account-scope, and Goals. |
| F2.9 | Amounts stay in the BankAccount’s ISO currency. Totals convert to Base currency (default USD). P&L uses the Transaction-date rate; balances use the latest rate. Fiat ISO only; unofficial/crypto omitted from totals with a banner. |
| F2.10 | Request Plaid **Liabilities** where the institution supports it (optional product: Link never fails because of it). On each sync, upsert the latest Statement (balance, minimum payment, due date) and Card terms (APR, limit) for credit BankAccounts, and balance/APR/term for loans. Fields the User has overridden are not overwritten. Institutions without Liabilities (and manual BankAccounts) use User-entered terms and Statements. |

### F3 — Dashboard (Home)

Customizable widget grid. Personalized greeting (`Good morning/afternoon/evening, {name}!`). **Customize** toggles which widgets are visible and their order.

| ID | Requirement |
|----|-------------|
| F3.1 | **Budget widget** — current month; Fixed / Flexible / Non-Monthly progress bars with planned, spent, remaining. Green under budget, red over. |
| F3.2 | **Net Worth widget** — large current value, period change ($ and %), area/line chart, timeframe dropdown (1 month default). |
| F3.3 | **Spending widget** — month-to-date total; comparison line chart (this month vs last month) across days of the month. |
| F3.4 | **Transactions widget** — most recent transactions: merchant logo, name, category icon + label, amount. Link to full Transactions. |
| F3.5 | **Recurring widget** — remaining due this month; upcoming bills with logo, cadence ("Every month"), countdown ("in 15 days"), amount. |
| F3.6 | **Credit Score widget** (if a bureau partner is connected) — score, rating label, 300–850 scale, 12-month trend. Hidden until connected. |
| F3.7 | Each widget header may include a filter/dropdown and a deep-link to the full screen. |
| F3.8 | Widget grid is two columns on desktop, single column on tablet/mobile. |
| F3.9 | Default visible widgets: Budget, Net Worth, Spending, Transactions, Recurring. No Advice or Weekly Recap in V1. |

### F4 — Accounts

Net-worth overview plus hierarchical account list. Not a settings dump.

| ID | Requirement |
|----|-------------|
| F4.1 | **Net Worth hero** — large KPI, period change ($ / %), line chart. View toggle (Performance) and timeframe dropdown. |
| F4.2 | Accounts grouped into collapsible sections by type: Cash, Credit Cards, Investments, Loans, Vehicles, Other. |
| F4.3 | Section header shows category total and period change. |
| F4.4 | **Account row:** institution logo, name + last 4, type (Checking / Savings / Credit), sparkline, current balance (native), last updated. |
| F4.5 | Credit card rows also show a **utilization bar**. |
| F4.6 | Click row → account detail (balance history, recent transactions) in a right drawer or dedicated page. |
| F4.7 | Header actions: Filters, Refresh all, **+ Add account** (Plaid Link or manual). |
| F4.8 | **Right summary panel** — Assets vs Liabilities. Toggle Totals / Percent. Horizontal stacked bars with color-coded categories (e.g. Vehicles, Investments, Cash / Credit Cards, Loans). |
| F4.9 | Download CSV from the summary panel. |
| F4.10 | **Credit card drawer** adds: credit limit, available, utilization %; last Statement (balance, minimum payment, due date + countdown); current period spend (charges since the last close); APR and Projected interest for next period; Payment rule. **Card terms** are editable in the drawer (APR, limit, statement close day, payment due day, Payment rule, fixed amount). A manual Statement can be added when Plaid has none. |
| F4.11 | **Statement periods:** the card drawer groups the card's Transactions by Statement period (`Dec 12 – Jan 11 · due Feb 5`) with a period navigator, period total, and its Statement balance. Calendar-month views elsewhere are unchanged. |
| F4.12 | **Loan drawer** adds Loan terms (principal, APR, term months, first payment date, payment day, scheduled payment, extra monthly payment) and links to the loan payoff drawer (F12.24). Balance-only loans (no APR/term) are allowed, in any ISO currency. |
| F4.13 | Savings and investment drawers have an **APY** field used by the Forecast. Savings drawers that host Funds list them with balances and the Unassigned remainder (F10.11). |
| F4.14 | Each cash BankAccount has an **in cash plan** toggle (Operating cash). Each liability has an **in debt plan** toggle. Both live in the account drawer. |

### F5 — Transactions

Date-grouped feed, not a spreadsheet ledger.

| ID | Requirement |
|----|-------------|
| F5.1 | Sub-tabs: **All** (default), Receipts, Retail Sync. Receipts / Retail Sync may be empty-state in V1. |
| F5.2 | Header actions: Search, Date range, Filters, **+ Add**. |
| F5.3 | Toolbar: account scope dropdown ("All transactions"), Edit multiple, Sort, Columns (show/hide merchant / category / account). |
| F5.4 | Transactions **grouped by date**. Date header includes the day's net total. |
| F5.5 | **Row:** merchant logo + name; category icon + label; account logo + name (last 4); amount; chevron. Pending indicator where applicable. |
| F5.6 | Spending amounts in default text; credits/income in green with `+`. |
| F5.7 | Infinite scroll (or virtual list). No page-number pagination as the primary pattern. |
| F5.8 | Click row → **right drawer**: merchant, date, category (editable select), account, native amount, notes, similar transactions, **This is a transfer** toggle (sets/clears `transfer` / `savings_transfer`). |
| F5.9 | Search filters by merchant/name. Filters: account (multi), category (multi), amount, pending. |
| F5.10 | **Edit multiple:** select rows → bulk assign category. |
| F5.11 | **Category management** from settings or a gear in filters: list with color/icon; create (name + color + icon); edit; delete (reassign to Uncategorized). Uncategorized is a seeded Category and cannot be deleted. |
| F5.12 | **+ Add** opens a right drawer: date, amount, merchant/description, category, account. |
| F5.13 | On Plaid ingest, if Category is Uncategorized, best-effort map Plaid’s primary category onto a seeded Category **name**. Never overwrite a User-set Category on later syncs. |
| F5.14 | After each sync, auto-tag **Transfers**: two Transactions, same User, different BankAccounts, opposite signs, equal absolute native amount, same currency, dates within 3 days, Plaid PFC primary `TRANSFER` or `LOAN_PAYMENTS`. Tag both. No auto-pair across currencies. Unpaired Plaid transfers stay spend. User can override via F5.8. |
| F5.15 | Transactions tagged `transfer` or `savings_transfer` are excluded from Budget actuals, Spending, Reports income/expense, and Cash Flow totals. They remain in the feed with highlight treatment. Pending Transactions **count** in those totals. |

### F6 — Budget

Collapsible category groups with progress bars and a live summary panel. Month is the default view.

| ID | Requirement |
|----|-------------|
| F6.1 | Month navigator (`◀ August 2026 ▶`). View toggles: Today, Month, Year, Decade. Settings gear for budget preferences. |
| F6.2 | Two top-level groups: **Income** and **Expenses**. Expenses split into **Fixed**, **Flexible**, **Non-Monthly**. Groups expand/collapse. |
| F6.3 | Columns: Category (icon + name) \| progress bar \| Planned \| Actual \| Remaining. Not a dense grid — rows with padding and thin separators. |
| F6.4 | Progress bar under/near Planned: green under budget, red over. Remaining in red when negative. |
| F6.5 | Group header rows show rolled-up Planned / Actual / Remaining. |
| F6.6 | Click a category → right drawer to set planned amount for that category+month. |
| F6.7 | "Copy from previous month" (manual) plus a copy-forward preference that copies planned amounts when the month changes. No remaining/overage rollover in V1. "Show unbudgeted" reveals categories with spend but no plan. |
| F6.8 | **Right summary panel:** large "Left to budget" (or over) callout; tabs Summary / Income / Expenses; Fixed / Flexible / Non-Monthly progress bars matching the Dashboard widget. |
| F6.9 | Income remaining is surplus (Actual − Planned when income); expense remaining is Planned − Actual. |

### F7 — Cash Flow

Visual month cash-flow, not a running-balance spreadsheet.

| ID | Requirement |
|----|-------------|
| F7.1 | Account scope (all or one account) and month navigator. |
| F7.2 | Summary cards: total income, total expenses, net cash flow. Totals exclude Transfers (F5.15). Amounts in Base currency. |
| F7.3 | Chart: daily or weekly income vs expenses for the month; optional running balance as an area overlay (not a table column). |
| F7.4 | Below the chart: the same date-grouped transaction list as F5, scoped to the selected month/account. |
| F7.5 | Highlight tagged activity (e.g. savings transfers) with a subtle row treatment. |

### F8 — Reports

Visual overview of financial health. Charts first; tables only as supporting ranked lists.

| ID | Requirement |
|----|-------------|
| F8.1 | Date range presets: This Month, Last 3 Months, YTD, Last Year, Custom. |
| F8.2 | **Spending by Category** — horizontal bar or donut. |
| F8.3 | **Income vs Expenses** — grouped bar by month. |
| F8.4 | **Net cash flow trend** — line chart. |
| F8.5 | **Top spending categories** — ranked list with amounts and category icons. |
| F8.6 | **Account balances over time** — multi-series line chart. |
| F8.7 | Click a chart segment → filtered transaction list in a right drawer. |
| F8.8 | Consistent palette with the rest of the app (orange accent, semantic green/red). |
| F8.9 | Income/expense reports exclude Transfers. Totals in Base currency. |

### F9 — Recurring

Upcoming bills and subscriptions as a timeline list, not a grid.

| ID | Requirement |
|----|-------------|
| F9.1 | Detect and list recurring merchants from transaction history (cadence: weekly / monthly / yearly). |
| F9.2 | Each item: logo, name, cadence, next date + countdown, amount, account. |
| F9.3 | Summary: remaining due this month vs already paid. |
| F9.4 | Mark paid / skip / edit amount in a right drawer. Manual add supported. Mark paid and skip **do not** insert a Transaction; they set `last_paid_on` (paid) and advance `next_date`. If a matching Transaction already exists this period (same merchant rule as F12), Mark paid is a no-op besides advancing the schedule if needed. |
| F9.5 | Dashboard Recurring widget is a truncated view of this list. |

### F10 — Goals

Card list of save-up and pay-down Goals. Progress is either associated BankAccount balances or, for a Fund, its own entries inside one real host BankAccount.

| ID | Requirement |
|----|-------------|
| F10.1 | Sub-tabs: **Save up** (default) and **Pay down**. |
| F10.2 | Header actions: Manage, **Edit accounts**, **+ Add goal**. No Allocate funds. |
| F10.3 | Group total (sum of current amounts, Base currency) at the top of the list. |
| F10.4 | **Goal card:** thumbnail, name, status badge (On track / At risk), target date, current amount, thin progress bar, `% of $target`. |
| F10.5 | **Right panel:** associated BankAccounts and balances; **Edit accounts** primary CTA. |
| F10.6 | Add/edit Goal in a right drawer: name, thumbnail, target amount, target date, type, funding (**Accounts** or **Fund**; save-up only). Create is allowed with zero BankAccounts (progress $0). |
| F10.7 | Accounts-funded progress is computed at read time from associated BankAccount balances (latest FX into Base). Fund progress is the sum of its Fund entries (F10.11). No other allocation ledger. |
| F10.8 | Save-up: many asset BankAccounts (`is_asset = true`). Pay-down: zero or one liability (`is_asset = false`). A BankAccount belongs to at most one Goal; associating one already on another Goal **moves** it (toast). Associating a second liability on a pay-down Goal **refuses**. |
| F10.9 | Pay-down: current display = remaining owed. Bar = `(target − remaining) / target`. Default `target_amount` to the liability balance when the first (only) liability is associated; User can edit. Do not auto-change target after that. |
| F10.10 | Pay-down cards show the liability's payoff month from the Debt plan (F12.18) and link to the Forecasting **Debt** tab. |
| F10.11 | **Funds:** a save-up Goal with funding = Fund picks one visible asset host BankAccount. Many Funds may share a host. Fund balance = sum of its Fund entries (native host currency, shown in Base at the latest rate). The host's drawer and the Goals right panel show each Fund plus **Unassigned** (host balance − sum of Funds); a negative Unassigned shows a warning, never blocks. A host cannot also be in a Goal association. |
| F10.12 | Fund drawer lists Fund entries by date (deposit / withdrawal / interest) with a running Fund balance shown in the date header; **+ Entry** adds one. A `savings_transfer` Transaction into or out of the host offers "Assign to Fund" in the Transaction drawer, which creates the entry linked to that Transaction (one Transaction → at most one Fund entry). |
| F10.13 | When a host gets an interest Transaction (Plaid PFC `INCOME` / `INCOME_INTEREST_EARNED`, or User-tagged), the app splits it into interest entries across that host's Funds pro rata by month-start Fund balance; rounding cents go to the largest Fund. Unassigned keeps its share implicitly. |
| F10.14 | Fund status (On track / At risk) uses the Fund's planned monthly deposits from the Forecast (savings rows pointing at it) plus projected interest at the host's APY, against target amount and date. |

### F11 — Investments

Holdings overview beyond a raw balance. V1 is balances + allocation, not a full brokerage.

| ID | Requirement |
|----|-------------|
| F11.1 | List investment accounts from Plaid with current value and period change. |
| F11.2 | Allocation chart (by account or asset class when Plaid provides it). |
| F11.3 | Sparkline / value-over-time per account. |
| F11.4 | No trade execution. Positions shown when the institution provides them; otherwise account-level value only. |

### F12 — Forecasting

Forward-looking plan visualized as charts and monthly cards — not a 12-column spreadsheet. Three sub-tabs: **Year** (default), **Month**, and **Debt**. All three read one projection engine (F12.14).

**Year**

| ID | Requirement |
|----|-------------|
| F12.1 | Year selector (`◀ 2026 ▶`). |
| F12.2 | Summary cards auto-calculated from the plan: projected cash flow, Operating cash balance, credit card total, savings total (including Funds), fixed expenses, variable expenses, debt payments (scheduled + Payback), total debt. |
| F12.3 | **Projected balance chart** across 12 months (line/area). |
| F12.4 | Sections as collapsible card groups: Revenue, Savings, Fixed expenses, Variable expenses. Each item shows name, typical monthly amount, and a 12-month sparkline or month chips — not an editable cell matrix. |
| F12.5 | Click an item → right drawer to set monthly amounts (copy across months supported), day of month, pay-from / receive-into BankAccount (Operating cash by default, or a credit card), and for savings rows the target Fund. |
| F12.6 | Add / delete line items per section. |
| F12.7 | Past months show **Actuals** from Transactions when available, visually distinct from the Plan (e.g. filled vs dashed). Plan amounts stay stored; Actuals are computed at read time. |
| F12.8 | Current month highlighted in the chart and month chips. |
| F12.9 | ForecastRow may have `category_id` and/or `recurring_item_id`. RecurringItem wins for Actuals if set (merchant_name match, and `bank_account_id` when the RecurringItem has one); otherwise Category. Neither → projection only. |
| F12.10 | One-shot **Add from categories** (skip Uncategorized and rows that already have that Category). Map: income → revenue; fixed → fixed_expense; flexible and non_monthly → variable_expense; “Savings Transfer” → savings. Separate **Add from recurring** skipping RecurringItems already linked. Twelve-month amounts edit in the drawer only. |
| F12.11 | Projected Operating cash starts from today's Operating cash balance. Each future month: `prior + revenue − (fixed + variable paid from Operating cash) − savings deposits − card payments − loan payments − Payback`. Spending on rows paid from a card goes into that card's balance, not Operating cash; it reaches Operating cash only as the card's payment on its due date. Past months use snapshots. Card totals stay a separate series, never added to the cash line. |
| F12.12 | A read-only **Debt** section (computed, not deletable) shows per month: each card payment, each loan payment, and Payback with its split per liability. Edit it from the Debt tab, not the Year drawer. |
| F12.13 | **One-offs** per section: name, date, amount, pay-from / receive-into BankAccount, optional Category and Fund. Listed under their section with an Expected / Done / Cancelled badge; matching a Transaction marks it Done (CONTEXT: One-off). Expected reimbursements are revenue One-offs. |

**Engine**

| ID | Requirement |
|----|-------------|
| F12.14 | The projection runs **day by day** for every future day of the selected range: plan items land on their `day_of_month` (clamped to the month's last day; no day → day 1 for revenue, last day for expenses), One-offs on their date, card payments on the card's due day, loan payments on the loan's payment day. Computed at read time; nothing about the projection is stored. |
| F12.15 | **Card balances** next period = balance − scheduled payment (Payment rule) − Payback + Projected interest + card-paid plan spending. Projected interest = (Statement balance − scheduled payment − Payback, if positive) × APR / 12. Card with no APR → 0 interest and a "Add APR" hint. |
| F12.16 | **Loan balances** follow the Amortization schedule plus extra payment plus Payback. Balance-only loans drop by whatever is paid. Native currency is kept; payments from Operating cash convert at the latest rate. |
| F12.17 | **Savings** and Fund balances grow by deposits and compound monthly at the account's APY (Fund share pro rata, F10.13). |
| F12.18 | **Payback** (CONTEXT: Payback): on the payback day (Setting, default the last day of the month), amount = lowest projected Operating cash from the payback day until the next revenue item lands, minus the Safety buffer, floored at 0, capped at the total payable debt after scheduled payments. Allocate in Debt plan order; each liability takes up to its remaining balance; the rest spills over to the next. Leftover stays in cash. Shows a payoff month per liability and a debt-free month overall. |
| F12.19 | Any projected day where Operating cash < Safety buffer is a **shortfall**: red on the charts, listed in a callout with the day and amount short. Payback can never cause a shortfall; plan items can. |

**Month**

| ID | Requirement |
|----|-------------|
| F12.20 | Month navigator. Area chart of daily Operating cash (past days from snapshots solid, future projected dashed) with a horizontal Safety buffer line and a **low point** callout (date + amount). Below: plan items grouped by date (income, bills, card payments, loan payments, savings deposits, One-offs, Payback with its spillover split); each date header shows the day's net and the projected balance after it. Date-grouped list, not a running-balance table column. Row click opens the item's drawer. |

**Debt**

| ID | Requirement |
|----|-------------|
| F12.21 | Hero: total debt (Base), debt-free month, projected interest for the next 12 months, total utilization (sum balances / sum limits). Strategy selector (Avalanche / Snowball / Custom) and Safety buffer and payback day controls. |
| F12.22 | One card per in-plan liability, in Debt plan order (drag to reorder switches strategy to Custom): name, balance, share of total debt %, limit / available / utilization bar (cards), Statement balance, minimum payment, due date countdown, APR, Payment rule, this month's scheduled payment + Payback, Projected interest, payoff month. |
| F12.23 | Chart: stacked bars of projected balance per liability by month until debt-free, with Payback marked. |
| F12.24 | **Loan payoff drawer** (from a loan card or F4.12): base payment, total interest, payoff date; extra-payment scenarios as compare cards for +$0 / 50 / 100 / 150 / 200 / 250 / 300 and a custom amount: payment, payoff months, months saved, total interest, interest saved. Amortization schedule as a balance chart plus a year-grouped collapsible list (period, payment, interest, principal, extra, ending balance). Choosing a scenario sets the loan's extra monthly payment. |
| F12.25 | Card and loan payments already modeled by the engine are not also counted from ForecastRows: rows linked to a RecurringItem whose matches are Transfers into a liability are flagged "counted in Debt" and excluded from totals. |

---

## 5. Settings

Opened from the top-chrome gear (not a primary nav item).

| ID | Requirement |
|----|-------------|
| S1 | Profile: name, email, change password, avatar |
| S2 | Connected accounts shortcut (full management lives on Accounts) |
| S3 | Categories (same as F5.11) |
| S4 | Dashboard customize (widget visibility / order). Defaults: Budget, Net Worth, Spending, Transactions, Recurring. |
| S5 | Budget preferences: copy-forward only (no rollover). |
| S6 | Data export (CSV) |
| S7 | Notifications preferences (in-app; push is out of scope for V1) |
| S8 | Base currency (ISO). Changing it rebuilds cached base amounts. |
| S9 | Plan: Safety buffer (default $150), payback day (default last day of month), debt strategy (Avalanche default). Same controls as the Forecasting Debt tab. |

---

## 6. Interaction Patterns (Global)

| Pattern | Detail |
|---------|--------|
| Primary create/edit | **Right drawer** (not a centered modal, not an inline spreadsheet cell) |
| Confirm / simple forms | Small modal allowed (disconnect account, delete category) |
| Drawer close | X, overlay click, Escape |
| Drawer size | ~400–480px; does not cover the left nav |
| Stacking | One drawer at a time |
| Form submit | Disabled until valid; spinner on submit; toast on success/error |
| Empty states | Illustration + one sentence + primary CTA (e.g. Connect an account) |
| Loading | Skeleton cards/lists, not a blank page |
| Customize | Dashboard widgets can be shown/hidden and reordered |

---

## 7. Non-Functional Requirements

| Area | Requirement |
|------|-------------|
| Performance | < 200ms API response for paginated/list queries; < 1s initial page load |
| Security | All API routes authenticated; Plaid tokens encrypted at rest; HTTPS only |
| Responsive | Desktop-first (1280px+ two-column widgets + optional right panel); tablet (1024px) stacks the right panel under main; mobile (375px) icon-rail + single column |
| Accessibility | Keyboard-navigable drawers; ARIA labels; charts have text summaries |
| Error handling | Global error boundary; toast notifications; retry on network failure |

---

## 8. Out of Scope (V1)

- Native mobile apps
- Receipt OCR / retail-sync ingestion (tabs may exist as empty states)
- Credit bureau partnership if no provider is wired — hide the Credit Score widget
- Push / SMS / email bill reminders (Recurring is on-screen only)
- Household multi-user editing and Shared tags
- Brokerage trading, tax lots, or full portfolio analytics beyond F11
- Paid Stripe Prices, Checkout, payment methods, and Stripe Connect (Free $0 Subscription only)
- Advice, AI Assistant, Weekly Recap
- Budget remaining/overage rollover
- Remittance and tax calculators (Remessa Online / Wise fees, IOF, pro-labore, INSS, IRRF)
- Spreadsheet or CSV import of past history or opening balances (history comes from Plaid or manual entry)
- Payroll audit (checking paychecks against hours, rate, and withholding)
- Moving money or paying bills: Payback and payment plans are projections, the User pays at the bank
- Auto-pairing Transfers across currencies
- Crypto / unofficial currency codes in totals
