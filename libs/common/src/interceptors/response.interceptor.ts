import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

/**
 * API 응답의 표준 형식을 정의하는 인터페이스.
 * @template T - 응답 데이터의 타입
 */
export interface StandardResponse<T> {
  /** 요청 성공 여부 */
  success: boolean;
  /** 응답 데이터 (선택) */
  data?: T;
  /** 에러 정보 (선택) */
  error?: {
    /** 에러 코드 */
    code: string;
    /** 에러 메시지 */
    message: string;
    /** 추가 에러 상세 정보 (선택) */
    details?: any;
  };
  /** 응답 생성 시각 (ISO 8601 형식) */
  timestamp: string;
  /** 요청 경로 */
  path: string;
  /** 요청 처리 소요 시간 (밀리초, 선택) */
  time?: number;
}

/**
 * 모든 HTTP 응답을 표준 형식(StandardResponse)으로 래핑하는 인터셉터.
 * 이미 표준 형식인 응답은 timestamp와 path만 추가하고,
 * 그 외 응답은 success, data, timestamp, path, time 필드로 래핑한다.
 * @template T - 응답 데이터의 타입
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  StandardResponse<T>
> {
  /**
   * 요청을 가로채어 응답을 표준 형식으로 변환한다.
   * @param context - 실행 컨텍스트 (HTTP 요청 정보 접근용)
   * @param next - 다음 핸들러를 호출하기 위한 CallHandler
   * @returns 표준 형식으로 래핑된 응답 Observable
   */
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<StandardResponse<T>> {
    const request = context.switchToHttp().getRequest();
    const startTime = Date.now();

    return next.handle().pipe(
      map((data) => {
        const elapsedTime = Date.now() - startTime;

        if (data && typeof data === "object" && "success" in data) {
          return {
            ...data,
            timestamp: new Date().toISOString(),
            path: request.url,
          };
        }

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
