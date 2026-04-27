/**
 * Insert a screenPreview row so the new /preview endpoint + thumbnail card
 * can be exercised end-to-end.
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
// Remove any existing preview to keep idempotent
await client.query(
  `DELETE FROM screen WHERE "recordId" = $1 AND type = 'screenPreview'`,
  [recordId],
);

const head = `
  <style>
    body { font: 16px -apple-system, "Inter Variable", sans-serif; margin: 0; background: #fafafa; color: #171717; }
    .nav { display: flex; align-items: center; gap: 16px; padding: 16px 24px; border-bottom: 1px solid #e5e5e5; background: #fff; }
    .brand { font-weight: 700; }
    .nav a { color: #525252; text-decoration: none; font-size: 14px; }
    .hero { padding: 48px 24px; max-width: 720px; margin: 0 auto; }
    h1 { font-size: 36px; line-height: 1.1; letter-spacing: -0.02em; margin: 0 0 12px; }
    .lead { color: #525252; font-size: 17px; }
    .cards { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; padding: 0 24px; max-width: 960px; margin: 0 auto; }
    .card { background: #fff; border: 1px solid #e5e5e5; border-radius: 12px; padding: 18px; }
    .card h3 { margin: 0 0 6px; font-size: 16px; }
    .card p { margin: 0; color: #737373; font-size: 13px; }
    .cta { background: #171717; color: #fff; padding: 10px 18px; border-radius: 8px; border: 0; font-size: 14px; cursor: pointer; }
  </style>
`;

const body = `
  <div class="nav">
    <span class="brand">shop.example.com</span>
    <a href="#">Products</a>
    <a href="#">Cart</a>
    <a href="#">Account</a>
    <span style="margin-left:auto"><button class="cta">Checkout</button></span>
  </div>
  <section class="hero">
    <h1>Reusable styles for a calmer checkout.</h1>
    <p class="lead">A captured customer page that the SDK shipped to the platform. Below are three highlighted modules from the live cart view.</p>
  </section>
  <section class="cards">
    <div class="card"><h3>Free shipping</h3><p>On orders over $40</p></div>
    <div class="card"><h3>30-day returns</h3><p>No questions asked</p></div>
    <div class="card"><h3>Live chat</h3><p>Replies in under 2 minutes</p></div>
  </section>
`;

const protocol = {
  method: "ScreenPreview.captured",
  params: {
    head,
    body,
    bodyClass: "page-checkout",
    width: 1280,
    height: 800,
    isMobile: false,
    baseHref: "https://shop.example.com/cart/",
  },
};

const nowNs = String(Date.now() * 1_000_000);
await client.query(
  `INSERT INTO screen (type, event_type, protocol, timestamp, sequence, "recordId")
   VALUES ('screenPreview', null, $1, $2, $3, $4)`,
  [JSON.stringify(protocol), nowNs, 999, recordId],
);

console.log(`seeded screenPreview for record ${recordId}`);
await client.end();
