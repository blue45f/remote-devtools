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
- **Empty-state CTAs to Sandbox + Demo mode** — `0ad29a12` —
  Sessions "No sessions yet" empty offers Module / Script SDK sandbox
  buttons; Dashboard ChartEmpty offers "Enable demo mode" inline.
  Removes the dead-end first-run experience.
- **Dashboard freshness badge + manual refresh** — `1527c74d` —
  Header now shows "Updated Xs ago" (relative time, ticks every 5s)
  next to the period tabs; clicking it spins the icon and invalidates
  every dashboard query. Datadog / PostHog / Grafana parity for
  long-lived auto-refresh dashboards.
- **Sessions filter URL serialization** — `b4546b8f` — search,
  regex, sort, duration, age, host (plus existing tab) now round-trip
  through the URL via `q`/`re`/`sort`/`dur`/`age`/`host` params. The
  address bar IS the shareable filter view; defaults are omitted from
  the URL so it stays clean. PostHog / Datadog list-view parity.
- **Pinned sessions (client-only)** — `44947206` — Per-row pin
  toggle on the Recorded tab; pinned sessions float to the top in a
  dedicated "Pinned (N)" section that survives across filters and
  reloads via `localStorage` (`sessions-pins:v1`). No backend change.
  Linear / Notion sidebar-pin parity.
- **Live polling rate toggle** — `43b07d1a` — Live tab gets a
  Refresh selector (5s / 15s / 30s / Paused). Lets users dial down
  the cadence of the polling react-query without code changes.
  Datadog "Refresh interval" parity.
- **Active filters pill summary** — `a51e1cb7` — Above the result
  count, each active filter renders as an accent-soft pill with an X
  that removes only that filter. Hidden when nothing is active.
  Linear / Notion / GitHub PR list parity.
- **Reset Sessions preferences command** — `2439e77a` — A new
  "Reset Sessions preferences" entry in the CommandPalette wipes
  `sessions-prefs:v1` + `sessions-pins:v1` from localStorage. The
  escape hatch for when stored prefs end up in a weird state.
- **ErrorBoundary copy/forward/escape hatch** — `b24e3cd3` —
  Fallback UI adds a collapsible stack-trace, "Copy error details"
  (clipboard with message + URL + UA + stacks + componentStack),
  "Go to dashboard" escape link, and `Sentry.captureException` with
  componentStack context. Linear / Sentry / Vercel error page parity.
- **NotFound: attempted path + did-you-mean + search shortcut** —
  `662c8f78` — 404 page surfaces the attempted pathname in mono
  font, suggests the closest nav route (Levenshtein ≤ 3) as a
  Did-you-mean link, and adds a "Search" button that opens the
  CommandPalette. Vercel / Linear 404 parity.
- **Timeline tab keyboard navigation** — `182379ad` — j/↓ next
  event, k/↑ previous, Enter jumps the replay to that timestamp.
  Cursor row gets bg-accent-soft and the virtualizer scrolls it into
  view via `scrollToIndex`. Matches the Sessions list bindings so
  the keyboard model is consistent across the app.
- **SessionDetail tab number shortcuts** — `959ac62d` — 1/2/3/4
  switch Overview / Replay / Timeline / Raw JSON without leaving the
  keyboard. Shortcuts skip inputs/textarea/contentEditable so they
  don't fight the Timeline search field. Chrome DevTools docking and
  Linear tab-by-number parity.
- **Timeline multi-select type filter** — `2003c6b6` — Timeline
  filter rows/chips toggle on/off instead of single-selecting. Empty
  selection means "show everything" so the default behaviour is
  unchanged. A "Clear" link appears next to the section header when
  any type is active so users can reset without hunting through chips.
  ActivityFeed kind-filter parity — same toggle mental model across
  the app.
- **Recent sessions in CommandPalette** — `0f1051f8` — Visiting
  `/sessions/:id` records the metadata (id + name + url) to
  `recent-sessions:v1` (capped at 5, deduped by id, MRU on top). The
  palette surfaces them as a top-level "Recent sessions" group so a
  re-open is `⌘K → click`. Linear "Recent" / Vercel project switcher
  / GitHub repo-jumper parity.
- **Reset Sessions also clears recent history** — `e940bf0a` —
  The CommandPalette "Reset Sessions preferences" command now also
  wipes `recent-sessions:v1` so the privacy-conscious reset is a
  single click. Toast copy updated to mention the recent history
  alongside view / sort / pins.
- **Replay playback speed picker** — `5e88fc1b` — Above the
  rrweb-player, a four-button group (0.5× / 1× / 2× / 4×) replaces
  the buried speed selector hidden inside the rrweb controller.
  Choice persists via `replay-prefs:v1` so the next session opens at
  the speed you last picked. ReplayPlayer accepts a `speed` prop and
  re-applies via `setSpeed()` on change. PostHog / OpenReplay /
  Sentry replay parity for "I just want this to go faster".
- **Replay "Skip idle" toggle** — `72c9f7d2` — A toggle button
  next to the speed picker turns on rrweb-player's `skipInactive`
  mode, fast-forwarding through idle stretches. Persists alongside
  the speed in `replay-prefs:v1`. ReplayPlayer passes `skipInactive`
  on init and re-applies via `setConfig({skipInactive})` when the
  prop changes. PostHog "Skip inactivity" / OpenReplay "Skip idle"
  parity — long sessions become bearable.
- **Dashboard period preference** — `fb688d20` — The
  daily / weekly / monthly tab choice persists to
  `dashboard-prefs:v1` and hydrates on next visit. Stops the
  back-and-forth tax of users who live on the monthly view.
  Datadog / Grafana / PostHog dashboard parity.
- **Sidebar collapse keyboard shortcut `[`** — `9b1f1ea4` —
  Pressing `[` (no modifiers, outside text inputs) toggles
  `sidebarCollapsed`, giving power users the "more canvas" muscle
  memory from Notion / Linear / Slack without grabbing the mouse.
  Shortcut documented in the General group of the help dialog.
- **CommandPalette toggle skip-idle** — `5daf1ea4` — A new
  Replay group in the palette flips the `replay-prefs:v1`
  skipInactive flag from anywhere in the app — no need to visit
  a session first. Toast confirms the new state.
- **Sessions list density toggle** — `6ab5f36a` — A new
  Comfortable / Compact toggle next to the view-mode buttons.
  Compact halves row padding in the table view, tightens grid
  gutters and card padding, and hides the secondary ID line in
  table cells so the row height drops by ~40%. Persists to
  `sessions-prefs:v1`. Linear / Notion / Datadog density-toggle
  parity.
- **Replay Restart button** — `ccbe969d` — Visible Restart
  button next to the speed picker in the replay toolbar. Calls
  `goto(0)` via a `restartToken` counter prop so the parent never
  reaches into the rrweb-player instance. Pairs the Home keyboard
  shortcut with a click target for mouse users. YouTube / Vimeo
  replay-control parity.
- **ActivityFeed filter persistence** — `bee4865c` — The chip
  filter selection (session / ticket / error / join) now hydrates
  from `activity-prefs:v1` on mount and writes back on every
  change. Users who only care about errors stop having to re-click
  on every visit. Linear / Slack feed-filter parity.
- **Browser/OS badge on Session row + detail** — current commit —
  First backend cycle. New `user_agent text NULL` column on
  RecordEntity captures `commonInfo.userAgent` at `createRoom`
  time; migration `1777700000000-AddUserAgentToRecord` adds it
  idempotently. `/sessions/record` and
  `/api/session-replay/sessions/:id` expose the value. Frontend
  parses with a tiny `lib/user-agent.ts` (no dep) and renders a
  "Chrome · macOS" badge in the SessionDetail header, in the
  table row's device cell (comfortable density only), and in the
  grid card meta row. PostHog / Sentry / Datadog session-row UA
  badge parity.

## Next obvious candidates

Listed in rough order of value × ease:

- ~~**Browser / OS badge on Session row** — done above.~~
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
