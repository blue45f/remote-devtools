import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Adds the SDK-captured `user_agent` column to the `record` table.
 *
 * The column is nullable so historical rows (pre-migration) and SDK builds
 * that don't send a UA continue to work. The frontend renders an absent UA
 * as "Unknown" rather than failing.
 *
 * Idempotent: `ADD COLUMN IF NOT EXISTS` so fresh deploys that bootstrap via
 * `synchronize: true` skip this safely.
 */
export class AddUserAgentToRecord1777700000000 implements MigrationInterface {
  name = "AddUserAgentToRecord1777700000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.query(
      `SELECT to_regclass($1) AS reg`,
      ["public.record"],
    );
    if (!exists?.[0]?.reg) return;

    await queryRunner.query(
      `ALTER TABLE "record" ADD COLUMN IF NOT EXISTS "user_agent" text NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "record" DROP COLUMN IF EXISTS "user_agent"`,
    );
  }
}
