import { join } from "path";

import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerModule } from "@nestjs/throttler";
import { ServeStaticModule } from "@nestjs/serve-static";
import * as dotenv from "dotenv";

import { DatabaseModule, ServicesModule } from "@remote-platform/core";

import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { GoogleSheetsModule } from "./modules/google-sheets/google-sheets.module";
import { ImageBase64Module } from "./modules/image-base64/image-base64.module";
import { RemoveRecordService } from "./modules/remove-record/remove-record.service";
import { SessionReplayModule } from "./modules/session-replay/session-replay.module";
import { TicketFormModule } from "./modules/ticket-form/ticket-form.module";
import { UserInfoModule } from "./modules/user-info/user-info.module";
import { UserProfileModule } from "./modules/user-profile/user-profile.module";
import { HealthModule } from "./modules/health/health.module";
import { WebviewGatewayModule } from "./modules/webview/webview.module";
import { WorkflowModule } from "./modules/workflow/workflow.module";

dotenv.config();

const isDevelopment = process.env.APP_ENV === "development";

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
    rootPath: join(process.cwd(), "client/dist"),
    serveRoot: "/client",
  },
  {
    rootPath: join(process.cwd(), "sdk/dist"),
    serveRoot: "/sdk",
  },
);

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    DatabaseModule.forRoot({ synchronize: isDevelopment }),
    ServicesModule,
    staticModule,
    WebviewGatewayModule,
    ImageBase64Module,
    SessionReplayModule,
    UserProfileModule,
    UserInfoModule,
    TicketFormModule,
    GoogleSheetsModule,
    ScheduleModule.forRoot(),
    WorkflowModule,
    DashboardModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService, RemoveRecordService],
})
export class AppModule {}
