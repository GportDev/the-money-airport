# Database Schema — Money Airport

All monetary values stored as **integers in cents** in the BankAccount’s ISO currency. Totals convert to the User’s Base currency at read (or via cached base cents). Display conversion happens in the frontend.

The schema supports a widget dashboard (snapshots, rollups, goals, recurring) — not a spreadsheet of cells. Language: `CONTEXT.md`.

---

## Entity Relationship Diagram

```
User (BetterAuth)
 ├── 1:1 → Billing (Stripe Customer + Subscription)
 ├── 1:N → PlaidItem (bank connections)
 │         └── 1:N → BankAccount
 ├── 1:N → BankAccount (Plaid or manual)
 │         ├── 1:N → Transaction
 │         │         └── N:1 → Category
 │         ├── 1:N → AccountBalanceSnapshot
 │         └── 0:1 → GoalAccount (exclusive)
 ├── 1:N → Category (kind + budget_group; includes Uncategorized)
 ├── 1:N → Budget (per category per month)
 ├── 1:N → RecurringItem
 ├── 1:N → Goal
 │         └── 1:N → GoalAccount
 ├── 1:N → ForecastSection
 │         └── 1:N → ForecastRow
 │                    ├── 0:1 → Category
 │                    ├── 0:1 → RecurringItem
 │                    └── 1:N → ForecastCell  (plan amounts only)
 ├── 1:1 → UserSettings (dashboard layout JSON, base currency)
 └── FxRate (shared daily quotes; not per-user)
```

---

## Tables

### `user` / `session` / `account` (BetterAuth)

Managed by BetterAuth. Do not modify directly. BetterAuth creates these tables automatically:

- `user` — id, email, name, emailVerified, image, createdAt, updatedAt
- `session` — id, userId, token, expiresAt, ipAddress, userAgent
- `account` — id, userId, providerId, providerAccountId, ...

> **Note:** BetterAuth's `account` table is for OAuth providers (Google, etc.), NOT bank accounts. Bank accounts use `bank_account` below.

---

### `plaid_item`

Represents a single Plaid connection (one per institution).

| Column | Type | Constraints |
|--------|------|------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `user_id` | `text` | FK → user.id, NOT NULL |
| `plaid_item_id` | `text` | UNIQUE, NOT NULL |
| `access_token` | `text` | NOT NULL, encrypted at app level |
| `institution_id` | `text` | |
| `institution_name` | `text` | |
| `institution_logo` | `text` | URL or base64 from Plaid, nullable |
| `cursor` | `text` | Plaid sync cursor |
| `status` | `text` | `active` \| `error` \| `disconnected` |
| `error_code` | `text` | Plaid error code if status=error |
| `last_synced_at` | `timestamptz` | |
| `created_at` | `timestamptz` | default `now()` |
| `updated_at` | `timestamptz` | default `now()` |

---

### `bank_account`

Individual accounts — Plaid-linked or manual (vehicles, property, cash on hand).

| Column | Type | Constraints |
|--------|------|------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `user_id` | `text` | FK → user.id, NOT NULL |
| `plaid_item_id` | `uuid` | FK → plaid_item.id, nullable (null = manual) |
| `plaid_account_id` | `text` | UNIQUE, nullable |
| `source` | `text` | `plaid` \| `manual`, NOT NULL, default `plaid` |
| `name` | `text` | NOT NULL |
| `official_name` | `text` | |
| `display_group` | `text` | `cash` \| `credit` \| `investment` \| `loan` \| `vehicle` \| `other` |
| `type` | `text` | `checking` \| `savings` \| `credit` \| `investment` \| `loan` \| `vehicle` \| `other` |
| `subtype` | `text` | |
| `mask` | `text` | Last 4 digits |
| `current_balance` | `integer` | In cents. Credit/loan: amount owed (positive liability) |
| `available_balance` | `integer` | In cents |
| `credit_limit` | `integer` | In cents, nullable — used for utilization bars |
| `iso_currency_code` | `text` | default `USD` |
| `is_asset` | `boolean` | default `true` (false for credit cards and loans) |
| `is_hidden` | `boolean` | default `false` — omit from net worth, Budget scope, Goals |
| `last_synced_at` | `timestamptz` | |
| `created_at` | `timestamptz` | default `now()` |
| `updated_at` | `timestamptz` | default `now()` |

**Indexes:** `(user_id)`, `(plaid_item_id)`, `(user_id, display_group)`

**Net worth:** sum of visible asset balances − sum of visible liability balances, each converted to Base at the **latest** Exchange rate. Hidden BankAccounts are omitted. Manual BankAccounts are included. Unofficial/crypto currencies are omitted from the total.

---

### `account_balance_snapshot`

Daily balance per account for net-worth charts and account sparklines.

| Column | Type | Constraints |
|--------|------|------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `user_id` | `text` | FK → user.id, NOT NULL |
| `bank_account_id` | `uuid` | FK → bank_account.id, ON DELETE CASCADE, NOT NULL |
| `date` | `date` | NOT NULL |
| `balance` | `integer` | In cents, NOT NULL |
| `created_at` | `timestamptz` | default `now()` |

**Unique:** `(bank_account_id, date)`

**Indexes:** `(user_id, date)`, `(bank_account_id, date)`

Written on Plaid sync and when a manual account balance is edited. Missing days are treated as carry-forward of the last known snapshot at query time.

---

### `category`

User-defined transaction categories.

| Column | Type | Constraints |
|--------|------|------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `user_id` | `text` | FK → user.id, NOT NULL |
| `name` | `text` | NOT NULL |
| `color` | `text` | Hex color, default `#6B7280` |
| `icon` | `text` | Icon identifier, NOT NULL, default `circle` |
| `kind` | `text` | `income` \| `expense`, NOT NULL, default `expense` |
| `budget_group` | `text` | `fixed` \| `flexible` \| `non_monthly` \| null (income categories are null) |
| `is_default` | `boolean` | default `false` (seeded categories) |
| `is_uncategorized` | `boolean` | default `false` — exactly one per User; cannot be deleted |
| `created_at` | `timestamptz` | default `now()` |

**Unique:** `(user_id, name)`

Partial unique: one `is_uncategorized = true` per `user_id`.

**Seed defaults (expense, with budget_group):**

| Name | budget_group |
|------|----------------|
| Housing, Utilities, Insurance, Debt Payment | `fixed` |
| Groceries, Transport, Dining, Entertainment, Shopping, Healthcare, Subscriptions, Giving | `flexible` |
| Education | `non_monthly` |
| Uncategorized (`is_uncategorized=true`) | `non_monthly` |

**Seed defaults (income):** Salary (`kind=income`). Savings Transfer is `expense` / `non_monthly`.

---

### `transaction`

All transactions from all accounts + manual entries.

| Column | Type | Constraints |
|--------|------|------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `user_id` | `text` | FK → user.id, NOT NULL |
| `bank_account_id` | `uuid` | FK → bank_account.id, nullable (null = manual, unassigned) |
| `category_id` | `uuid` | FK → category.id, NOT NULL |
| `plaid_transaction_id` | `text` | UNIQUE, nullable (null = manual) |
| `name` | `text` | NOT NULL |
| `merchant_name` | `text` | |
| `merchant_logo_url` | `text` | From Plaid when available |
| `amount` | `integer` | In cents, **native** currency. Positive = income, Negative = expense |
| `iso_currency_code` | `text` | NOT NULL, copied from BankAccount at ingest |
| `date` | `date` | NOT NULL |
| `pending` | `boolean` | default `false` |
| `plaid_category` | `text[]` | Plaid legacy category array |
| `plaid_pfc_primary` | `text` | Plaid personal_finance_category.primary |
| `notes` | `text` | |
| `tags` | `text[]` | `transfer` \| `savings_transfer` for internal pairs |
| `is_manual` | `boolean` | default `false` |
| `created_at` | `timestamptz` | default `now()` |
| `updated_at` | `timestamptz` | default `now()` |

**Indexes:**
- `(user_id, date DESC)` — feed and cash-flow queries
- `(user_id, category_id)` — budget/report queries
- `(bank_account_id, date)` — account-specific queries
- `(plaid_transaction_id)` — upsert on sync
- GIN `(user_id)` + `pg_trgm` on `name` / `merchant_name` — search

**Amount convention:** Plaid returns positive = debit (money leaving), negative = credit (money coming in). **Normalize on ingest:** flip the sign so that positive = income, negative = expense.

**Category on ingest:** assign Uncategorized, then if still Uncategorized, best-effort map `plaid_pfc_primary` (or Plaid primary name) onto a seeded Category name. Never overwrite a User-set Category on later syncs.

**Transfer pairing:** after sync, pair two Transactions (same User, different `bank_account_id`, opposite signs, equal `|amount|`, same `iso_currency_code`, dates within 3 days, `plaid_pfc_primary` in `TRANSFER` / `LOAN_PAYMENTS`). Tag both `transfer` (or `savings_transfer` if Category is Savings Transfer). No cross-currency pairs. Totals that exclude Transfers also exclude `savings_transfer`.

**Disconnect:** do not cascade-delete Transactions or BankAccounts. Set `plaid_item.status = disconnected`.

---

### `budget`

Monthly budget per category.

| Column | Type | Constraints |
|--------|------|------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `user_id` | `text` | FK → user.id, NOT NULL |
| `category_id` | `uuid` | FK → category.id, NOT NULL |
| `month` | `date` | First day of month (e.g., 2026-08-01) |
| `amount` | `integer` | Planned amount in **Base** cents |
| `created_at` | `timestamptz` | default `now()` |
| `updated_at` | `timestamptz` | default `now()` |

**Unique:** `(user_id, category_id, month)`

---

### `recurring_item`

Detected or manually added bills and subscriptions.

| Column | Type | Constraints |
|--------|------|------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `user_id` | `text` | FK → user.id, NOT NULL |
| `bank_account_id` | `uuid` | FK → bank_account.id, nullable |
| `category_id` | `uuid` | FK → category.id, nullable |
| `merchant_name` | `text` | NOT NULL |
| `merchant_logo_url` | `text` | |
| `amount` | `integer` | Typical amount in cents (expense stored negative or absolute — **use absolute cents, treat as outflow**) |
| `cadence` | `text` | `weekly` \| `monthly` \| `yearly`, NOT NULL |
| `next_date` | `date` | NOT NULL |
| `is_manual` | `boolean` | default `false` |
| `is_active` | `boolean` | default `true` |
| `last_paid_on` | `date` | nullable |
| `created_at` | `timestamptz` | default `now()` |
| `updated_at` | `timestamptz` | default `now()` |

**Indexes:** `(user_id, next_date)`, `(user_id, is_active)`

V1 detection: group transactions by merchant over ≥2 months with similar amounts; user can confirm, skip, or edit. Mark paid / skip do **not** insert a Transaction.

---

### `goal`

Save-up and pay-down Goals. Progress is **not** stored.

| Column | Type | Constraints |
|--------|------|------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `user_id` | `text` | FK → user.id, NOT NULL |
| `name` | `text` | NOT NULL |
| `type` | `text` | `save_up` \| `pay_down`, NOT NULL |
| `thumbnail_url` | `text` | |
| `target_amount` | `integer` | Base cents, NOT NULL |
| `target_date` | `date` | nullable |
| `sort_order` | `integer` | default `0` |
| `created_at` | `timestamptz` | default `now()` |
| `updated_at` | `timestamptz` | default `now()` |

**Progress** is computed at read time: sum of associated BankAccount `current_balance` converted to Base at the latest Exchange rate. Save-up current = that sum. Pay-down current display = remaining owed (that sum); bar = `(target − remaining) / target`. Zero associations → 0.

**Status** is computed at read time: `at_risk` if projected monthly contribution (remaining / months left) exceeds a simple affordability heuristic; otherwise `on_track`. No stored status column.

---

### `goal_account`

Exclusive association of a BankAccount to a Goal.

| Column | Type | Constraints |
|--------|------|------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `user_id` | `text` | FK → user.id, NOT NULL |
| `goal_id` | `uuid` | FK → goal.id, ON DELETE CASCADE, NOT NULL |
| `bank_account_id` | `uuid` | FK → bank_account.id, ON DELETE CASCADE, NOT NULL |
| `created_at` | `timestamptz` | default `now()` |

**Unique:** `(bank_account_id)` — a BankAccount belongs to at most one Goal. Associating an account already on another Goal **moves** the row.

**App rules:** save-up Goals only accept `is_asset = true`. Pay-down Goals accept at most one `is_asset = false` BankAccount (refuse a second). Hidden BankAccounts cannot be associated.

---

### `forecast_section`

Defines a section in the forecast (Revenue, Savings, Fixed Expenses, Variable Expenses).

| Column | Type | Constraints |
|--------|------|------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `user_id` | `text` | FK → user.id, NOT NULL |
| `name` | `text` | NOT NULL |
| `type` | `text` | `revenue` \| `savings` \| `fixed_expense` \| `variable_expense` |
| `sort_order` | `integer` | Display order |
| `created_at` | `timestamptz` | default `now()` |

**Unique:** `(user_id, name)`

---

### `forecast_row`

A line item within a forecast section (e.g., "Rent", "Salary").

| Column | Type | Constraints |
|--------|------|------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `section_id` | `uuid` | FK → forecast_section.id, NOT NULL, ON DELETE CASCADE |
| `user_id` | `text` | FK → user.id, NOT NULL |
| `name` | `text` | NOT NULL |
| `category_id` | `uuid` | FK → category.id, nullable |
| `recurring_item_id` | `uuid` | FK → recurring_item.id, nullable |
| `day_of_month` | `integer` | Due date / pay day (1-31), nullable |
| `sort_order` | `integer` | Display order within section |
| `created_at` | `timestamptz` | default `now()` |

**Actuals** are not stored. RecurringItem wins if `recurring_item_id` is set (match `merchant_name` + optional `bank_account_id` for the month); else Category. Neither → plan only.

---

### `forecast_cell`

Plan amounts only. One cell per row per month. The UI edits these in a **drawer** (copy-across-months), not a 12-column grid.

| Column | Type | Constraints |
|--------|------|------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `forecast_row_id` | `uuid` | FK → forecast_row.id, NOT NULL, ON DELETE CASCADE |
| `year` | `integer` | NOT NULL |
| `month` | `integer` | 1-12, NOT NULL |
| `amount` | `integer` | Plan in **Base** cents |
| `updated_at` | `timestamptz` | default `now()` |

**Unique:** `(forecast_row_id, year, month)`

**Index:** `(forecast_row_id, year)` — fetch full year in one query

---

### `user_settings`

| Column | Type | Constraints |
|--------|------|------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `user_id` | `text` | FK → user.id, UNIQUE, NOT NULL |
| `currency` | `text` | Base currency, default `USD` |
| `dashboard_widgets` | `jsonb` | Widget id + order + visible. Default: budget, net_worth, spending, transactions, recurring |
| `budget_copy_forward` | `boolean` | default `false` |
| `created_at` | `timestamptz` | default `now()` |
| `updated_at` | `timestamptz` | default `now()` |

`dashboard_widgets` example:

```json
[
  { "id": "budget", "visible": true, "order": 0 },
  { "id": "net_worth", "visible": true, "order": 1 },
  { "id": "spending", "visible": true, "order": 2 },
  { "id": "transactions", "visible": true, "order": 3 },
  { "id": "recurring", "visible": true, "order": 4 }
]
```

Credit Score widget is omitted until a bureau partner exists. Advice and Weekly Recap are not V1 widgets.

---

### `billing`

One Stripe Customer and one Subscription per User.

| Column | Type | Constraints |
|--------|------|------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `user_id` | `text` | FK → user.id, UNIQUE, NOT NULL |
| `stripe_customer_id` | `text` | UNIQUE, nullable until Stripe succeeds |
| `stripe_subscription_id` | `text` | UNIQUE, nullable until Stripe succeeds |
| `stripe_price_id` | `text` | nullable — V1 is the Free $0 Price |
| `status` | `text` | Stripe subscription status, nullable |
| `created_at` | `timestamptz` | default `now()` |
| `updated_at` | `timestamptz` | default `now()` |

Created after signup. Null Stripe IDs are retried on later authenticated requests. Signup/login never wait on Stripe. Webhooks update `status` and IDs.

---

### `fx_rate`

Cached daily quotes into Base (and cross pairs as needed). Shared, not per-User.

| Column | Type | Constraints |
|--------|------|------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `date` | `date` | NOT NULL |
| `from_currency` | `text` | ISO-4217, NOT NULL |
| `to_currency` | `text` | ISO-4217, NOT NULL |
| `rate` | `numeric` | NOT NULL |
| `source` | `text` | default `frankfurter` |
| `created_at` | `timestamptz` | default `now()` |

**Unique:** `(date, from_currency, to_currency)`

P&L converts native Transaction amounts at the rate for `transaction.date` (roll back to last business day if missing). Balances / net worth / Goal progress use the latest row per pair.

---

## Drizzle Schema Example

```typescript
// src/db/schema/transaction.ts
import { pgTable, uuid, text, integer, date, boolean, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { bankAccount } from "./bank-account";
import { category } from "./category";

export const transaction = pgTable("transaction", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => user.id),
  bankAccountId: uuid("bank_account_id").references(() => bankAccount.id),
  categoryId: uuid("category_id").notNull().references(() => category.id),
  plaidTransactionId: text("plaid_transaction_id").unique(),
  name: text("name").notNull(),
  merchantName: text("merchant_name"),
  merchantLogoUrl: text("merchant_logo_url"),
  amount: integer("amount").notNull(), // native cents
  isoCurrencyCode: text("iso_currency_code").notNull(),
  date: date("date").notNull(),
  pending: boolean("pending").default(false),
  notes: text("notes"),
  isManual: boolean("is_manual").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
```

---

## Migrations

Use `drizzle-kit` for schema migrations:

```bash
npx drizzle-kit generate   # Generate SQL migration from schema changes
npx drizzle-kit migrate    # Apply migrations
npx drizzle-kit studio     # Visual DB browser
```
