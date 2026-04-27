/**
 * Seed rrweb-format SessionReplay events into the `screen` table for record 1.
 * The session-replay service reads from this table and unwraps rrweb events
 * out of `SessionReplay.rrwebEvent` envelopes.
 */
import pg from "pg";

const client = new pg.Client({
  host: "localhost",
  port: 5432,
  user: "myuser",
  password: "mypassword",
  database: "mydb",
});
await client.connect();

const recordId = 1;
const start = Date.now() * 1_000_000; // nanoseconds

// Wipe any prior screen rows for this record (idempotent test)
await client.query(`DELETE FROM screen WHERE "recordId" = $1`, [recordId]);

// rrweb event types: 4 Meta, 2 FullSnapshot, 3 Incremental
const rrwebEvents = [
  {
    type: 4,
    timestamp: Date.now(),
    data: { href: "https://example.com/checkout", width: 1280, height: 720 },
  },
  {
    type: 2,
    timestamp: Date.now() + 100,
    data: {
      node: { type: 0, id: 0, childNodes: [] },
      initialOffset: { left: 0, top: 0 },
    },
  },
  {
    type: 3,
    timestamp: Date.now() + 1000,
    data: { source: 1, positions: [{ x: 200, y: 100, id: 1, timeOffset: 0 }] },
  },
  {
    type: 3,
    timestamp: Date.now() + 2000,
    data: { source: 1, positions: [{ x: 400, y: 220, id: 1, timeOffset: 0 }] },
  },
  {
    type: 3,
    timestamp: Date.now() + 5000,
    data: { source: 2, type: 2, id: 100, x: 320, y: 180 }, // click
  },
];

let seq = 0;
for (const evt of rrwebEvents) {
  await client.query(
    `INSERT INTO screen (event_type, protocol, timestamp, sequence, "recordId")
     VALUES ($1, $2, $3, $4, $5)`,
    [
      `rrweb.${evt.type}`,
      JSON.stringify({
        method: "SessionReplay.rrwebEvent",
        params: { event: evt },
      }),
      String(start + seq * 1_000_000),
      seq,
      recordId,
    ],
  );
  seq++;
}

console.log(`seeded ${rrwebEvents.length} screen rows for record ${recordId}`);
await client.end();
