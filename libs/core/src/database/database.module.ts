import { DynamicModule, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import {
  createDatabaseConfig,
  DatabaseConfigOptions,
} from "../config/database.config";

/**
 * Dynamic module that bootstraps the TypeORM database connection.
 * Use {@link DatabaseModule.forRoot} to register it in the root application module.
 */
@Module({})
export class DatabaseModule {
  static forRoot(options: DatabaseConfigOptions = {}): DynamicModule {
    return {
      module: DatabaseModule,
      imports: [TypeOrmModule.forRoot(createDatabaseConfig(options))],
      exports: [TypeOrmModule],
    };
  }
}
