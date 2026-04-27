/**
 * Seed CDP-style events into DOM/Network/Runtime tables for record id 1.
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
const start = Date.now();

// One full DOM snapshot
await client.query(
  `INSERT INTO dom (type, protocol, timestamp, "recordId") VALUES ($1, $2, $3, $4)
   ON CONFLICT DO NOTHING`,
  [
    "entireDom",
    JSON.stringify({
      method: "DOM.getDocument",
      result: { root: { nodeId: 1, nodeName: "#document" } },
    }),
    String(start),
    recordId,
  ],
);

// A handful of network requests
const requestUrls = [
  "https://example.com/api/products",
  "https://example.com/api/cart",
  "https://example.com/api/checkout",
];
for (let i = 0; i < requestUrls.length; i++) {
  await client.query(
    `INSERT INTO network ("requestId", "responseBody", "base64Encoded", protocol, timestamp, "recordId")
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      i + 1,
      JSON.stringify({ status: 200 }),
      false,
      JSON.stringify({
        method: "Network.requestWillBeSent",
        params: { request: { url: requestUrls[i], method: "GET" } },
      }),
      String(start + (i + 1) * 1000),
      recordId,
    ],
  );
}

// A console event in Runtime
await client.query(
  `INSERT INTO runtime (protocol, timestamp, "recordId") VALUES ($1, $2, $3)`,
  [
    JSON.stringify({
      method: "Runtime.consoleAPICalled",
      params: { type: "log", args: [{ type: "string", value: "checkout step 1" }] },
    }),
    String(start + 5000),
    recordId,
  ],
);

console.log("seeded events for record", recordId);
await client.end();
