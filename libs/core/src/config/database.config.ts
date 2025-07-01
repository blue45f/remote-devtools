import { TypeOrmModuleOptions } from "@nestjs/typeorm";
import * as dotenv from "dotenv";

import {
  Dom,
  Network,
  Record,
  Runtime,
  Screen,
  TicketLogEntity,
  TicketComponentEntity,
  TicketLabelEntity,
  UserEntity,
  DeviceInfoEntity,
  UserTicketTemplateEntity,
} from "@remote-platform/entity";

dotenv.config();

export interface DatabaseConfigOptions {
  synchronize?: boolean;
  dropSchema?: boolean;
  logging?: boolean;
}

export const ALL_ENTITIES = [
  Network,
  Record,
  Dom,
  Runtime,
  Screen,
  TicketLogEntity,
  TicketComponentEntity,
  TicketLabelEntity,
  UserEntity,
  DeviceInfoEntity,
  UserTicketTemplateEntity,
];

export function createDatabaseConfig(
  options: DatabaseConfigOptions = {},
): TypeOrmModuleOptions {
  const isDevelopment = process.env.APP_ENV !== "beta";

  return {
    type: "postgres",
    host: process.env.DB_WRITER_HOST || "postgres",
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    password:
      process.env.DB_PASSWORD ||
      process.env.DB_SVC_USER_PASSWORD ||
      "mypassword",
    username: process.env.DB_USER || process.env.DB_SVC_USER || "myuser",
    database: process.env.DB_NAME || "mydb",
    schema: "public",
    entities: ALL_ENTITIES,
    synchronize: options.synchronize ?? isDevelopment,
    dropSchema: options.dropSchema ?? false,
    logging: options.logging ?? false,
  };
}
