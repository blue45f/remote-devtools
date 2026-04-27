/**
 * Generates a minimal but visually engaging rrweb session for demo mode.
 * Real (non-demo) sessions deliver their own valid rrweb events from the SDK.
 *
 * Schema reference (rrweb v2):
 *   - type 4 = Meta { href, width, height }
 *   - type 2 = FullSnapshot { node, initialOffset }
 *   - type 3 = IncrementalSnapshot { source, ...payload }
 *
 * The DOM tree uses sequential ids (1 = document root).
 */

interface RrwebEvent {
  type: number;
  timestamp: number;
  data: unknown;
}

function makeFullSnapshot(): RrwebEvent["data"] {
  // ids must be unique, 1 = document
  return {
    node: {
      type: 0, // Document
      childNodes: [
        // Doctype
        {
          type: 1,
          name: "html",
          publicId: "",
          systemId: "",
          id: 2,
        },
        {
          type: 2, // Element <html>
          tagName: "html",
          attributes: { lang: "en" },
          childNodes: [
            {
              type: 2,
              tagName: "head",
              attributes: {},
              childNodes: [
                {
                  type: 2,
                  tagName: "style",
                  attributes: {},
                  childNodes: [
                    {
                      type: 3,
                      textContent: `
                        body { margin: 0; font: 15px/1.4 -apple-system, "Inter Variable", sans-serif; background: #fafafa; color: #171717; }
                        .wrap { max-width: 720px; margin: 60px auto; padding: 0 24px; }
                        .pill { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px; background: #eef2ff; color: #4338ca; font-size: 11px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; }
                        h1 { font-size: 32px; line-height: 1.15; letter-spacing: -.02em; margin: 16px 0 8px; }
                        p { color: #525252; }
                        .card { margin-top: 28px; background: #fff; border: 1px solid #ededed; border-radius: 12px; padding: 18px; box-shadow: 0 1px 2px rgba(0,0,0,.04); }
                        .row { display: flex; gap: 8px; align-items: center; }
                        .dot { width: 8px; height: 8px; border-radius: 999px; background: #22c55e; }
                        .meta { color: #737373; font-size: 12px; }
                        .btn { background: #171717; color: #fff; border: 0; border-radius: 8px; padding: 8px 14px; font-size: 13px; cursor: pointer; }
                        .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-top: 14px; }
                        .stat { padding: 12px; border-radius: 10px; background: #f5f5f5; }
                        .stat b { display: block; font-size: 22px; }
                        .stat span { color: #737373; font-size: 11px; }
                        #cursor { position: fixed; width: 22px; height: 22px; border-radius: 999px; pointer-events: none; border: 2px solid #6366f1; mix-blend-mode: difference; transition: transform .12s ease; left: 0; top: 0; }
                      `,
                      id: 5,
                    },
                  ],
                  id: 4,
                },
              ],
              id: 3,
            },
            {
              type: 2,
              tagName: "body",
              attributes: {},
              childNodes: [
                {
                  type: 2,
                  tagName: "div",
                  attributes: { class: "wrap" },
                  childNodes: [
                    {
                      type: 2,
                      tagName: "span",
                      attributes: { class: "pill" },
                      childNodes: [
                        { type: 3, textContent: "Replay · demo", id: 102 },
                      ],
                      id: 101,
                    },
                    {
                      type: 2,
                      tagName: "h1",
                      attributes: {},
                      childNodes: [
                        {
                          type: 3,
                          textContent: "Checkout flow · live trace",
                          id: 104,
                        },
                      ],
                      id: 103,
                    },
                    {
                      type: 2,
                      tagName: "p",
                      attributes: {},
                      childNodes: [
                        {
                          type: 3,
                          textContent:
                            "A captured customer session showing how rrweb-player replays DOM mutations, mouse activity, and console events captured by the SDK.",
                          id: 106,
                        },
                      ],
                      id: 105,
                    },
                    {
                      type: 2,
                      tagName: "div",
                      attributes: { class: "card" },
                      childNodes: [
                        {
                          type: 2,
                          tagName: "div",
                          attributes: { class: "row" },
                          childNodes: [
                            {
                              type: 2,
                              tagName: "span",
                              attributes: { class: "dot" },
                              childNodes: [],
                              id: 110,
                            },
                            {
                              type: 2,
                              tagName: "strong",
                              attributes: {},
                              childNodes: [
                                {
                                  type: 3,
                                  textContent: "Session live",
                                  id: 112,
                                },
                              ],
                              id: 111,
                            },
                            {
                              type: 2,
                              tagName: "span",
                              attributes: { class: "meta" },
                              childNodes: [
                                {
                                  type: 3,
                                  textContent: "device · iPhone 15",
                                  id: 114,
                                },
                              ],
                              id: 113,
                            },
                          ],
                          id: 109,
                        },
                        {
                          type: 2,
                          tagName: "div",
                          attributes: { class: "grid" },
                          childNodes: [
                            statBox(120, "events", "0", "captured"),
                            statBox(123, "errors", "0", "console"),
                            statBox(126, "duration", "00:00", "elapsed"),
                          ],
                          id: 119,
                        },
                        {
                          type: 2,
                          tagName: "button",
                          attributes: { class: "btn", style: "margin-top:14px" },
                          childNodes: [
                            { type: 3, textContent: "Continue", id: 131 },
                          ],
                          id: 130,
                        },
                      ],
                      id: 108,
                    },
                  ],
                  id: 100,
                },
                {
                  type: 2,
                  tagName: "div",
                  attributes: { id: "cursor" },
                  childNodes: [],
                  id: 200,
                },
              ],
              id: 6,
            },
          ],
          id: 1,
        },
      ],
      id: 0,
    },
    initialOffset: { left: 0, top: 0 },
  };
}

function statBox(baseId: number, label: string, big: string, sub: string) {
  return {
    type: 2,
    tagName: "div",
    attributes: { class: "stat" },
    childNodes: [
      {
        type: 2,
        tagName: "b",
        attributes: { id: `stat-${label}` },
        childNodes: [{ type: 3, textContent: big, id: baseId + 1 }],
        id: baseId,
      },
      {
        type: 2,
        tagName: "span",
        attributes: {},
        childNodes: [
          { type: 3, textContent: `${label} · ${sub}`, id: baseId + 2 },
        ],
        id: baseId + 3,
      },
    ],
    id: baseId + 4,
  };
}

/**
 * Build a minimal valid rrweb session.
 * Returns events suitable for both rrweb-player and our existing timeline view.
 */
export function buildSeedRrwebEvents(start: number): RrwebEvent[] {
  const events: RrwebEvent[] = [];
  events.push({
    type: 4,
    timestamp: start,
    data: { href: "https://shop.example.com/cart", width: 1024, height: 640 },
  });
  events.push({
    type: 2,
    timestamp: start + 80,
    data: makeFullSnapshot(),
  });

  // Mouse movements (source 1 = MouseMove in rrweb)
  let t = start + 200;
  for (let i = 0; i < 24; i++) {
    t += 220 + Math.floor(Math.random() * 80);
    events.push({
      type: 3,
      timestamp: t,
      data: {
        source: 6, // MouseInteraction in some versions; keep simple
        positions: [
          {
            x: 200 + i * 12,
            y: 220 + Math.sin(i / 3) * 40,
            id: 200,
            timeOffset: 0,
          },
        ],
      },
    });
  }

  // Update text counters (incremental mutations, source 0)
  for (let i = 1; i <= 5; i++) {
    t += 600;
    events.push({
      type: 3,
      timestamp: t,
      data: {
        source: 0,
        texts: [
          { id: 121, value: String(i * 12) },
          { id: 124, value: String(Math.floor(i / 3)) },
          {
            id: 127,
            value: `00:${String(i * 4).padStart(2, "0")}`,
          },
        ],
        attributes: [],
        removes: [],
        adds: [],
      },
    });
  }

  return events;
}
