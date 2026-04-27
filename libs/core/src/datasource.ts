/**
 * Standalone TypeORM DataSource — used by the migration CLI
 * (`pnpm migration:generate`, `pnpm migration:run`, `pnpm migration:revert`).
 *
 * NestJS apps configure their own DataSource via {@link DatabaseModule}; this
 * file is purely for the CLI tooling so it can read entities + connection
 * settings without booting the whole NestJS application.
 */
import { join } from "path";
import { DataSource } from "typeorm";
import * as dotenv from "dotenv";

import { ALL_ENTITIES } from "./config/database.config";

dotenv.config();

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST ?? process.env.DB_WRITER_HOST ?? "localhost",
  port: parseInt(process.env.DB_PORT ?? "5432", 10),
  username: process.env.DB_USER ?? process.env.DB_USERNAME ?? "myuser",
  password: process.env.DB_PASSWORD ?? "mypassword",
  database: process.env.DB_NAME ?? process.env.DB_DATABASE ?? "mydb",
  schema: "public",
  entities: [...ALL_ENTITIES],
  migrations: [join(process.cwd(), "migrations", "*.{ts,js}")],
  migrationsTableName: "typeorm_migrations",
});

export default AppDataSource;
