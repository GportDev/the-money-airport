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

- Page title stays **Dashboard** (every screen's h1 matches its nav label); the greeting sits under it, by local time of day.
- **Customize** toggles widget visibility and order (persisted in settings).
- Two columns on ≥1280px; single column below. Wide screens stack widgets in two independent columns (1st, 3rd, 5th left; 2nd, 4th right) so tall widgets leave no gaps.
- Budget widget before Budgets exist: spent per group, empty bars, and a **Set up a budget** link. Recurring widget: empty state until Recurring exists.
- Recent transaction rows open the transaction drawer.
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

- Account scope: all accounts or one. Month navigator. Both live in the URL: `?month=YYYY-MM&account=<id>`.
- Daily / Weekly toggle (`?view=weekly`; weeks are days 1–7, 8–14, …). Running balance checkbox shows or hides the overlay: net worth for all accounts, balance for one asset account, amount owed for one card or loan.
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
- Click row → account drawer (balance history sparkline, recent transactions). The drawer adds a section by type:
  - **Credit:** limit / available / utilization bar; last Statement card (balance, minimum, due date countdown); current period spend; APR and Projected interest; Payment rule select; **Statement periods** list with `◀ Dec 12 – Jan 11 · due Feb 5 ▶` navigator, period total, date-grouped charges. Card terms edit inline in the drawer form; Plaid-filled fields show a "from bank" hint until overridden. **+ Statement** for manual entry.
  - **Loan:** Loan terms form; base payment, payoff date, total interest; **View payoff** opens the loan payoff drawer (S10 Debt).
  - **Savings / investment:** APY field. Fund hosts list Funds + Unassigned (warning style if negative).
  - **All cash:** "In cash plan" toggle. **All liabilities:** "In debt plan" toggle.
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

- Presets: This Month (default), Last 3 Months, YTD, Last Year, Custom (From / To date inputs). In the URL: `?range=this_month|last_3_months|ytd|last_year|custom&from=YYYY-MM-DD&to=YYYY-MM-DD`. Presets are calendar ranges from the User's local date; a custom range with bad dates falls back to This Month.
- Cards: **Spending by category** (donut + legend with % and amount), **Income vs expenses** (grouped bars per month), **Top categories** (top 5 ranked, icon + bar), **Net cash flow** (line per month), **Account balances over time** (one line per visible BankAccount, full width).
- Charts first. Ranked lists with category icons — no monthly comparison spreadsheet.
- Click a category (slice, legend row, or Top categories row) → right drawer titled with the Category, feed filtered to it and the range. Click a month (bar, line point, or month label) → drawer titled with the month, feed for that month's days in range. The balance chart is not clickable. A feed row opens the Transaction drawer; closing it returns to the report drawer.
- Each card: "Loading…", its own empty line ("No spending in this range.", "No transactions in this range.", "No balance history in this range."), or "Could not load this report.". Currencies with no FX rate are listed under the card.
- Recharts; category colors; orange accent; `--chart-1…6` series inks. Stack to one column below `lg`.

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

- Default view: Month. Year/Decade are rolled-up read-only summaries in V1; Today highlights current-day spend. **Shipped so far: Month only** (`?month=YYYY-MM` in the URL); Today / Year / Decade are a follow-up.
- Groups: Income; Expenses → Fixed, Flexible, Non-Monthly. Expand/collapse.
- Rows: icon + name, thin progress bar (green under / red over), Planned, Actual, Remaining. Remaining red when negative.
- Group headers roll up totals.
- Click category → drawer to set planned amount.
- Settings gear: copy from previous month, copy-forward preference. No rollover.
- Groups list planned Categories. **Show unbudgeted** (`?unbudgeted=show`) reveals every Category with no plan this month, ones with spend first, so any can be opened to set a first plan. Group header Actual counts unplanned spend too.
- Saving or removing a plan, copying, and the copy-forward toggle each show a toast.
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
- Goal drawer has a **Funding** choice for save-up: Accounts (default) or Fund (pick a host BankAccount). Fund cards show a small "in {host}" label.
- Fund card click → Fund drawer: balance, target, date-grouped Fund entries (deposit / withdrawal / interest) with balance after each date, **+ Entry**.
- Right panel: associated BankAccount balances; for each Fund host, its Funds and **Unassigned** (warning if negative). **Edit accounts** primary CTA. No Allocate funds.
- Pay down tab: each card shows the payoff month from the Debt plan and a link **See debt plan** → `/forecast?tab=debt`.

**Shipped in 7a:**
- The tab lives in the URL (`?tab=pay_down`); **Edit accounts** opens with `?edit=accounts` from the header or the right panel.
- Cards show a Category-style icon and color instead of a thumbnail. Status shows only when a target date is set.
- **Edit accounts** drawer: pick a Goal of the current tab, then tick its BankAccounts (pay-down keeps one). Hidden accounts and Fund hosts are not offered. Moving an account shows "Moved {account} off {goal}".
- Fund drawer: balance, progress, **Add entry** (Deposit / Withdrawal / Interest, amount, date, note), date-grouped entries with the balance after each date, delete per entry, **Edit goal**.
- **Manage** (reorder) is not built yet; the Debt plan payoff month shows a placeholder until Phase 10.
- Toasts: Goal created / saved / deleted, Accounts saved, Entry added / deleted, Assigned to {Fund}.

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

- Read-only. No trade ticket. Visible BankAccounts in the Investments display group only.
- Timeframe toggle 1 month (default) / 3 months / 1 year in `?range=1m|3m|1y`.
- **Portfolio total** card: total in Base currency, change over the timeframe with % (green up, red down).
- **Allocation** card: donut by account with legend (name, % of total, value).
- Account list: name, institution (or Manual) and mask, sparkline over the timeframe, % of total, value (native), change (native, signed). Rows are not clickable; edit accounts on Accounts.
- Account-level value only; Plaid holdings/positions are not stored in V1.
- Empty state if no investment accounts: "No investment accounts yet." with **Go to Accounts**.

---

## S10 — Forecasting

**Route:** `/forecast` — sub-tabs in the URL: `?tab=year` (default) | `month` | `debt`.

### Year — Layout

```
┌──────────────────────────────────────────────────────────────┐
│  Forecasting   Year | Month | Debt            ◀ 2026 ▶       │
│  [Cash flow] [Cash] [Cards] [Savings] [Fixed] [Variable]     │
│  [Debt payments] [Total debt]                                │
│  [projected balance area chart — 12 months, buffer line]     │
│  ⚠ 2 shortfalls: Mar 6 (−$42), Apr 6 (−$18)                  │
│                                                              │
│  Revenue                                                     │
│  Salary     $3,400/mo typical    [12-month sparkline]     >  │
│  Reimbursement  Mar 14  $250  Expected                    >  │
│  Savings / Fixed expenses / Variable expenses  (same)        │
│  Debt (computed)                                             │
│  Amex payment  $2,097 Jan … [sparkline]   Payback $1,453  >  │
└──────────────────────────────────────────────────────────────┘
```

### Year — Behavior

- Year navigator. Summary **cards** (not a summary spreadsheet row).
- Projected balance chart (Operating cash, month-end). Current month highlighted; past actuals solid, projections dashed. Safety buffer as a thin horizontal line. Shortfall callout lists days below the buffer; clicking one opens that Month.
- Collapsible card groups. Each item: name, typical monthly amount, sparkline or month chips — **not** an editable 12-column matrix. Items paid from a card show the card's logo; savings items pointing at a Fund show the Fund name.
- One-offs sit under their section with date, amount, and an Expected / Done / Cancelled badge.
- Click item → drawer: per-month Plan amounts + "copy to all months", day of month, pay-from account, Fund (savings). Add/delete item from section header / row action; **+ One-off** in each section header. **Add from categories** and **Add from recurring** are one-shot seeds.
- Debt section is read-only: card payments, loan payments, Payback per month. Row click → Debt tab focused on that liability.
- Past months: chart draws Plan (dashed) and Actual (solid) when Actuals exist.
- Confirm dialog for delete.

### Month — Layout

```
┌──────────────────────────────────────────────────────────────┐
│  Forecasting   Year | Month | Debt          ◀ January 2027 ▶ │
│  Opening $4,524   Low point $150 on Jan 6   Closing $9,115   │
│  [daily area chart · buffer line $150 · today marker]        │
│                                                              │
│  Jan 1 · −$1,500 · balance $3,024                            │
│    Rent                                   −$1,500            │
│  Jan 3 · −$2,835 · balance $189                              │
│    Amex payment (statement)               −$2,097            │
│    Car loan payment                         −$538            │
│    Electricity                              −$200            │
│  Jan 30 · +$3,211 · balance $9,115                           │
│    SEO Gets                               +$3,633            │
│    Payback  −$1,453  (Delta $1,200 · Blue $253)              │
└──────────────────────────────────────────────────────────────┘
```

### Month — Behavior

- Daily chart: past days from snapshots (solid), future projected (dashed), Safety buffer line, low point dot, red fill on shortfall days.
- Date-grouped list of plan items; header shows day net and balance after. Not a table with a running-balance column.
- Payback rows expand to show the spillover split. Clicking an item opens its source drawer (forecast item, One-off, account).

### Debt — Layout

```
┌──────────────────────────────────────────────────────────────┐
│  Forecasting   Year | Month | Debt                           │
│  Total debt $8,564   Debt-free Jun 2027   Interest 12m $312  │
│  Strategy [Avalanche ▾]  Buffer [$150]  Payback day [Last ▾] │
│  [stacked bars: balance per liability by month · payback ▲]  │
│                                                              │
│  ≡ Amex Delta   $6,046 · 71%   ████████░░ 40% of $15,000     │
│    Statement $6,200 · min $600 · due Feb 5 (in 12 days)      │
│    APR 29% · Pay: statement · this month $2,568 + $1,200     │
│    Interest next period $0 · paid off Apr 2027            >  │
│  ≡ Truck loan   $31,980 · 7% APR · $538/mo · Mar 2033     >  │
│  ≡ André (BRL)  R$51,680 ≈ $9,381 · balance only · May 2027  │
└──────────────────────────────────────────────────────────────┘
```

### Debt — Behavior

- Strategy, Safety buffer, payback day edit inline and recompute (same values as Settings → Plan).
- Liability cards in Debt plan order; drag handle (≡) reorders and switches to Custom. Out-of-plan liabilities sit in a collapsed "Not in plan" group.
- Card click → account drawer (credit section). Loan click → **Loan payoff drawer**: summary (payment, total interest, payoff date), extra-payment compare cards (+$0 … +$300, custom), balance chart, year-grouped amortization list. **Use this** on a scenario saves `extra_payment`.
- Text summary under the chart for screen readers (debt-free month, total interest).

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
- **Plan** — Safety buffer, payback day, debt strategy
- **Currency** — Base currency
- **Data** — export transactions CSV

### Behavior

- Disconnect uses a **confirm dialog**, then sets the Plaid item `disconnected` and **keeps** BankAccounts and Transactions.
- Change password is a small form on the page or a confirm-style dialog.

---

## Drawer Catalog

| Drawer | Trigger | Contents |
|--------|---------|----------|
| Transaction | Row click / + Add | Merchant, date, native amount, category, account, notes, similar, transfer toggle, **Assign to Fund** (any Transaction on a Fund host; shows "In {Fund}" once assigned); or add form |
| Account | Account row / + Add (manual) | History sparkline, recent tx, in cash plan / in debt plan toggles; credit: Card terms, Statement, Statement periods; loan: Loan terms; savings: APY, Funds + Unassigned; or manual account fields including currency |
| Loan payoff | Debt tab loan / account drawer **View payoff** | Payment, total interest, payoff date, extra-payment scenarios, balance chart, amortization by year |
| Budget category | Budget row | Planned amount for category+month |
| Recurring | Row / + Add | Amount, cadence, next date, mark paid, skip |
| Goal | Card / + Add / Edit accounts | Name, thumbnail, target, date, type, funding (Accounts / Fund + host); or associated BankAccounts |
| Fund | Fund card | Balance, target, date-grouped entries, + Entry |
| Forecast item | Row / + Add | Name, day of month, 12 Plan amounts, copy-to-all, pay-from account, Fund (savings) |
| One-off | One-off row / + One-off | Name, date, amount, account, Category, Fund, status, matched Transaction |
| Category manager | Filters gear / Settings | List with color/icon; create/edit; delete confirm |
| Report transactions | Report category or month click | Filtered `transaction-feed`; a row opens the Transaction drawer, closing it returns here |

## Dialog Catalog (small, confirm only)

| Dialog | Trigger |
|--------|---------|
| Confirm delete | Delete category, forecast row, One-off, goal, Fund entry, manual Statement, manual account |
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
