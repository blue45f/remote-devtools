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
- **Browser/OS badge on Session row + detail** — `aacd39e7` —
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
- **Session tags** — `f4f7cd34` — Second backend cycle. New
  `tags text[]` column on RecordEntity (NOT NULL, default `{}`)
  - migration `1777800000000-AddTagsToRecord`. New
    `RecordService.replaceTags(id, tags)` and
    `PUT /sessions/record/:id/tags` endpoint with server-side
    normalisation (trim, dedupe, cap at 16 × 24 chars). Tags ride
    along on `/sessions/record` list responses + session-replay
    metadata. Frontend: inline `TagsEditor` chip strip on
    SessionDetail header — add via input + Enter, remove via the X
    on each chip, optimistic UI with rollback on failure. The
    `apiFetch` helper now accepts a `RequestInit` and the demo seed
    router echoes the PUT body so offline edits feel live. Linear
    / Notion / GitHub issue-tag parity.
- **Network tab on SessionDetail** — `deaec788` — Third
  backend cycle. SessionReplayService gains `getSessionNetwork`
  which flattens captured CDP-shaped network rows
  (Network.requestWillBeSent / responseReceived) into a flat
  `{ method, url, status, type, mimeType, size, timestamp }`
  table-friendly shape. New
  `GET /api/session-replay/sessions/:id/network` endpoint. S3
  sessions return [] since network capture only runs against DB
  sessions. Frontend: 5th "Network" tab on SessionDetail with
  filter input, status-coloured cells (success / 3xx / 4xx / 5xx),
  byte-sized response sizes, and sticky toolbar. Tab number
  shortcuts shift: 1/2/3/4/5 = Overview / Replay / Timeline /
  Network / Raw. Chrome DevTools / PostHog / Highlight.io
  network-panel parity.
- **Network row Copy as cURL** — `4c03a32a` — Each Network
  row gets a hover-revealed Copy icon that writes
  `curl [-X METHOD] 'URL' [-H 'Accept: …']` to the clipboard.
  Logic lives in a tiny pure `lib/curl.ts` (single-quote-escapes
  embedded apostrophes) so it's unit-testable without the React
  shell. Toast confirms with the method + URL preview. Closes
  the "Copy as cURL" half of FOLLOWUPS #2.
- **Sessions list tag chips + filter** — `90906a3a` —
  Comfortable-density rows render saved tags as small accent
  chips below the session ID. Clicking a chip toggles it as the
  list-wide `tagFilter`, which round-trips through `?tag=…` in
  the URL and surfaces as a `tag: foo` pill in the active-filter
  summary. Card view places the chips between URL and meta row.
  Builds on the `record.tags` data shipped in the second backend
  cycle. Linear / Notion list-tag parity.
- **Network tab HAR export** — `257fc47c` — New "Export HAR"
  button in the Network tab serialises captured rows to HAR v1.2
  (HTTP Archive) JSON and downloads as `<session-name>.har`.
  `buildHar()` lives in a pure `lib/har.ts` (no React) so it's
  unit-testable — splits query strings into HAR entries, carries
  base64-encoded response bodies, falls back to safe defaults
  (`-1` sizes, `0` timings, `x-unknown` mime) for missing fields.
  Chrome DevTools / Charles / Insomnia accept the output. Closes
  the HAR-export half of FOLLOWUPS #2.
- **Network response body viewer** — `4db41ac7` — Clicking
  a Network row opens a modal with the captured response body.
  JSON bodies are detected (via mimeType or first-non-WS char)
  and pretty-printed with 2-space indent; everything else renders
  raw. Base64 payloads are surfaced with a small "base64" badge
  so the user knows what they're looking at. A "Copy body"
  button writes the pretty/raw text to the clipboard. The
  Network row's Copy-cURL button gets a stopPropagation so it
  doesn't fight the row-click. Chrome DevTools / Sentry / PostHog
  response-preview parity.
- **Heatmap overlay on Captured Preview** — `77ba5e5e` —
  Replaces the per-click accent dots with a true canvas-based
  radial-gradient heatmap. Each click paints a warm 40-px blob;
  `globalCompositeOperation = "lighter"` makes overlapping blobs
  brighten so dense areas glow. The canvas keeps native
  (capture-resolution) intrinsic pixels and CSS-scales via the
  same transform as the iframe — pixel-perfect alignment
  regardless of the card's display size. `mix-blend-screen` on
  the canvas keeps the underlying preview readable. Closes
  FOLLOWUPS #5. FullStory / Microsoft Clarity / LogRocket
  heatmap parity.
- **Replay comments / annotations** — `3defa228` — Fourth
  backend cycle and the last open FOLLOWUPS candidate. New
  `replay_comment` table (id PK, record_id FK CASCADE,
  timestamp_ms int, body text, author varchar(80) NULL,
  org_id uuid NULL, created_at timestamp); migration
  `1777900000000-AddReplayComments` creates the table + indexes
  on (record_id, created_at) and (org_id, created_at).
  `ReplayCommentService` (libs/core) handles CRUD;
  WebviewController exposes
  `GET/POST/DELETE /sessions/record/:id/comments[/:commentId]`
  with server-side trim, body length cap (2000), author length
  cap (80), and negative-timestampMs rejection. Frontend:
  `CommentsPanel` on the Replay tab — chronological list
  (sorted by timestampMs), click the m:ss prefix to seek the
  replay, X to delete, inline form to add at the current
  playhead. apiFetch's RequestInit support carries POST/DELETE.
  Demo seed router holds an in-memory store with two starter
  comments per session so the UI demos out of the box. PostHog
  / Sentry / OpenReplay collaborative-review parity.
- **Console tab on SessionDetail** — `9279963f` — Fifth
  backend cycle (no schema change — `RuntimeEntity` was already
  populated by the SDK). New
  `SessionReplayService.getSessionConsole()` flattens captured
  CDP `Runtime.consoleAPICalled` (concatenates args into a
  single text) and `Runtime.exceptionThrown` (text / url /
  lineNumber) rows into a uniform
  `{ id, timestamp, level, text, source, url?, lineNumber? }`
  shape with level normalisation (warning→warn, assert→error).
  New `GET /api/session-replay/sessions/:id/console` endpoint.
  Frontend: 5th-position "Console" tab — message list with
  per-level colour, level-chip multi-select filter (counts +
  disabled-empty styling), free-text filter, url:line suffix
  on exception rows. Tab number shortcuts now run
  1/2/3/4/5/6 = Overview / Replay / Timeline / Network /
  Console / Raw. Chrome DevTools console parity.
- **Tab error count badges** — `947286f9` — Network and
  Console tab triggers grow a small red `Badge` showing the
  number of failed requests (`status >= 400`) or error-level
  console rows. Counts are computed from cached network /
  console queries pre-fetched by the parent page so the badge
  appears before the user clicks into either panel. Reuses the
  TanStack Query cache (same key as the in-tab fetches) so the
  pre-fetch is free for the panels. Chrome DevTools tab-badge
  parity.
- **Top tags quick-filter strip on Sessions** — `fa866061` —
  Mirrors the host-chips pattern: above the Sessions list, a
  strip surfaces the top 8 tags across currently-loaded
  sessions with hit counts. Clicking a chip toggles it as the
  list-wide `tagFilter` (same state as the in-row chips), so
  the `?tag=` URL round-trip and active-filter pill keep
  working. Lets the user pick the dominant tag without
  scanning every row. Linear / Notion / Datadog list-tag
  parity.
- **Comments badge + `C` shortcut on Replay** — `c901d504` —
  Mirrors the Network / Console error-badge pattern: the
  Replay tab trigger shows a neutral badge with the comment
  count, pre-fetched from `/sessions/record/:id/comments` so it
  appears before the user opens the Replay tab. Pressing `C`
  from any tab (outside text inputs) jumps to Replay and
  focuses the comment input via a `commentFocusSignal` counter
  — bypasses the setTimeout/race-condition trap a naïve focus
  attempt would hit during the tab transition. Documented in
  the Session detail shortcuts group.
- **ActivityFeed surfaces recent replay comments** — `d5004bde` — Connects the comments feature to the Dashboard.
  `ActivityService.getFeedPage` now pulls from the
  `replay_comment` table too, merges into the chronological
  feed, and a `comment` kind ships with a 80-char truncated
  body subtitle so reviewers see what was said without
  navigating. Anonymous author + missing session name both
  fall back gracefully. Frontend gains a 5th chip
  ("Comment") with its own MessageSquare icon. The
  `activity-prefs:v1` storage parser accepts the new kind
  without breaking older saved sets. Linear / Slack /
  Discourse activity-stream parity.
- **Network tab resource type filter chips** — `3ca9a8bc` —
  Above the Network row table, a chip strip surfaces the
  resource types (Document, Stylesheet, Fetch, Image, Script,
  …) that appear in the captured rows, sorted by count
  descending so the dominant type floats up. Multi-select
  toggle — empty selection means "show everything" so the
  default flow is unchanged. Free-text + type filters
  compose. Mirrors the Console level-chip pattern. Chrome
  DevTools Network "Fetch/XHR" filter parity.
- **Network row Open URL button** — `232d5db0` — Tiny UX
  polish: each Network row exposes an `ExternalLink` icon
  next to the Copy-cURL button. Hover-revealed (same
  pattern), opens the captured URL in a new tab with
  `rel="noreferrer"`. The row-click → response body modal
  still fires when clicking the row body — the link sits
  in the existing stopPropagation cell.
- **Codebase prettier reformat** — `b7d73670` — Chore. The
  user's tooling rollout (commitlint + husky pre-push +
  eslint-plugin-prettier + `.prettierrc` `singleQuote: true`)
  was blocking every push with 5928 lint violations across
  the existing double-quote codebase. Ran `eslint --fix`
  across apps / libs / client / sdk / debug-recorder-admin
  to normalise quote style + trailing commas + wrap-at-100.
  Also cleaned up: unused `Kbd` import in Sessions.tsx, two
  `== null` → `=== undefined || === null` checks for the
  eqeqeq rule, two stale eslint-disable comments referencing
  the now-unregistered react-hooks/exhaustive-deps rule, and
  added a scripts/\*_/_.mjs block to debug-recorder-admin's
  eslint config so the build-budget script has Node globals.
  CI green again.
- **Overview top-errors card** — `622d19bc` — When a
  session has captured console errors, the Overview tab
  surfaces the most recent 3 as a danger-toned card at the
  top (above the event-type counts). Each entry shows
  timestamp + truncated message. A "See all" button jumps
  to the Console tab. Reuses the pre-fetched consoleRows
  query so no extra network hit. PostHog / Sentry / Datadog
  session-overview "what went wrong" parity.
- **Comments inline edit (PATCH endpoint)** — `a39c8b04` —
  Eighth backend cycle. Completes the CRUD on `replay_comment`.
  New `ReplayCommentService.updateBody(commentId, recordId, body)`
  loads with FK scope, mutates, saves. New
  `PATCH /sessions/record/:id/comments/:commentId` endpoint
  with trim + length cap + non-empty validation. Frontend:
  comment body becomes a click-to-edit affordance — input
  appears in place, Enter commits, Esc cancels, blur commits.
  Optimistic update lands instantly; failure rolls back via
  the same pattern the delete mutation already uses. Demo
  seed router echoes PATCH so the offline demo feels live.
  Backend tests cover trim, blank rejection, non-string
  rejection, 404 when missing. Linear / Notion / Figma
  comment-edit parity.
- **Comment markers on Replay minimap** — `ddb91c6e` —
  Captured comments render as small accent-colored vertical
  pins on the existing ReplayMinimap, positioned by
  `timestampMs / totalSessionMs`. Clicking a pin jumps the
  player to that comment's playhead (stopPropagation so it
  doesn't fire the bar-wide seek-at-click). Hover widens the
  pin slightly for affordance. Connects comments back to the
  timeline view — reviewers can scan the entire session for
  annotated moments at a glance. Figma comments / Loom
  timestamp-pin parity.
- **Network/Console row → seek replay** — `8e253eb4` —
  Each Network row and Console row gains a hover-revealed
  `PlayCircle` icon button that jumps to the Replay tab and
  seeks the player to that event's timestamp. The seek uses
  a `normaliseOffsetMs` helper that auto-detects ms-vs-ns
  units by checking whether `(row.timestamp - sessionStart)`
  exceeds a 24h sanity threshold — handles both rrweb (ms)
  and CDP-stored DB rows (ns) without per-route branches.
  The "what failed and where exactly was the user looking
  at that moment" triage flow now lives end-to-end on
  SessionDetail. Chrome DevTools / OpenReplay / Highlight.io
  network/console-to-replay parity.

- **CommandPalette: Recent comments group** — `61e51be2` —
  ActivityEntry now carries `timestampMs` on `comment` kind
  entries so the palette can deep-link to the exact playhead.
  CommandPalette pulls `/api/activity/feed?limit=20` while
  open (TanStack `enabled: commandOpen`) and surfaces the top
  5 comment entries as a "Recent comments" group. Click
  navigates to `/sessions/:id?t=<offset>` — picks up the
  existing deep-link logic on SessionDetail. Demo-mode test
  enables seed-mode so the offline run reaches the seeded
  activity feed. ninth backend cycle.

- **Session tag autosuggest** — `bf677f8b` — Tenth backend
  cycle. New `RecordService.findAllTags(orgId?)` using a
  Postgres `UNNEST(r.tags)` distinct, surfaced as
  `GET /sessions/record/tags`. The Session detail tag editor
  pulls that list with a 5-minute TanStack query and renders
  matching suggestions as the user types (already-applied
  tags are filtered out, top 6 shown, `mousedown` activates
  before blur kills the dropdown). Free-form input still
  works. Demo seed-router returns the deduped tag set so the
  offline mode keeps parity. Drive-by: `buildSeedSessions()`
  memoizes itself so the rrweb event anchor and the network
  anchors share one base — eliminates a 1ms drift that broke
  the Network-row-to-replay-offset test.

- **Network status-class filter chips** — `0f90aaf0` — Adds
  a 2xx/3xx/4xx/5xx/pending chip strip to the Network panel.
  Toggling a chip filters the table by HTTP status class.
  Mirrors the resource-type chip pattern (counts inline,
  empty classes disabled). 4xx tints warning, 5xx tints
  danger so the failing buckets pop. Collapses the request
  list down to just the broken ones in one click — primary
  triage flow upgrade.

- **Session detail shortcuts cheatsheet** — `1f818095` —
  Global `?` handler on the Session detail page toggles a
  Dialog listing the existing tab (1-6), Comment (C) and
  Timeline navigation (J/K/Enter) bindings. Timeline rows
  conditionally render only when the Timeline tab is active.
  Until now the bindings were only documented in the
  source — discoverability upgrade.

- **Activity feed pause/resume** — `753a9847` — Pill toggle
  next to the LiveDot on the Dashboard activity feed halts
  the refetch interval. LiveDot text flips to "Paused" so
  the indicator stays truthful. Click again to resume. Lets
  a reader inspect a row without it scrolling away. Button
  only renders when polling is enabled (`pollMs > 0`).

- **Download response body** — `6f045dc7` — Adds a Download
  button next to Copy body in the NetworkRowDetail dialog.
  Picks the extension from the row's mimeType (json/html/
  xml/css/js/txt, bin for base64) and a basename from the
  URL pathname's last segment so the saved file is
  recognisable. base64 payloads decode through a typed
  Uint8Array before being wrapped in a Blob so binary
  captures survive the round-trip. JSON downloads use the
  pretty-printed body to stay diffable.

- **Console text export** — `315086e2` — Export button on
  the Console tab downloads the currently filtered rows as a
  plain-text file (`[timestamp] [LEVEL] message`, one per
  line). Respects both the level chip and text filter so the
  saved file matches what's on screen — great for attaching
  the right slice to a support ticket without leaking
  unrelated rows.

- **Sessions CSV export** — `abd6ef78` — Download icon in
  the Sessions page header dumps the currently filtered +
  sorted rows to CSV. Columns: id, name, url, host,
  deviceId, mode, durationMs, timestamp, tags, userAgent.
  Duration converts from nanoseconds; tags join with a
  space so spreadsheets don't split them. Respects every
  active filter (search/age/duration/host/tag, recorded vs
  live tab) so the file matches what's on screen.

- **Top hosts panel on Dashboard** — `99c82876` — Eleventh
  backend cycle. New `DashboardService.getTopHosts(period,
limit)` extracts hostname directly in SQL
  (`regexp_replace + split_part`) and counts records over
  the trend window. `GET /api/dashboard/top-hosts` surfaces
  the data; the Dashboard renders a panel under the trend
  charts with each row linking to `/sessions?host=<host>`
  and a thin accent bar showing the share. Limit clamped
  to [1, 25]. Demo seed-router aggregates hostnames from
  the seed sessions so offline mode keeps parity.

- **Network row Copy URL** — `ded8beae` — Small Copy URL
  action between Open URL and Copy cURL. Faster than the
  cURL flow when all you need is the raw URL — Slack
  posts, Postman, browser address bar. Same toast/Check
  flip pattern as the existing copy actions.

- **Session header Copy URL** — `b600aca4` — Outline
  "Copy URL" button next to Open URL in the SessionHeader
  action cluster. Saves a trip into the Network tab when
  the user just needs the captured page URL (Linear
  tickets, repro recipes). Drive-by: Raw tab's Copy button
  gets a `raw-copy` testid so the tab-switch tests don't
  ambiguously match either Copy button.

- **Sessions JSON export** — `230642f2` — Promotes the
  Sessions export button into a dropdown with Export CSV /
  Export JSON. JSON dumps the same per-row shape as CSV
  but keyed and indented so engineering consumers get a
  structured payload — useful for jq pipelines or pasting
  into a scratch script. Same filter-respecting behaviour.

- **Network panel summary bar** — `2d6954e2` — Transferred-
  bytes and failed-request counters in the Network tab's
  count bar (Chrome DevTools status-bar parity). Both track
  the filtered view, so narrowing by type/status/text
  updates them live. Failed counter renders in danger color
  only when ≥1 4xx/5xx is present.

- **Network detail copy actions** — `ff19a89f` — Copy URL /
  Copy cURL / Open buttons in the NetworkRowDetail header.
  Once a request's detail is open the user can grab its URL
  or a runnable cURL without closing the dialog to hunt for
  the row-hover affordance. Reuses buildCurlCommand.

- **Per-session note** — `a25bd284` (server) + `7d4ed97f`
  (client) — Twelfth backend cycle. Nullable `note text`
  column on RecordEntity (migration 1778000000000), carried
  through SessionMetadata, written via
  `PATCH /sessions/record/:id/note` (trim, cap 4000, empty →
  NULL). SessionDetail renders a NoteEditor textarea under
  the tags row with Save/Cancel that appears only when the
  draft diverges; Save round-trips the server-trimmed value
  into the metadata cache. Demo seed-router handles the
  PATCH and session 1000 ships a sample note. Distinct from
  tags: tags are short labels, note is long-form context
  (repro steps). Sentry/Linear issue-note parity.

- **Sortable network columns** — `9282546a` — Status and
  Size headers are click-to-sort (desc → asc → clear) with
  a direction caret. Sort derives from the filtered rows so
  it composes with type/status/text filters; default stays
  capture order. Surfaces biggest payloads / groups error
  statuses without scrolling. Chrome DevTools column-sort
  parity.

- **Sessions note indicator** — `94e636d3` (server) +
  `f788434e` (client) — Record list mapping adds a lean
  `hasNote` boolean (non-empty note after trim) so the list
  payload stays slim while the Sessions rows can show a note
  icon next to the name. Spot annotated sessions at a glance
  without opening each. Seed session 1000 flags hasNote to
  match its detail-view note.

- **Annotated-only filter** — `f485cf7e` — "Annotated"
  toggle in the Sessions toolbar narrows the list to rows
  with a note (uses hasNote). Round-trips as `note=1` in the
  URL, shows an active-filter pill, and clears with the
  Clear-filters action. Closes the notes loop — find every
  annotated session in one click.

- **Copy session summary (Markdown)** — `e4b6ae0c` — Copy
  summary button on the SessionHeader puts a Markdown digest
  on the clipboard: name, ID, URL, device, duration, browser,
  tags, network/console error counts, comment count, and the
  note as a blockquote. Pure `buildSessionSummary` helper
  composes page data and omits empty rows. Ready-to-paste
  into a Linear/GitHub/Jira ticket. Sentry "copy issue
  details" parity.

- **Console row copy button** — `4745c457` — Hover copy
  affordance on each console row grabs the single message
  text — quick for pasting one error line into a ticket or
  search without exporting the whole console. Matches the
  network-row copy interaction.

- **Recently annotated panel** — `fc8b9fe3` (server) +
  `18267ac4` (client) — Thirteenth backend cycle.
  `DashboardService.getRecentlyAnnotated(limit)` returns the
  newest records with a non-empty note via
  `GET /api/dashboard/recent-notes`; the dashboard renders a
  panel under the charts listing them (link + note preview +
  relative age). Extends the notes feature to the dashboard
  for team triage. Demo seed-router serves annotated seed
  sessions.

- **Error markers on replay minimap** — `7aac1bf5` — The
  replay minimap renders red ticks for console errors and
  4xx/5xx network responses (from rows the page already
  fetches). Click a tick to seek the player to that moment —
  jump straight to where something broke. Sits alongside the
  accent comment markers on the same strip. OpenReplay /
  Sentry error-timeline parity.

- **Next/Prev error navigation** — `b970b30c` — Compact
  error-nav control on the Replay toolbar (shown only when
  the session has errors): a count badge flanked by prev/next
  buttons that seek to the nearest error marker relative to
  the playhead, wrapping at the ends. Step through failures
  hands-free instead of hunting the minimap visually.

- **Failed-requests card on Overview** — `687db0fe` —
  Mirrors the console-errors card: lists the 3 most recent
  4xx/5xx network responses (status, method, URL) with a
  See-all button that jumps to the Network tab. Triage
  starts on the landing tab without clicking around.

- **Keyboard error nav + replay cheatsheet** — `2604a5c2` —
  `e` / `Shift+E` jump to next / previous error on the
  Replay tab (shared `pickErrorOffset` helper keeps it in
  sync with the ErrorNavButton). The shortcuts dialog now
  lists Replay-tab bindings (F, E, Shift+E) when active, so
  they're discoverable.

- **Jump-to-replay from Overview cards** — `eb61a5fc` — The
  console-errors and failed-requests cards on the Overview
  tab now have clickable rows that seek the replay to that
  error's moment (via normaliseOffsetMs), not just the
  See-all tab jump. Click an error on the landing tab, watch
  what the user saw.

- **Slash-to-focus sessions search** — `d860ae65` — Pressing
  `/` anywhere on the Sessions page focuses the search input
  (GitHub / Linear convention), unless already typing in a
  field. Power-user navigation polish.

- **Copy-link on session rows** — `97732ea2` — Hover
  copy-link button on each recorded-session row puts the
  absolute `/sessions/:id` URL on the clipboard for sharing.
  Matches the app-wide copy-affordance pattern. (Also fixed
  `1d9508cc`: dashboard manual refresh now invalidates the
  Top-hosts and Recently-annotated panels too.)

- **Deep-linkable session tabs** — `2380c861` — The active
  Session-detail tab round-trips through `?tab=` so a tab is
  shareable and survives reload (`?tab=network`). Single-
  writer `setTab` updates state + URL in one call (no mirror
  effect) so it never races with the `?t=` playhead write;
  jumpToReplay now writes `t` + `tab=replay` together.
  Overview is the default and omitted. (Earlier mirror-effect
  attempt was reverted for racing `?t=`; this is the correct
  single-writer version.)

- **Resolve/unresolve replay comments** — `042cb4eb`
  (server) + `aecb7ef8` (client) — Fifteenth backend cycle and
  a first slice of the "collaboration" next-level item.
  ReplayCommentEntity gains a `resolved` boolean (migration
  1778100000000); `PATCH …/comments/:id/resolve` toggles it
  and the list/mutations carry it. Each comment row gets a
  resolve toggle (circle → check) and renders muted +
  strikethrough when resolved — a shared-triage workflow on
  the existing async-collaboration comments. Demo seed-router
  handles the PATCH.

- **Hide-resolved + clean minimap** — `1b42bbe7` — Resolved
  comments drop out of the replay minimap markers (timeline
  flags only open annotations) and the Comments panel gains a
  "Hide resolved (N)" toggle with an "All comments resolved"
  empty state. Also adds a test-only `__resetDemoComments()`
  (called in beforeEach) to stop the module-level demo store
  leaking state across tests.

- **Comment author byline** — `a0da7fef` — Comment rows show
  the author beneath the body (field was stored/returned but
  never surfaced). Attribution for shared annotations — see
  who left which note.

- **Near-real-time comment polling** — `1aec92fa` — The
  session comments query refetches every 15s so a teammate's
  new annotations / resolve toggles surface without a reload.
  Low-risk step toward real-time collab using the established
  polling pattern (no gateway changes); shared query key keeps
  the list, minimap markers, and tab badge current. In-flight
  edits are guarded against background refetches.

- **Open-comment tab badge** — `8fc8dade` — The Replay tab
  badge counts unresolved (open) comments — the actionable
  triage number — rather than the total, decrementing live as
  comments are resolved. Copy-summary still reports total.

- **Live viewer presence** — `d0ce20b5` (server) + `8252de83`
  (client) — Sixteenth backend cycle; the real-time-presence
  next-level item as a heartbeat/poll MVP (no WebSocket).
  PresenceModule keeps an in-memory 20s-TTL viewer map;
  `POST /api/presence/:id/heartbeat` + `GET /api/presence/:id`.
  `usePresence` heartbeats every 10s (per-tab sessionStorage
  client id) and the Session header shows a "N viewing" chip.
  Single-process MVP — multi-node would move the map to Redis.
  (Refined `9736dd38`: only show when >1 viewer; hardened
  `0f9fe0bd`: @Interval(60s) pruneAll bounds the map.)

- **WebSocket presence upgrade** — `51df998d` (server) +
  `a74d6f6b` (client) — Seventeenth backend cycle; pushes
  presence live instead of polling. New `PresenceGateway`
  (raw ws) on a distinct path `/ws/presence` so it coexists
  with the DevTools gateway untouched; connect=join,
  close=leave, `ping` refreshes TTL, every change broadcasts
  the viewer list to that session's sockets. Shares
  PresenceService state with the HTTP endpoints.
  `usePresence` prefers the socket and **falls back to HTTP
  polling** in demo mode or on socket error/close, so neither
  presence nor DevTools depends on the ws path. New
  `/ws/presence` dev proxy (`ws:true`).
  VERIFIED — the earlier "needs a smoke test" caveat is
  resolved. An automated live-ws spec (`51eccd91`) boots a
  real Nest app (WsAdapter + PresenceModule + a default-path
  gateway standing in for DevTools) and drives it with real
  `ws` clients: `/ws/presence` routing, viewer broadcast
  (join→2, leave→1), and **multi-gateway coexistence** all
  pass. Also smoke-tested against the full internal app on an
  isolated alt-port stack (pg 5533 / internal 3010 / external
  3011 / client 8080): HTTP presence, direct WS (counts
  1→2→1), and WS through the Vite proxy (8080→3010) all work
  with both gateways live.

- **Internal app boot fix (found during smoke)** — `602b080d`
  — `ActivityModule` used `@UseGuards(AuthGuard)` but never
  imported `AuthModule` (not `@Global`), so the internal app
  crashed at boot with an unresolved-AuthService DI error.
  Importing AuthModule fixes it; surfaced only when actually
  booting the app for the presence smoke test (unit specs
  don't boot the full app). Same commit makes `start-pg.mjs`
  honour `PG_PORT` and the Vite proxy honour
  `VITE_INTERNAL_PORT`/`VITE_EXTERNAL_PORT` for isolated
  multi-instance dev.

- **Top tags dashboard panel** — `a2e8edfd` (server) +
  `98f1121c` (client) — Fourteenth backend cycle.
  `DashboardService.getTopTags(period, limit)` aggregates the
  tags text[] via UNNEST over the window
  (`GET /api/dashboard/top-tags`); the dashboard renders tag
  chips with counts, each linking to `/sessions?tag=`. Makes
  the dashboard a jump-off for tag navigation, completing the
  tag loop (autosuggest → search → filter → dashboard).

- **Command palette session search** — `3dd2dda7` — Cmd+K now
  runs a debounced backend search as you type (controlled
  input → `/sessions/record?q=`) and shows a "Sessions" group
  of matches beyond the local Recent list, picking up
  tag-aware search. Recent dupes removed; item values carry
  name/url/tags so cmdk's local filter keeps them. Cmd+K is a
  real session finder now.

- **Tag-aware session search** — `55520aef` — Session search
  now matches user-authored tags alongside name/URL.
  `findPaginated` flattens the tags array (`array_to_string`)
  for a single LIKE; the client matcher tests tags too so
  server + client results stay consistent. A step toward
  cross-session search using structured columns (jsonb
  console/network content search remains infeasible without a
  denormalized text column + GIN index). Notes stay out — not
  in the lean list payload.

- **Session insights panel** — `1782fea7` — First slice of
  the "AI summarization" next-level item, delivered as honest
  deterministic heuristics (no model). An Insights card on
  the Overview synthesises the page's data into plain-language
  observations: error/failed-request counts, the densest 3s
  error cluster, the single largest response, and the worst
  rage-click burst — each clickable to seek the replay; a
  clean run reports a positive "no issues" line. Pure
  `buildSessionInsights` helper, unit-tested.

- **Insights in copy summary** — `9a7d2687` — The Markdown
  "Copy summary" appends a **Notable:** section with the same
  derived insights as the Overview card. Computed once in a
  page-level memo shared by both, so a pasted bug ticket
  carries the narrative (error clusters, largest response,
  rage bursts), not just raw counts.

Listed in rough order of value × ease:

- ~~**Browser / OS badge on Session row** — done above.~~
- ~~**Session tags** — done above.~~
- ~~**Network HAR / "Copy as cURL"** — Network list, cURL copy
  and HAR export all shipped above.~~
- ~~**Comments / annotations on a replay** — done above.~~
- ~~**Heatmap overlay on Captured Preview** — done above.~~

The original FOLLOWUPS candidates are all shipped. Future cycles
should look at next-level features (real-time collab, replay
search, AI summarization, etc.).

## Conventions

- All cycles ship to `main` directly (per user instruction).
- `pnpm typecheck` + `pnpm test` must pass before push.
- No backend / schema changes inside a single hourly cycle unless they're
  tiny and self-contained.
- Reference the peer that inspired the feature in the commit body.
