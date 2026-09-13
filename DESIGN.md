---
name: Money Airport
description: Quiet Terminal. A well-lit board you read in seconds.
colors:
  background: "#f7f7f6"
  foreground: "#171717"
  card: "#ffffff"
  primary: "#ea580c"
  primary-foreground: "#ffffff"
  secondary: "#f5f5f4"
  border: "#e5e5e5"
  muted: "#f5f5f4"
  muted-foreground: "#737373"
  ring: "#171717"
  positive: "#16a34a"
  negative: "#dc2626"
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
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "12px"
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
    padding: "24px"
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
    height: "8px"
    width: "100%"
  sheet:
    backgroundColor: "{colors.background}"
    width: "384px"
    height: "100%"
---

# Design System: Money Airport

## Overview

**Creative North Star: "Quiet Terminal"**

A well-lit board you read in seconds. The shell is a pale canvas with white cards, one gray hairline, and a single orange accent used on actions, the Free chip, and progress fill. Status arrives as type, charts, and bar fill, not as chrome.

The type is Geist Variable at 14px for UI and 20px semibold for page titles. Geist Mono Variable is reserved for amounts. Light theme only. White cards. Soft gray borders. Rounded corners. Green means on track or income. Red means over budget or overage.

This is not aviation costume, not a spreadsheet, and not a SaaS gradient kit.

**Key Characteristics:**

- Flat depth: off-white canvas, white cards, 1px gray borders, no drop shadows
- One accent (orange) for CTAs, Free, and progress. Never for borders
- Geist for UI, Geist Mono for numbers only
- Desktop-first rail: 240px sidebar, 56px header, right drawer that leaves the nav visible

## Colors

A light board with one orange accent and two status inks. Neutrals do the rest.

### Primary

- **Signal Orange** (#ea580c): CTAs, the Free chip (text plus a 10% wash), and progress fill. The track behind a bar is the same orange at 20%. Text on orange is white (#ffffff). Selection tint is 16% orange mixed into white. Orange is never a border.

### Neutral

- **Board Canvas** (#f7f7f6): Page background. Slightly off-white so white cards read as surfaces.
- **Surface White** (#ffffff): Cards and the sidebar body.
- **Ink** (#171717): Body text, card text, page titles, and the focus ring. Focus is a 2px Ink outline with a 2px offset, not an orange glow.
- **Hairline Gray** (#e5e5e5): The only border color. 1px on cards, sidebar, header, summary, and drawers.
- **Wash** (#f5f5f4): Muted fills. Active nav, hover nav, secondary surfaces. Secondary and muted share this value.
- **Quiet Gray** (#737373): Labels, descriptions, idle nav, profile caption.

On-track and overage are inks, not a second brand color.

- **On-Track Green** (#16a34a): On track, income, positive change. Use in numbers, chart series, and copy. Not as a card outline.
- **Overage Red** (#dc2626): Over budget, overage, negative change. Same rule.

### Named Rules

**The No-Colored-Border Rule.** Borders are 1px Hairline Gray. Orange, green, and red never become outlines, left rails, or card strokes.

**The Status-From-Fill Rule.** Green and red mark on-track/income and over-budget/overage in type, charts, and progress fill. They are not chrome.

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

Amounts are a component, not a fourth body family. Use `<Amount>` (`data-slot="amount"`) with the `.amount` utility: Geist Mono Variable, `tabular-nums`, letter-spacing -0.02em.

### Named Rules

**The Geist-Only Rule.** Geist Variable is the UI face. system-ui is fallback only, never the design face. No novelty or display fonts.

**The Numbers-Are-Mono Rule.** Geist Mono Variable is for money and numeric amounts via Amount. Never on labels, nav, headings, or body copy.

## Layout

Desktop-first. The workspace is a left rail, a 56px header, a padded main column, and an optional right summary.

The sidebar is a white rail with a 1px gray right edge. Expanded width is 240px at the `xl` breakpoint (1280px). Collapsed and all widths below `xl` are 64px (icon rail). Header is 56px tall with 16px horizontal padding and a 1px gray bottom edge. Main padding is 24px. Page title sits above content with 24px of space below.

The right summary is 320px at `xl`, with a 1px gray left edge. Below `xl` it stacks under main with a top edge. It appears only on Accounts, Budget, and Goals.

Create and edit open in a right Sheet. The drawer uses a 1px gray left edge and does not cover the left nav. One drawer at a time.

Spacing rhythm is 4 / 8 / 12 / 16 / 24px. Cards use 24px gap and 24px inset on header, body, and footer.

### Named Rules

**The Board-First Rule.** Desktop-first. The left nav stays visible. Drawers open from the right and do not cover that rail.

## Elevation & Depth

Flat by default. Depth is Board Canvas against Surface White, plus 1px Hairline Gray. Cards have no box-shadow. There is no zero-offset colored halo. The focus ring is a 2px Ink outline, 2px offset.

### Named Rules

**The Flat-By-Default Rule.** Surfaces are flat at rest. Depth is canvas vs card, plus 1px gray borders. No card drop shadows. No zero-offset colored halos.

## Shapes

Soft rectangles and full pills. Cards use a 12px corner (`rounded-xl`). Controls and nav items use 6px (`rounded-md`, the `--radius` scale step md). The `--radius` token is 8px (lg), then 6px (md) and 4px (sm). Chips and progress bars are fully round (9999px). The right Sheet is square against the viewport edge.

Borders are 1px Hairline Gray, never colored, never thicker as a brand move.

### Named Rules

**The Soft-Corner Rule.** Cards 12px. Controls 6px. Pills and bars full-round. No sharp tickets, no squircles, no colored radii.

## Components

Restrained and precise. Status comes from type, charts, and progress fill, not from chrome.

### Buttons

No button primitive ships yet. Token-derived default:

- **Shape:** 6px corners, 36px tall, 8px 16px padding
- **Primary:** Signal Orange fill, white label, 14px Geist medium
- **Hover / Focus:** Darken the orange fill. Focus is the 2px Ink outline, 2px offset. No orange glow, no lift, no shadow

### Chips

- **Style:** Fully round. Free chip is Signal Orange text on a 10% orange wash, 12px medium, 2px 8px padding. No border
- **State:** The shipped chip is the plan badge (Free), not a filter chip

### Cards / Containers

- **Corner Style:** 12px
- **Background:** Surface White
- **Shadow Strategy:** None. See Elevation
- **Border:** 1px Hairline Gray
- **Internal Padding:** 24px vertical on the card, 24px horizontal on header, content, and footer. 24px gap between slots. Title is 14px semibold. Description is 14px Quiet Gray

### Inputs / Fields

No text-field primitive ships yet. Token-derived default:

- **Style:** Surface White fill, 1px Hairline Gray stroke, 6px corners, 36px tall, 8px 12px padding, 14px Geist
- **Focus:** 2px Ink outline, 2px offset
- **Error / Disabled:** Error copy and values may use Overage Red. Do not switch the border to red or orange as a brand stroke

### Navigation

Left rail on Surface White. 16px icons, 14px Geist labels. Default is Quiet Gray text. Hover is Wash fill and Ink text. Active is Wash fill, Ink text, medium weight. No colored left border. Product name in the rail is 14px semibold Geist, not a wordmark and not a display face.

### Amount

Money and numeric figures. Geist Mono Variable, tabular nums, -0.02em tracking. Inherits size and color from context. Wrap figures in `<Amount>`, not in a mono class on a heading or nav label.

### Progress

8px tall, full-round. Track is 20% Signal Orange. Fill is solid Signal Orange. Over-budget state may use Overage Red on the fill, not a red outline around the track.

### Sheet / drawer

Right-side panel, canvas background, 1px gray left edge, 384px max width at `sm`. Header and footer use 16px padding. Title is semibold Ink. Description is 14px Quiet Gray. Does not cover the left nav.

### Named Rules

**The Quiet-Active Rule.** Active nav is Wash fill and medium weight. Not a colored left border, not orange text, not a pill in Signal Orange.

## Do's and Don'ts

### Do:

- **Do** use 1px Hairline Gray on cards, sidebar, header, summary, and drawers.
- **Do** set amounts in Geist Mono with tabular nums and -0.02em tracking via Amount.
- **Do** mark active nav with Wash fill and medium weight.
- **Do** keep cards at 12px corners with no shadow.
- **Do** use Signal Orange on primary actions, the Free chip, and progress fill.
- **Do** keep focus as a 2px Ink outline with a 2px offset.

### Don't:

- **Don't** put colored borders on cards, nav items, callouts, or alerts. No accent `border-left`, no rainbow outlines.
- **Don't** use Geist Mono on labels, nav, or body copy.
- **Don't** set system-ui as the design face.
- **Don't** add card drop shadows or zero-offset colored halos.
- **Don't** use novelty or display fonts. Geist only.
- **Don't** treat orange as a border color.
- **Don't** ship spreadsheet chrome (cell grids, column letters, click-to-edit cells).
- **Don't** invent a dark theme.
