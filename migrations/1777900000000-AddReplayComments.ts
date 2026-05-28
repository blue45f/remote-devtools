import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Creates the `replay_comment` table for the comments-on-a-replay feature.
 *
 * Schema:
 *   id           SERIAL PRIMARY KEY
 *   org_id       uuid NULL                   — multi-tenant scope
 *   record_id    int  NOT NULL  references record(id) ON DELETE CASCADE
 *   timestamp_ms int  NOT NULL               — playhead offset (ms)
 *   body         text NOT NULL               — comment text, ≤2000 chars
 *   author       varchar(80) NULL            — optional display name
 *   created_at   TIMESTAMP NOT NULL DEFAULT now()
 *
 * Idempotent — `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS`
 * so a fresh deploy that previously bootstrapped via `synchronize: true`
 * is safe to re-run.
 */
export class AddReplayComments1777900000000 implements MigrationInterface {
  name = "AddReplayComments1777900000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.query(
      `SELECT to_regclass($1) AS reg`,
      ["public.record"],
    );
    if (!exists?.[0]?.reg) return;

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "replay_comment" (
        "id" SERIAL PRIMARY KEY,
        "org_id" uuid NULL,
        "record_id" int NOT NULL,
        "timestamp_ms" int NOT NULL,
        "body" text NOT NULL,
        "author" varchar(80) NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_replay_comment_record"
          FOREIGN KEY ("record_id") REFERENCES "record"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_replay_comment_record_created"
         ON "replay_comment" ("record_id", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_replay_comment_org_created"
         ON "replay_comment" ("org_id", "created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "replay_comment"`);
  }
}
