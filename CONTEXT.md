# Money Airport

Personal finance for one User: where money went this month, and whether the month is on track. The product is a widget dashboard, not a spreadsheet and not a household ledger.

## Language

### Product

**Money Airport**:
The product. The shipping name everywhere.
_Avoid_: CashPilot, Cash Pilot

**User**:
The authenticated person who owns the books. V1 is one User, one login.
_Avoid_: customer (except Stripe Customer), household, member, account holder

### Money

**Money**:
An integer amount of cents in a single ISO currency. Display conversion happens at the edge.
_Avoid_: dollars, float, decimal money

**Native amount**:
Money in the BankAccount’s own currency. Stored on the Transaction or balance; never overwritten by conversion.
_Avoid_: converted amount as the source of truth

**Base currency**:
The User’s chosen currency for totals, Budget, Reports, Forecast, net worth, and Goal progress. Default USD. Editable in Settings.
_Avoid_: display currency as a separate idea from base

**Exchange rate**:
A daily rate from one ISO currency into the Base currency. Profit-and-loss uses the rate on the Transaction date (last business day if none). Balances, net worth, and Goal progress use the latest rate.
_Avoid_: a single spot rate for history; crypto / unofficial codes in V1 totals

### Institutions

**PlaidItem**:
One connection to one institution for a User. Disconnect sets status to disconnected and keeps history. It is not a BankAccount.
_Avoid_: bank, connection (when you mean the PlaidItem or the BankAccount — pick one)

**BankAccount**:
A Plaid-linked or manual account (cash, credit, investment, loan, vehicle, property). Hidden BankAccounts are omitted from net worth, Budget account-scope, and Goals.
_Avoid_: account (alone), Shared account, goal account as a global flag

**Stripe Customer**:
The Stripe object that represents this User as someone who may be billed. One per User. Not a Connect Account.
_Avoid_: Stripe Account, Connect Account, account (for billing)

**Subscription**:
The Stripe object for this User’s plan. One per User. V1 is a Free Product at Price $0, created after signup, with no payment method.
_Avoid_: trial, plan (the deprecated Stripe object), paid Product in V1

### Activity

**Category**:
A User-defined bucket for Transactions, with kind (income | expense) and an optional budget group (fixed | flexible | non_monthly).
_Avoid_: Plaid category as the User-facing name (that is ingest metadata)

**Uncategorized**:
A real seeded Category per User. It cannot be deleted. Deleting any other Category reassigns its Transactions here. After ingest, every Transaction has a Category.
_Avoid_: null category, empty category

**Transaction**:
A dated movement of Money on a BankAccount (or a manual entry). Pending Transactions count in Budget, Spending, Cash Flow, and Reports. Amount sign: positive = income, negative = expense.
_Avoid_: row, cell, ledger line, transfer (unless it is a Transfer)

**Transfer**:
A pair of Transactions that moved Money between two of the User’s BankAccounts in the same currency (including a card or loan payment when both sides exist). Tagged `transfer` or `savings_transfer`. Excluded from Budget actuals, Spending, Reports income/expense, and Cash Flow totals. Still visible in the feed. Not a Zelle/Venmo to someone else.
_Avoid_: all Plaid TRANSFER_* as Transfers; cross-currency auto-pairs in V1

### Planning

**Budget**:
Planned Money per Category per month, in Base currency. Left to budget = income planned − expense planned. Copy-forward copies planned amounts to the next month. There is no remaining/overage rollover in V1.
_Avoid_: rollover, envelope carry, zero-based as a religion name

**RecurringItem**:
A detected or manual bill/subscription with a merchant, cadence, and next date. Mark paid and skip advance the schedule only; they do not insert a Transaction.
_Avoid_: bill as a separate entity, paid Transaction created by the app

**Goal**:
A save-up or pay-down target. Progress is the real balances of associated BankAccounts (converted to Base at the latest rate), not an in-app envelope.
_Avoid_: allocation, virtual ledger, Allocate funds

**Goal association**:
The link from a Goal to BankAccounts. A BankAccount belongs to at most one Goal; associating it moves it off the previous Goal. Save-up: many assets. Pay-down: zero or one liability. A Goal with no BankAccounts has progress of 0.
_Avoid_: linked account (singular), goal account pool, is_goal_account

**ForecastRow**:
A named line in a year plan (revenue, savings, fixed expense, or variable expense). It may point at a Category, a RecurringItem, both, or neither.
_Avoid_: spreadsheet row, forecast cell as the plan’s identity

**Plan amount**:
The User-entered Money on a ForecastRow for a given month. Stored. Always the plan, even for past months.
_Avoid_: is_actual on the stored amount

**Actual**:
Money summed from matching Transactions at read time. If a RecurringItem is set on the ForecastRow, match that merchant (and BankAccount when set). Otherwise match the Category. A row with neither has no Actuals.
_Avoid_: overwriting the Plan amount with Actuals

### Out of V1

These are not domain objects in V1. Do not put them on screens or in the schema as live features.

**Advice**, **AI Assistant**, **Weekly Recap**, **Shared** (household), **rollover**.
