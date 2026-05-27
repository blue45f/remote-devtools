import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddOrganizationBillingState1777500000000
  implements MigrationInterface
{
  name = "AddOrganizationBillingState1777500000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "organizations"
        ADD COLUMN IF NOT EXISTS "billing_provider" varchar(32) NULL,
        ADD COLUMN IF NOT EXISTS "billing_subscription_id" varchar(128) NULL,
        ADD COLUMN IF NOT EXISTS "subscription_status" varchar(32) NULL,
        ADD COLUMN IF NOT EXISTS "subscription_current_period_end" timestamp NULL`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_organizations_stripe_customer_id"
        ON "organizations" ("stripe_customer_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_organizations_billing_subscription_id"
        ON "organizations" ("billing_subscription_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_organizations_billing_subscription_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_organizations_stripe_customer_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "organizations"
        DROP COLUMN IF EXISTS "subscription_current_period_end",
        DROP COLUMN IF EXISTS "subscription_status",
        DROP COLUMN IF EXISTS "billing_subscription_id",
        DROP COLUMN IF EXISTS "billing_provider"`,
    );
  }
}
