import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAccountsAndOrganizationMembers1778200000000 implements MigrationInterface {
  name = 'AddAccountsAndOrganizationMembers1778200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "accounts" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "email" varchar(320) NOT NULL,
        "name" varchar(120) NOT NULL,
        "password_hash" varchar(255) NULL,
        "status" varchar(32) NOT NULL DEFAULT 'active',
        "last_login_at" TIMESTAMP NULL,
        "deleted_at" TIMESTAMP NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_accounts_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_accounts_email" UNIQUE ("email")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "organization_members" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "org_id" uuid NOT NULL,
        "account_id" uuid NOT NULL,
        "role" varchar(32) NOT NULL DEFAULT 'member',
        "status" varchar(32) NOT NULL DEFAULT 'active',
        "invited_at" TIMESTAMP NULL,
        "joined_at" TIMESTAMP NULL,
        "deleted_at" TIMESTAMP NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_organization_members_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_organization_members_org_account" UNIQUE ("org_id", "account_id"),
        CONSTRAINT "FK_organization_members_org"
          FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_organization_members_account"
          FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_accounts_email" ON "accounts" ("email")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_organization_members_account_id"
        ON "organization_members" ("account_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_organization_members_org_role_status"
        ON "organization_members" ("org_id", "role", "status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_organization_members_org_role_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_organization_members_account_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_accounts_email"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "organization_members" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "accounts" CASCADE`);
  }
}
