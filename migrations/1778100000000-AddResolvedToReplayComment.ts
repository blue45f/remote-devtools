import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds a `resolved boolean NOT NULL DEFAULT false` column to
 * `replay_comment` so teams can mark an annotation as addressed (a
 * triage workflow on shared comments). Existing rows default to unresolved
 * without backfill.
 *
 * Idempotent — ADD COLUMN IF NOT EXISTS so a re-run against a database that
 * bootstrapped via synchronize is safe.
 */
export class AddResolvedToReplayComment1778100000000 implements MigrationInterface {
  name = 'AddResolvedToReplayComment1778100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.query(`SELECT to_regclass($1) AS reg`, [
      'public.replay_comment',
    ]);
    if (!exists?.[0]?.reg) return;

    await queryRunner.query(
      `ALTER TABLE "replay_comment"
         ADD COLUMN IF NOT EXISTS "resolved" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "replay_comment" DROP COLUMN IF EXISTS "resolved"`);
  }
}
