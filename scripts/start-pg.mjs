#!/usr/bin/env node
/**
 * Boots an embedded Postgres on port 5432 with credentials matching the
 * project's .env.local files. Used by the local E2E harness when Docker is
 * unavailable.
 */
import EmbeddedPostgres from "embedded-postgres";
import { mkdirSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const dataDir = process.env.PG_DATA_DIR ?? join(homedir(), ".cache", "remote-devtools-pg");
const isFirstBoot = !existsSync(join(dataDir, "PG_VERSION"));

if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: "myuser",
  password: "mypassword",
  port: 5432,
  persistent: true,
});

console.log(`[pg] data dir: ${dataDir}`);

if (isFirstBoot) {
  console.log("[pg] initialising cluster…");
  await pg.initialise();
}

console.log("[pg] starting cluster…");
await pg.start();

if (isFirstBoot) {
  console.log("[pg] creating database 'mydb'…");
  await pg.createDatabase("mydb");
}

console.log("[pg] ready on localhost:5432 (db=mydb, user=myuser)");

// Hold the event loop so the script doesn't exit immediately after pg.start()
// returns. We keep the handle so signal handlers can release it before the
// async pg.stop() runs — otherwise the interval keeps the loop alive and
// SIGTERM can't drain in time, leaving a zombie node process behind.
const keepAlive = setInterval(() => {}, 1 << 30);

let stopping = false;
async function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  clearInterval(keepAlive); // free the loop first so exit happens cleanly
  if (signal === "SIGINT") console.log("\n[pg] stopping…");
  try {
    await pg.stop();
    process.exit(0); // explicit 0 — beats Node's default 128+signal on signal-triggered exits
  } catch (err) {
    console.error("[pg] stop failed:", err);
    process.exit(1);
  }
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
