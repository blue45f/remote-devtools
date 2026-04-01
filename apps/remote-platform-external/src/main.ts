import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { WsAdapter } from "@nestjs/platform-ws";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import * as express from "express";
import helmet from "helmet";

import {
  AllExceptionsFilter,
  HttpExceptionFilter,
  QueryFailedExceptionFilter,
} from "@remote-platform/common";

import { AppModule } from "./app.module";

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
  app.use(express.json({ limit: "30mb" }));
  app.use(express.urlencoded({ limit: "30mb", extended: true }));
  app.useWebSocketAdapter(new WsAdapter(app));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      const customOrigins = process.env.CORS_ALLOWED_ORIGINS?.split(",") || [];
      const customPatterns = customOrigins.map(
        (domain) =>
          new RegExp(
            `^https?:\\/\\/[^/]+\\.${domain.trim().replace(/\./g, "\\.")}$`,
          ),
      );

      const allowedPatterns = [
        /^https?:\/\/localhost(:\d+)?$/,
        ...customPatterns,
      ];

      const isAllowed = allowedPatterns.some((pattern) => pattern.test(origin));

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  });

  app.useGlobalFilters(
    new AllExceptionsFilter(),
    new HttpExceptionFilter(),
    new QueryFailedExceptionFilter(),
  );

  // Swagger API documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle("Remote DevTools - External API")
    .setDescription("외부 플랫폼 API (SDK, CDP 데이터 수집, Jira/Slack 연동)")
    .setVersion("1.0")
    .build();
  SwaggerModule.setup(
    "api/docs",
    app,
    SwaggerModule.createDocument(app, swaggerConfig),
  );

  await app.listen(process.env.PORT || 3001);

  process.on("uncaughtException", (err) => {
    const logger = new Logger("UncaughtException");
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
