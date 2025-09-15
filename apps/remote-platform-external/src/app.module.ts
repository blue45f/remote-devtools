import { join } from "path";

import { Module } from "@nestjs/common";
import { ServeStaticModule } from "@nestjs/serve-static";
import * as dotenv from "dotenv";

import { DatabaseModule, ServicesModule } from "@remote-platform/core";

import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { FigmaModule } from "./modules/figma/figma.module";
import { ImageBase64Module } from "./modules/image-base64/image-base64.module";
import { JiraModule } from "./modules/jira/jira.module";
import { WebviewGatewayModule } from "./modules/webview/webview.module";

dotenv.config();

const staticModule = ServeStaticModule.forRoot({
  rootPath: join(process.cwd(), "sdk/dist"),
  serveRoot: "/sdk",
});

@Module({
  imports: [
    DatabaseModule.forRoot({ synchronize: false }),
    ServicesModule,
    staticModule,
    WebviewGatewayModule,
    ImageBase64Module,
    JiraModule,
    FigmaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
