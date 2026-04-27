/**
 * Seeds a minimal record session into the local Postgres so we can verify the
 * Sessions list / detail endpoints against real DB rows.
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

const now = new Date();
const insertRecord = await client.query(
  `INSERT INTO record (name, duration, url, device_id, record_mode, referrer, timestamp)
   VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, name, device_id, record_mode`,
  [
    "e2e-recording-test",
    18_000_000_000n.toString(), // 18 seconds in nanoseconds
    "https://example.com/checkout",
    "device-e2e-test-001",
    true,
    "https://example.com",
    now,
  ],
);
console.log("inserted record:", insertRecord.rows[0]);
const recordId = insertRecord.rows[0].id;

// Insert a few CDP-style events into the DOM table
const domEvents = [
  { type: "Document", payload: { url: "https://example.com/checkout" } },
  { type: "FullSnapshot", payload: { node: { id: 1 } } },
  { type: "MouseMove", payload: { x: 100, y: 200 } },
  { type: "Click", payload: { target: "button#checkout" } },
];

// Inspect dom entity columns to know exact insert shape
const colsRes = await client.query(
  `SELECT column_name FROM information_schema.columns WHERE table_name='dom' ORDER BY ordinal_position`,
);
console.log("dom columns:", colsRes.rows.map((r) => r.column_name));

// Insert a few network rows
const netCols = await client.query(
  `SELECT column_name FROM information_schema.columns WHERE table_name='network' ORDER BY ordinal_position`,
);
console.log("network columns:", netCols.rows.map((r) => r.column_name));

await client.end();
console.log(
  "\n→ verify via:\n  curl -s http://localhost:3000/sessions/record\n",
);
