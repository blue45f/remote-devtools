import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddBillingWebhookEvents1777600000000
  implements MigrationInterface
{
  name = "AddBillingWebhookEvents1777600000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "billing_webhook_events" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "provider" varchar(32) NOT NULL,
        "provider_event_id" varchar(255) NOT NULL,
        "provider_event_type" varchar(128) NOT NULL,
        "received_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_billing_webhook_events_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_billing_webhook_events_provider_event"
          UNIQUE ("provider", "provider_event_id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_billing_webhook_events_provider_event_id"
        ON "billing_webhook_events" ("provider", "provider_event_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS "billing_webhook_events" CASCADE`,
    );
  }
}

