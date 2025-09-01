import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { WsAdapter } from "@nestjs/platform-ws";
import * as express from "express";

import { AllExceptionsFilter } from "@remote-platform/common";

import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });

  app.use(express.json({ limit: "30mb" }));
  app.use(express.urlencoded({ limit: "30mb", extended: true }));
  app.useWebSocketAdapter(new WsAdapter(app));

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || origin === "null") {
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

  app.useGlobalFilters(new AllExceptionsFilter());

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
