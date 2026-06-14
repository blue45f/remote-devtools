// MUST be the first import — installs Sentry hooks before NestJS wires modules.
import './instrument';

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { WsAdapter } from '@nestjs/platform-ws';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import {
  AllExceptionsFilter,
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
import type { Request, Response } from 'express';

function assertRequiredEnv(): void {
  const appEnv = (process.env.APP_ENV ?? 'local').toLowerCase();
  if (['local', 'development', 'dev'].includes(appEnv)) return;

  const missing: string[] = [];
  if (!process.env.AUTH_JWT_SECRET) missing.push('AUTH_JWT_SECRET');
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

interface RequestWithRawBody extends Request {
  rawBody?: Buffer;
}

function preserveBillingWebhookRawBody(req: Request, _res: Response, buffer: Buffer): void {
  if (req.originalUrl.startsWith('/api/billing/webhook')) {
    (req as RequestWithRawBody).rawBody = Buffer.from(buffer);
  }
}

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
  app.use(express.json({ limit: '30mb', verify: preserveBillingWebhookRawBody }));
  app.use(express.urlencoded({ limit: '30mb', extended: true }));
  app.useWebSocketAdapter(new WsAdapter(app));
  app.useGlobalPipes(new ZodValidationPipe());

  app.useGlobalFilters(
    new AllExceptionsFilter({ sdkCompatible: true }),
    new HttpExceptionFilter(),
    new QueryFailedExceptionFilter(),
  );

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      const customOrigins = process.env.CORS_ALLOWED_ORIGINS?.split(',') || [];
      const customPatterns = customOrigins.map(
        (domain) => new RegExp(`^https?:\\/\\/[^/]+\\.${domain.trim().replace(/\./g, '\\.')}$`),
      );

      const allowedPatterns = [/^https?:\/\/localhost(:\d+)?$/, ...customPatterns];

      const isAllowed = allowedPatterns.some((pattern) => pattern.test(origin));

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'stripe-signature'],
  });

  // Swagger API documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Remote DevTools - Internal API')
    .setDescription('내부 플랫폼 API (세션 리플레이, 대시보드, 사용자 관리)')
    .setVersion('1.0')
    .build();
  SwaggerModule.setup(
    'api/docs',
    app,
    cleanupOpenApiDoc(SwaggerModule.createDocument(app, swaggerConfig)),
  );

  await app.listen(process.env.PORT || 3000);

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
