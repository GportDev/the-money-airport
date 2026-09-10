# Screen Specifications — Money Airport

All screens share: collapsible **left sidebar** + **main content** (cards, grouped lists, charts) + **optional right summary panel**. Create/edit/detail open in a **right drawer**. The main layout never becomes a spreadsheet.

Visual language: white cards, soft gray borders, rounded corners. Orange primary CTAs and active tabs. Green = on track / income / positive change. Red = over budget / overage.

---

## Layout Shell

```
┌────────────┬─────────────────────────────────────────────┬──────────────┐
│            │  🔍  🔔  ⚙  ☰     Title   tabs    [actions] [+] │              │
│  Logo      ├─────────────────────────────────────────────┤  Optional    │
│            │                                             │  right       │
│  Dashboard │           Main: cards / lists / charts      │  summary     │
│  Cash Flow │                                             │  (Accounts,  │
│  Accounts  │                                             │   Budget,    │
│  Transact. │                                             │   Goals)     │
│  Reports   │                                             │              │
│  Budget    │                                             │              │
│  Recurring │                                             │              │
│  Goals     │                                             │              │
│  Invest.   │                                             │              │
│  Forecast  │                                             │              │
│  ────────  │                                             │              │
│  Free      │                                             │              │
│  Profile   │                                             │              │
└────────────┴─────────────────────────────────────────────┴──────────────┘
```

- Sidebar: 240px. Collapses to icon-only (64px). Active item: tinted background + accent border.
- Top chrome: search, notifications, settings gear, sidebar toggle. Settings is **not** a primary nav item.
- Right panel: ~320px. Present on Accounts, Budget, Goals. Hidden on Dashboard, Transactions, Cash Flow, Reports, Recurring, Investments, Forecasting.
- Drawers: ~400–480px Sheet from the right. Do not cover the left nav. One at a time.
- No dense cell grids, click-to-edit cells, or column-letter headers.

---

## S1 — Dashboard

**Route:** `/` (default home)

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│  Good evening, Gabriel!                      [Customize]     │
├─────────────────────────────┬────────────────────────────────┤
│  Budget (Aug)               │  Spending  $3,057              │
│  Fixed    ████░░  $1,678/$1,974 │  this month vs last (line)    │
│  Flexible ██░░░░  $914/$3,100   │                                │
│  Non-Mo.  ██████  $466/$25  │                                │
│  Net Worth  -$13,405        │  Transactions (most recent)    │
│  +$2,225 (14.2%)  [1 month] │  logo  Joe Coffee    -$4.75    │
│  [area chart]               │  …                             │
│                             │  Recurring  $702 remaining     │
│                             │  Citi  Every month  in 15d     │
└─────────────────────────────┴────────────────────────────────┘
```

### Behavior

- Personalized greeting by time of day.
- **Customize** toggles widget visibility and order (persisted in settings).
- Two columns on ≥1280px; single column below.
- Widget headers deep-link to the full screen (Budget → `/budget`, etc.).
- Default widgets: Budget, Net Worth, Spending, Transactions, Recurring.
- Credit Score widget is not rendered unless a bureau partner is connected.
- Empty state if no accounts: illustration + **Connect an account**.

---

## S2 — Cash Flow

**Route:** `/cash-flow`

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│  Cash Flow     [All accounts ▾]           ◀ August 2026 ▶    │
├──────────────────────────────────────────────────────────────┤
│  [Income $X]     [Expenses $X]     [Net $X]                  │
│  [daily income vs expenses chart; optional running-balance]  │
│                                                              │
│  August 13, 2026                                  $241.73    │
│  logo  Merchant     cat     account              -$12.00  >  │
│  …                                                           │
└──────────────────────────────────────────────────────────────┘
```

### Behavior

- Account scope: all accounts or one. Month navigator.
- Three KPI cards (income green, expenses, net semantic).
- Chart is the primary view. Running balance is an area overlay, never a table column.
- Below: same date-grouped `transaction-feed` as S4, scoped to month/account.
- Tagged rows (e.g. savings transfers) get a subtle background.
- Row click → transaction drawer. **+ Add** in header → add-transaction drawer.

---

## S3 — Accounts

**Route:** `/accounts`

### Layout

```
┌────────────────────────────────────────────┬─────────────────┐
│  Accounts     [Filters] [Refresh all] [+ Add account]        │
│  NET WORTH  -$13,404.66   +$2,225 (14.2%)  [1 month ▾]       │
│  [line chart]                                                │
│                                            │  Totals | %     │
│  Cash                            $485  ↓   │  Assets $11,227 │
│  ▾ Rewards Checking  spark  $412  9h ago   │  ████ vehicles  │
│  Credit Cards                    $4,200    │  Liab. $24,631  │
│  ▾ Apple Card  util+spark  $2,100  9h ago  │  [Download CSV] │
└────────────────────────────────────────────┴─────────────────┘
```

### Behavior

- Hero: net worth KPI + change + chart. Timeframe dropdown.
- Collapsible groups by `displayGroup`. Header shows group total and period change.
- Row: institution logo, name + last 4, type, sparkline, balance (native), last updated. Credit rows include a utilization bar.
- Click row → account drawer (balance history sparkline, recent transactions).
- **+ Add account:** Plaid Link or manual account form in a drawer.
- **Refresh all** calls `/plaid/sync-all`.
- Right panel: Assets vs Liabilities stacked bars; Totals / Percent toggle.

---

## S4 — Transactions

**Route:** `/transactions`

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│  Transactions   All | Receipts | Retail Sync                 │
│                 [Search] [Date] [Filters]            [+ Add] │
│  [All transactions ▾]          [Edit multiple] [Sort] [Cols] │
│                                                              │
│  August 13, 2026                                  $241.73    │
│  logo  Joe Coffee   🍽 Restaurants   Amex …1007    -$4.75  > │
│  logo  Google       💼 Fees          Apple Card     +$0.59  > │
└──────────────────────────────────────────────────────────────┘
```

### Behavior

- Sub-tabs: **All** (default). Receipts and Retail Sync are empty states in V1.
- Date-grouped feed. Date header shows that day's net. Infinite/virtual scroll.
- Row: merchant logo + name; category icon + label; account logo + name; amount; chevron. Pending badge when `pending`.
- Spend in default text; income/credits green with `+`.
- Click row → **transaction drawer** (category select, notes, similar transactions, **This is a transfer** toggle).
- Search (300ms debounce). Filters: account multi, category multi, amount, pending. All in URL search params.
- **Edit multiple:** checkboxes → bulk category assign (drawer).
- **Columns:** show/hide category and account.
- **+ Add** → add-transaction drawer.
- Category manager from Filters gear or Settings.

---

## S5 — Reports

**Route:** `/reports`

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│  Reports     Date range: [This Month ▾]                      │
├─────────────────────────────┬────────────────────────────────┤
│  Spending by category       │  Income vs expenses            │
│  (donut or horizontal bar)  │  (grouped bar by month)        │
├─────────────────────────────┼────────────────────────────────┤
│  Top categories (icons)     │  Net cash flow (line)          │
├─────────────────────────────┴────────────────────────────────┤
│  Account balances over time (multi-series line)              │
└──────────────────────────────────────────────────────────────┘
```

### Behavior

- Presets: This Month, Last 3 Months, YTD, Last Year, Custom.
- Charts first. Ranked lists with category icons — no monthly comparison spreadsheet.
- Click a segment → transaction feed in a **right drawer** (filtered).
- Recharts; category colors; orange accent. Stack to one column on tablet.

---

## S6 — Budget

**Route:** `/budget`

### Layout

```
┌────────────────────────────────────────────┬─────────────────┐
│  ◀ August 2026 ▶   Today  Month  Year  Decade     [⚙]        │
│                                            │  $1,201 Left    │
│  Income                                    │  to budget      │
│  ▾ G Paycheck     ██░   Planned  Actual  Rem │  Summary|Inc|Exp│
│  Expenses                                  │  Fixed   ██░    │
│  ▾ Fixed                                   │  Flexible ██░   │
│    Rent           ███   $1,500  $1,503  -$3│  Non-Mo. ████   │
│  ▾ Flexible                                │                 │
│    Groceries      ██░   $600    $432    $168│                 │
│  [Show unbudgeted]                         │                 │
└────────────────────────────────────────────┴─────────────────┘
```

### Behavior

- Default view: Month. Year/Decade are rolled-up read-only summaries in V1; Today highlights current-day spend.
- Groups: Income; Expenses → Fixed, Flexible, Non-Monthly. Expand/collapse.
- Rows: icon + name, thin progress bar (green under / red over), Planned, Actual, Remaining. Remaining red when negative.
- Group headers roll up totals.
- Click category → drawer to set planned amount.
- Settings gear: copy from previous month, copy-forward preference. No rollover.
- **Show unbudgeted** reveals spend with no plan.
- Right panel: large left-to-budget callout; tabs Summary / Income / Expenses; group progress bars (same as Dashboard widget).

---

## S7 — Recurring

**Route:** `/recurring`

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│  Recurring     $702 remaining due this month         [+ Add] │
│                                                              │
│  logo  Citi Card     Every month    in 15 days      $200.00  │
│  logo  Google        Every month    in 18 days       $13.99  │
│  logo  Verizon       Every month    in 22 days       $80.00  │
└──────────────────────────────────────────────────────────────┘
```

### Behavior

- Timeline list sorted by `nextDate`. Summary: remaining due vs already paid this month.
- Row click → drawer: edit amount/cadence, mark paid, skip, deactivate. Mark paid / skip do not insert a Transaction.
- **+ Add** → manual recurring drawer.
- Detection: banner when `/recurring/detect` finds candidates to confirm.

---

## S8 — Goals

**Route:** `/goals`

### Layout

```
┌────────────────────────────────────────────┬─────────────────┐
│  Goals   Save up | Pay down                                  │
│          [Manage] [Edit accounts]               [+ Add goal] │
│  Save up                                      $101.86        │
│  [img] Emergency fund  At risk  Jul 2027  $96.57             │
│        █░░░░░░░░░░░░░░░░░░░░░░░░  1% of $10,000              │
│  [img] Vacation        Dec 2027            $5.29             │
│                                            │  Ally  $2,000   │
│                                            │  HYSA  $800     │
│                                            │  [Edit accounts]│
└────────────────────────────────────────────┴─────────────────┘
```

### Behavior

- Sub-tabs: Save up (default), Pay down.
- Goal cards: thumbnail, name, status badge, target date, current amount, progress bar, `% of $target`.
- **+ Add goal** / card click → goal drawer. Create allowed with zero BankAccounts (progress $0).
- **Edit accounts** → associate BankAccounts (save-up: many assets; pay-down: 0 or 1 liability). Moving an account off another Goal shows a toast.
- Right panel: associated BankAccount balances; **Edit accounts** primary CTA. No Allocate funds.

---

## S9 — Investments

**Route:** `/investments`

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│  Investments     Total $X          change $X (x%)  [1 month] │
│  [allocation donut or stacked bar by account]                │
│  Account name     sparkline                    $value   Δ    │
└──────────────────────────────────────────────────────────────┘
```

### Behavior

- Read-only. No trade ticket.
- Positions shown only if Plaid provided them; otherwise account-level value.
- Empty state if no investment accounts: prompt to connect via Accounts.

---

## S10 — Forecasting

**Route:** `/forecast`

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│  Forecasting                              ◀ 2026 ▶           │
│  [Cash flow] [Checking] [Cards] [Savings] [Fixed] [Variable] │
│  [projected balance area chart — 12 months]                  │
│                                                              │
│  Revenue                                                     │
│  Salary     $3,400/mo typical    [12-month sparkline]     >  │
│  Savings / Fixed expenses / Variable expenses  (same)        │
└──────────────────────────────────────────────────────────────┘
```

### Behavior

- Year navigator. Summary **cards** (not a summary spreadsheet row).
- Projected balance chart. Current month highlighted; past actuals solid, projections dashed.
- Collapsible card groups. Each item: name, typical monthly amount, sparkline or month chips — **not** an editable 12-column matrix.
- Click item → drawer: per-month Plan amounts + "copy to all months". Add/delete item from section header / row action. **Add from categories** and **Add from recurring** are one-shot seeds.
- Past months: chart draws Plan (dashed) and Actual (solid) when Actuals exist.
- Confirm dialog for delete.

---

## S11 — Settings

**Route:** `/settings`

Opened from the top-chrome gear.

### Layout

Vertical stacked sections (cards), no sub-nav:

- **Profile** — name, email (read-only), avatar, change password
- **Accounts shortcut** — link to `/accounts` (connect/disconnect lives there)
- **Categories** — opens category manager drawer
- **Dashboard** — widget visibility / order (same as Customize). Defaults omit Advice and Weekly Recap.
- **Budget** — copy-forward toggle (no rollover)
- **Currency** — Base currency
- **Data** — export transactions CSV

### Behavior

- Disconnect uses a **confirm dialog**, then sets the Plaid item `disconnected` and **keeps** BankAccounts and Transactions.
- Change password is a small form on the page or a confirm-style dialog.

---

## Drawer Catalog

| Drawer | Trigger | Contents |
|--------|---------|----------|
| Transaction | Row click / + Add | Merchant, date, native amount, category, account, notes, similar, transfer toggle; or add form |
| Account | Account row / + Add (manual) | History sparkline, recent tx; or manual account fields including currency |
| Budget category | Budget row | Planned amount for category+month |
| Recurring | Row / + Add | Amount, cadence, next date, mark paid, skip |
| Goal | Card / + Add / Edit accounts | Name, thumbnail, target, date, type; or associated BankAccounts |
| Forecast item | Row / + Add | Name, day of month, 12 Plan amounts, copy-to-all |
| Category manager | Filters gear / Settings | List with color/icon; create/edit; delete confirm |
| Report transactions | Chart segment click | Filtered `transaction-feed` |

## Dialog Catalog (small, confirm only)

| Dialog | Trigger |
|--------|---------|
| Confirm delete | Delete category, forecast row, goal, manual account |
| Confirm disconnect | Disconnect Plaid item |
| Confirm copy budgets | Copy previous month |

---

## Color Palette

| Usage | Token | Light | Dark |
|-------|-------|-------|------|
| Background | `--background` | `#FFFFFF` | `#0A0A0A` |
| Card | `--card` | `#FFFFFF` | `#141414` |
| Border | `--border` | `#E5E7EB` | `#27272A` |
| Positive / on track | `--positive` | `#16A34A` | `#22C55E` |
| Negative / over | `--negative` | `#DC2626` | `#EF4444` |
| Primary / CTA / progress | `--primary` | `#EA580C` | `#FB923C` |
| Muted text | `--muted` | `#6B7280` | `#9CA3AF` |
| Warning badge (At risk) | `--warning` | `#EAB308` | `#FACC15` |

---

## Typography

- **Headings / KPI values:** Inter or system font, semibold
- **Body / lists:** Inter, regular, 14px
- **Amounts:** Tabular nums (`font-variant-numeric: tabular-nums`)
- Generous row padding; thin horizontal separators — list feel, not grid feel
