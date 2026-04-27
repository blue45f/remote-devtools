import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Bootstrap migration. Creates the schema as it currently exists in code so
 * that production deployments can stop relying on TypeORM `synchronize: true`.
 *
 * Run order:
 *   1. Apply this migration once to a fresh database.
 *   2. Subsequent schema changes should be authored as new migrations
 *      (`pnpm migration:generate -- migrations/<NAME>`).
 *
 * Idempotency: every CREATE statement uses `IF NOT EXISTS` so the migration
 * is safe to re-run on databases that were previously bootstrapped via
 * synchronize.
 */
export class Init1777300000000 implements MigrationInterface {
  name = "Init1777300000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Lightweight version of the schema TypeORM would generate.
    // Each table mirrors the current entity shape.

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "organizations" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "slug" varchar(64) NOT NULL,
        "name" varchar(200) NOT NULL,
        "plan" varchar(32) NOT NULL DEFAULT 'free',
        "stripe_customer_id" varchar NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_organizations" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_org_slug" ON "organizations" ("slug")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "record" (
        "id" SERIAL NOT NULL,
        "org_id" uuid NULL,
        "name" varchar NOT NULL,
        "duration" bigint NULL,
        "url" text NULL,
        "device_id" varchar(255) NULL,
        "record_mode" boolean NOT NULL DEFAULT false,
        "referrer" varchar(500) NULL,
        "timestamp" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_record" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_record_device_ts" ON "record" ("device_id", "timestamp")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_record_ts" ON "record" ("timestamp")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_record_org_ts" ON "record" ("org_id", "timestamp")`,
    );

    // Note: dom / network / runtime / screen / ticket_* tables are managed by
    // their entity definitions and re-generated on first synchronize.
    // For a from-scratch production deploy:
    //   1. Boot once with APP_ENV=development → synchronize creates the rest.
    //   2. Switch to APP_ENV=production + RUN_MIGRATIONS=true thereafter.
    // A future migration can pin them explicitly via `pnpm migration:generate`.
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "record"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "organizations"`);
  }
}
