# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Confirmed in `docs/02_ARCHITECTURE.md` (binding):

- Frontend: React 19, TypeScript, Vite, TailwindCSS 4, shadcn/ui + Radix, TanStack Query v5, React Router 7, TanStack Virtual, Recharts, BiomeJS
- Backend: NestJS, BetterAuth, Drizzle ORM, PostgreSQL 16, Plaid Node SDK, Stripe Node SDK
- Deploy (recommended, not yet live): frontend on Vercel or Cloudflare Pages; backend on Railway, Render, or Fly.io; database on Neon or Supabase Postgres

No application code exists yet. The repo is product and architecture docs only. Domain language is in `CONTEXT.md`.

## Users

Primary user is the founder, using Money Airport as a daily driver. One authenticated person. Several BankAccounts at once: checking, savings, credit cards, investments, loans, vehicles, cash, property. The job is to see where money went and whether the month is on track, in a glance, not by hunting a grid.

V1 is single-login. Household editing is later. No Shared tags.

## Product Purpose

Money Airport connects bank accounts through Plaid and shows monthly cash flow, transactions, budgets, accounts, goals, recurring bills, reports, and a forward plan — in the User’s Base currency, with FX for other ISO currencies. Success is: open the dashboard and know, in seconds, whether this month is fine.

## Positioning

This is a widget SaaS dashboard, not a spreadsheet and not a budget religion. Neighboring products can copy Plaid and a transaction list. They cannot truthfully claim this shell: cards, grouped lists, and charts; primary create/edit/detail in a right drawer; a persistent left sidebar; no cell grid, no click-to-edit cells, no column-letter headers.

## Operating Context

Used in a desktop browser first (1280px+ two-column widgets and an optional right summary panel). Tablet stacks the right panel. Mobile is an icon rail and a single column.

Daily ritual: connect or refresh banks, scan the dashboard, skim the date-grouped feed, check budget progress, glance at upcoming bills. Charts and progress bars carry status before raw numbers. Search, filters, month/year, and account scope live in the URL.

Bank data arrives via Plaid Link, then webhooks (`/transactions/sync`). Manual BankAccounts exist so net worth can include vehicles, property, and cash. Plaid access tokens are encrypted at rest. Sessions are HTTP-only cookies via BetterAuth (email/password and Google). After signup, BillingModule creates a Stripe Customer and a $0 Subscription without blocking login.

The current repo has no running app, no logo files, and no production data. `docs/` is the spec. The shipping name is Money Airport.

## Capabilities and Constraints

**V1 ships (from `docs/01_PRD.md`, binding):** auth; Stripe Customer + Free Subscription at $0 (no payment method); Plaid connect/sync/disconnect (history kept) plus manual BankAccounts; FX into Base currency; Dashboard widget grid (Budget, Net Worth, Spending, Transactions, Recurring; Credit Score hidden until a bureau is wired); Accounts with net-worth hero and grouped rows; Transactions as a date-grouped infinite feed; Budget with Fixed / Flexible / Non-Monthly and copy-forward; Cash Flow; Reports; Recurring; Goals (save-up / pay-down, progress = associated BankAccount balances); Investments (balances and allocation, no trading); Forecasting as monthly cards and charts with plan vs Actuals.

**Shell (binding):** left sidebar nav in this order: Dashboard, Cash Flow, Accounts, Transactions, Reports, Budget, Recurring, Goals, Investments, Forecasting. Footer is profile with a **Free** chip (not Trial). Settings is a gear in the top chrome, not a nav item. Right summary panel on Accounts, Budget, and Goals only. One drawer at a time; it does not cover the left nav.

**Data (binding):** native Money stored as integer cents plus ISO currency; totals in Base currency; cursor-paginated transaction feeds; dashboard/net-worth/cash-flow/reports consume pre-aggregated series (daily snapshots, category rollups), never a client-side rebuild from the raw ledger. Every query is scoped by `user_id`. Transfers (paired internal legs) are excluded from spend totals. Pending counts. Hidden BankAccounts are omitted from net worth, Budget scope, and Goals.

**V1 does not ship:** native apps; receipt OCR / retail-sync ingestion (tabs may exist empty); credit bureau if unwired; push/SMS/email bill reminders; household multi-user editing or Shared tags; brokerage trading or tax lots; Advice; AI Assistant; Weekly Recap; budget rollover; paid Stripe Prices or Checkout; payment methods; Stripe Connect; auto-pairing Transfers across currencies; crypto / unofficial currency totals.

**Open:** public launch audience beyond the founder; a later paid Product.

## Brand Commitments

- Shipping name: **Money Airport**. Not CashPilot.
- Product model from the PRD is binding: widget dashboard, right drawers, left sidebar, no spreadsheet chrome.
- PRD visual language, recorded as a constraint rather than a design system: light theme; white cards with soft gray borders and rounded corners; orange as the primary accent (CTAs, active tabs, progress); green = on track / income / positive change; red = over budget / overage.
- No logo, wordmark, or other brand assets are in the repo.

## Evidence on Hand

Specs and sample UI copy only (`CONTEXT.md`, `docs/01_PRD.md` through `docs/07_IMPLEMENTATION_GUIDE.md`). Screen specs use placeholder figures (greeting, merchant names, dollar amounts). There are no testimonials, case studies, press, production screenshots, or real balances. Future work must not invent them.

## Product Principles

1. Glance first. Status is a chart, a bar, or a number on a card, not a row you have to read.
2. One person's money, one login. Do not design V1 as if a household is already sharing the books.
3. Banks come in through Plaid. Manual BankAccounts fill net worth; they are not a second product.
4. Never ship a spreadsheet. If a screen wants a grid, the screen is wrong.
5. Do not recompute the month from the whole ledger on the client. Feeds paginate; charts read snapshots and rollups.
6. Totals are Base currency. Native amounts stay native. Goal progress is real balances, not envelopes.

## Accessibility & Inclusion

From the PRD: drawers are keyboard-navigable; controls have ARIA labels; charts have text summaries. Desktop-first, with the breakpoints above. No further standard (WCAG level, etc.) was set.
