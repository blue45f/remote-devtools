import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds a nullable `note text` column to the `record` table for a free-form
 * per-session memo (repro steps, context). Distinct from `tags`, which are
 * short labels. NULL means "no note" so historical rows need no backfill.
 *
 * Idempotent — ADD COLUMN IF NOT EXISTS so a re-run against a database that
 * bootstrapped via synchronize is safe.
 */
export class AddNoteToRecord1778000000000 implements MigrationInterface {
  name = 'AddNoteToRecord1778000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.query(`SELECT to_regclass($1) AS reg`, ['public.record']);
    if (!exists?.[0]?.reg) return;

    await queryRunner.query(`ALTER TABLE "record" ADD COLUMN IF NOT EXISTS "note" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "record" DROP COLUMN IF EXISTS "note"`);
  }
}
