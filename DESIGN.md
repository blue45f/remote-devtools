---
name: Remote DevTools
description: Operator-grade monochrome control surface for remote CDP debugging
colors:
  bg: 'oklch(1 0 0)'
  bg-subtle: 'oklch(0.98481 0 0)'
  bg-muted: 'oklch(0.96955 0 0)'
  surface: 'oklch(1 0 0)'
  surface-overlay: 'oklch(1 0 0)'
  fg: 'oklch(0.20441 0 0)'
  fg-muted: 'oklch(0.39942 0 0)'
  fg-subtle: 'oklch(0.49225 0 0)'
  fg-faint: 'oklch(0.52814 0 0)'
  border: 'oklch(0.93886 0 0)'
  border-strong: 'oklch(0.88454 0 0)'
  accent: 'oklch(0.62613 0.18593 259.596)'
  accent-fg: 'oklch(1 0 0)'
  accent-soft: 'oklch(0.97015 0.0141 259.945)'
  accent-soft-fg: 'oklch(0.46986 0.19048 260.71)'
  success: 'oklch(0.50988 0.13224 149.972)'
  success-soft: 'oklch(0.97251 0.02427 158.169)'
  warning: 'oklch(0.67644 0.14392 70.995)'
  warning-soft: 'oklch(0.97399 0.02166 81.491)'
  danger: 'oklch(0.50531 0.18844 27.33)'
  danger-soft: 'oklch(0.95906 0.01593 17.435)'
  live: 'oklch(0.68956 0.18398 46.934)'
  live-soft: 'oklch(0.97064 0.01542 56.214)'
  live-soft-fg: 'oklch(0.52169 0.14394 44.457)'
typography:
  display:
    fontFamily: 'Inter Variable, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif'
    fontSize: '1.5rem'
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: '-0.02em'
  title:
    fontFamily: 'Inter Variable, sans-serif'
    fontSize: '0.875rem'
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: '-0.01em'
  body:
    fontFamily: 'Inter Variable, sans-serif'
    fontSize: '0.875rem'
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 'normal'
  label:
    fontFamily: 'Inter Variable, sans-serif'
    fontSize: '0.6875rem'
    fontWeight: 600
    lineHeight: 1
    letterSpacing: '0.05em'
  mono:
    fontFamily: 'JetBrains Mono Variable, ui-monospace, SFMono-Regular, Consolas, monospace'
    fontSize: '0.75rem'
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 'normal'
rounded:
  xs: '0.1875rem'
  sm: '0.3125rem'
  md: '0.4375rem'
  lg: '0.625rem'
  xl: '0.875rem'
  '2xl': '1.125rem'
  '3xl': '1.75rem'
components:
  button-primary:
    backgroundColor: '{colors.fg}'
    textColor: '{colors.bg}'
    rounded: '{rounded.md}'
    height: '2.25rem'
    padding: '0 0.875rem'
  button-accent:
    backgroundColor: '{colors.accent}'
    textColor: '{colors.accent-fg}'
    rounded: '{rounded.md}'
    height: '2.25rem'
  button-outline:
    backgroundColor: '{colors.bg}'
    textColor: '{colors.fg}'
    rounded: '{rounded.md}'
    height: '2.25rem'
  button-ghost:
    backgroundColor: '{colors.bg}'
    textColor: '{colors.fg-muted}'
    rounded: '{rounded.md}'
    height: '2.25rem'
  badge-neutral:
    backgroundColor: '{colors.bg-muted}'
    textColor: '{colors.fg-muted}'
    rounded: '{rounded.md}'
    height: '1.5rem'
  badge-accent:
    backgroundColor: '{colors.accent-soft}'
    textColor: '{colors.accent-soft-fg}'
    rounded: '{rounded.md}'
    height: '1.5rem'
  input:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.fg}'
    rounded: '{rounded.md}'
    height: '2.25rem'
    padding: '0 0.75rem'
  card:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.fg}'
    rounded: '{rounded.xl}'
    padding: '1.25rem'
---

# Design System: Remote DevTools

## 1. Overview

**Creative North Star: "The Operator's Console"**

Remote DevTools is read first, acted on second. An operator scanning recorded and live debugging sessions needs the surface to vanish so the signal (an error spike, a failed request, who is watching right now) reads instantly. The system is a near-monochrome instrument panel: untinted grayscale carries every structural surface, and the single Signal Blue exists only to mark an action, a selection, or focus. Color is information, never decoration. When a number turns red it means something broke; the restraint everywhere else is what gives that red its voice.

Density is welcome. This is an authenticated tool with tables, timelines, network rows, and console streams, so the type scale is tight and fixed (no fluid hero type), the radii are smaller than Tailwind defaults, and spacing varies for rhythm rather than padding everything identically. Depth is conveyed by hairline borders, not shadows: surfaces sit flat at rest and only lift (popover, dialog, hover) when state demands it.

It explicitly rejects the SaaS-marketing reflex. No gradient washes, no neon, no glassmorphism, no big-number hero-metric template, no endless identical icon-and-heading card grids. The lineage is Linear and Vercel: confident neutral surfaces, one disciplined accent, and motion that reports state instead of performing.

**Key Characteristics:**

- Pure-neutral grayscale (OKLCH chroma 0; formerly HSL saturation 0%) for all structural color; one Signal Blue accent used sparingly.
- The default primary action is Ink (near-black), not blue. Blue is a deliberate secondary affordance.
- Flat by default: hairline borders define structure, shadows are reserved for floating layers.
- Inter for interface, JetBrains Mono for machine data (IDs, timestamps, URLs, payload sizes).
- Tight fixed type scale and tight radii for an information-dense, operator-grade feel.
- First-class dark mode; every token has a paired dark value.

## 2. Colors

A pure-neutral spine with a single chromatic accent and a small, sparingly-used status vocabulary. Light values are listed below; every token has a paired dark value (see the sidecar for the dark ramp).

Colors are authored in **OKLCH** (a perceptually-uniform color space): lightness reads as actual visual lightness, so the neutral ramp and the soft-tint steps are evenly spaced to the eye. Each OKLCH value is the exact equivalent of the original HSL recipe and round-trips to the identical sRGB color — the palette is unchanged, only the color space it is expressed in. The legacy HSL recipe is kept inline below for intent, with the authored OKLCH alongside.

### Primary

- **Signal Blue** (`oklch(0.62613 0.18593 259.596)`, was `hsl(217 91% 60%)`): The one accent. Reserved for the `accent` button variant, current selection, links, focus rings, and state indicators. Not a surface color, not decoration.
- **Signal Blue Soft** (`oklch(0.97015 0.0141 259.945)` bg / `oklch(0.46986 0.19048 260.71)` text): Low-emphasis accent fills (soft button, accent badge, selected-row tint).

### Neutral

- **Ink** (`oklch(0.20441 0 0)`, was `hsl(0 0% 9%)`): Primary text, and the fill of the default primary button. Near-black, never pure `#000`.
- **Ash 28 / 38 / 42** (`oklch(0.39942 0 0)` / `0.49225` / `0.52814`, was `hsl(0 0% 28%)` / `38%` / `42%`): Muted, subtle, and faint foreground tiers for secondary text, captions, and placeholders. Each step is tuned to hold WCAG AA on its intended background.
- **Paper** (`oklch(1 0 0)`, was `hsl(0 0% 100%)`): Base background and card surface. Subtle and muted backgrounds step down to `oklch(0.98481 …)` and `oklch(0.96955 …)` (was `98%` / `96%`) for sidebars, toolbars, and inset panels.
- **Hairline** (`oklch(0.93886 0 0)`, strong `oklch(0.88454 0 0)`, was `hsl(0 0% 92%)` / `85%`): Borders and dividers. The primary structural tool of the whole system.

### Status (sparingly)

- **Terminal Green** (`oklch(0.50988 0.13224 149.972)`), **Caution Amber** (`oklch(0.67644 0.14392 70.995)`), **Alarm Red** (`oklch(0.50531 0.18844 27.33)`): success / warning / danger (was `hsl(142 71% 28%)` / `hsl(38 92% 42%)` / `hsl(0 72% 42%)`). Each pairs with a `*-soft` tint for badge and callout fills. Lightness is intentionally darkened from the usual 500-weight so small numerals pass AA on their soft backgrounds.
- **Record Orange** (`oklch(0.68956 0.18398 46.934)`, soft `oklch(0.97064 0.01542 56.214)` bg / `oklch(0.52169 0.14394 44.457)` text, was `hsl(24 90% 52%)` / `hsl(24 90% 96%)` / `hsl(22 85% 36%)`): The live/recording state — the pulse dot and the `live` badge. A warm "REC" hue, deliberately shifted off Alarm Red so a live session never reads as an error. The `live` badge keys to `live-soft`/`live-soft-fg`, not the danger tokens.

### Named Rules

**The One Voice Rule.** Signal Blue appears on a small fraction of any screen. Primary actions use Ink, not blue; blue marks the _one_ thing that is selected, focused, or the explicit accent action. Its rarity is the point.

**The Pure Neutral Rule.** Structural neutrals carry zero chroma (OKLCH chroma 0; formerly HSL saturation 0%). The monochrome is deliberate and is the brand. Do not warm or cool the grays toward a hue.

**The Color-Is-Information Rule.** If a color appears, it must mean something (state, selection, severity). Never introduce a hue for visual interest alone.

## 3. Typography

**Body / UI Font:** Inter Variable (with `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto` fallback)
**Data / Mono Font:** JetBrains Mono Variable (with `ui-monospace, SFMono-Regular, Consolas` fallback)

**Character:** One humanist sans does all interface work (headings, labels, body, controls); a precise monospace is reserved exclusively for machine data. Inter ships with stylistic sets enabled (`cv02 cv03 cv04 cv11 ss01`) for cleaner digits and letterforms at small sizes. The scale is fixed in rem (no clamp): users sit at consistent DPI in a task, so headings hold their size in a sidebar instead of shrinking.

### Hierarchy

- **Display** (600, ~1.5rem / `text-2xl`, line-height 1.1, tracking -0.02em): Page titles only (Dashboard, Sessions).
- **Title** (600, 0.875rem / `text-sm`, tracking -0.01em): Card titles, panel headers, section labels.
- **Body** (400, 0.875rem / `text-sm`, line-height 1.5): Default reading text. Cap prose at 65 to 75ch; dense tables may run wider.
- **Label** (600, ~0.6875rem / `text-[11px]`, letter-spacing 0.05em, often UPPERCASE): Eyebrows, table column headers, metadata tags.
- **Mono** (400, 0.75rem / `text-xs`): Session IDs, device hashes, timestamps, URLs, byte sizes, raw payloads, anything copy-pasteable or machine-generated.

### Named Rules

**The Mono-Means-Machine Rule.** JetBrains Mono is for values a machine produced or a human will copy (IDs, timestamps, URLs, sizes, JSON). Never use mono for prose or UI labels, and never use Inter for a raw payload.

**The Tight-Title Rule.** Titles carry negative tracking (-0.01 to -0.02em) and weight 600, not size inflation. Hierarchy comes from weight and tracking contrast, not giant type.

## 4. Elevation

Flat by default. Structure is drawn with hairline borders and one-step tonal layering (`bg` to `bg-subtle` to `bg-muted`), not shadows. A card at rest has a border and no shadow. Shadows exist only as a response to state or to lift genuinely floating layers (dropdowns, popovers, dialogs, command palette) above the page.

### Shadow Vocabulary

- **shadow-xs** (`0 1px 2px 0 rgb(0 0 0 / 0.04)`): Barely-there lift on accent and danger buttons.
- **shadow-sm** (`0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)`): Resting raised controls.
- **shadow-md** (`0 4px 12px -2px rgb(0 0 0 / 0.06), 0 2px 4px -2px rgb(0 0 0 / 0.04)`): Hover lift, popovers.
- **shadow-lg** (`0 12px 32px -8px rgb(0 0 0 / 0.1), 0 4px 8px -4px rgb(0 0 0 / 0.06)`): Dialogs, command palette, the highest layer. Dark mode deepens every alpha (0.4 to 0.6).

### Named Rules

**The Flat-At-Rest Rule.** Surfaces are flat until state intervenes. If a card has a resting drop shadow, it is wrong: give it a border instead. Shadows answer hover, focus, and float, nothing else.

## 5. Components

Refined and restrained surfaces with one precise tactile cue: interactive controls dip to `scale(0.98)` on press. States are never half-shipped (default, hover, focus-visible, active, disabled all exist), and the focus-visible ring is consistent everywhere.

### Buttons

- **Shape:** Tight rounding (`rounded-md`, 7px). Heights: sm 28px, md 36px (default), lg 44px; plus square `icon` (36px) and `icon-sm` (28px).
- **Primary:** Ink fill, Paper text (`bg-fg text-bg`), hover to 90% opacity. The default high-emphasis action, monochrome by design.
- **Accent:** Signal Blue fill with `shadow-xs`. Used when the action _is_ the blue affordance.
- **Secondary / Outline / Ghost / Soft:** Muted fill with border / transparent with strong border / transparent muted text / soft-blue tint. Descending emphasis.
- **Danger:** Alarm Red fill, for destructive actions only.
- **Link:** Inline blue, underline on hover, no height or padding.
- **Hover / Focus / Press:** 150ms transition on background, color, border, box-shadow, transform; `focus-visible` shows a 2px Signal Blue ring with a 2px offset against the page; `active:scale-[0.98]`; disabled drops to 50% opacity and disables pointer events.

### Badges

- **Style:** `rounded-md`, weight 500, optional 12px leading icon. Variants: neutral (muted fill), outline, accent (soft blue), success / warning / danger (soft tint + matching text), live (Record Orange soft tint + record dot — its own token, never the danger red), solid (Ink fill).
- **Sizes:** sm (20px, 10px text, wide tracking), md (24px), lg (28px).

### Cards / Containers

- **Corner Style:** `rounded-xl` (14px), softer than controls.
- **Background:** Paper (`bg-surface`); inset panels step to `bg-subtle` / `bg-muted`.
- **Shadow Strategy:** None at rest (see Elevation). Border carries the edge.
- **Border:** 1px Hairline, all sides. Never a single colored side-stripe.
- **Internal Padding:** 20px (`p-5`); header and footer split with a 16px gap and a top/bottom Hairline divider.

### Inputs / Fields

- **Style:** 36px tall, `rounded-md`, 1px Hairline border, Paper background, 12px horizontal padding. Optional leading/trailing icon slots in Ash-faint at 16px.
- **Focus:** Border shifts to Signal Blue plus a soft 2px `accent/20` glow ring (`focus-visible:border-accent focus-visible:ring-accent/20`). No heavy outline.
- **Disabled:** 50% opacity, not-allowed cursor.

### Navigation

- **Style:** Sidebar + topbar shell with a Cmd+K command palette. Nav items use Body weight; active is a soft-accent tint with Ink text, hover is a muted background. Mobile collapses the sidebar into a drawer; rails that overflow use `.scroll-rail` with an edge-fade mask.

### Signature: Status & Live indicators

- **Live/Recording:** Record Orange dot with the `pulse-dot` animation (opacity + scale, 1.6s) next to a `live` badge. The only persistently animated element, because "is this live" is the one thing worth a heartbeat.
- **Severity counts:** small mono numerals in Terminal Green / Caution Amber / Alarm Red on their soft tints, used in tab badges and summary bars.

## 6. Do's and Don'ts

### Do:

- **Do** default high-emphasis actions to Ink (`bg-fg`); reserve Signal Blue for the `accent` variant, selection, links, and focus. Keep it under roughly 10% of any screen.
- **Do** convey depth with 1px Hairline borders and one-step tonal layering. Keep surfaces flat at rest; add shadow only on hover or for floating layers.
- **Do** use JetBrains Mono for IDs, timestamps, URLs, byte sizes, and raw payloads; Inter for everything else.
- **Do** keep radii tight: `rounded-md` (7px) for controls, `rounded-xl` (14px) for cards.
- **Do** animate only opacity and transform with `ease-out-expo` / `ease-out-quart` over 150 to 280ms, and honor `prefers-reduced-motion`.
- **Do** ship every interactive state (default, hover, focus-visible, active, disabled) and the consistent 2px Signal Blue focus ring.
- **Do** keep neutrals pure grayscale (OKLCH chroma 0) and let color mean something.

### Don't:

- **Don't** use gradient washes, neon accents, or glassmorphism (blurred glass cards). This system is opaque and flat.
- **Don't** build the hero-metric template (giant number + tiny label + supporting stats + gradient) or endless identical icon-and-heading card grids.
- **Don't** add decorative motion that doesn't report state, reinvent the scrollbar, or reach for loud, full-saturation color (especially on inactive states).
- **Don't** use `background-clip: text` gradient text. Emphasize with weight or size.
- **Don't** put a colored `border-left` / `border-right` stripe on cards, rows, or callouts. Use a full border, a soft tint, or a leading icon.
- **Don't** give a resting card a drop shadow, or warm/cool the grays toward a hue.
- **Don't** set display fonts or mono in standard UI labels, and don't use em dashes in product copy.
