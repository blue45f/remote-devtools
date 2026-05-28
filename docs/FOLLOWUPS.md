# Follow-ups

Running log of small features shipped via the hourly benchmark routine, plus
the next obvious candidates. Each entry: what shipped, what's next.

## Shipped

- **Responsive polish across all surfaces** — `a78fe431` — phone/tablet
  layouts, safe-area, touch-targets, scroll rails. Sessions default view
  now picks grid on phones.
- **Keyboard shortcut help dialog** — `48751ba3` — `?` opens a categorized
  reference (Linear/GitHub parity). Command palette gets one "Keyboard
  shortcuts" entry instead of static rows.
- **Replay timestamp deep-link** — `f21ac2ae` — `?t=ms` in `/sessions/:id`
  seeks the player on mount and auto-opens the Replay tab. Share button
  copies a URL with the current playhead. Parity with PostHog / Sentry /
  Highlight.io.
- **Events JSON download + Sessions regex search** — `3daaba93` —
  RawTab gets a Download button next to Copy. Sessions search has a regex
  toggle with inline error UI for invalid patterns. Parity with PostHog /
  Sentry export + Datadog / Clarity regex search.
- **Timeline → Jump to replay** — `216bc9a4` — Clicking any event in
  the Timeline tab flips to the Replay tab with `?t=<offset>` set, and
  the player re-seeks live (not just on mount). The Sentry / OpenReplay
  debugger workflow: errors and incidents become navigable.
- **Sessions hostname quick-filter** — `df20e599` — A chip strip
  above the result list shows the top hosts currently on screen with
  hit counts. Clicking one narrows the result to that origin. Clarity /
  Datadog parity.
- **Replay timeline minimap** — `678fd274` — A 96-bucket density
  bar sits above the rrweb player on the Replay tab. Each column is a
  slice of session time; opacity scales with event count. Click anywhere
  to seek. OpenReplay / FullStory parity for "where's the action in a
  long session?".
- **Rage-click detection** — `281ca413` — Overview tab surfaces a
  yellow card listing detected rage-click moments (≥3 clicks within
  1.5s and 50px). Each gets a Jump button that lands the replay on the
  first click. Demo seed now includes a 5-click burst so it's visible
  out of the box. FullStory / Microsoft Clarity / LogRocket frustration
  signal parity.
- **Replay keyboard controls** — `96efbe0b` — Space/K toggle, J/L
  ±10s, ←/→ ±5s, Home restart. Player wrapper takes focus on click and
  the shortcut help dialog gains a "Replay player" section. YouTube /
  OpenReplay parity.
- **Sessions sticky toolbar + persisted prefs** — `ae47e1ee` —
  Toolbar (tabs + search + sort + filter chips) stays pinned while a
  long list scrolls. View + sort preferences write to `localStorage`
  under `sessions-prefs:v1` so the page reopens with the user's last
  shape. Linear / Notion / Vercel parity for table-shaped views.
- **Replay fullscreen toggle** — `df2418e7` — `F` key or button on
  the Replay tab puts the player + minimap + share row into native
  fullscreen via `requestFullscreen()`. Button auto-hides where the
  Fullscreen API isn't available. OpenReplay / FullStory parity.
- **Sessions keyboard navigation** — `6d22e573` — j/↓ next, k/↑
  prev, Enter opens detail. Active row gets an accent ring (grid) or
  accent-soft bg (table) and `scrollIntoView` keeps it visible. Linear
  / Gmail parity for high-velocity triage.
- **ActivityFeed date grouping** — `bdfe7796` — Feed splits into
  Today / Yesterday / This week / Older buckets with sticky headers
  and per-bucket counts. The spine that connects events is preserved
  across groups so the timeline metaphor still reads. Linear / PostHog
  / Slack parity.
- **Dashboard cards click-through + Sessions tab URL** — `6a7b0b6d`
  — Hero "Live now" jumps to `/sessions?tab=live`; "Sessions today",
  "Total sessions", "Weekly avg sessions" link to `/sessions`. Cards
  use real `<a>` semantics (Cmd+click for new tab works). Sessions
  reads `?tab=live` from the URL and writes it back as tab changes.
  Vercel / Linear dashboard parity.
- **Captured preview click heatmap** — `0cef3e57` — SessionDetail
  overlays click coordinates as accent-colored dots on the captured
  preview thumbnail. Toggle in the overlay shows / hides them with the
  total count. FullStory / Microsoft Clarity heatmap MVP.
- **Pricing FAQ search** — `5145105a` — Live filter input over
  questions + answers, with a helpful "no matches" CTA that links to
  GitHub issues. Stripe / Vercel / Linear pricing parity.
- **Sessions time-range filter** — `3a643931` — Sessions filter
  chips gain a "Time" group (24h / 7d / 30d / all time) ahead of the
  Duration group. Filters by `s.timestamp`. Datadog / PostHog parity
  for "show me what happened recently" triage flows.
- **SessionDetail copy-to-clipboard chips** — `ed3cec93` — Session
  ID eyebrow and Device metric tile become hover-to-copy. Copy icon
  flips to a Check on success and a toast confirms. Linear / Vercel /
  Stripe metadata block parity.
- **Timeline search highlight** — `6812f04c` — Timeline filter
  input matches now render with a `<mark>` highlight on each row's
  event-type label. Special regex characters are escaped before
  compile; query is split via capturing group and re-identified via
  case-insensitive equality. PostHog / Sentry / Algolia parity.
- **Topbar theme quick toggle** — `58d86191` — Sun/Moon/Monitor
  icon button on the topbar cycles light → dark → system → light.
  Desktop-only; mobile keeps the CommandPalette / sidebar theme menu.
  GitHub / Vercel / Linear parity.
- **ActivityFeed kind filter chips** — `fe1672ef` — Multi-select
  Session / Ticket / Error / Join chips with per-kind counts. Zero-count
  chips render disabled-looking so the row width stays stable across
  polls. Linear / Slack feed-filter parity.
- **Sessions page-size selector** — `c6345055` — Recorded tab gets
  a per-page select (50 / 100 / 200) in the result-meta row. Choice
  persists to `localStorage` via the existing `sessions-prefs:v1`
  schema. Datadog / PostHog data-list parity.
- **Empty-state CTAs to Sandbox + Demo mode** — current commit —
  Sessions "No sessions yet" empty offers Module / Script SDK sandbox
  buttons; Dashboard ChartEmpty offers "Enable demo mode" inline.
  Removes the dead-end first-run experience.

## Next obvious candidates

Listed in rough order of value × ease:

- **Browser / OS badge on Session row** — requires capturing `userAgent`
  on the backend (`libs/entity` + `SessionRecord` API). Skip until backend
  is touched.
- **Network HAR / "Copy as cURL"** — depends on shaping network events
  with method/url/headers; check `libs/core` to see if SDK already
  captures these.
- **Session tags** — needs DB column + endpoint; defer until backend cycle.
- **Comments / annotations on a replay** — needs DB + auth; defer.
- **Heatmap overlay on Captured Preview** — aggregate click coordinates
  across the session; needs decent event shape.

## Conventions

- All cycles ship to `main` directly (per user instruction).
- `pnpm typecheck` + `pnpm test` must pass before push.
- No backend / schema changes inside a single hourly cycle unless they're
  tiny and self-contained.
- Reference the peer that inspired the feature in the commit body.
