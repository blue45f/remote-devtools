/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/* eslint-disable @typescript-eslint/no-this-alias */
import jsCookie from "js-cookie";
import mime from "mime";

import { getAbsolutePath, key2UpperCase } from "../common/utils";
import { logger } from "../utils/logger";

import { BaseDomain, Option } from "./base";
import { NetworkRewrite } from "./network-rewrite";
import { Events } from "./protocol";

const getTimestamp = () => Date.now() / 1000;

// 원본 fetch 함수 저장 (전역)
let originalFetch: typeof fetch | null = null;

/**
 * 리소스 타입을 Content-Type과 URL을 기반으로 결정
 * Chrome DevTools Protocol ResourceType 기준
 */
const getResourceType = (
  url: string,
  contentType?: string | null,
  isXHR: boolean = false,
): string => {
  // Content-Type 기반 판단
  if (contentType) {
    const lowerContentType = contentType.toLowerCase();

    // Document (HTML)
    if (lowerContentType.includes("text/html")) return "Document";

    // Stylesheet (CSS)
    if (lowerContentType.includes("text/css")) return "Stylesheet";

    // Script (JavaScript)
    if (
      lowerContentType.includes("javascript") ||
      lowerContentType.includes("ecmascript")
    )
      return "Script";

    // Image
    if (lowerContentType.includes("image/")) return "Image";

    // Font
    if (
      lowerContentType.includes("font/") ||
      lowerContentType.includes("application/font")
    )
      return "Font";

    // Media (Audio/Video)
    if (
      lowerContentType.includes("video/") ||
      lowerContentType.includes("audio/")
    )
      return "Media";

    // JSON/API 요청 - XHR/Fetch로 분류
    if (
      lowerContentType.includes("application/json") ||
      lowerContentType.includes("application/xml")
    ) {
      return isXHR ? "XHR" : "Fetch";
    }
  }

  // URL 확장자 기반 판단 (fallback)
  const urlPath = url.split("?")[0].toLowerCase();

  // 확장자로 판단
  if (urlPath.endsWith(".html") || urlPath.endsWith(".htm")) return "Document";
  if (urlPath.endsWith(".css")) return "Stylesheet";
  if (
    urlPath.endsWith(".js") ||
    urlPath.endsWith(".mjs") ||
    urlPath.endsWith(".ts")
  )
    return "Script";
  if (urlPath.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/)) return "Image";
  if (urlPath.match(/\.(woff|woff2|ttf|eot|otf)$/)) return "Font";
  if (urlPath.match(/\.(mp4|webm|mp3|wav|ogg)$/)) return "Media";

  // API 패턴 확인
  if (
    urlPath.includes("/api/") ||
    urlPath.includes("/graphql") ||
    urlPath.includes("/rest/")
  ) {
    return isXHR ? "XHR" : "Fetch";
  }

  // 루트 경로는 Document로 간주
  if (urlPath === "/" || urlPath === "") {
    return "Document";
  }

  // 기본값: 확장자가 없으면 API 요청으로 간주
  return isXHR ? "XHR" : "Fetch";
};

// 전역 responseData 저장소
const globalResponseData = new Map();

// 인터셉터 초기화 플래그
let interceptorsInitialized = false;

export class Network extends BaseDomain {
  /**
   * NetworkRewrite 서브모듈
   * @static
   */
  public static Rewrite = NetworkRewrite;

  /**
   * Format http response header
   * @static
   * @param {String} header http response header eg：content-type: application/json; charset=UTF-8\n date: Wed, 15 Sep 2021 07:20:26 GMT
   */
  public static formatResponseHeader(header: string): Record<string, string> {
    const headers = new Map();
    header
      .split("\n")
      .filter((val) => val)
      .forEach((item) => {
        const [key, val] = item.split(":");
        headers.set(key2UpperCase(key), val);
      });
    return Object.fromEntries(headers);
  }

  /**
   * Get the default http request header, currently only ua, cookie
   * @static
   */
  public static getDefaultHeaders(): Record<string, string> {
    const headers = {
      "User-Agent": navigator.userAgent,
      ...(document.cookie && { Cookie: document.cookie }),
    };

    return headers;
  }

  /**
   * Get global response data map
   * @static
   */
  public static getGlobalResponseData(): Map<number, any> {
    return globalResponseData;
  }

  /**
   * Initialize interceptors for network manipulation
   * This is called once at SDK initialization to capture all network requests
   * @static
   */
  public static initInterceptors(): void {
    if (interceptorsInitialized) {
      return;
    }

    // Rewrite 규칙 로드
    NetworkRewrite.loadRules();

    // 초기화 플래그 설정
    interceptorsInitialized = true;
  }

  /**
   * @public
   */
  public getCookies(): { cookies: { name: string; value: string }[] } {
    const cookies = jsCookie.get();
    return {
      cookies: Object.keys(cookies).map((name) => ({
        name,
        value: cookies[name],
      })),
    };
  }

  constructor(option: Option) {
    super(option);

    // 원본 fetch를 전역으로 저장 (이미 저장되지 않았다면)
    if (!originalFetch) {
      originalFetch = window.fetch.bind(window);
    }
    this.originFetch = originalFetch;

    // 인터셉터가 초기화되지 않았다면 초기화
    if (!interceptorsInitialized) {
      NetworkRewrite.loadRules(); // Rewrite 규칙 로드
      interceptorsInitialized = true;
    }

    // XHR과 Fetch 인터셉터는 한 번만 설정 (첨 인스턴스 생성 시)
    // 이미 설정되어 있다면 건너뛰기
    this.initXhr();
    this.initFetch();
  }

  public getRequestId(): number {
    this.requestId += 1;
    return this.requestId;
  }

  public socketSend = (data: unknown): void => {
    this.cacheRequest.push(data);
    if (this.enabled) {
      this.sendProtocol(data);
    }
  };

  public handleResponseData = (id: number, data: unknown): void => {
    this.responseData.set(id, data);
    if (
      this.enabled &&
      (this.recordMode || (this.room && this.room.startsWith("Buffer-")))
    ) {
      globalResponseData.set(id, data);
      this.sendResponseData(id, this.getResponseBody({ requestId: id }));
    }
  };

  public enable(): void {
    this.enabled = true;

    // Fetch와 XMLHttpRequest 인터셉트 시작

    // 캐시된 요청들을 전송 (socketSend는 자동으로 버퍼 모드 체크 포함)
    this.cacheRequest.forEach((data) => {
      this.socketSend(data);
    });

    // 녹화 모드일 때 응답 데이터 전송
    if (this.recordMode) {
      globalResponseData.forEach((_, id) => {
        this.sendResponseData(id, this.getResponseBody({ requestId: id }));
      });
    }

    // 버퍼 모드일 때 캐시된 응답 데이터도 버퍼에 추가
    const isBufferMode = this.room && this.room.startsWith("Buffer-");
    if (isBufferMode) {
      this.responseData.forEach((_, id) => {
        this.sendResponseData(id, this.getResponseBody({ requestId: id }));
      });
    }

    this.reportImageNetwork();
  }

  public disable(): void {
    this.enabled = false;
    // 캐시와 응답 데이터는 유지 (재연결 시 전송할 수 있도록)
  }

  /**
   * 녹화 세션 전환 시점에 캐시된 요청/응답을 한 번 더 전송한다.
   */
  public flushCachedEventsForRecord(): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    if (!this.recordMode || !this.room || this.room.startsWith("Buffer-")) {
      return;
    }

    this.cacheRequest.forEach((data) => {
      this.sendProtocol(data);
    });

    this.responseData.forEach((_, id) => {
      this.sendResponseData(id, this.getResponseBody({ requestId: id }));
    });
  }

  /**
   * Get network response content
   * @public
   * @param {Object} param
   * @param {Number} param.requestId
   */
  public getResponseBody({ requestId }: { requestId: number }): {
    body: string;
    base64Encoded: boolean;
  } {
    let body = "";
    let base64Encoded = false;
    const response = globalResponseData.get(requestId);

    if (typeof response === "string") {
      body = response;
    } else if (response) {
      // XHR/Fetch 응답 처리 (responseBody 필드)
      if (response.responseBody !== undefined) {
        body = response.responseBody;
      }
      // Image 응답 처리 (data 필드)
      else if (response.data !== undefined) {
        body = response.data;
        base64Encoded = true;
      }
    }

    // 이미 minified 형태로 저장되어 있으므로 추가 처리 불필요
    // DevTools가 자체적으로 pretty print를 수학함

    return { body, base64Encoded };
  }

  private static xhrInitialized = false;

  public initXhr(): void {
    // 이미 초기화되었으면 건너뛰기
    if (Network.xhrInitialized) {
      return;
    }
    Network.xhrInitialized = true;
    const instance = this;
    const xhrSend = XMLHttpRequest.prototype.send;
    const xhrOpen = XMLHttpRequest.prototype.open;
    const xhrSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
    XMLHttpRequest.prototype.open = function (
      method: string,
      url: string | URL,
      async: boolean = true,
      username?: string | null,
      password?: string | null,
    ) {
      (this as any).$$request = {
        method: method.toUpperCase(),
        url: getAbsolutePath(url),
        requestId: instance.getRequestId(),
        headers: Network.getDefaultHeaders(),
      };

      // Rewrite 처리를 위해 절대 URL 저장
      (this as any).$$absoluteUrl = getAbsolutePath(url);
      (this as any).$$method = method.toUpperCase();

      xhrOpen.apply(this, [method, url, async, username, password]);
    };

    XMLHttpRequest.prototype.send = function (data) {
      const xhr = this as any;
      const absoluteUrl = xhr.$$absoluteUrl;
      const method = xhr.$$method;

      // Rewrite 규칙 체크
      if (NetworkRewrite.isEnabled() && absoluteUrl && method) {
        const rewriteRule = NetworkRewrite.getRule(method, absoluteUrl);

        if (rewriteRule) {
          // 요청 변조 처리
          let modifiedData = data;
          let modifiedUrl = absoluteUrl;

          // Query String 변조
          if (rewriteRule.queryString !== undefined) {
            const baseUrl = absoluteUrl.split("?")[0];
            modifiedUrl = baseUrl + rewriteRule.queryString;
            logger.rewrite.debug(
              `[XHR Request] Query String 변조: ${rewriteRule.queryString}`,
            );
          }

          // Request Body 변조
          if (rewriteRule.requestBody !== undefined) {
            modifiedData =
              typeof rewriteRule.requestBody === "string"
                ? rewriteRule.requestBody
                : JSON.stringify(rewriteRule.requestBody);
            logger.rewrite.debug(`[XHR Request] Body 변조: ${modifiedData}`);
          }

          // 응답도 변조하는 경우
          if (rewriteRule.response !== undefined) {
            logger.rewrite.info(
              `[XHR] ${method} ${absoluteUrl} → ${rewriteRule.status}`,
            );
            logger.rewrite.debug("Response body:", rewriteRule.response);

            // NetworkRewrite 모듈의 XHR 응답 생성 메서드 사용
            NetworkRewrite.createXHRRewriteResponse(
              this,
              rewriteRule,
              absoluteUrl,
            );

            // 데이터 저장 (디버깅용)
            setTimeout(() => {
              const request = xhr.$$request;
              if (request) {
                instance.handleResponseData(request.requestId, {
                  url: absoluteUrl,
                  method: method.toUpperCase(),
                  status: rewriteRule.status,
                  statusText: "OK",
                  responseBody: JSON.stringify(rewriteRule.response),
                  timestamp: Date.now(),
                  type: "XHR",
                });
              }
            }, 10);

            return; // 실제 요청 보내지 않음
          }

          // 요청만 변조하고 실제 요청은 보내기
          if (
            rewriteRule.queryString !== undefined ||
            rewriteRule.requestBody !== undefined
          ) {
            // URL이 변경되었으면 open을 다시 호출
            if (modifiedUrl !== absoluteUrl) {
              xhrOpen.call(this, method, modifiedUrl, true);
              xhr.$$absoluteUrl = modifiedUrl;
              xhr.$$request.url = modifiedUrl;
            }

            // 변경된 데이터로 요청 전송
            xhrSend.call(this, modifiedData);

            // 나머지 인터셉터 로직 실행
            const request = (this as any).$$request;
            const { requestId } = request;
            const reqMethod = request.method;
            if (reqMethod.toLowerCase() === "post") {
              request.postData = modifiedData;
              request.hasPostData = !!modifiedData;
            }

            instance.socketSend({
              method: Events.requestWillBeSent,
              params: {
                documentURL: location.href,
                request: {
                  url: modifiedUrl,
                  method: reqMethod.toUpperCase(),
                  headers: request.headers,
                  mixedContentType: "none",
                  initialPriority: "High",
                  referrerPolicy: "no-referrer-when-downgrade",
                  ...(reqMethod.toLowerCase() === "post" && {
                    postData: modifiedData,
                    hasPostData: !!modifiedData,
                  }),
                },
                requestId,
                timestamp: getTimestamp(),
                wallTime: Date.now(),
                type: getResourceType(modifiedUrl, null, true),
              },
            });

            return; // 나머지 기본 로직 건너뛰기
          }
        }
      }

      // Rewrite이 아닌 경우 기존 로직 실행
      xhrSend.call(this, data);

      const request = (this as any).$$request;
      const { requestId, url } = request;
      const reqMethod = request.method;
      if (reqMethod.toLowerCase() === "post") {
        request.postData = data;
        request.hasPostData = !!data;
      }

      instance.socketSend({
        method: Events.requestWillBeSent,
        params: {
          requestId,
          request,
          documentURL: location.href,
          timestamp: getTimestamp(),
          wallTime: Date.now(),
          type: getResourceType(url, null, true), // URL 기반으로 추정, XHR = true
        },
      });

      // 이벤트 리스너 중복 방지
      if (!(this as any).$$listenersAdded) {
        (this as any).$$listenersAdded = true;

        this.addEventListener("readystatechange", () => {
          if (this.readyState === 4) {
            const headers = this.getAllResponseHeaders();
            const responseHeaders = Network.formatResponseHeader(headers);

            // Content-Type이 없으면 기본값 설정
            if (
              !responseHeaders["Content-Type"] &&
              !responseHeaders["content-type"]
            ) {
              // JSON 요청인 경우 기본값으로 application/json 설정
              const isJsonUrl =
                url.includes("json") ||
                url.includes("/api/") ||
                url.includes("jsonplaceholder");
              if (isJsonUrl) {
                responseHeaders["Content-Type"] =
                  "application/json; charset=utf-8";
              }
            }

            instance.sendNetworkEvent({
              requestId,
              url: getAbsolutePath(url),
              headers: responseHeaders,
              blockedCookies: [],
              headersText: headers || "Content-Type: application/json\r\n",
              type: "XHR",
              status: this.status,
              statusText: this.statusText,
              encodedDataLength: Number(
                this.getResponseHeader("Content-Length"),
              ),
            });
          }
        });

        this.addEventListener("load", () => {
          if (this.responseType === "" || this.responseType === "text") {
            const request = (this as any).$$request;

            // Response가 JSON인지 확인하고 Content-Type 설정
            let isJson = false;
            try {
              if (this.responseText) {
                JSON.parse(this.responseText);
                isJson = true;
              }
            } catch {
              //
            }

            // JSON이면 sendNetworkEvent를 다시 호출하여 mimeType 업데이트
            if (isJson) {
              const headers = this.getAllResponseHeaders();
              const responseHeaders = Network.formatResponseHeader(headers);

              // Content-Type이 없으면 application/json으로 설정
              if (!responseHeaders["Content-Type"]) {
                responseHeaders["Content-Type"] =
                  "application/json; charset=utf-8";
              }

              // 다시 sendNetworkEvent 호출하여 mimeType 업데이트
              instance.sendNetworkEvent({
                requestId: request.requestId,
                url: request.url,
                headers: responseHeaders,
                blockedCookies: [],
                headersText: headers || "Content-Type: application/json\r\n",
                type: "XHR",
                status: this.status,
                statusText: this.statusText,
                encodedDataLength: this.responseText.length,
              });
            }

            // JSON을 minified 형태로 저장 (DevTools pretty print 지원)
            let processedBody = this.responseText;
            try {
              const parsed = JSON.parse(this.responseText);
              processedBody = JSON.stringify(parsed); // minified
            } catch {
              // JSON이 아닌 경우 원본 유지
            }

            instance.handleResponseData(request.requestId, {
              url: request.url,
              method: request.method,
              status: this.status,
              statusText: this.statusText,
              responseBody: processedBody,
              requestBody: request.postData,
              timestamp: Date.now(),
              type: "XHR",
            });
          }
        });
      }
    };

    XMLHttpRequest.prototype.setRequestHeader = function (key, value) {
      const request = (this as any).$$request;
      if (request) {
        request.headers[key] = String(value);
      }
      xhrSetRequestHeader.call(this, key, value);
    };
  }

  private static fetchInitialized = false;

  /**
   * Intercept Fetch requests
   * @private
   */
  public initFetch(): void {
    // 이미 초기화되었으면 건너뛰기
    if (Network.fetchInitialized) {
      return;
    }
    Network.fetchInitialized = true;

    // 원본 fetch를 전역으로 저장 (최초 1회만)
    if (!originalFetch) {
      originalFetch = window.fetch.bind(window);
    }

    const instance = this;
    window.fetch = function (request, initConfig = {}) {
      let url;
      let method;
      let data: any;
      let finalInitConfig = initConfig; // 최종적으로 사용할 config

      // When request is a string, it is the requested url
      if (typeof request === "string" || request instanceof URL) {
        url = request;
        method = (initConfig.method || "GET").toUpperCase();
        data = initConfig.body;
      } else {
        // Otherwise it is a Request object
        ({ url, method } = request);
        method = (method || "GET").toUpperCase();
      }

      url = getAbsolutePath(url);

      // Rewrite 규칙 체크
      if (NetworkRewrite.isEnabled()) {
        const normalizedMethod = (method || "GET").toUpperCase();
        const rewriteRule = NetworkRewrite.getRule(normalizedMethod, url);

        if (rewriteRule) {
          // 요청 변조 처리
          let modifiedUrl = url;
          let modifiedData = data;

          // Query String 변조
          if (rewriteRule.queryString !== undefined) {
            const baseUrl = url.split("?")[0];
            modifiedUrl = baseUrl + rewriteRule.queryString;
            logger.rewrite.debug(
              `[Fetch Request] Query String 변조: ${rewriteRule.queryString}`,
            );
          }

          // Request Body 변조
          if (rewriteRule.requestBody !== undefined) {
            modifiedData =
              typeof rewriteRule.requestBody === "string"
                ? rewriteRule.requestBody
                : JSON.stringify(rewriteRule.requestBody);
            // initConfig 업데이트
            finalInitConfig = { ...initConfig, body: modifiedData };
            logger.rewrite.debug(`[Fetch Request] Body 변조: ${modifiedData}`);
          }

          // 응답도 변조하는 경우
          if (rewriteRule.response !== undefined) {
            // NetworkRewrite 모듈의 Fetch 응답 생성 메서드 사용
            const rewriteResponse = NetworkRewrite.createFetchRewriteResponse(
              rewriteRule,
              modifiedUrl,
              normalizedMethod,
            );
            return Promise.resolve(rewriteResponse);
          }

          // 요청만 변조하고 실제 요청 전송
          if (
            rewriteRule.queryString !== undefined ||
            rewriteRule.requestBody !== undefined
          ) {
            url = modifiedUrl;
            data = modifiedData;

            // Request 객체인 경우 새로 생성
            if (typeof request !== "string" && !(request instanceof URL)) {
              request = new Request(modifiedUrl, {
                ...request,
                body: modifiedData,
              });
            } else {
              request = modifiedUrl;
            }
          }
        }
      }
      const requestId = instance.getRequestId();
      const sendRequest = new Map<string, any>();

      sendRequest.set("url", url);
      sendRequest.set("method", method);
      sendRequest.set("requestId", requestId);
      sendRequest.set("headers", Network.getDefaultHeaders());

      if (method.toLowerCase() === "post") {
        sendRequest.set("postData", data);
        sendRequest.set("hasPostData", !!data);
      }

      instance.socketSend({
        method: Events.requestWillBeSent,
        params: {
          requestId,
          documentURL: location.href,
          timestamp: getTimestamp(),
          wallTime: Date.now(),
          type: getResourceType(url, null, false), // URL 기반으로 추정, XHR = false
          request: Object.fromEntries(sendRequest),
        },
      });

      let oriResponse: Response;

      // 전역 원본 fetch 사용
      if (!originalFetch) {
        return Promise.reject(
          new Error("[Network] Original fetch is not initialized"),
        );
      }

      return originalFetch(request, finalInitConfig)
        .then((response) => {
          // Temporarily save the raw response to the request
          oriResponse = response;

          const { headers, status, statusText } = response;
          const responseHeaders = new Map();
          let headersText = "";
          headers.forEach((val, key) => {
            key = key2UpperCase(key);
            responseHeaders.set(key, val);
            headersText += `${key}: ${val}\r\n`;
          });

          instance.sendNetworkEvent({
            url,
            requestId,
            status,
            statusText,
            headersText,
            type: "Fetch",
            blockedCookies: [],
            headers: Object.fromEntries(responseHeaders),
            encodedDataLength: Number(headers.get("Content-Length")),
            response,
          });

          const contentType = headers.get("Content-Type");
          if (
            [
              "application/json",
              "application/javascript",
              "text/plain",
              "text/html",
              "text/css",
            ].some((type) => contentType?.includes(type))
          ) {
            return response.clone().text();
          }
          return "";
        })
        .then((responseBody) => {
          // JSON을 minified 형태로 저장 (DevTools pretty print 지원)
          let processedBody = responseBody;
          if (typeof responseBody === "string") {
            try {
              const parsed = JSON.parse(responseBody);
              processedBody = JSON.stringify(parsed); // minified
            } catch {
              // JSON이 아닌 경우 원본 유지
            }
          }

          // 완전한 요청/응답 정보 저장
          instance.handleResponseData(requestId, {
            url,
            method,
            status: oriResponse.status,
            statusText: oriResponse.statusText,
            responseBody: processedBody,
            requestBody:
              method.toLowerCase() === "post" ||
              method.toLowerCase() === "put" ||
              method.toLowerCase() === "patch"
                ? data
                : undefined,
            timestamp: Date.now(),
            type: "Fetch",
          });
          // Returns the raw response to the request
          return oriResponse;
        })
        .catch((error) => {
          const status = error.status || 500; // error 객체에서 상태 코드 추출 (없으면 기본값 500)
          const statusText = error.statusText || "Fetch Error"; // error 객체에서 상태 텍스트 추출 (없으면 기본값)
          const message = error.message || "An unknown error occurred"; // 에러 메시지
          const stack = error.stack || ""; // 에러 스택 트레이스 (옵션)
          const errorDetails = `Message: ${message}\nStack: ${stack}`;

          instance.sendNetworkEvent({
            url,
            requestId,
            status,
            statusText,
            headersText: `Content-Type: text/plain\r\n${errorDetails}`, // 에러 메시지 포함
            type: "Fetch",
            blockedCookies: [],
            headers: { "Content-Type": "text/plain" }, // 기본 헤더
            encodedDataLength: 0, // 실패 시 데이터 길이는 0
          });

          instance.sendNetworkEvent({
            url,
            requestId,
            blockedCookies: [],
            type: "Fetch",
          });
          throw error;
        });
    };
  }

  private sendNetworkEvent(params: any) {
    const {
      requestId,
      headers,
      headersText,
      type,
      url,
      status,
      statusText,
      encodedDataLength,
    } = params;

    // Content-Type 헤더 추출
    let contentType =
      headers?.["Content-Type"] ||
      headers?.["content-type"] ||
      mime.getType(url);

    // Content-Type이 없고 JSON API 패턴인 경우 기본값 설정
    if (!contentType) {
      // URL 패턴으로 JSON API 판단
      const isJsonApi =
        url.includes("json") ||
        url.includes("/api/") ||
        url.includes("/graphql") ||
        url.includes("jsonplaceholder") ||
        url.match(/\/\d+(\/|\?|$)/); // /1, /1?dd=1 같은 패턴

      if (isJsonApi && (type === "XHR" || type === "Fetch")) {
        contentType = "application/json";
        // headers 객체에도 추가
        if (headers && !headers["Content-Type"]) {
          headers["Content-Type"] = "application/json; charset=utf-8";
        }
      }
    }

    // 리소스 타입 결정 (type이 XHR인지 확인)
    const resourceType = getResourceType(url, contentType, type === "XHR");

    this.socketSend({
      method: Events.responseReceivedExtraInfo,
      params: {
        requestId,
        headers: headers || {},
        blockedCookies: [],
        headersText: headersText || "",
      },
    });

    // mimeType에서 charset 제거 (DevTools pretty print 호환성)
    let cleanMimeType = contentType || "text/plain";
    if (cleanMimeType && cleanMimeType.includes("application/json")) {
      cleanMimeType = "application/json"; // charset 정보 제거
    }

    const responseReceivedData = {
      method: Events.responseReceived,
      params: {
        type: resourceType, // 결정된 리소스 타입 사용
        requestId,
        timestamp: getTimestamp(),
        response: {
          url,
          status,
          statusText,
          headers: headers || {},
          mimeType: cleanMimeType, // charset이 제거된 mimeType 사용
        },
      },
    };

    this.socketSend(responseReceivedData);

    setTimeout(() => {
      // loadingFinished event delay report
      this.socketSend({
        method: Events.loadingFinished,
        params: {
          requestId,
          encodedDataLength,
          timestamp: getTimestamp(),
        },
      });
    }, 10);
  }

  public reportImageNetwork(): void {
    const imgUrls = new Set();

    const reportNetwork = (urls: string[]) => {
      urls.forEach(async (url) => {
        const requestId = this.getRequestId();

        try {
          // NOTE: 개발 HMR 활용될 때 import.meta.env 가 없으므로 이를 대응하기 위한 코드
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          const host = `${import.meta.env?.VITE_EXTERNAL_HOST || "http://localhost:3001"}`;
          const { base64 } = await originalFetch!(
            `${host}/image/image_base64?url=${encodeURIComponent(url)}`,
          ).then((res) => res.json());
          this.handleResponseData(requestId, {
            data: base64,
            base64Encoded: true,
          });
        } catch {
          // nothing to do
        }

        this.sendProtocol({
          method: Events.requestWillBeSent,
          params: {
            requestId,
            documentURL: location.href,
            timestamp: getTimestamp(),
            wallTime: Date.now(),
            type: "Image",
            request: { method: "GET", url },
          },
        });

        this.sendNetworkEvent({
          url,
          requestId,
          status: 200,
          statusText: "",
          headersText: "",
          type: "Image",
          blockedCookies: [],
          encodedDataLength: 0,
        });
      });
    };

    const getImageUrls = () => {
      const urls: string[] = [];
      Object.values(document.images).forEach((image) => {
        const url = image.getAttribute("src");
        if (!imgUrls.has(url) && url) {
          imgUrls.add(url);
          urls.push(url);
        }
      });
      return urls;
    };

    const observerBodyMutation = () => {
      const observer = new MutationObserver(() => {
        const urls = getImageUrls();
        if (urls.length) {
          reportNetwork(urls);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    };

    reportNetwork(getImageUrls());
    observerBodyMutation();
  }

  private sendResponseData = (requestId: number, data: any) => {
    // 웹소켓 연결 상태 확인 (OPEN 상태일 때만 전송)
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    // room 정보가 없으면 전송하지 않음
    if (!this.room) {
      return;
    }

    // Buffer 모드인지 확인 (room이 Buffer-로 시작하는지)
    const isBufferMode = this.room.startsWith("Buffer-");

    if (isBufferMode) {
      // Buffer 모드일 때는 bufferEvent로 전송
      const payload = JSON.stringify({
        event: "bufferEvent",
        data: {
          room: this.room,
          recordId: 0, // Buffer 모드에서는 recordId가 0
          deviceId: this.deviceId || "unknown-device",
          url: this.url || window.location.href,
          userAgent: navigator.userAgent,
          event: {
            method: "updateResponseBody",
            params: {
              requestId,
              ...data,
            },
            timestamp: Date.now(),
          },
        },
      });

      try {
        this.socket.send(payload);
      } catch (error) {
        console.error(
          `[Network.sendResponseData] Failed to send response data via bufferEvent:`,
          error,
        );
      }
    } else {
      // 일반 모드일 때는 기존 방식 사용
      const payload = JSON.stringify({
        event: "updateResponseBody",
        data: { requestId, room: this.room, ...data },
      });

      try {
        this.socket.send(payload);
      } catch (error) {
        console.error(
          `[Network.sendResponseData] Failed to send response data via direct event:`,
          error,
        );
      }
    }
  };

  public namespace = "Network";
  public originFetch: typeof fetch;
  public responseData = globalResponseData; // 전역 데이터 참조

  private enabled = false;
  private cacheRequest: any[] = [];
  private requestId = 0;
}
