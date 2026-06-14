import { join } from 'path';

import {
  AccountEntity,
  DomEntity,
  BillingWebhookEventEntity,
  NetworkEntity,
  OrganizationMemberEntity,
  OrganizationEntity,
  RecordEntity,
  ReplayCommentEntity,
  RuntimeEntity,
  ScreenEntity,
  TicketLogEntity,
  TicketComponentEntity,
  TicketLabelEntity,
  UserEntity,
  DeviceInfoEntity,
  UserTicketTemplateEntity,
} from '@remote-platform/entity';
import * as dotenv from 'dotenv';

import type { TypeOrmModuleOptions } from '@nestjs/typeorm';

dotenv.config();

/** Optional overrides for the default database configuration. */
export interface DatabaseConfigOptions {
  readonly synchronize?: boolean;
  readonly dropSchema?: boolean;
  readonly logging?: boolean;
}

/** Complete list of TypeORM entities registered with the application. */
export const ALL_ENTITIES = [
  NetworkEntity,
  RecordEntity,
  ReplayCommentEntity,
  DomEntity,
  RuntimeEntity,
  ScreenEntity,
  TicketLogEntity,
  TicketComponentEntity,
  TicketLabelEntity,
  UserEntity,
  DeviceInfoEntity,
  UserTicketTemplateEntity,
  BillingWebhookEventEntity,
  OrganizationEntity,
  AccountEntity,
  OrganizationMemberEntity,
] as const;

/** Environments where schema synchronization is allowed. */
const SYNCHRONIZE_ALLOWED_ENVS = new Set(['local', 'development', 'dev']);

/**
 * Build a TypeORM configuration from environment variables.
 * Schema synchronization is only enabled in explicit development environments
 * (local, development, dev). All other environments (beta, production, etc.)
 * must use migrations to prevent accidental data loss.
 */
export function createDatabaseConfig(options: DatabaseConfigOptions = {}): TypeOrmModuleOptions {
  const appEnv = (process.env.APP_ENV ?? 'local').toLowerCase();
  const isDevelopment = SYNCHRONIZE_ALLOWED_ENVS.has(appEnv);

  return {
    type: 'postgres',
    host: process.env.DB_WRITER_HOST ?? 'postgres',
    port: parseInt(process.env.DB_PORT ?? '', 10) || 5432,
    password: process.env.DB_PASSWORD ?? process.env.DB_SVC_USER_PASSWORD ?? 'mypassword',
    username: process.env.DB_USER ?? process.env.DB_SVC_USER ?? 'myuser',
    database: process.env.DB_NAME ?? 'mydb',
    schema: 'public',
    entities: [...ALL_ENTITIES],
    synchronize: options.synchronize ?? isDevelopment,
    dropSchema: options.dropSchema ?? false,
    logging: options.logging ?? false,
    migrations: [join(__dirname, '..', '..', '..', '..', 'migrations', '*.{ts,js}')],
    migrationsRun: process.env.RUN_MIGRATIONS === 'true',
    extra: {
      max: parseInt(process.env.DB_POOL_MAX ?? '10', 10),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    },
  };
}
