---
name: Money Airport
description: Quiet Terminal. A well-lit board you read in seconds.
colors:
  background: "#fafafa"
  foreground: "#171717"
  card: "#ffffff"
  primary: "#ea580c"
  primary-foreground: "#ffffff"
  secondary: "#f5f5f4"
  border: "#ebebeb"
  border-strong: "#d4d4d4"
  muted: "#f5f5f4"
  muted-foreground: "#737373"
  ring: "#171717"
  positive: "#16a34a"
  negative: "#dc2626"
  warning: "#b45309"
typography:
  display:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "normal"
  headline:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "normal"
  title:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "normal"
  body:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.33
    letterSpacing: "normal"
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "16px"
  2xl: "20px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "36px"
  input:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
    height: "36px"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
    padding: "20px"
  amount:
    textColor: "{colors.foreground}"
    typography: "Geist Mono Variable, ui-monospace, SFMono-Regular, monospace"
  nav-item:
    textColor: "{colors.muted-foreground}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  nav-item-active:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  chip-free:
    textColor: "{colors.primary}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  progress:
    backgroundColor: "{colors.primary}"
    rounded: "{rounded.full}"
    height: "6px"
    width: "100%"
  sheet:
    backgroundColor: "{colors.background}"
    width: "460px"
    height: "100%"
---

# Design System: Money Airport

## Overview

**Creative North Star: "Quiet Terminal"**

A well-lit board you read in seconds. The shell is a near-white canvas with soft, rounded white cards, one light hairline, and a single orange accent used on actions, the Free chip, and progress fill. Status arrives as type, charts, and bar fill, not as chrome. Rows inside cards are open, never boxed; values are edited where they are shown.

The type is Geist Variable at 14px for UI and 20px semibold for page titles. Geist Mono Variable is reserved for amounts. Light theme only. White cards. Soft gray borders. Rounded corners. Green means on track or income. Red means over budget or overage.

This is not aviation costume, not a spreadsheet, and not a SaaS gradient kit.

**Key Characteristics:**

- Flat at rest: near-white canvas, white 16px cards, 1px light borders. Only floating things (toolbar, active segment, popovers, modals) get a soft shadow
- One accent (orange) for CTAs, Free, and progress. Never for borders
- Geist for UI, Geist Mono for numbers only
- Desktop-first rail from 1000px: 168px sidebar, 56px header, 460px right drawer that leaves the nav visible
- Display and input are one element: titles, notes, and properties edit in place and save on their own

## Colors

A light board with one orange accent and two status inks. Neutrals do the rest.

### Primary

- **Signal Orange** (#ea580c): CTAs, the Free chip (text plus a 10% wash), and progress fill. The track behind a bar is the same orange at 20%. Text on orange is white (#ffffff). Selection tint is 16% orange mixed into white. Orange is never a border.

### Neutral

- **Board Canvas** (#fafafa): Page background. Near-white so white cards sit on it quietly.
- **Surface White** (#ffffff): Cards and the sidebar body.
- **Ink** (#171717): Body text, card text, page titles, and the focus ring. Focus is a 2px Ink outline with a 2px offset, not an orange glow.
- **Hairline Gray** (#ebebeb): The resting border color. 1px on cards, sidebar, header, summary, and drawers.
- **Strong Hairline** (#d4d4d4): Hover border for inputs and clickable cards only.
- **Wash** (#f5f5f4): Muted fills. Active nav, hover nav, secondary surfaces. Secondary and muted share this value.
- **Quiet Gray** (#737373): Labels, descriptions, idle nav, profile caption.

On-track and overage are inks, not a second brand color.

- **On-Track Green** (#16a34a): On track, income, positive change. Use in numbers, chart series, and copy. Not as a card outline.
- **Overage Red** (#dc2626): Over budget, overage, negative change. Same rule.
- **Caution Amber** (#b45309): Warning badges only (text on a 10% wash).

### Named Rules

**The No-Colored-Border Rule.** Borders are 1px Hairline Gray. Orange, green, and red never become outlines, left rails, or card strokes.

**The Status-From-Fill Rule.** Green and red mark on-track/income and over-budget/overage in type, charts, and progress fill. They are not chrome.

**The Badge Rule.** Status pills (`ui/badge.tsx`) are full-round tinted washes with matching text, 12px medium, never a border. Tones: neutral, positive, negative, warning, accent. A leading dot is a composed `BadgeDot`, not a flag.

## Typography

**Display Font:** Geist Variable (ui-sans-serif, system-ui, sans-serif as fallback)
**Body Font:** Geist Variable (same stack)
**Label/Mono Font:** Geist Mono Variable (ui-monospace, SFMono-Regular, monospace), amounts only

**Character:** One face, tight and even. No display contrast pairing. Figures sit in mono so columns of money hold still.

### Hierarchy

- **Display** (semibold, 20px, 1.4): Same as the page title. No poster scale ships.
- **Headline** (semibold, 20px, 1.4): Page titles in the main column (`text-xl`).
- **Title** (semibold, 14px, line-height 1): Card titles. Inherits body size, medium-heavy.
- **Body** (regular, 14px, 1.5): App chrome, nav labels, descriptions. Nav uses the 14px body size (`text-sm`).
- **Label** (medium, 12px, 1.33): Free chip and compact meta. Not uppercase, no tracked-out captions.

Headline figures (KPI cells, net worth, drawer amounts) are 28–32px, weight 400, -0.03em tracking: light and large, not bold. Card titles are 15px semibold Ink; an inline count after a title is 13px Quiet Gray.

Amounts are a component, not a fourth body family. Use `<Amount>` (`data-slot="amount"`) with the `.amount` utility: Geist Mono Variable, `tabular-nums`, letter-spacing -0.02em.

### Named Rules

**The Geist-Only Rule.** Geist Variable is the UI face. system-ui is fallback only, never the design face. No novelty or display fonts.

**The Numbers-Are-Mono Rule.** Geist Mono Variable is for money and numeric amounts via Amount. Never on labels, nav, headings, or body copy.

## Layout

Desktop-first. The workspace is a left rail, a 56px header, a padded main column, and an optional right summary. The desktop layout starts at the `desk` breakpoint (1000px, `--breakpoint-desk`, mirrored by `DESK_QUERY`).

The sidebar is a white rail with a 1px gray right edge. Expanded width is 168px from `desk` up, sized to fit its widest line. Collapsed and all widths below `desk` are 64px (icon rail). Header is 56px tall with 16px horizontal padding and a 1px gray bottom edge. Main padding is 24px. Page title sits above content with 24px of space below.

The right summary is 320px from `desk` up, with a 1px gray left edge. Below `desk` it stacks under main with a top edge. It appears only on Accounts, Budget, and Goals.

Pages with filters put them in one floating **Toolbar** (`ui/toolbar.tsx`): `rounded-2xl`, white, hairline, sticky at the top of the scroll area, gaining `shadow-float` only once content scrolls under it. Controls inside are ghost buttons, ghost selects, and segmented clusters split by thin vertical dividers.

Create and edit open in a right Sheet. The drawer uses a 1px gray left edge and does not cover the left nav. One drawer at a time.

Spacing rhythm is 4 / 8 / 12 / 16 / 24px. Cards use 24px gap and 24px inset on header, body, and footer.

### Named Rules

**The Board-First Rule.** Desktop-first. The left nav stays visible. Drawers open from the right and do not cover that rail.

## Elevation & Depth

Flat at rest. Depth is Board Canvas against Surface White, plus 1px Hairline Gray. Resting cards have no box-shadow. Two shadow tokens exist for things that float above the board: `shadow-float` (`--elevation-float`, a 1–2px whisper) on the sticky toolbar, the active segment, and lifted clickable cards; `shadow-pop` (`--elevation-pop`, a soft 24px blur) on popovers, menus, selects, tooltips, chart tooltips, modals, and the Sheet. There is no zero-offset colored halo. The focus ring is a 2px Ink outline, 2px offset.

### Named Rules

**The Flat-At-Rest Rule.** Resting surfaces are flat: canvas vs card, plus 1px borders. Only floating surfaces carry `shadow-float` or `shadow-pop`. No card drop shadows at rest. No zero-offset colored halos.

## Shapes

Soft rectangles and full pills. Cards use a 16px corner (`rounded-xl`, `--radius-card`); the toolbar and modals use 20px (`rounded-2xl`, `--radius-float`). Controls use 10px (`rounded-lg`, the `--radius` token) and menu rows and segment thumbs 8px (`rounded-md`); small marks 6px (`rounded-sm`). Badges, progress, and share bars are fully round (9999px). The right Sheet is square against the viewport edge.

Borders are 1px Hairline Gray, never colored, never thicker as a brand move.

### Named Rules

**The Soft-Corner Rule.** Cards 16px. Controls 10px. Pills and bars full-round. No sharp tickets, no squircles, no colored radii.

**The Open-Rows Rule.** Rows inside a card are never boxed. They are separated by hairlines or space, and hover with an inset, rounded wash (`row-hover`: `inset 2px 4px`, 3.5% Ink) that never touches the card edge or its dividers. Whole-card clickables lift instead (`card-hover`: strong hairline plus `shadow-float`). No negative-margin hover areas.

## Components

Restrained and precise. Status comes from type, charts, and progress fill, not from chrome.

### Buttons

`<Button>` (`components/ui/button.tsx`) for every pressable control; `asChild` wraps a `<Link>`. Raw `<button>` only for bespoke rows (list items, chart legends).

- **Shape:** 8px corners, 36px tall (`h-9`), 12px horizontal padding, 14px Geist medium. `sm` is 28px and 12px text; `icon` is 32px square, `icon-sm` 28px
- **Variants:** `primary` (Signal Orange fill, white label), `outline` (white fill, Hairline Gray stroke), `ghost` (no fill until hover), `danger` (Overage Red fill, confirm dialogs only), `danger-outline` (Hairline Gray stroke, red label)
- **Hover / Focus:** Darken the fill or add a 5% Ink wash. Focus is the 2px Ink outline, 2px offset. No orange glow, no lift, no shadow
- **Press:** scales to 97% over 150ms so the board answers the click. Dropped under reduced motion

### Chips

- **Style:** Fully round. Free chip is Signal Orange text on a 10% orange wash, 12px medium, 2px 8px padding. No border
- **State:** The shipped chip is the plan badge (Free), not a filter chip

### Cards / Containers

- **Corner Style:** 12px
- **Background:** Surface White
- **Shadow Strategy:** None. See Elevation
- **Border:** 1px Hairline Gray
- **Internal Padding:** 20px on widget and report cards, 16px between header and body. Title is 15px semibold Ink, optionally followed by a `CardCount` (13px Quiet Gray) and a `CardInfo` icon whose tooltip says what the number means in one sentence. Ghost icon actions sit at the right

### Inputs / Fields

`<Input>` (`components/ui/input.tsx`). Same 36px height as Button so fields and actions line up in a row.

- **Style:** Surface White fill, 1px Hairline Gray stroke, 8px corners, 36px tall, 8px 12px padding, 14px Geist. Hover raises the stroke to Strong Hairline
- **Focus:** 2px Ink outline, 2px offset
- **Error / Disabled:** Error copy and values may use Overage Red. Do not switch the border to red or orange as a brand stroke

### Navigation

Left rail on Surface White. 16px icons, 14px Geist labels. Default is Quiet Gray text. Hover is Wash fill and Ink text. Active is Wash fill, Ink text, medium weight. No colored left border. Product name in the rail is 14px semibold Geist, not a wordmark and not a display face.

### Amount

Money and numeric figures. Geist Mono Variable, tabular nums, -0.02em tracking. Inherits size and color from context. Wrap figures in `<Amount>`, not in a mono class on a heading or nav label.

### Selects

Every dropdown is the Radix Select (`ui/select.tsx`, `SelectField` for plain option lists). Never a native `<select>`. `outline` triggers sit in forms; `ghost` triggers (no border, wash on hover, optional muted lead such as "Timeframe" and a leading icon) sit in toolbars and card headers.

### Segmented and tabs

A 4% Ink track with a 1px inset hairline and 3px padding. The active option is a raised white thumb (`rounded-md`, hairline ring, `shadow-float`) that slides between options in 200ms; Ink text, medium weight. Options may carry a muted tabular count ("Growing 13"). Same Quiet-Active rule as the nav: not orange.

### Inline fields

Display and input are one element (`InlineText`, `InlineNote`, `PropertyList`). At rest the value is plain text; on hover a hairline and faint wash appear (`rounded-lg`); on focus the field turns white with the Ink focus ring. Enter or blur commits, Escape reverts, a cleared required field reverts. Each field saves on its own; a spinner fades in only after 150ms; a failed save reverts and shows an error toast; a successful save shows no toast. Notes are quiet: a Quiet Gray "Add a note…" placeholder and no box until hover. Properties sit in one bordered card of label/value rows (112px label column, hairline dividers); pickers inside are ghost and read as text until hover. Create flows keep one explicit submit.

### KPI strip

Headline numbers sit in one card split into cells by hairlines (`ui/kpi-strip.tsx`), stacking below `md`. Each cell is a region: an 8px rounded-square marker in the series ink, a 13px Quiet Gray label, the 28px light figure, and an optional signed delta in status ink with a Quiet Gray comparison. Secondary facts use a borderless gray `StatTile`.

### Charts

All charts share `lib/chart.ts`: horizontal grid only in `--chart-grid`, no axis or tick lines, 12px Quiet Gray ticks, 4px top bar radius, area fills as a vertical gradient (`ChartGradient`, 24% to 0%). Hover uses `ChartTooltip`: a white `rounded-xl` card with `shadow-pop`, a formatted date header, one swatch row per series (dashed swatch for a previous period), mono amounts, and a Total row on stacked charts. It never leaves the chart. Line and area cursors are a thin dashed guide with a white-ringed 4px dot; bar cursors are a soft rounded column, never a full-bleed gray block. Legends are small swatch rows (`ChartLegend`).

### Share bars

A 4px full-round bar under a row label (`ui/share-bar.tsx`) shows the row's share of the list's largest value on a neutral 6% Ink track. The fill is a chart ink or the Category's own color.

### Modals

Quick, single-purpose actions launched from a list row (splitting a Transaction) open a centered Base UI Dialog (`ui/dialog.tsx`): 480px, `rounded-2xl`, `shadow-pop`, 40% Ink backdrop. Edit and detail flows stay in the right Sheet.

### Motion

Motion is feedback, never decoration. Tokens live in `index.css`.

- **Easing:** `ease-out` is a strong curve (`cubic-bezier(0.23, 1, 0.32, 1)`). The Sheet uses `ease-drawer` (`cubic-bezier(0.32, 0.72, 0, 1)`). Never `ease-in`
- **Popovers and dialogs:** `animate-pop-in` (160ms, from 96% scale and transparent) and `animate-pop-out` (100ms). Popovers grow from their trigger via the Radix transform-origin variable; dialogs stay centered
- **Collapsibles:** `ui/collapsible.tsx` eases height open (220ms) and closed (180ms) with a fade; the chevron rotates in 200ms. Reduced motion keeps only the fade
- **Row actions:** rename and split buttons on a row fade in (120ms) on row hover or keyboard focus, only on precise pointers (`row-action`); touch screens always show them
- **Content settling:** a page's content fades in (160ms) when its skeleton resolves; dashboard widgets stagger in once per load (40ms apart, from 4px below). Refetches never replay it
- **Changed rows:** a feed row changed from elsewhere (drawer, split modal, rule, bulk edit) flashes a soft orange wash once
- **Reorders:** reordered cards, debts, and widgets glide to their new place via View Transitions (200ms); keyboard moves stay instant
- **Delight:** `--ease-spring` is reserved for rare moments (a goal reached, the first bank connected). Never on daily paths
- **Duration:** under 300ms for everything except the Sheet slide
- **Reduced motion:** keep fades, drop scale and slides

### Progress

6px tall, full-round. Track is a neutral 6% Ink. Fill is solid Signal Orange (budget bars: green under plan, red over). Over-budget state uses Overage Red on the fill, not a red outline around the track.

### Sheet / drawer

Right-side panel, canvas background, 1px gray left edge, `shadow-pop`, 460px max width at `sm`. Header and footer use 16px padding. Title is semibold Ink. Description is 14px Quiet Gray. Does not cover the left nav.

### Named Rules

**The Quiet-Active Rule.** Active nav is Wash fill and medium weight. Not a colored left border, not orange text, not a pill in Signal Orange.

## Do's and Don'ts

### Do:

- **Do** use 1px Hairline Gray on cards, sidebar, header, summary, and drawers.
- **Do** set amounts in Geist Mono with tabular nums and -0.02em tracking via Amount.
- **Do** mark active nav with Wash fill and medium weight.
- **Do** keep cards at 16px corners with no shadow at rest.
- **Do** edit values where they are shown; one field, one place.
- **Do** keep rows inside cards open, with inset rounded hovers.
- **Do** use Signal Orange on primary actions, the Free chip, and progress fill.
- **Do** keep focus as a 2px Ink outline with a 2px offset.

### Don't:

- **Don't** put colored borders on cards, nav items, callouts, or alerts. No accent `border-left`, no rainbow outlines.
- **Don't** use Geist Mono on labels, nav, or body copy.
- **Don't** set system-ui as the design face.
- **Don't** add drop shadows to resting cards or zero-offset colored halos.
- **Don't** box rows inside cards, use native `<select>`, or show the same value twice in one drawer.
- **Don't** use novelty or display fonts. Geist only.
- **Don't** treat orange as a border color.
- **Don't** ship spreadsheet chrome (cell grids, column letters, click-to-edit cells).
- **Don't** invent a dark theme.
