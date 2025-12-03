import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

export interface Response<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
  path: string;
  time?: number;
}

/**
 * 모든 응답을 일관된 형식으로 변환하는 인터셉터
 *
 * 성공 응답:
 * {
 *   success: true,
 *   data: {...},
 *   timestamp: "...",
 *   path: "/api/...",
 *   time: 123
 * }
 *
 * 에러 응답 (글로벌 필터에서 처리):
 * {
 *   success: false,
 *   error: {
 *     code: "DEVICE_001",
 *     message: "...",
 *     details: {...}
 *   },
 *   timestamp: "...",
 *   path: "/api/..."
 * }
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
  private readonly logger = new Logger(ResponseInterceptor.name);

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    const request = context.switchToHttp().getRequest();
    const startTime = Date.now();

    return next.handle().pipe(
      map((data) => {
        const elapsedTime = Date.now() - startTime;

        // 이미 우리 형식인 경우 (controller에서 직접 반환)
        if (data && typeof data === "object" && "success" in data) {
          return {
            ...data,
            timestamp: new Date().toISOString(),
            path: request.url,
          };
        }

        // 일반 데이터를 우리 형식으로 변환
        return {
          success: true,
          data,
          timestamp: new Date().toISOString(),
          path: request.url,
          time: elapsedTime,
        };
      }),
    );
  }
}
