/**
 * Remote Debug SDK Logger
 *
 * 카테고리별로 구분된 통일된 로깅 시스템
 * - Network: 네트워크 인터셉트, Rewrite 관련
 * - Ticket: 티켓 생성 관련
 * - Remote: 원격 디버깅 (방 생성, WebSocket 등)
 * - Session: 세션 리플레이 관련
 * - SDK: 일반 SDK 초기화/상태
 */

type LogLevel = "debug" | "info" | "warn" | "error";
type LogCategory =
  | "UserData"
  | "Rewrite"
  | "HrefChange"
  | "Remote"
  | "DeepLink"
  | "DeepLinkAction"
  | "CommonInfo";

interface LoggerConfig {
  enabled: boolean;
  level: LogLevel;
  showDebug: boolean;
}

// 로그 레벨별 우선순위
const LOG_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// 카테고리별 색상
const CATEGORY_COLORS: Record<LogCategory, string> = {
  CommonInfo: "#8BC34A", // 연두색
  UserData: "#00BCD4", // 청록색
  Rewrite: "#ff6b35", // 주황색
  HrefChange: "#2196F3", // 파란색
  Remote: "#9C27B0", // 보라색
  DeepLink: "#FF5722", // 빨간색
  DeepLinkAction: "#4CAF50", // 초록색
};

// 로그 레벨별 색상
const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: "#9E9E9E",
  info: "#2196F3",
  warn: "#FF9800",
  error: "#F44336",
};

class Logger {
  private config: LoggerConfig = {
    enabled: true,
    level: "info",
    showDebug: false,
  };

  constructor() {
    // 개발 모드에서만 debug 로그 표시
    if (typeof window !== "undefined") {
      // localStorage에서 설정 읽기
      const savedLevel = localStorage.getItem("REMOTE_DEBUG_LOG_LEVEL");
      if (savedLevel) {
        this.config.level = savedLevel as LogLevel;
        this.config.showDebug = savedLevel === "debug";
      }

      // 개발 환경 감지
      const isDev =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1";
      if (isDev) {
        this.config.showDebug = true;
      }
    }
  }

  /**
   * 로그 레벨 설정
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
    this.config.showDebug = level === "debug";
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("REMOTE_DEBUG_LOG_LEVEL", level);
    }
  }

  /**
   * 로그 활성화/비활성화
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  /**
   * 내부 로그 출력 함수
   */
  private log(
    category: LogCategory,
    level: LogLevel,
    message: string,
    ...args: any[]
  ): void {
    if (!this.config.enabled) return;

    // 로그 레벨 체크
    if (LOG_PRIORITY[level] < LOG_PRIORITY[this.config.level]) return;

    // debug 레벨은 showDebug가 true일 때만
    if (level === "debug" && !this.config.showDebug) return;

    const categoryColor = CATEGORY_COLORS[category];

    // 카테고리 뱃지
    const categoryStyle = `background: ${categoryColor}; color: white; padding: 2px 6px; border-radius: 3px; font-weight: 600;`;

    // 레벨 표시 (warn, error만)
    const levelPrefix = "";

    // 콘솔 메서드 선택
    const consoleMethod =
      level === "error"
        ? console.error
        : level === "warn"
          ? console.warn
          : console.log;

    // 출력
    if (args.length > 0) {
      consoleMethod(
        `%c${category}%c ${levelPrefix}${message}\n`,
        categoryStyle,
        `color: ${level === "error" ? LEVEL_COLORS.error : "inherit"}`,
        ...args,
      );
    } else {
      consoleMethod(
        `%c${category}%c ${levelPrefix}${message}\n`,
        categoryStyle,
        `color: ${level === "error" ? LEVEL_COLORS.error : "inherit"}`,
      );
    }
  }

  // 카테고리별 로거 메서드
  userData = {
    debug: (message: string, ...args: any[]) =>
      this.log("UserData", "debug", message, ...args),
    info: (message: string, ...args: any[]) =>
      this.log("UserData", "info", message, ...args),
    warn: (message: string, ...args: any[]) =>
      this.log("UserData", "warn", message, ...args),
    error: (message: string, ...args: any[]) =>
      this.log("UserData", "error", message, ...args),
  };

  rewrite = {
    debug: (message: string, ...args: any[]) =>
      this.log("Rewrite", "debug", message, ...args),
    info: (message: string, ...args: any[]) =>
      this.log("Rewrite", "info", message, ...args),
    warn: (message: string, ...args: any[]) =>
      this.log("Rewrite", "warn", message, ...args),
    error: (message: string, ...args: any[]) =>
      this.log("Rewrite", "error", message, ...args),
  };

  commonInfo = {
    debug: (message: string, ...args: any[]) =>
      this.log("CommonInfo", "debug", message, ...args),
    info: (message: string, ...args: any[]) =>
      this.log("CommonInfo", "info", message, ...args),
    warn: (message: string, ...args: any[]) =>
      this.log("CommonInfo", "warn", message, ...args),
    error: (message: string, ...args: any[]) =>
      this.log("CommonInfo", "error", message, ...args),
  };

  hrefChange = {
    debug: (message: string, ...args: any[]) =>
      this.log("HrefChange", "debug", message, ...args),
    info: (message: string, ...args: any[]) =>
      this.log("HrefChange", "info", message, ...args),
    warn: (message: string, ...args: any[]) =>
      this.log("HrefChange", "warn", message, ...args),
    error: (message: string, ...args: any[]) =>
      this.log("HrefChange", "error", message, ...args),
  };

  deepLink = {
    debug: (message: string, ...args: any[]) =>
      this.log("DeepLink", "debug", message, ...args),
    info: (message: string, ...args: any[]) =>
      this.log("DeepLink", "info", message, ...args),
    warn: (message: string, ...args: any[]) =>
      this.log("DeepLink", "warn", message, ...args),
    error: (message: string, ...args: any[]) =>
      this.log("DeepLink", "error", message, ...args),
  };

  deepLinkAction = {
    debug: (message: string, ...args: any[]) =>
      this.log("DeepLinkAction", "debug", message, ...args),
    info: (message: string, ...args: any[]) =>
      this.log("DeepLinkAction", "info", message, ...args),
    warn: (message: string, ...args: any[]) =>
      this.log("DeepLinkAction", "warn", message, ...args),
    error: (message: string, ...args: any[]) =>
      this.log("DeepLinkAction", "error", message, ...args),
  };

  remote = {
    debug: (message: string, ...args: any[]) =>
      this.log("Remote", "debug", message, ...args),
    info: (message: string, ...args: any[]) =>
      this.log("Remote", "info", message, ...args),
    warn: (message: string, ...args: any[]) =>
      this.log("Remote", "warn", message, ...args),
    error: (message: string, ...args: any[]) =>
      this.log("Remote", "error", message, ...args),
  };
}

// 싱글톤 인스턴스
export const logger = new Logger();

// 전역에서 디버그 모드 활성화할 수 있도록
if (typeof window !== "undefined") {
  (window as any).remoteDebugLogger = {
    setLevel: (level: LogLevel) => logger.setLevel(level),
    enable: () => logger.setEnabled(true),
    disable: () => logger.setEnabled(false),
  };
}
