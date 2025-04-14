import { join } from "path";

import { Module } from "@nestjs/common";
import { ServeStaticModule } from "@nestjs/serve-static";
import { TypeOrmModule } from "@nestjs/typeorm";
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
  // 어드민 시스템 엔티티
  UserEntity,
  DeviceInfoEntity,
  UserTicketTemplateEntity,
} from "@remote-platform/entity";

import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { DomModule } from "./modules/dom/dom.module";
import { FigmaModule } from "./modules/figma/figma.module";
import { ImageBase64Module } from "./modules/imageBase64/imageBase64.module";
import { JiraModule } from "./modules/jira/jira.module";
import { NetworkModule } from "./modules/network/network.module";
import { RecordModule } from "./modules/record/record.module";
import { RuntimeModule } from "./modules/runtime/runtime.module";
import { ScreenModule } from "./modules/screen/screen.module";
import { WebviewGatewayModule } from "./modules/webview/webview.module";

dotenv.config();

// TODO: 리팩토링 필요
const dbModule = TypeOrmModule.forRoot({
  type: "postgres",
  host: process.env.DB_WRITER_HOST || "postgres",
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  password: process.env.DB_SVC_USER_PASSWORD || "mypassword",
  username: process.env.DB_SVC_USER || "myuser",
  database: process.env.DB_NAME || "mydb",
  schema: "public",
  entities: [
    Network,
    Record,
    Dom,
    Runtime,
    Screen,
    TicketLogEntity,
    TicketComponentEntity,
    TicketLabelEntity,
    // 어드민 시스템 엔티티
    UserEntity,
    DeviceInfoEntity,
    UserTicketTemplateEntity,
  ],
  synchronize: false,
  dropSchema: false,
  // logging: true,
});

const staticModule = ServeStaticModule.forRoot({
  rootPath: join(process.cwd(), "sdk/dist"),
  serveRoot: "/sdk",
});

@Module({
  imports: [
    dbModule,
    staticModule,
    WebviewGatewayModule,
    ImageBase64Module,
    RecordModule,
    NetworkModule,
    DomModule,
    RuntimeModule,
    ScreenModule,
    JiraModule,
    FigmaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
