/* eslint-disable @typescript-eslint/no-explicit-any */
import { logger } from "../utils/logger";

// Rewrite 규칙 타입 정의
export interface RewriteRule {
  url: string;
  method: string;
  status: number;
  response: any;
  // 요청 변조 관련 필드
  queryString?: string; // 변조할 쿼리스트링 (예: "?param1=value1&param2=value2")
  requestBody?: any; // 변조할 요청 본문
  enabled: boolean;
  createdAt: number;
}

// Rewrite 규칙 저장소
const rewriteRules = new Map<string, RewriteRule>();
let rewriteEnabled = false;

/**
 * Network Rewrite Manager
 * 네트워크 요청/응답 재작성 기능을 관리하는 모듈
 */
export class NetworkRewrite {
  /**
   * Add rewrite rule
   */
  public static addRule(
    url: string,
    method: string,
    status: number,
    response: any,
    queryString?: string,
    requestBody?: any,
  ): void {
    const normalizedMethod = method.toUpperCase();
    const ruleKey = `${normalizedMethod}:${url}`;

    const rule: RewriteRule = {
      url,
      method: normalizedMethod,
      status: status || 200,
      response,
      queryString,
      requestBody,
      enabled: true,
      createdAt: Date.now(),
    };

    // response가 undefined인 경우 제거 (요청만 변조)
    if (response === undefined) {
      delete rule.response;
    }

    // 디버깅 로그
    console.log("[NetworkRewrite.addRule] Adding rule:", {
      url,
      method: normalizedMethod,
      status,
      queryString,
      requestBody,
      response,
    });
    console.log("[NetworkRewrite.addRule] Full rule object:", rule);

    rewriteRules.set(ruleKey, rule);
    rewriteEnabled = true;

    // sessionStorage에 저장
    sessionStorage.setItem(
      "REMOTE_DEBUG_MOCK_RULES",
      JSON.stringify(Array.from(rewriteRules)),
    );
    sessionStorage.setItem("REMOTE_DEBUG_MOCK_ENABLED", "true");

    logger.rewrite.info(
      `Rule added: ${normalizedMethod} ${url} → HTTP ${status}`,
    );
  }

  /**
   * Remove a specific rewrite rule
   */
  public static removeRule(url: string, method: string): void {
    const normalizedMethod = method.toUpperCase();
    const ruleKey = `${normalizedMethod}:${url}`;

    rewriteRules.delete(ruleKey);

    if (rewriteRules.size === 0) {
      rewriteEnabled = false;
      sessionStorage.removeItem("REMOTE_DEBUG_MOCK_RULES");
      sessionStorage.removeItem("REMOTE_DEBUG_MOCK_ENABLED");
    } else {
      sessionStorage.setItem(
        "REMOTE_DEBUG_MOCK_RULES",
        JSON.stringify(Array.from(rewriteRules)),
      );
    }

    logger.rewrite.info(`Rule removed: ${normalizedMethod} ${url}`);
  }

  /**
   * Clear all rewrite rules
   */
  public static clearRules(): void {
    rewriteRules.clear();
    rewriteEnabled = false;
    sessionStorage.removeItem("REMOTE_DEBUG_MOCK_RULES");
    sessionStorage.removeItem("REMOTE_DEBUG_MOCK_ENABLED");
  }

  /**
   * Check if rewrite is enabled
   */
  public static isEnabled(): boolean {
    return rewriteEnabled;
  }

  /**
   * Load rewrite rules from storage
   */
  public static loadRules(): void {
    const stored = sessionStorage.getItem("REMOTE_DEBUG_MOCK_RULES");
    if (stored) {
      const rules = JSON.parse(stored) as Array<[string, RewriteRule]>;
      rules.forEach(([key, rule]) => rewriteRules.set(key, rule));
    }
    rewriteEnabled =
      sessionStorage.getItem("REMOTE_DEBUG_MOCK_ENABLED") === "true";
  }

  /**
   * Get rewrite rule for a specific request
   * @internal Network.ts에서 내부적으로 사용
   */
  public static getRule(method: string, url: string): RewriteRule | undefined {
    const normalizedMethod = method.toUpperCase();
    const urlWithoutQuery = url.split("?")[0];
    const ruleKey = `${normalizedMethod}:${urlWithoutQuery}`;
    const rule = rewriteRules.get(ruleKey);

    return rule && rule.enabled ? rule : undefined;
  }

  /**
   * Get all rewrite rules
   */
  public static getAllRules(): Map<string, RewriteRule> {
    return rewriteRules;
  }

  /**
   * Create XHR rewrite response
   * @internal Network.ts에서 내부적으로 사용
   */
  public static createXHRRewriteResponse(
    xhr: XMLHttpRequest,
    rule: RewriteRule,
    absoluteUrl: string,
  ): void {
    // readyState를 1로 설정 (OPENED)
    Object.defineProperty(xhr, "readyState", {
      value: 1,
      writable: true,
      configurable: true,
    });

    setTimeout(() => {
      // readyState를 2로 변경 (HEADERS_RECEIVED)
      Object.defineProperty(xhr, "readyState", {
        value: 2,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(xhr, "status", {
        value: rule.status,
        writable: false,
      });
      Object.defineProperty(xhr, "statusText", {
        value: rule.status >= 400 ? "Error" : "OK",
        writable: false,
      });

      // readystatechange 이벤트 (readyState = 2)
      if (xhr.onreadystatechange) {
        xhr.onreadystatechange(new Event("readystatechange"));
      }
      xhr.dispatchEvent(new Event("readystatechange"));

      // readyState를 3으로 변경 (LOADING)
      Object.defineProperty(xhr, "readyState", {
        value: 3,
        writable: true,
        configurable: true,
      });

      // readystatechange 이벤트 (readyState = 3)
      if (xhr.onreadystatechange) {
        xhr.onreadystatechange(new Event("readystatechange"));
      }
      xhr.dispatchEvent(new Event("readystatechange"));

      // readyState를 4로 변경 (DONE)
      Object.defineProperty(xhr, "readyState", { value: 4, writable: false });

      // responseType에 따른 response 설정
      const responseType = xhr.responseType || "text";
      let responseValue = JSON.stringify(rule.response);

      if (responseType === "json") {
        responseValue = rule.response;
      }

      Object.defineProperty(xhr, "responseText", {
        value: JSON.stringify(rule.response),
        writable: false,
      });
      Object.defineProperty(xhr, "response", {
        value: responseValue,
        writable: false,
      });
      Object.defineProperty(xhr, "responseURL", {
        value: absoluteUrl,
        writable: false,
      });

      // 응답 헤더 설정
      const rewriteHeaders =
        "Content-Type: application/json\r\nX-Rewrite-Response: true";
      Object.defineProperty(xhr, "getAllResponseHeaders", {
        value: () => rewriteHeaders,
        writable: false,
      });
      Object.defineProperty(xhr, "getResponseHeader", {
        value: (header: string) => {
          if (header.toLowerCase() === "content-type")
            return "application/json";
          if (header.toLowerCase() === "x-rewrite-response") return "true";
          return null;
        },
        writable: false,
      });

      // readystatechange 이벤트 (readyState = 4)
      const readyStateEvent = new Event("readystatechange");
      xhr.dispatchEvent(readyStateEvent);

      // loadstart 이벤트
      const loadStartEvent = new ProgressEvent("loadstart", {
        lengthComputable: true,
        loaded: 0,
        total: JSON.stringify(rule.response).length,
      });
      xhr.dispatchEvent(loadStartEvent);

      // XHR/axios 표준: 4xx/5xx는 error 이벤트 발생
      if (rule.status >= 400) {
        const errorEvent = new ProgressEvent("error", {
          lengthComputable: false,
          loaded: 0,
          total: 0,
        });
        xhr.dispatchEvent(errorEvent);

        // onerror 콜백 실행
        if (xhr.onerror) {
          xhr.onerror(errorEvent);
        }

        logger.rewrite.debug(
          `XHR Rewrite: status=${rule.status}, error event dispatched`,
        );
      } else {
        // 성공 응답인 경우만 load 이벤트 발생
        const loadEvent = new ProgressEvent("load", {
          lengthComputable: true,
          loaded: JSON.stringify(rule.response).length,
          total: JSON.stringify(rule.response).length,
        });
        xhr.dispatchEvent(loadEvent);

        // onload 콜백 실행
        if (xhr.onload) {
          xhr.onload(loadEvent);
        }
      }

      // loadend 이벤트
      const loadEndEvent = new ProgressEvent("loadend", {
        lengthComputable: true,
        loaded: JSON.stringify(rule.response).length,
        total: JSON.stringify(rule.response).length,
      });
      xhr.dispatchEvent(loadEndEvent);

      // onreadystatechange 콜백은 항상 실행
      if (xhr.onreadystatechange) {
        xhr.onreadystatechange(readyStateEvent);
      }
    }, 10); // 비동기 처리를 위한 짧은 지연
  }

  /**
   * Create Fetch rewrite response
   * @internal Network.ts에서 내부적으로 사용
   */
  public static createFetchRewriteResponse(
    rule: RewriteRule,
    url: string,
    method: string,
  ): Response {
    // Rewrite 응답 상세 정보 출력
    logger.rewrite.info(`[Fetch] ${method} ${url} → ${rule.status}`);
    logger.rewrite.debug("Response body:", rule.response);

    // Rewrite Response 생성
    const rewriteResponse = new Response(JSON.stringify(rule.response), {
      status: rule.status,
      statusText: rule.status >= 400 ? "Error" : "OK",
      headers: {
        "Content-Type": "application/json",
        "X-Rewriteed-Response": "true",
      },
    });

    // Fetch는 항상 resolve (4xx/5xx도 성공 응답)
    // 사용자가 response.ok를 체크해야 함
    if (rule.status >= 400) {
      logger.rewrite.debug(
        `Fetch Rewrite: status=${rule.status}, response.ok will be false`,
      );
    }

    return rewriteResponse;
  }
}
