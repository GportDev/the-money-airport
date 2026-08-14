# Product Requirements Document — CashPilot

## 1. Overview

CashPilot is a personal finance management app that connects to bank accounts via Plaid and gives a clear, visual picture of monthly cash flow, transactions, budgets, accounts, goals, recurring bills, reports, and forecasting.

**Core philosophy:** CashPilot is a widget-based SaaS dashboard, not a spreadsheet. Every screen is a card/list/chart layout with generous whitespace, merchant and category icons, and progress visualization. Primary actions use a right-side drawer. The main navigation lives in a persistent left sidebar.

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
│  Trial     │                                             │              │
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

**Sidebar footer:** user profile.

---

## 4. Feature Set

### F1 — Authentication

| ID | Requirement |
|----|-------------|
| F1.1 | Email + password sign-up/login via BetterAuth |
| F1.2 | OAuth with Google |
| F1.3 | Session persistence with secure HTTP-only cookies |
| F1.4 | Password reset flow |

### F2 — Bank Account Connection (Plaid)

| ID | Requirement |
|----|-------------|
| F2.1 | Connect checking, savings, credit card, loan, and investment accounts via Plaid Link |
| F2.2 | Manual accounts supported (vehicles, property, cash) for net-worth completeness |
| F2.3 | Automatic daily transaction sync via Plaid webhook |
| F2.4 | Manual "Refresh all" / "Sync Now" |
| F2.5 | Handle Plaid Link token refresh when connection expires |
| F2.6 | Disconnect / reconnect accounts |
| F2.7 | Show last-updated timestamp per account (e.g. "9 hours ago") |

### F3 — Dashboard (Home)

Customizable widget grid. Personalized greeting (`Good morning/afternoon/evening, {name}!`). **Customize** toggles which widgets are visible and their order.

| ID | Requirement |
|----|-------------|
| F3.1 | **Budget widget** — current month; Fixed / Flexible / Non-Monthly progress bars with planned, spent, remaining. Green under budget, red over. |
| F3.2 | **Net Worth widget** — large current value, period change ($ and %), area/line chart, timeframe dropdown (1 month default). |
| F3.3 | **Spending widget** — month-to-date total; comparison line chart (this month vs last month) across days of the month. |
| F3.4 | **Transactions widget** — most recent transactions: merchant logo, name, category icon + label, amount. Link to full Transactions. |
| F3.5 | **Recurring widget** — remaining due this month; upcoming bills with logo, cadence ("Every month"), countdown ("in 15 days"), amount. |
| F3.6 | **Advice widget** — top recommended action (e.g. emergency fund) with a mini progress bar. Links to Advice / Goals. |
| F3.7 | **Weekly Recap widget** — short narrative summary of recent activity with a "See recap" link. |
| F3.8 | **Credit Score widget** (if a bureau partner is connected) — score, rating label, 300–850 scale, 12-month trend. Hidden until connected. |
| F3.9 | Each widget header may include a filter/dropdown and a deep-link to the full screen. |
| F3.10 | Widget grid is two columns on desktop, single column on tablet/mobile. |

### F4 — Accounts

Net-worth overview plus hierarchical account list. Not a settings dump.

| ID | Requirement |
|----|-------------|
| F4.1 | **Net Worth hero** — large KPI, period change ($ / %), line chart. View toggle (Performance) and timeframe dropdown. |
| F4.2 | Accounts grouped into collapsible sections by type: Cash, Credit Cards, Investments, Loans, Vehicles, Other. |
| F4.3 | Section header shows category total and period change. |
| F4.4 | **Account row:** institution logo, name + last 4, type (Checking / Savings / Credit), optional Shared tag, sparkline, current balance, last updated. |
| F4.5 | Credit card rows also show a **utilization bar**. |
| F4.6 | Click row → account detail (balance history, recent transactions) in a right drawer or dedicated page. |
| F4.7 | Header actions: Filters, Refresh all, **+ Add account** (Plaid Link or manual). |
| F4.8 | **Right summary panel** — Assets vs Liabilities. Toggle Totals / Percent. Horizontal stacked bars with color-coded categories (e.g. Vehicles, Investments, Cash / Credit Cards, Loans). |
| F4.9 | Download CSV from the summary panel. |

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
| F5.8 | Click row → **right drawer**: merchant, date, category (editable select), account, amount, notes, similar transactions. |
| F5.9 | Search filters by merchant/name. Filters: account (multi), category (multi), amount, pending. |
| F5.10 | **Edit multiple:** select rows → bulk assign category. |
| F5.11 | **Category management** from settings or a gear in filters: list with color/icon; create (name + color + icon); edit; delete (reassign to Uncategorized). |
| F5.12 | **+ Add** opens a right drawer: date, amount, merchant/description, category, account. |

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
| F6.7 | "Copy from previous month" in settings. "Show unbudgeted" reveals categories with spend but no plan. |
| F6.8 | **Right summary panel:** large "Left to budget" (or over) callout; tabs Summary / Income / Expenses; Fixed / Flexible / Non-Monthly progress bars matching the Dashboard widget. |
| F6.9 | Income remaining is surplus (Actual − Planned when income); expense remaining is Planned − Actual. |

### F7 — Cash Flow

Visual month cash-flow, not a running-balance spreadsheet.

| ID | Requirement |
|----|-------------|
| F7.1 | Account scope (all or one account) and month navigator. |
| F7.2 | Summary cards: total income, total expenses, net cash flow. |
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

### F9 — Recurring

Upcoming bills and subscriptions as a timeline list, not a grid.

| ID | Requirement |
|----|-------------|
| F9.1 | Detect and list recurring merchants from transaction history (cadence: weekly / monthly / yearly). |
| F9.2 | Each item: logo, name, cadence, next date + countdown, amount, account. |
| F9.3 | Summary: remaining due this month vs already paid. |
| F9.4 | Mark paid / skip / edit amount in a right drawer. Manual add supported. |
| F9.5 | Dashboard Recurring widget is a truncated view of this list. |

### F10 — Goals

Card list of save-up and pay-down goals, with allocation from designated accounts.

| ID | Requirement |
|----|-------------|
| F10.1 | Sub-tabs: **Save up** (default) and **Pay down**. |
| F10.2 | Header actions: Manage, Allocate funds, **+ Add goal**. |
| F10.3 | Group total (sum of current amounts) at the top of the list. |
| F10.4 | **Goal card:** thumbnail, name, status badge (On track / At risk), target date, current amount, thin progress bar, `% of $target`. |
| F10.5 | **Right panel:** available for goals; list of goal accounts with balances; **Allocate funds** primary CTA; Edit goal accounts. |
| F10.6 | Add/edit goal in a right drawer: name, thumbnail, target amount, target date, type (save up / pay down), linked account. |
| F10.7 | Allocate funds moves money between available cash and goal allocations (in-app allocation, not a bank transfer). |

### F11 — Investments

Holdings overview beyond a raw balance. V1 is balances + allocation, not a full brokerage.

| ID | Requirement |
|----|-------------|
| F11.1 | List investment accounts from Plaid with current value and period change. |
| F11.2 | Allocation chart (by account or asset class when Plaid provides it). |
| F11.3 | Sparkline / value-over-time per account. |
| F11.4 | No trade execution. Positions shown when the institution provides them; otherwise account-level value only. |

### F12 — Forecasting

Forward-looking plan visualized as charts and monthly cards — not a 12-column spreadsheet.

| ID | Requirement |
|----|-------------|
| F12.1 | Year selector (`◀ 2026 ▶`). |
| F12.2 | Summary cards auto-calculated from the plan: projected cash flow, checking balance, credit card total, savings total, fixed expenses, variable expenses. |
| F12.3 | **Projected balance chart** across 12 months (line/area). |
| F12.4 | Sections as collapsible card groups: Revenue, Savings, Fixed expenses, Variable expenses. Each item shows name, typical monthly amount, and a 12-month sparkline or month chips — not an editable cell matrix. |
| F12.5 | Click an item → right drawer to set monthly amounts (copy across months supported). |
| F12.6 | Add / delete line items per section. |
| F12.7 | Past months show **actuals** from transactions when available, visually distinct from projections (e.g. filled vs dashed). |
| F12.8 | Current month highlighted in the chart and month chips. |

### F13 — Advice

Prioritized recommendations, not a report dump.

| ID | Requirement |
|----|-------------|
| F13.1 | Ranked cards (e.g. build emergency fund, pay down high-APR card, cut overspent category). |
| F13.2 | Each card: title, short why, optional progress, CTA into Budget / Goals / Accounts. |
| F13.3 | Dashboard Advice widget shows the top card only. |
| F13.4 | V1 rules are deterministic (thresholds on emergency fund, utilization, budget overages). LLM copy is optional later via AI Assistant. |

### F14 — AI Assistant

| ID | Requirement |
|----|-------------|
| F14.1 | Sidebar entry opens a chat drawer. |
| F14.2 | V1: answer questions about the user's own data (spend this month, what's left in groceries, upcoming bills). |
| F14.3 | Never executes transfers or deletes data without an explicit in-app confirmation. |

---

## 5. Settings

Opened from the top-chrome gear (not a primary nav item).

| ID | Requirement |
|----|-------------|
| S1 | Profile: name, email, change password, avatar |
| S2 | Connected accounts shortcut (full management lives on Accounts) |
| S3 | Categories (same as F5.11) |
| S4 | Dashboard customize (widget visibility / order) |
| S5 | Budget preferences (copy-forward, rollover) |
| S6 | Data export (CSV) |
| S7 | Notifications preferences (in-app; push is out of scope for V1) |

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
- Household multi-user editing (Shared tags may display if present; no invite-to-edit)
- Brokerage trading, tax lots, or full portfolio analytics beyond F11
- Referral rewards / paid trial billing (plan chip may be static)
