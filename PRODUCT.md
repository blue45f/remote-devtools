# Product

## Register

product

## Users

Engineers operating Remote DevTools to debug what happened in a browser they cannot reach. They work in two contexts:

- **Post-mortem:** reviewing a recorded session after a bug report, scrubbing the replay and reading the network waterfall, console stream, and DOM/runtime snapshots to reconstruct a failure.
- **Live:** watching an active session in real time, following a device as it runs, seeing who else is viewing, and catching an error spike the moment it lands.

They sit inside an authenticated dashboard, usually on a large monitor, switching between dense tables, timelines, and raw JSON payloads. The job is reconstruction and triage, not browsing: find the signal, confirm the cause, then act or hand off.

## Product Purpose

Remote DevTools is a Chrome DevTools Protocol based remote debugging platform. An SDK instruments a customer's browser and streams CDP data (network, DOM, runtime, screen, console) back to the platform, where operators replay or watch those sessions through a single console. It exists so that a failure on a device you do not own becomes as inspectable as one in your own DevTools. Success is an operator reaching the cause of an issue quickly, with the interface staying out of the way of the signal.

## Platform Capabilities

Current feature set as of the latest enhancement round:

- **Session replay:** rrweb-based full-page recording with a scrubber, click-heatmap overlay, and error markers on the minimap for jumping straight to a failure. Replay, Timeline, Network, Console, and Raw JSON tabs under a single session view.
- **Live presence:** WebSocket gateway shows who else is viewing a session in real time, with HTTP polling fallback.
- **Dashboard:** ticket and record-session trend charts (day / week / month), top-hosts and top-tags panels, recently annotated sessions list, and a live-session counter with 30-second refresh.
- **SDK:** browser instrumentation shipped as both UMD and ESM bundles. Intercepts fetch, XHR, Axios, console, and DOM mutations. Sandboxed demo pages (module and script variants) exercise all capture paths.
- **Integrations:** Jira ticket creation from a session, Figma inspection link, Slack notifications, image-to-base64 proxy.
- **API surface:** fully documented with Swagger (`@ApiTags` + `@ApiResponse` on all controllers). Swagger UI at `/api/docs` on both servers.

## Reliability Baseline

Established during the 2026-06 hardening pass:

- All unbounded `find()` queries on large tables are capped (`take: 10_000` for per-session event streams; `take: 5_000` for stats aggregation; `take: 200` for search endpoints).
- `AbortSignal.timeout()` applied to every `fetch()` call in the client, SDK, and backend HTTP calls — no hanging requests.
- Startup `assertRequiredEnv()` fails fast on missing required environment variables in non-local environments.
- Error states rendered in the replay, network, and console tabs; dashboard panels degrade gracefully to an error card rather than a silent blank.
- Global `QueryCache.onError` surfaces unexpected API failures as toasts without breaking the page.

## Brand Personality

Operator-grade, precise, quiet. Three words: instrument, disciplined, legible. The product behaves like a control surface, not a marketing site. It reports state instead of performing, trusts the user's expertise, and earns attention only where something changed. Copy is direct and unembellished, the language of a tool a professional reaches for every day.

## Anti-references

- **SaaS-marketing aesthetics:** gradient washes, neon accents, glassmorphism (blurred glass cards). This surface is opaque and flat.
- **The hero-metric dashboard template:** one giant number with a tiny label and supporting stats, followed by an endless grid of identical icon-and-heading cards.
- **Decorative excess:** motion that does not report state, reinvented scrollbars, and loud full-saturation color used for visual interest rather than meaning.

## Design Principles

- **Signal over surface.** The interface should vanish so the data (an error, a failed request, a live viewer) reads first. Restraint everywhere is what gives a red number its voice.
- **Color is information, never decoration.** If a hue appears it means a state, a selection, or a severity. The neutral spine stays pure grayscale.
- **Density is a feature, not a problem.** This is a professional tool. Pack the screen with legible, well-ranked information rather than padding it into a brochure.
- **Report, do not perform.** Motion, color, and elevation respond to state (hover, focus, live, float). Nothing animates or lifts for show.
- **Never half-ship a state.** Every control carries default, hover, focus-visible, active, and disabled, behind one consistent focus ring.

## Accessibility & Inclusion

Target WCAG 2.1 AA. Color tokens are tuned so foreground tiers and small status numerals hold AA contrast on their intended backgrounds, including the soft-tinted fills. Status is never carried by color alone: icons, labels, and the record dot reinforce it. A consistent 2px focus-visible ring marks keyboard focus on every interactive element. Motion honors `prefers-reduced-motion`. First-class dark mode ships a paired value for every token. Monospace is reserved for machine data so copyable values stay unambiguous.
