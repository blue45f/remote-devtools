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
- **Replay timeline minimap** — current commit — A 96-bucket density
  bar sits above the rrweb player on the Replay tab. Each column is a
  slice of session time; opacity scales with event count. Click anywhere
  to seek. OpenReplay / FullStory parity for "where's the action in a
  long session?".

## Next obvious candidates

Listed in rough order of value × ease:

- **Browser / OS badge on Session row** — requires capturing `userAgent`
  on the backend (`libs/entity` + `SessionRecord` API). Skip until backend
  is touched.
- **Network HAR / "Copy as cURL"** — depends on shaping network events
  with method/url/headers; check `libs/core` to see if SDK already
  captures these.
- **Rage-click detection** — scan IncrementalSnapshot events for rapid
  same-target clicks; add a chip to the timeline summary.
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
