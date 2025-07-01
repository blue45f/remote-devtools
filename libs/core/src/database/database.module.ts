import { DynamicModule, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import {
  createDatabaseConfig,
  DatabaseConfigOptions,
} from "../config/database.config";

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
