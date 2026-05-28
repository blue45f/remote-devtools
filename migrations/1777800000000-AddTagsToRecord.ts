import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Adds a `tags text[]` column to the `record` table for free-form user
 * labels (e.g. "checkout", "bug", "verified"). NOT NULL with empty-array
 * default so historical rows look like "no tags" without backfill.
 *
 * Idempotent — ADD COLUMN IF NOT EXISTS so a re-run against a database
 * that bootstrapped via synchronize is safe.
 */
export class AddTagsToRecord1777800000000 implements MigrationInterface {
  name = "AddTagsToRecord1777800000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.query(
      `SELECT to_regclass($1) AS reg`,
      ["public.record"],
    );
    if (!exists?.[0]?.reg) return;

    await queryRunner.query(
      `ALTER TABLE "record"
         ADD COLUMN IF NOT EXISTS "tags" text[] NOT NULL DEFAULT '{}'::text[]`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "record" DROP COLUMN IF EXISTS "tags"`,
    );
  }
}
