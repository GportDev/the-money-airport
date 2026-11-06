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

**Operating cash**:
The BankAccounts the plan pays bills from and receives income into. Defaults to visible `checking` BankAccounts; each cash BankAccount has an "in cash plan" toggle. The Forecast's projected balance and the Safety buffer apply to Operating cash only, not to savings that host Funds.
_Avoid_: checking balance as a fixed single account, Cash group (when you mean the plan's cash)

**Card terms**:
The repayment facts of a credit BankAccount: credit limit, APR, statement close day, payment due day, and Payment rule. Plaid Liabilities fills them when the institution supports it; the User can enter or override them. A User override wins over Plaid on later syncs.
_Avoid_: card settings, card config

**Statement**:
One closed billing period of a credit BankAccount: period start/end, statement balance, minimum payment, due date. From Plaid Liabilities or entered by the User. Charges after the last close are the **current period spend** (unbilled).
_Avoid_: invoice, bill (for a card), month (when you mean the statement period)

**Payment rule**:
How the plan pays a card each period: `statement_balance` (pay in full), `new_charges` (pay the current period spend, at least the minimum), `minimum`, or `fixed` (a set amount, at least the minimum). Payback lump sums come on top.
_Avoid_: autopay (the bank feature, which the app does not control)

**Loan terms**:
The repayment facts of a loan BankAccount: principal, APR, term in months, first payment date, payment day, scheduled payment (computed with the standard amortization formula unless entered), and extra monthly payment. All optional except the balance; a loan with no APR or term is a balance-only liability (e.g. a personal loan from a person, in any ISO currency).
_Avoid_: financing, installment plan as a separate entity

**Amortization schedule**:
The month-by-month split of a loan's payments into interest and principal until payoff, computed at read time from Loan terms. Never stored.
_Avoid_: loan table, schedule rows as stored data

**APY**:
The yearly interest rate on a savings or investment BankAccount, entered by the User (Plaid does not provide it). The Forecast compounds it monthly.
_Avoid_: interest (alone), yield as a stored balance

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
A save-up or pay-down target. Funding is either **accounts** (progress is the real balances of associated BankAccounts, converted to Base at the latest rate) or **fund** (see Fund). Pay-down Goals are always accounts-funded.
_Avoid_: allocation, Allocate funds

**Goal association**:
The link from an accounts-funded Goal to BankAccounts. A BankAccount belongs to at most one Goal; associating it moves it off the previous Goal. Save-up: many assets. Pay-down: zero or one liability. A Goal with no BankAccounts has progress of 0. A BankAccount that hosts Funds cannot also be associated.
_Avoid_: linked account (singular), goal account pool, is_goal_account

**Fund**:
A save-up Goal that lives inside one asset BankAccount (its **host**) alongside other Funds, e.g. Emergency, Vacation, and Green Card in one savings account. Its balance is the sum of its Fund entries. **Unassigned** = host balance − sum of its Funds; the app warns when that goes negative. Interest earned on the host is split across its Funds pro rata by month-start balance.
_Avoid_: envelope, virtual account, sub-account

**Fund entry**:
A dated deposit, withdrawal, or interest amount on a Fund, in the host's currency. It may point at the Transaction that moved the Money (usually a `savings_transfer`). Entered by the User, created from a Transaction, or created by the interest split.
_Avoid_: allocation, contribution ledger

**ForecastRow**:
A named line in a year plan (revenue, savings, fixed expense, or variable expense). It may point at a Category, a RecurringItem, both, or neither. It has a **pay-from** BankAccount (default: Operating cash). A row paid from a credit card adds to that card's projected balance instead of Operating cash; the card's payment then leaves Operating cash on its due date. A savings row may point at a Fund, so its deposits grow that Fund.
_Avoid_: spreadsheet row, forecast cell as the plan’s identity

**One-off**:
A single dated plan item (expected reimbursement, planned withdrawal, a one-time bill). Status `expected`, `done`, or `cancelled`. It becomes `done` when a matching Transaction arrives (same sign, amount within 5%, date within 7 days) or when the User marks it.
_Avoid_: receivable, extra (as a section name)

**Safety buffer**:
The lowest Operating cash balance the plan will allow on any day. Base cents, default $150, set by the User. Payback never pushes the projected balance below it.
_Avoid_: minimum balance (the bank's rule), cushion

**Debt plan**:
The ordered list of liabilities (cards and loans) that Payback pays down. Order comes from a strategy: `avalanche` (highest APR first, default), `snowball` (lowest balance first), or `custom` (User drag order). Each liability has an "in debt plan" toggle.
_Avoid_: payoff goal (that is a pay-down Goal), debt bucket

**Payback**:
The extra Money the plan sends to debt each month: the lowest projected Operating cash balance from the payback day until the next income lands, minus the Safety buffer, never below 0. It is paid on top of scheduled card and loan payments, in Debt plan order. What one liability does not need **spills over** to the next, e.g. from the last card to a personal loan. Anything left over stays in Operating cash.
_Avoid_: lump sum (alone), extra payment (that is a Loan terms field), sweep

**Projected interest**:
Interest the plan expects a liability to add next period: for a card, the unpaid statement balance (after scheduled payment and Payback) × APR / 12; for a loan, the Amortization schedule's interest. Shown, never stored.
_Avoid_: finance charge as stored data

**Plan amount**:
The User-entered Money on a ForecastRow for a given month. Stored. Always the plan, even for past months.
_Avoid_: is_actual on the stored amount

**Actual**:
Money summed from matching Transactions at read time. If a RecurringItem is set on the ForecastRow, match that merchant (and BankAccount when set). Otherwise match the Category. A row with neither has no Actuals.
_Avoid_: overwriting the Plan amount with Actuals

### Out of V1

These are not domain objects in V1. Do not put them on screens or in the schema as live features.

**Advice**, **AI Assistant**, **Weekly Recap**, **Shared** (household), **rollover**, **remittance and tax calculators** (Remessa Online / Wise fees, IOF, pro-labore, INSS, IRRF), **spreadsheet or CSV import** of history or opening balances, **payroll audit** (checking paychecks against hours, rate, and withholding).
