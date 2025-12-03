import ErrorStackParser from "error-stack-parser";

import {
  createPropertySnapshot,
  getObjectById,
  getObjectProperties,
  objectFormat,
  objectRelease,
} from "../common/remoteObject";

import { BaseDomain, Option } from "./base";
import { Events } from "./protocol";
import {
  GetObjectPropertiesParams,
  PropertyDescriptor,
  RemoteObject,
} from "./runtime.type";

declare global {
  interface Window {
    $: typeof document.querySelector;
    $_: any;
    $$: typeof document.querySelectorAll;
    $x<K extends keyof HTMLElementTagNameMap>(selector: K): (Node | null)[];
    $0: Node;
    $$inspectMode: string;
    clear: typeof console.clear;
    copy: (text: string) => void;
    dir: typeof console.dir;
    dirxml: typeof console.dirxml;
    keys: typeof Object.keys;
    values: typeof Object.values;
    table: typeof console.table;
  }
}

export class Runtime extends BaseDomain {
  public readonly namespace = "Runtime";
  private cacheConsole: any[] = [];
  private cacheError: any[] = [];
  private isEnable = false;
  // 녹화 세션 전환 시 재전송을 위한 백업 캐시
  private sentConsoleCache: any[] = [];
  private sentErrorCache: any[] = [];

  private socketSend = (type: string, data: unknown) => {
    if (type === "console") {
      this.cacheConsole.push(data);
    } else if (type === "error") {
      this.cacheError.push(data);
    }
    if (this.isEnable) {
      this.sendProtocol(data);
    }
  };

  /**
   * set Chrome Command Line Api
   *
   * In older versions of Electron,
   * you might see the printout of the following function as:
   * ```js
   * // console.log($x):
   * $x(xpath, [startNode]) { [Command Line API] }
   * ```
   * @static
   */
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/explicit-member-accessibility
  private static setCommandLineApi() {
    if (typeof window.$ !== "function") {
      window.$ = function <K extends keyof HTMLElementTagNameMap>(selector: K) {
        return document.querySelector(selector);
      };
    }

    if (typeof window.clear !== "function") {
      window.clear = () => console.clear();
    }

    if (typeof window.copy !== "function") {
      window.copy = (object) => {
        function fallbackCopyTextToClipboard(text: string) {
          if (typeof document !== "object") {
            console.error(
              "Copy text failed, running environment is not a browser",
            );
          }
          const textArea = document.createElement("textarea");
          textArea.value = text;
          textArea.style.position = "fixed";
          textArea.style.top = "0";
          textArea.style.left = "0";
          textArea.style.width = "1px";
          textArea.style.height = "1px";
          textArea.style.padding = "0";
          textArea.style.border = "none";
          textArea.style.outline = "none";
          textArea.style.boxShadow = "none";
          textArea.style.background = "transparent";
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          try {
            const successful = document.execCommand("copy");
            if (!successful) console.error("Unable to copy using execCommand");
          } catch (err) {
            console.error("Unable to copy using execCommand:", err);
          }
          document.body.removeChild(textArea);
        }
        const str = String(object);
        if ("clipboard" in navigator) {
          navigator.clipboard.writeText(str).catch(() => {
            fallbackCopyTextToClipboard(str);
          });
        } else {
          fallbackCopyTextToClipboard(str);
        }
      };
    }

    if (typeof window.dir !== "function") {
      window.dir = (object) => console.dir(object);
    }

    if (typeof window.dirxml !== "function") {
      window.dirxml = (object) => console.dirxml(object);
    }

    if (typeof window.keys !== "function") {
      window.keys = (object) => Object.keys(object);
    }

    if (typeof window.values !== "function") {
      window.values = (object: any) => Object.values(object);
    }

    if (typeof window.table !== "function") {
      window.table = (object) => console.table(object);
    }
  }

  constructor(option: Option) {
    super(option);
    // 최신 Runtime 인스턴스를 window에 저장 (클로저 문제 해결)
    // Runtime이 여러 번 생성되어도 항상 최신 인스턴스의 캐시로 로그가 저장됨
    (window as any).__REMOTE_DEBUG_RUNTIME_INSTANCE__ = this;

    // enable() 전에 발생하는 로그도 캐시하기 위해 미리 후킹
    // 중복 방지 로직이 있으므로 enable()에서 다시 호출해도 안전
    this.hookConsole();
    this.listenError();
  }

  /**
   * Get call stack
   * @static
   * @param {Error} error
   */
  public static getCallFrames(error?: Error): any {
    let callFrames = [];
    if (error) {
      callFrames = ErrorStackParser.parse(error).map((frame) => ({
        ...frame,
        url: frame.fileName,
      }));
      // Safari does not support captureStackTrace
    } else if (Error.captureStackTrace !== undefined) {
      callFrames = callsites().map((val) => ({
        functionName: val.getFunctionName(),
        lineNumber: val.getLineNumber(),
        columnNumber: val.getColumnNumber(),
        url: val.getFileName(),
      }));
    } else {
      callFrames = ErrorStackParser.parse(new Error()).map((frame) => ({
        ...frame,
        url: frame.fileName,
      }));
    }

    return callFrames;
  }

  /**
   * Intercept method of console object
   * @private
   */
  private hookConsole() {
    // HMR 환경에서도 유지되는 중복 후킹 방지 (window 객체에 저장)
    if ((window as any).__REMOTE_DEBUG_CONSOLE_HOOKED__) {
      return;
    }
    (window as any).__REMOTE_DEBUG_CONSOLE_HOOKED__ = true;

    // 클로저 대신 window 객체의 인스턴스 참조 사용
    // Runtime이 여러 번 생성되어도 항상 최신 인스턴스로 전달됨
    const getRuntimeInstance = (): Runtime =>
      (window as any).__REMOTE_DEBUG_RUNTIME_INSTANCE__;

    const methods: Record<ConsoleKeys, string> = {
      info: "info",
      log: "log",
      debug: "debug",
      error: "error",
      warn: "warning",
      dir: "dir",
      dirxml: "dirxml",
      table: "table",
      trace: "trace",
      clear: "clear",
      group: "startGroup",
      groupCollapsed: "startGroupCollapsed",
      groupEnd: "endGroup",
    };

    Object.keys(methods).forEach((_key) => {
      const key = _key as ConsoleKeys;

      const nativeConsoleFunc = window.console[key];
      window.console[key] = (...args: unknown[]) => {
        // 원본 console 함수 먼저 호출 (항상 실행되도록)
        nativeConsoleFunc?.(...args);

        try {
          // 프로퍼티 스냅샷을 수집할 배열
          const propertySnapshots: Array<{
            objectId: string;
            ownProperties: boolean;
            properties: PropertyDescriptor[];
          }> = [];

          // 객체를 포맷하고 프로퍼티 스냅샷 생성
          const formattedArgs = args.map((arg) => {
            try {
              const formatted = objectFormat(arg, { preview: true });

              // 객체인 경우 프로퍼티 스냅샷 생성 (녹화 세션 재생용)
              // 단, 안전하게 try-catch로 감싸서 실패해도 계속 진행
              if (
                formatted.objectId &&
                (formatted.type === "object" || formatted.type === "function")
              ) {
                try {
                  const snapshotMap = createPropertySnapshot(
                    formatted.objectId,
                    2,
                  ); // 2단계 깊이로 제한
                  // Record<string, PropertyDescriptor[]> 형태를 배열로 변환
                  for (const [objId, props] of Object.entries(snapshotMap)) {
                    if (Array.isArray(props) && props.length > 0) {
                      propertySnapshots.push({
                        objectId: objId,
                        ownProperties: true,
                        properties: props,
                      });
                    }
                  }
                } catch {
                  // 스냅샷 생성 실패해도 무시
                }
              }

              return formatted;
            } catch {
              // objectFormat 실패 시 기본값 반환
              return { type: "undefined" as const };
            }
          });

          const data = {
            method: Events.consoleAPICalled,
            params: {
              type: methods[key],
              args: formattedArgs,
              executionContextId: 1,
              timestamp: Date.now(),
              stackTrace: {
                // processing call stack
                callFrames: ["error", "warn", "trace", "assert"].includes(key)
                  ? Runtime.getCallFrames()
                  : [],
              },
              // 프로퍼티 스냅샷 포함 (녹화 세션 재생용)
              _propertySnapshots:
                propertySnapshots.length > 0 ? propertySnapshots : undefined,
            },
          };
          getRuntimeInstance().socketSend("console", data);
        } catch {
          // 전체 처리 실패해도 무시 (원본 console은 이미 호출됨)
        }
      };
    });
  }

  /**
   * Global error monitor
   * @private
   */
  private listenError(): void {
    // HMR 환경에서도 유지되는 중복 리스너 방지 (window 객체에 저장)
    if ((window as any).__REMOTE_DEBUG_ERROR_LISTENER_ADDED__) {
      return;
    }
    (window as any).__REMOTE_DEBUG_ERROR_LISTENER_ADDED__ = true;

    // 클로저 대신 window 객체의 인스턴스 참조 사용
    const getRuntimeInstance = (): Runtime =>
      (window as any).__REMOTE_DEBUG_RUNTIME_INSTANCE__;

    const exceptionThrown = (error: any) => {
      const data = {
        method: Events.exceptionThrown,
        params: {
          timestamp: Date.now(),
          exceptionDetails: {
            text: "Uncaught",
            exception: {
              type: "object",
              subtype: "error",
              className: error ? error.name : "Error",
              description: error ? error.stack : "Script error.",
            },
            stackTrace: {
              callFrames: Runtime.getCallFrames(error),
            },
          },
        },
      };
      getRuntimeInstance().socketSend("error", data);
    };

    window.addEventListener("error", (e) => exceptionThrown(e.error));
    window.addEventListener("unhandledrejection", (e) =>
      exceptionThrown(e.reason),
    );
  }

  // Runtime Domain methods

  public enable(): void {
    // 이미 활성화되어 있으면 캐시 재전송 방지
    if (this.isEnable) {
      return;
    }
    this.isEnable = true;

    // 콘솔 인터셉트 시작
    this.hookConsole();
    // 에러 리스너 시작
    this.listenError();

    // 캐시된 로그 전송 및 백업 (녹화 세션 전환 시 재전송용)
    this.cacheConsole.forEach((data) => this.sendProtocol(data));
    this.cacheError.forEach((data) => this.sendProtocol(data));
    // 백업에 추가 (기존 백업과 합침)
    this.sentConsoleCache = [...this.sentConsoleCache, ...this.cacheConsole];
    this.sentErrorCache = [...this.sentErrorCache, ...this.cacheError];
    this.cacheConsole = [];
    this.cacheError = [];

    this.sendProtocol({
      method: Events.executionContextCreated,
      params: {
        context: {
          id: 1,
          name: "top",
          origin: location.origin,
        },
      },
    });
    Runtime.setCommandLineApi();

    // console.log('[Runtime] Console hooks and error listeners activated')
  }

  /**
   * 녹화 세션 전환 시점에 이전에 전송된 콘솔/에러 로그를 재전송
   * Buffer 모드에서 녹화 세션으로 전환될 때 호출
   */
  public flushCachedConsoleForRecord(): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    // Buffer 룸이면 스킵 (실제 녹화 세션일 때만 재전송)
    if (!this.recordMode || !this.room || this.room.startsWith("Buffer-")) {
      return;
    }

    // 백업된 캐시 재전송
    this.sentConsoleCache.forEach((data) => this.sendProtocol(data));
    this.sentErrorCache.forEach((data) => this.sendProtocol(data));

    // 현재 캐시도 전송 (enable 이후 ~ 녹화 세션 전환 사이에 발생한 로그)
    this.cacheConsole.forEach((data) => this.sendProtocol(data));
    this.cacheError.forEach((data) => this.sendProtocol(data));
  }

  /**
   * script execution
   * @public
   * @param {Object} param
   * @param {String} param.expression expression string
   * @param {Boolean} param.generatePreview whether to generate a preview
   */
  public evaluate({
    expression,
    generatePreview,
  }: {
    expression: string;
    generatePreview: boolean;
  }): {
    result: RemoteObject;
    // exceptionDetails: ExceptionDetails
  } {
    // Modifying the scope to the global scope enables variables defined
    // with var to be accessible globally.
    // eslint-disable-next-line
    const res = window.eval(expression)
    // chrome-api
    window.$_ = res;
    return {
      result: objectFormat(res, { preview: generatePreview }),
    };
  }

  /**
   * Get object properties
   * @public
   */
  public getProperties(params: GetObjectPropertiesParams): {
    result: PropertyDescriptor[];
    // internalProperties: InternalPropertyDescriptor
    // privateProperties: PrivatePropertyDescriptor
    // exceptionDetails: ExceptionDetails
  } {
    return {
      result: getObjectProperties(params),
    };
  }

  /**
   * release object
   * @public
   */
  public releaseObject(params: { objectId: string }): void {
    objectRelease(params);
  }

  public callFunctionOn({
    functionDeclaration,
    objectId,
    arguments: args,
    silent,
  }: {
    functionDeclaration: string;
    objectId: string;
    arguments: {
      value: any;
      unserializableValue: string;
      objectId: string;
    }[];
    silent: boolean;
  }):
    | {
        result: any;
        exceptionDetails: any;
      }
    | undefined {
    /** @type {Function} */
    // eslint-disable-next-line no-eval
    const fun = eval(`(() => ${functionDeclaration})()`);
    if (Array.isArray(args)) {
      args = args.map((v) => {
        if (v.value) return v.value;
        if (v.objectId) return getObjectById(v.objectId);

        return undefined;
      });
    }
    if (silent === true) {
      try {
        return fun.apply(objectId ? getObjectById(objectId) : null, args);
      } catch (error) {
        //
      }
    } else {
      return fun.apply(objectId ? getObjectById(objectId) : null, args);
    }
  }
}

type ConsoleKeys = keyof Omit<
  Console,
  | "assert"
  | "Console"
  | "count"
  | "countReset"
  | "profile"
  | "profileEnd"
  | "time"
  | "timeEnd"
  | "timeStamp"
  | "timeLog"
>;

// callsites 를 참고함 (https://github.com/sindresorhus/callsites/blob/main/index.js)
function callsites() {
  const _prepareStackTrace = Error.prepareStackTrace;
  try {
    let result: NodeJS.CallSite[] = [];
    Error.prepareStackTrace = (_, callSites) => {
      const callSitesWithoutCurrent = callSites.slice(1);
      result = callSitesWithoutCurrent;
      return callSitesWithoutCurrent;
    };

    new Error().stack;
    return result;
  } finally {
    Error.prepareStackTrace = _prepareStackTrace;
  }
}
