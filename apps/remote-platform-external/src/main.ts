import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { WsAdapter } from '@nestjs/platform-ws';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import {
  AllExceptionsFilter,
  createCorsOriginValidator,
  HttpExceptionFilter,
  QueryFailedExceptionFilter,
  validateEnv,
  ZodValidationPipe,
} from '@remote-platform/common';
import * as express from 'express';
import helmet from 'helmet';
import { cleanupOpenApiDoc } from 'nestjs-zod';

import { AppModule } from './app.module';

import type { NestExpressApplication } from '@nestjs/platform-express';

function assertRequiredEnv(): void {
  const appEnv = (process.env.APP_ENV ?? 'local').toLowerCase();
  if (['local', 'development', 'dev'].includes(appEnv)) return;

  const missing: string[] = [];
  if (!process.env.DB_WRITER_HOST) missing.push('DB_WRITER_HOST');
  if (!process.env.DB_PASSWORD && !process.env.DB_SVC_USER_PASSWORD) {
    missing.push('DB_PASSWORD or DB_SVC_USER_PASSWORD');
  }

  if (missing.length > 0) {
    throw new Error(`[STARTUP] Missing required environment variables:\n  ${missing.join('\n  ')}`);
  }
}

assertRequiredEnv();
// Non-fatal: warns on malformed env vars / insecure production defaults. Never throws.
validateEnv();

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(express.json({ limit: '30mb' }));
  app.use(express.urlencoded({ limit: '30mb', extended: true }));
  app.useWebSocketAdapter(new WsAdapter(app));
  app.useGlobalPipes(new ZodValidationPipe());

  app.enableCors({
    // Origin allow-listing lives in `@remote-platform/common` so it is a pure,
    // unit-tested security boundary (see libs/common/src/security/cors-origin.ts).
    origin: createCorsOriginValidator(),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  app.useGlobalFilters(
    new AllExceptionsFilter(),
    new HttpExceptionFilter(),
    new QueryFailedExceptionFilter(),
  );

  // Swagger API documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Remote DevTools - External API')
    .setDescription('외부 플랫폼 API (SDK, CDP 데이터 수집, Jira/Slack 연동)')
    .setVersion('1.0')
    .build();
  SwaggerModule.setup(
    'api/docs',
    app,
    cleanupOpenApiDoc(SwaggerModule.createDocument(app, swaggerConfig)),
  );

  await app.listen(process.env.PORT || 3001);

  process.on('uncaughtException', (err) => {
    const logger = new Logger('UncaughtException');
    logger.error(
      `[UNCAUGHT_EXCEPTION] ${JSON.stringify({
        error:
          err instanceof Error
            ? { message: err.message, stack: err.stack, name: err.name }
            : JSON.stringify(err),
        timestamp: new Date().toISOString(),
        processId: process.pid,
      })}`,
    );
  });
}

void bootstrap();
