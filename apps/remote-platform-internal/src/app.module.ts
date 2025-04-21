import { join } from "path";

import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
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
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { DomModule } from "./modules/dom/dom.module";
import { GoogleSheetsModule } from "./modules/google-sheets/google-sheets.module";
import { ImageBase64Module } from "./modules/imageBase64/imageBase64.module";
import { NetworkModule } from "./modules/network/network.module";
import { RecordModule } from "./modules/record/record.module";
import { RemoveRecordService } from "./modules/removeRecord/removeRecord.service";
import { RuntimeModule } from "./modules/runtime/runtime.module";
import { ScreenModule } from "./modules/screen/screen.module";
import { SessionReplayModule } from "./modules/session-replay/session-replay.module";
import { TicketFormModule } from "./modules/ticket-form/ticket-form.module";
import { UserInfoModule } from "./modules/user-info/user-info.module";
import { UserProfileModule } from "./modules/user-profile/user-profile.module";
import { WebviewGatewayModule } from "./modules/webview/webview.module";
import { WorkflowModule } from "./modules/workflow/workflow.module";

dotenv.config();

const isDevelopment = process.env.APP_ENV !== "beta";

// TODO: 리팩토링 필요
const dbModule = TypeOrmModule.forRoot({
  type: "postgres",
  host: process.env.DB_WRITER_HOST || "postgres",
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  password: process.env.DB_PASSWORD || "mypassword",
  username: process.env.DB_USER || "myuser",
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
  synchronize: isDevelopment,
  dropSchema: false, // Session Replay 테스트를 위해 비활성화

  // logging: true,
});

const staticModule = ServeStaticModule.forRoot(
  {
    rootPath: join(process.cwd(), "devtools-frontend"),
    serveRoot: "/devtools",
  },
  {
    rootPath: join(process.cwd(), "devtools-frontend/tabbed"),
    serveRoot: "/tabbed-debug",
  },
  {
    rootPath: join(process.cwd(), "client/out/rooms"),
    serveRoot: "/rooms",
  },
  {
    rootPath: join(process.cwd(), "client/out/_next/static"),
    serveRoot: "/_next/static",
  },
  {
    rootPath: join(process.cwd(), "sdk/dist"),
    serveRoot: "/sdk",
  },
);

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
    SessionReplayModule,
    UserProfileModule,
    UserInfoModule,
    TicketFormModule,
    GoogleSheetsModule,
    ScheduleModule.forRoot(),
    WorkflowModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService, RemoveRecordService],
})
export class AppModule {}
