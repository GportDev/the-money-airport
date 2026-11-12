# AGENTS.md

Codebase standards for Money Airport. pnpm workspace with two packages: `client/` (Vite + React 19 SPA) and `server/` (NestJS 12 API). Postgres 16 through Drizzle. Playwright e2e in `e2e/`. **There is no Next.js.**

Read before working: `CONTEXT.md` (glossary, use its terms), `PRODUCT.md`, `DESIGN.md`, and the numbered specs in `docs/` (`02_ARCHITECTURE`, `03_DATABASE`, `04_API_SPEC`, `06_SCREEN_SPECS`, `07_IMPLEMENTATION_GUIDE`).

## Commands

```bash
pnpm db:up          # Postgres in Docker (port 5433)
pnpm db:push        # push Drizzle schema to the local DB
pnpm db:seed-demo   # seed demo data
pnpm dev:server     # NestJS watch, http://localhost:3000/api
pnpm dev:client     # Vite, http://localhost:5173
pnpm check          # Biome lint + format check
pnpm typecheck      # tsc in both packages
pnpm test           # Playwright e2e (starts server + client, fake Plaid)
```

After every change: `pnpm exec biome check --write <changed files>`. Before handing off: `pnpm check && pnpm typecheck`, plus the Playwright specs that cover the area you touched.

## Agent Behavior

- **Output:** use `/caveman full` for tasks unless told otherwise. Use `/unslop` before answering a question or presenting a plan. Do the task, show the simplest result.
- **Before creating any file:** search for a similar one. Do not duplicate.
- **Before adding any library:** check [Stack](#stack). If it is not listed, stop and ask. Never install speculatively.
- **Follow the nearest similar file.** A new hook in `client/src/hooks/` matches its neighbors; a new server module matches `accounts/`.
- **Surgical changes only.** Never refactor outside the current task's scope. Report anything else you notice instead of fixing it.
- **Never change a type signature without updating all call sites.**
- **Imports:** in `client/`, every internal import uses the `@/` alias (maps to `client/src/`), including siblings and `@/index.css`. No relative paths (`./`, `../`).
- **Performance:** pick the fastest, most reliable solution for the user.
- **UX feedback:** every user interaction shows feedback: a state or color change, or a message for success, error, or progress. Messages are toasts: `toast.success` / `toast.error` / `toast.promise` from `sonner` (see [Client — Feedback](#client--feedback)).
- **After each feature, fix, or refactor:** if you introduced a pattern that deviates from this file, either update this file with the new canonical pattern, or add `// CONVENTION-DEVIATION: <reason>` at the deviation site.

### Security

- Every user-owned row carries `userId`, and every query filters on it. Take it from `@CurrentUser()`, never from client input.
- `AuthGuard` is global (`APP_GUARD`). Only health and webhook routes opt out with `@Public()`.
- Plaid access tokens are encrypted (`server/src/crypto/token-crypto.ts`) before storage. Never log tokens or PII.
- Never read, print, or commit `.env` values. Tests, seeds, and `db:push` run against the local Docker DB only.

## Workflow

Work moves `spec → failing test → code → review → human merge`. Take one step at a time. If a step's input is missing, go back a step; do not fill the gap by guessing.

### Spec (plan mode)

Turn the request into a spec another agent can execute without asking. Ask about any product decision the request does not settle. Template:

```markdown
## Behavior
What the user can do and sees, including empty, loading, and error states.
## Rules
Business rules, validation limits, user scope.
## Feedback
What changes on screen for each action.
## Test cases
One line per case: given, when, then. Include the other-user case for every endpoint.
## Definition of done
Observable, checkable conditions.
## Out of scope
What this task must not touch.
## Areas
Files or modules expected to change. Note schema changes.
```

Specs describe behavior, not implementation. Name files only under Areas. Split work so each task ships one behavior and fits one pull request.

### Tests

- Write tests from the spec's cases first and confirm they fail because the behavior is missing, not because of a typo or broken fixture.
- E2E specs live in `e2e/*.spec.ts`, use the `test` fixture from `e2e/fixtures.ts` (signs up a fresh user), and test through the UI and public API, not internals.
- Tests stay hermetic: Plaid runs through `FakePlaid` (`PLAID_FAKE=1`). Never call real providers.
- Do not edit or delete tests to make them pass. If a test looks wrong, say why.

### Code

Make the tests pass with the smallest clean code, then clean up with tests still green. Do not build beyond the spec. Commits use conventional prefixes: `feat(scope):`, `fix(scope):`, `test(scope):`, `docs(scope):`.

### Review (blocking)

- **Single responsibility:** each function and component has one purpose, statable in one sentence without "and".
- **No god components or functions.** Warning signs: a component that fetches, holds business rules, and renders; nested branches; flag arguments that switch behavior. Look harder at components over ~150 lines and functions over ~40.
- **Composition:** build from small parts with props and `children`, not boolean flags.
- **Open/closed:** new variants extend through `cva`, composition, or a port, not growing conditionals.
- **Large existing files** must not get worse: put new logic in a new focused unit. Do not ask for unrelated refactors.
- Code meets the spec, nothing missing, nothing extra. Queries filter by `userId`. Async errors handled. Every interaction has feedback.

## Stack

Approved libraries only. Adding one requires updating this section and explicit user confirmation.

**Client (`client/`):** React 19, react-router 7 (`createBrowserRouter`), TanStack Query 5, @tanstack/react-virtual, Tailwind v4 (`@tailwindcss/vite`), `radix-ui` (barrel), `@base-ui/react` (Drawer), class-variance-authority, clsx + tailwind-merge, lucide-react, recharts, react-plaid-link, sonner (toasts), better-auth client, Geist fonts via `@fontsource-variable`.

**Server (`server/`):** NestJS 12 (`@nestjs/common`, `core`, `config`, `platform-express`), Express 5, better-auth, drizzle-orm + `postgres`, zod 4, plaid, stripe, cors, rxjs.

**Tooling:** TypeScript 6 (`strict`), Vite 8, Biome 2 (lint + format + import order), Playwright, drizzle-kit, tsx, pnpm workspaces, Docker Compose for Postgres.

**Not used, ask before adding:** a global store (Zustand, Redux), a form library, a second toast or notification library, CSS Modules, an ORM other than Drizzle, `class-validator`.

## Architecture

```
client/src/
  main.tsx, App.tsx     Entry; QueryClientProvider + RouterProvider + <Toaster />
  router.tsx            All routes
  index.css             Tailwind entry + design tokens
  api/                  One file per resource; client.ts `api<T>()` is the ONLY fetch
  auth/                 better-auth client, session hooks, route guards
  hooks/                use-*.ts TanStack Query hooks per resource
  components/ui/        Generic primitives (Radix / Base UI wrappers)
  components/[domain]/  Domain UI (accounts, transactions, dashboard, ...)
  components/drawers/   Create / edit / detail drawers
  lib/                  Pure utils (cn, format, constants, invalidate)
  pages/                One component per route
  types/                Client copies of API types

server/src/
  [domain]/             [domain].module.ts, .controller.ts, .service.ts, .types.ts
  db/schema/            One Drizzle table file per entity, re-exported from index.ts
  auth/                 better-auth instance, global AuthGuard, @CurrentUser, @Public
  plaid/                plaid.port.ts + real-plaid.ts + fake-plaid.ts
server/scripts/         One-off tsx scripts (seed-demo)
e2e/                    Playwright specs, fixtures, helpers
```

- **Data flow:** component → hook (`hooks/use-*.ts`) → `api/*.ts` → `api<T>()` → Nest controller → service → Drizzle.
- **Business logic:** server services. Client hooks hold query keys, caching, and invalidation only.

## Client — Components

- Generic primitives go in `components/ui/`; domain UI in `components/[domain]/`. Files are kebab-case `.tsx`. **Check `components/ui/` before creating a primitive.**
- **One component per file.** Use folders so bigger components compose from smaller ones. A `ui/` primitive may keep its sub-parts in one file, as `sheet.tsx` does.
- **Radix (`radix-ui` barrel) or Base UI is the base for interactive elements.** No new raw `<dialog>`, `<select>`, or `<input type="checkbox">`.
- Create, edit, and detail flows use a right drawer (`ui/sheet.tsx`, in `components/drawers/`). Confirm-only actions use `confirm-dialog.tsx`.
- **Named exports only.** No default exports.
- **Props typing:**
  - Simple props: `type Props = { ... }`
  - HTML extension: `interface FooProps extends React.ButtonHTMLAttributes<HTMLButtonElement>`
  - Primitive wrapper: `React.ComponentProps<typeof Primitive.Part>`, plus `& { extraProp?: Type }` for extras
- **Variants:** `cva`, with `VariantProps<typeof variantFn>` exposed in props.
- **Refs:** React 19 passes `ref` as a prop. No `forwardRef`.
- **Copy:** match the language and tone of the nearest screen and `DESIGN.md`.

## Client — Hooks and State

- Hook files are `use-kebab-case.ts` in `client/src/hooks/` (`.tsx` only if they return JSX). Auth hooks stay in `auth/`.
- Query hooks wrap `useQuery` / `useInfiniteQuery` / `useMutation`, call functions from `api/`, and set `staleTime`: 5 min for transactions, dashboard, cash flow, net worth; 30 min for account lists and categories.
- Query keys start with the resource (`["accounts", "net-worth", range]`). Mutations that change balances or transactions call `invalidateLedger` from `lib/invalidate.ts`.
- Pages compose hooks and components. No raw `fetch`, no business rules in pages.
- **Server state:** TanStack Query. Never copy it into other state.
- **URL state:** `useSearchParams` for filters, ranges, tabs, pagination, anything that should survive reload.
- **Local state:** `useState` / `useReducer` for open/close, hover, form drafts.
- **Context** only for dependency injection. Shared UI state is lifted to the nearest parent.
- Show API errors to the user. Never swallow them.

## Client — Feedback

- Toasts come from `sonner`. `<Toaster />` (`components/ui/toaster.tsx`) is mounted once in `App.tsx`; never mount another.
- Call `toast` from `sonner` directly. No wrapper hooks.
- Mutations: `toast.success` on success, `toast.error` with the API message on failure. Long actions (sync, import) use `toast.promise` for loading, success, and error in one toast.
- Use a toast for results the user would otherwise miss. Inline state (disabled button, spinner, field error) stays the feedback for in-place changes; don't toast what is already visible on screen.
- Toast colors come from tokens in `index.css`. Don't style toasts per call.

## Client — Styling

- Tailwind v4. Tokens live in `client/src/index.css` (`:root` values, mapped by `@theme inline`). Use token classes (`bg-primary`, `text-muted-foreground`, `text-negative`). No hardcoded colors. New tokens go in both blocks.
- Light theme only. Do not add a dark theme (`DESIGN.md`).
- Fonts: Geist (`font-sans`) and Geist Mono (`font-mono`), imported only in `index.css`.
- Class merging: `cn()` from `lib/cn.ts`. No CSS Modules.
- **Keep classes inline on the element.** Never store class strings in consts in TSX files, except `cva` variants. Move a group to `@apply` only when it repeats in 2 or more places that are not one shared component. A component used in many places keeps its classes inline.
- No inline styles unless unavoidable (e.g. dynamic chart colors). Comment why.
- Biome owns formatting: tabs, `lineWidth: 100`, double quotes, sorted imports. Don't format by hand.

## Server — API

- One Nest module per domain: `module`, `controller`, `service`, `types`. No repository layer.
- Controllers stay thin: validate the body with a Zod schema (`safeParse`, then `throw new BadRequestException(...)`), pass `user.id` from `@CurrentUser()` to the service, return `{ data: ... }`.
- Services get `userId` as an argument and never touch the request object.
- Errors: throw Nest exceptions (`BadRequestException`, `NotFoundException`, `ForbiddenException`). Never hand-build error payloads.
- Routes are REST under the `/api` global prefix (see `docs/04_API_SPEC.md`). The transaction feed uses cursor pagination. Aggregates (net worth, cash flow, dashboard) are computed on the server, not in the client.
- External providers go behind a port, as `plaid/plaid.port.ts` does, with a real and a fake implementation. Never fabricate provider responses in real code.
- Webhooks that verify signatures keep the raw body (`main.ts`). Do not add body parsers in front of them.

## Server — Database

- Drizzle with `postgres`. Inject `DATABASE` (`db/db.module.ts`) and write queries inline in the service.
- One schema file per table in `db/schema/`, exported from `db/schema/index.ts`. Schema changes go through `pnpm db:push`.
- **Money is integer cents** in the account's ISO currency. Totals convert to the base currency at read (`FxService`). Dates are ISO 8601 strings.
- Multi-step writes run in a transaction (`db.transaction`).

## Types

- Server types in each domain's `[domain].types.ts`. Client copies in `client/src/types/`; keep them in sync with the server DTO when one changes.
- `type` for object shapes, unions, and most local types. `interface` only for props extending HTML attributes.
- **No `any`.** Use `unknown` and narrow, or a real type. Treat Biome's `noExplicitAny` warning as an error.
- `as Type` only for API responses and narrowed literals; comment if non-obvious.
- Client input is `unknown` until Zod parses it.

## Code Quality

- Single responsibility per function and component. No god components or functions.
- No `console.log` in commits.
- All async code needs explicit error handling. No empty catch blocks. Prefix unused catch vars with `_`.
- No unused variables or imports (Biome warns; fix them).

## Readability Over Comments

Code should explain itself. Reach for a better name or a smaller function before writing a comment.

- **Names carry intent.** Functions after what they do or answer (`invalidateLedger`, `isAssetType`), variables after what they hold. A name that needs a comment is the wrong name.
- **Small functions.** One job each, aim for under ~40 lines. If a block needs a heading comment, extract it into a function with that name.
- **Flat control flow.** Early returns and guard clauses. Name complex conditions: `const isPastDue = ...`.
- **No magic values.** Named constants instead of explaining a literal.
- **Tests describe themselves.** The scenario goes in the test name (`test("hides hidden accounts from net worth")`), not in comments.

**Comments: default to none.** Write one only for what the code cannot say:

- why a non-obvious choice was made (business rule, Plaid/Stripe quirk, workaround)
- invariants, ordering, or concurrency constraints
- required markers: `TODO`, lint directives, `CONVENTION-DEVIATION`, inline-style and `as Type` justifications

**Never write comments that** restate the code, narrate steps (`// Step 1`), label JSX sections (`{/* Header */}`), record history (`// previously ...`), or describe what an assert checks.

## Naming Conventions

| Context                   | Convention                         | Example                                  |
| ------------------------- | ---------------------------------- | ---------------------------------------- |
| Client files              | kebab-case                         | `net-worth-hero.tsx`, `format.ts`        |
| Hook files                | `use-` + kebab-case                | `use-accounts.ts`                        |
| Components                | PascalCase, named export           | `NetWorthHero`, `AccountsPage`           |
| Page components           | PascalCase + `Page`                | `CashFlowPage` in `pages/cash-flow.tsx`  |
| Server files              | `[domain].[role].ts`               | `accounts.service.ts`                    |
| Nest classes              | PascalCase + role                  | `AccountsController`, `FxService`        |
| Drizzle tables            | camelCase export, snake_case table | `bankAccount` / `bank_account`           |
| Variables                 | camelCase                          | `userId`, `isLoading`                    |
| Module-level constants    | UPPER_SNAKE_CASE                   | `DISPLAY_GROUPS`, `PLAID_PORT`           |
| Booleans                  | `is` / `has` / `can` / `should`    | `isHidden`, `hasError`                   |
| Types                     | PascalCase                         | `BankAccountDto`, `NetWorthRange`        |
| CSS custom properties     | `--kebab-case`                     | `--muted-foreground`                     |
| E2E specs                 | `[area].spec.ts`                   | `cash-flow.spec.ts`                      |

## Agent skills

### Issue tracker

GitHub Issues on GportDev/the-money-airport, via `gh`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default roles: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context. Glossary is `CONTEXT.md` at the repo root. ADRs go in `docs/adr/`. See `docs/agents/domain.md`.
