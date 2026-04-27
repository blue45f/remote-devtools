import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Adds the multi-tenant `org_id` column to the remaining domain tables.
 *
 * The bootstrap (`Init1777300000000`) already covers `record`. This follow-up
 * propagates the column to every table that should be tenant-scoped at the
 * row level: dom / network / runtime / screen / ticket_logs / users /
 * device_info_list. The column is nullable so existing rows are unaffected
 * and self-host single-tenant deployments continue working.
 *
 * Each statement uses `IF NOT EXISTS` so the migration is idempotent across
 * environments that previously synced via `synchronize: true`.
 */
export class AddOrgIdToChildEntities1777400000000
  implements MigrationInterface
{
  name = "AddOrgIdToChildEntities1777400000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tables: { table: string; tsColumn: string }[] = [
      { table: "dom", tsColumn: "timestamp" },
      { table: "network", tsColumn: "timestamp" },
      { table: "runtime", tsColumn: "timestamp" },
      { table: "screen", tsColumn: "timestamp" },
      { table: "ticket_logs", tsColumn: "created_at" },
      { table: "users", tsColumn: "" },
      { table: "device_info_list", tsColumn: "" },
    ];

    for (const { table, tsColumn } of tables) {
      // Only mutate the table if it exists — fresh deploys may bootstrap via
      // `synchronize: true` and skip earlier migrations.
      const exists = await queryRunner.query(
        `SELECT to_regclass($1) AS reg`,
        [`public.${table}`],
      );
      if (!exists?.[0]?.reg) continue;

      await queryRunner.query(
        `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "org_id" uuid NULL`,
      );

      const indexName = tsColumn
        ? `IDX_${table}_org_${tsColumn}`
        : `IDX_${table}_org`;
      const cols = tsColumn ? `("org_id", "${tsColumn}")` : `("org_id")`;
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "${indexName}" ON "${table}" ${cols}`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tables = [
      "dom",
      "network",
      "runtime",
      "screen",
      "ticket_logs",
      "users",
      "device_info_list",
    ];
    for (const table of tables) {
      await queryRunner.query(
        `ALTER TABLE IF EXISTS "${table}" DROP COLUMN IF EXISTS "org_id"`,
      );
    }
  }
}
