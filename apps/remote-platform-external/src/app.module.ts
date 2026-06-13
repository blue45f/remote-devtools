import { join } from 'path';

import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule, ServicesModule } from '@remote-platform/core';
import * as dotenv from 'dotenv';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FigmaModule } from './modules/figma/figma.module';
import { HealthModule } from './modules/health/health.module';
import { ImageBase64Module } from './modules/image-base64/image-base64.module';
import { JiraModule } from './modules/jira/jira.module';
import { WebviewGatewayModule } from './modules/webview/webview.module';

dotenv.config();

const staticModule = ServeStaticModule.forRoot({
  rootPath: join(process.cwd(), 'sdk/dist'),
  serveRoot: '/sdk',
});

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    DatabaseModule.forRoot({ synchronize: false }),
    ServicesModule,
    staticModule,
    WebviewGatewayModule,
    ImageBase64Module,
    JiraModule,
    FigmaModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
