import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { WsAdapter } from "@nestjs/platform-ws";
import * as express from "express";

import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { HttpExceptionFilter } from "./filters/http-exception.filter";
import { QueryFailedExceptionFilter } from "./filters/query-failed-exception.filter";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false, // 기본 body parser 비활성화
  });

  // Express body-parser 직접 설정 (30MB)
  app.use(express.json({ limit: "30mb" }));
  app.use(express.urlencoded({ limit: "30mb", extended: true }));
  app.useWebSocketAdapter(new WsAdapter(app));
  // 전역 예외 필터 적용 (표준화된 에러 응답)
  app.useGlobalFilters(
    new AllExceptionsFilter(),
    new HttpExceptionFilter(),
    new QueryFailedExceptionFilter(),
  );
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        // WebSocket, Postman 등 origin이 없는 요청 허용
        return callback(null, true);
      }

      // CORS 허용 패턴 설정
      // 프로덕션 환경에서는 환경변수 CORS_ALLOWED_ORIGINS를 설정하세요
      // 예: CORS_ALLOWED_ORIGINS=example.com,myapp.com
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
    allowedHeaders: ["Content-Type", "Authorization"],
  });
  await app.listen(process.env.PORT || 3000);

  process.on("uncaughtException", (err) => {
    const logger = new Logger("UncaughtException");
    logger.error(
      `[UNCAUGHT_EXCEPTION] ${JSON.stringify({
        error:
          err instanceof Error
            ? {
                message: err.message,
                stack: err.stack,
                name: err.name,
              }
            : JSON.stringify(err),
        timestamp: new Date().toISOString(),
        processId: process.pid,
      })}`,
    );
  });
}

void bootstrap();
