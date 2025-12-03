import { ChromeDomain } from "../domain";
import { CommonInfo } from "../types/common";
import { logger } from "../utils/logger";
import { createUserDataText, UserData } from "../utils/userDataText";

/**
 * 간소화된 RemoteDebugger 클래스
 *
 * 핵심 기능:
 * 1. 페이지 로드 시 즉시 버퍼링 시작
 * 2. 페이지 이탈 시 버퍼 데이터를 JSON으로 저장
 * 3. 녹화 세션 생성 시 이전 기록과 병합
 */
export class RemoteDebugger {
  private socket: WebSocket | null = null;
  private roomName: string | null = null;
  private recordId: number | null = null;
  private roomTimestamp: number | null = null; // 녹화 세션 생성 시간 저장
  private domain: ChromeDomain;
  private isRecordMode: boolean = false;
  private deviceId: string = "unknown-device";
  private bufferRoomName: string | null = null;
  private isBuffering: boolean = false; // 현재 버퍼링 중인지 여부
  private isSaving: boolean = false; // 현재 저장 중인지 여부 (중복 방지)
  private bufferSaved: boolean = false; // 세션 중 한 번만 저장하도록 하는 플래그
  private lastBufferActivityAt: number = Date.now();
  private lastBufferSaveAt: number = 0;
  private roomOrTicketCreated: boolean = false; // 녹화 세션 또는 티켓이 생성되었는지 여부
  private onRoomCreatedCallback?: (data: unknown) => void; // 녹화 세션 생성 완료 콜백

  constructor() {
    // 기본 도메인 생성 (socket 없음, 일단 비활성화)
    this.domain = new ChromeDomain(
      {
        socket: null,
        onBufferEvent: this.handleBufferActivity,
        title: document.title,
      },
      true,
    );

    // 페이지 로드 즉시 버퍼링 시작 (초기 데이터 손실 방지)
    this.startBuffering();

    // location.href 할당 감지 설정
    this.setupLocationHrefInterceptor();
  }

  /**
   * 버퍼링 시작 - 페이지 로드 시점부터 캡처
   */
  private startBuffering(): void {
    // Starting buffering
    this.isBuffering = true;
    this.bufferSaved = false;
    this.lastBufferActivityAt = Date.now();
    this.lastBufferSaveAt = 0;

    // 즉시 캡처 시작
    this.domain.startImmediateCapture();

    // 페이지 이탈 시 버퍼 저장을 위한 이벤트 리스너 설정
    this.setupPageUnloadListeners();
  }

  private handleBufferActivity = (): void => {
    this.lastBufferActivityAt = Date.now();
    this.bufferSaved = false;
  };

  /**
   * 실제 CDP 이벤트 수집 활성화
   */
  private enableCDPCollection(): void {
    if (!this.socket) return;

    const bufferRoom = `Buffer-${this.deviceId}-${Date.now()}`;
    this.bufferRoomName = bufferRoom;

    this.domain.updateRoomInfo({
      room: bufferRoom,
      recordMode: true,
      socket: this.socket,
      deviceId: this.deviceId,
      url: window.location.href,
      title: document.title,
    });

    // startImmediateCapture를 다시 호출하여 모든 도메인이 활성화되도록 함
    this.domain.startImmediateCapture();
    // Immediate capture started
  }

  private lastLocationHref: string = window.location.href;
  private originalLocationReplace: typeof window.location.replace | null = null;
  private originalLocationAssign: typeof window.location.assign | null = null;

  /**
   * URL이 앱 딥링크인지 확인하고 적절한 로거 카테고리 반환
   * 앱 딥링크는 커스텀 스킴(app-action://, app://)을 사용
   *
   * @returns 'deepLinkAction' | 'deepLink' | 'href'
   */
  private getUrlLogCategory(
    url: string,
  ): "deepLinkAction" | "deepLink" | "hrefChange" {
    const lowerUrl = url.toLowerCase();

    // app-action:// 또는 커스텀 action 딥링크
    if (lowerUrl.includes("-action://")) {
      return "deepLinkAction";
    }

    // 커스텀 앱 딥링크 (http, https가 아닌 경우)
    if (
      !lowerUrl.startsWith("http://") &&
      !lowerUrl.startsWith("https://") &&
      lowerUrl.includes("://")
    ) {
      return "deepLink";
    }

    // 일반 URL
    return "hrefChange";
  }

  /**
   * URL 로깅 (딥링크 여부에 따라 적절한 카테고리로 로깅)
   * decodeURIComponent를 사용하여 URL 인코딩 디코드
   */
  private logUrl(url: string): void {
    const category = this.getUrlLogCategory(url);

    // URL 디코딩 (인코딩된 한글 등을 읽기 쉽게)
    let decodedUrl = url;
    try {
      decodedUrl = decodeURIComponent(url);
    } catch {
      // 디코딩 실패 시 원본 사용
    }

    logger[category].info(decodedUrl);
  }

  /**
   * location.href 할당 감지 및 로깅
   *
   * 우선순위:
   * 1. Navigation API (가장 확실한 방법, Chrome 102+)
   * 2. Location.prototype.assign/replace 후킹 (폴백)
   * 3. 링크 클릭 감지 (폴백)
   * 4. History API 후킹 (SPA 네비게이션용)
   * 5. popstate/hashchange 이벤트 (히스토리 변경 감지)
   */
  private setupLocationHrefInterceptor(): void {
    this.lastLocationHref = window.location.href;

    // 1. Navigation API 사용 (window.location.href = "value" 포함 모든 네비게이션 감지)
    if (!this.setupNavigationAPI()) {
      // 2. Location.prototype.assign/replace 후킹
      this.setupLocationPrototypeHooks();
    }

    // 3. 링크(<a> 태그) 클릭 감지
    this.setupLinkClickInterceptor();

    // 4. History API 후킹 (pushState, replaceState)
    this.setupHistoryAPIHooks();

    // 5. popstate/hashchange 이벤트 감지 (뒤로가기/앞으로가기, 해시 변경)
    window.addEventListener("popstate", () => {
      const currentHref = window.location.href;
      if (currentHref !== this.lastLocationHref) {
        logger.hrefChange.info(`[popstate] ${currentHref}`);
        this.lastLocationHref = currentHref;
      }
    });

    window.addEventListener("hashchange", (event) => {
      logger.hrefChange.info(`[hashchange] ${event.newURL}`);
      this.lastLocationHref = window.location.href;
    });
  }

  /**
   * Navigation API 설정 (가장 확실한 방법)
   * Chrome 102+, Edge 102+ 지원
   *
   * window.location.href = "value" 할당을 포함한 모든 네비게이션 감지 가능
   */
  private setupNavigationAPI(): boolean {
    // Navigation API 지원 확인
    if (typeof (window as any).navigation === "undefined") {
      return false;
    }

    const navigation = (window as any).navigation;

    try {
      navigation.addEventListener("navigate", (event: any) => {
        const destinationUrl = event.destination?.url;

        if (!destinationUrl) {
          return;
        }

        // URL에서 경로만 추출 (origin 제거)
        let displayUrl = destinationUrl;
        try {
          const url = new URL(destinationUrl);
          if (url.origin === window.location.origin) {
            displayUrl = url.pathname + url.search + url.hash;
          }
        } catch {
          // URL 파싱 실패 시 원본 사용
        }

        // 콘솔에 로깅 (딥링크 여부에 따라 다른 카테고리로 로깅)
        this.logUrl(displayUrl);

        // 내부 처리
        this.handleLocationChange(destinationUrl);
        this.lastLocationHref = destinationUrl;
      });

      return true;
    } catch (error) {
      logger.hrefChange.warn(
        `Navigation API 설정 실패: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }

  /**
   * Location.prototype.assign/replace 후킹 (Navigation API 미지원 시 폴백)
   * Safari/iOS 웹뷰에서는 네이티브 메서드에 .bind()가 없을 수 있어서 Function.prototype.apply 사용
   */
  private setupLocationPrototypeHooks(): void {
    try {
      const LocationPrototype = Location.prototype;
      const originalReplace = LocationPrototype.replace;
      const originalAssign = LocationPrototype.assign;

      // 원본 메서드 저장 (bind 없이 저장, 호출 시 apply 사용)
      this.originalLocationReplace = (url: string | URL) => {
        return Function.prototype.apply.call(originalReplace, window.location, [
          url,
        ]);
      };
      this.originalLocationAssign = (url: string | URL) => {
        return Function.prototype.apply.call(originalAssign, window.location, [
          url,
        ]);
      };

      // 바인딩된 메서드 참조
      const boundLogUrl = this.logUrl.bind(this);
      const boundHandleLocationChange = this.handleLocationChange.bind(this);

      // Location.prototype.replace 후킹
      LocationPrototype.replace = function (url: string | URL) {
        const targetUrl = typeof url === "string" ? url : url.toString();
        boundLogUrl(targetUrl);
        boundHandleLocationChange(targetUrl);
        return Function.prototype.apply.call(originalReplace, this, [url]);
      };

      // Location.prototype.assign 후킹
      LocationPrototype.assign = function (url: string | URL) {
        const targetUrl = typeof url === "string" ? url : url.toString();
        boundLogUrl(targetUrl);
        boundHandleLocationChange(targetUrl);
        return Function.prototype.apply.call(originalAssign, this, [url]);
      };

      logger.hrefChange.debug("Location.prototype.assign/replace 후킹 성공");
    } catch (error) {
      logger.hrefChange.warn(
        `Location.prototype 후킹 실패: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * <a> 태그 클릭 감지
   */
  private setupLinkClickInterceptor(): void {
    document.addEventListener(
      "click",
      (event) => {
        // 클릭된 요소 또는 부모 중 <a> 태그 찾기
        const target = event.target as HTMLElement;
        const anchor = target.closest("a");

        if (!anchor) return;

        const href = anchor.getAttribute("href");
        if (!href) return;

        // javascript:, #만 있는 경우, 빈 문자열 제외
        if (href.startsWith("javascript:") || href === "#" || href === "") {
          return;
        }

        this.logUrl(href);
      },
      { capture: true },
    );
  }

  /**
   * History API 후킹 (SPA 네비게이션 감지)
   */
  private setupHistoryAPIHooks(): void {
    try {
      const originalPushState = history.pushState.bind(history);
      const originalReplaceState = history.replaceState.bind(history);

      // 바인딩된 메서드 참조
      const boundLogUrl = this.logUrl.bind(this);
      const updateLastHref = (url: string) => {
        this.lastLocationHref = new URL(url, window.location.href).href;
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      history.pushState = function (
        data: any,
        unused: string,
        url?: string | URL | null,
      ) {
        if (url) {
          const targetUrl = typeof url === "string" ? url : url.toString();
          boundLogUrl(targetUrl);
          updateLastHref(targetUrl);
        }
        return originalPushState(data, unused, url);
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      history.replaceState = function (
        data: any,
        unused: string,
        url?: string | URL | null,
      ) {
        if (url) {
          const targetUrl = typeof url === "string" ? url : url.toString();
          boundLogUrl(targetUrl);
          updateLastHref(targetUrl);
        }
        return originalReplaceState(data, unused, url);
      };

      logger.hrefChange.debug("History API 후킹 성공");
    } catch (error) {
      logger.hrefChange.warn(
        `History API 후킹 실패: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * location 변경 처리
   */
  private handleLocationChange(newUrl: string): void {
    this.lastLocationHref = newUrl;

    // 버퍼링 중이면 페이지 이탈 처리
    if (this.isBuffering && !this.roomOrTicketCreated) {
      // location.replace/assign은 페이지를 즉시 이동시키므로
      // beforeunload 이벤트가 발생하지 않을 수 있음
      // 따라서 여기서 버퍼 저장을 시도할 수 있음
      // (단, 비동기 작업이 완료되기 전에 페이지가 이동할 수 있으므로 주의)
    }
  }

  /**
   * 디버깅용: location 후킹 상태 확인
   * 브라우저 콘솔에서 window.remoteDebugger?.checkLocationHooks() 호출 가능
   */
  public checkLocationHooks(): {
    navigationAPISupported: boolean;
    replaceHooked: boolean;
    assignHooked: boolean;
    historyHooked: boolean;
  } {
    const navigationAPISupported =
      typeof (window as any).navigation !== "undefined";

    // Location.prototype 후킹 확인
    const replaceHooked =
      this.originalLocationReplace !== null &&
      Location.prototype.replace !== this.originalLocationReplace;
    const assignHooked =
      this.originalLocationAssign !== null &&
      Location.prototype.assign !== this.originalLocationAssign;

    // History API 후킹 확인 (원본 함수와 다른지)
    const historyHooked = history.pushState.toString().includes("targetUrl");

    return {
      navigationAPISupported,
      replaceHooked,
      assignHooked,
      historyHooked,
    };
  }

  /**
   * 테스트용: URL 변경 시뮬레이션 (실제 이동 없이 로깅만)
   * 브라우저 콘솔에서 window.remoteDebugger?.testLocationLog("test-url") 호출 가능
   */
  public testLocationLog(url: string): void {
    logger.hrefChange.info(`[테스트] ${url}`);
    console.log(`[Href 감지 테스트] 입력된 URL: ${url}`);
  }

  /**
   * 페이지 이탈 감지 리스너 설정
   */
  private setupPageUnloadListeners(): void {
    let unloadTimer: NodeJS.Timeout | null = null;
    let lastUnloadTime = 0;

    const handlePageUnload = (trigger: string, force = false) => {
      // Page unload triggered

      if (!this.isBuffering) {
        // Not buffering - exit
        return;
      }

      // 녹화 세션 또는 티켓이 생성된 후에는 더 이상 버퍼링하지 않음
      if (this.roomOrTicketCreated) {
        // Room/ticket created - stop buffering
        return;
      }

      const now = Date.now();

      if (
        !force &&
        this.bufferSaved &&
        this.lastBufferActivityAt <= this.lastBufferSaveAt
      ) {
        return;
      }

      if (!force && this.bufferSaved && now - this.lastBufferSaveAt < 1000) {
        return;
      }

      // 중복 방지 (500ms 이내)
      if (this.bufferSaved && now - lastUnloadTime < 500) {
        // Duplicate prevention
        return;
      }

      // 이미 예약된 저장이 있으면 취소하고 새로 예약 (마지막 이벤트만 처리)
      const shouldForceImmediate = force || trigger === "pagehide";

      if (shouldForceImmediate) {
        this.saveBufferToStorage(trigger, true, true);
        return;
      }

      if (unloadTimer) {
        // Cancel existing timer
        clearTimeout(unloadTimer);
      }

      lastUnloadTime = now;

      unloadTimer = setTimeout(() => {
        this.saveBufferToStorage(trigger, true);
        unloadTimer = null;
      }, 100);
    };

    // 페이지 숨김/표시 (다른 탭으로 이동, 앱 백그라운드)
    document.addEventListener("visibilitychange", () => {
      // Visibility changed

      if (document.visibilityState === "hidden") {
        // Page hidden
        handlePageUnload("visibilitychange");
      } else if (document.visibilityState === "visible") {
        lastUnloadTime = 0;
      }
    });

    // 페이지 언로드 (닫기, 새로고침, 다른 페이지로 이동) - 웹뷰 종료 시 가장 확실한 이벤트
    window.addEventListener("beforeunload", (_event) => {
      // 기존 타이머가 있으면 취소 (중복 방지)
      if (unloadTimer) {
        clearTimeout(unloadTimer);
        unloadTimer = null;
      }

      // beforeunload는 즉시 저장만 수행 (Buffer → Record 전환 시에는 저장하지 않음)
      if (this.isBuffering && !this.roomOrTicketCreated) {
        // Execute immediate save
        this.saveBufferToStorage("beforeunload_immediate", true, true);
      }
    });

    // 모바일 페이지 숨김
    window.addEventListener("pagehide", () => {
      handlePageUnload("pagehide");
    });

    // 추가 웹뷰 종료 감지
    window.addEventListener("unload", () => {
      // Page unload
      handlePageUnload("unload", true);
    });

    // 모바일 앱 백그라운드에서 복귀 시 플래그 리셋
    window.addEventListener("pageshow", (_event) => {
      if (_event.persisted) {
        // Return from background - reset flags
        lastUnloadTime = 0;
      }
    });
  }

  /**
   * 현재 버퍼 데이터를 서버에 저장 요청
   */
  private saveBufferToStorage(
    trigger: string,
    preferBeacon = false,
    force = false,
  ): void {
    // 중복 방지
    if (!force && (this.bufferSaved || this.isSaving)) {
      return;
    }

    this.isSaving = true;
    this.bufferSaved = true; // 세션 중 한 번만 저장 플래그 설정

    // 녹화 세션 timestamp가 있으면 사용, 없으면 현재 시간 사용
    const sessionTimestamp = this.roomTimestamp || Date.now();

    const payload = {
      event: "saveBuffer",
      data: {
        deviceId: this.deviceId,
        url: window.location.href,
        trigger: trigger,
        timestamp: sessionTimestamp, // 녹화 세션 생성 시간 사용 (파일명으로 활용)
        title: document.title,
        room: this.bufferRoomName || undefined,
      },
    };

    const serializedPayload = JSON.stringify(payload);
    const canUseWebSocket =
      this.socket && this.socket.readyState === WebSocket.OPEN;

    let deliveredViaWebSocket = false;

    if (canUseWebSocket) {
      try {
        this.socket?.send(serializedPayload);
        deliveredViaWebSocket = true;
      } catch {
        deliveredViaWebSocket = false;
      }
    }

    if (preferBeacon || !deliveredViaWebSocket) {
      const beaconPayload = JSON.stringify({
        deviceId: this.deviceId,
        url: window.location.href,
        trigger,
        timestamp: sessionTimestamp,
        title: document.title,
        room: this.bufferRoomName || undefined,
      });

      const apiHost =
        import.meta.env?.VITE_EXTERNAL_HOST || "http://localhost:3001";
      const endpoint = `${apiHost}/buffer/save`;

      const beaconBody = new Blob([beaconPayload], {
        type: "application/json",
      });
      const beaconSent =
        typeof navigator.sendBeacon === "function" &&
        navigator.sendBeacon(endpoint, beaconBody);

      if (!beaconSent) {
        // keepalive fetch는 일부 웹뷰에서 sendBeacon 미지원 시 대안
        fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: beaconPayload,
          keepalive: true,
        }).catch(() => {
          // 네트워크 오류는 조용히 무시 (언로드 중에는 불가피)
        });
      }
    }

    this.lastBufferSaveAt = Date.now();

    // 저장 완료 후 플래그 리셋 (1초 후)
    setTimeout(() => {
      this.isSaving = false;
    }, 1000);
  }

  /**
   * WebSocket 연결 초기화
   */
  public initSocket(recordMode = true): void {
    this.isRecordMode = recordMode;

    // 환경 변수 사용 (recordMode = true는 External, false는 Internal)
    const externalWs =
      import.meta.env?.VITE_EXTERNAL_WS || "ws://localhost:3001";
    const internalWs =
      import.meta.env?.VITE_INTERNAL_WS || "ws://localhost:3000";
    const finalHost = recordMode ? externalWs : internalWs;

    // Connecting to WebSocket

    this.socket = new WebSocket(finalHost);

    this.socket.onopen = () => {
      // WebSocket connected

      // ChromeDomain을 실제 소켓으로 업데이트하고 활성화
      this.enableCDPCollection();

      // 연결 즉시 버퍼링 모드 알림
      this.notifyBufferingMode();
    };

    this.socket.onmessage = (message) => {
      const messageData = message.data as string;
      const data = JSON.parse(messageData) as {
        event: string;
        recordId: number;
        roomName: string;
      };
      const event = data.event;

      if (event === "error") {
        logger.remote.error(" WebSocket error:", data);
        return;
      }

      if (event === "roomCreated") {
        if (!this.socket) return;

        this.recordId = data.recordId;
        this.roomName = data.roomName;

        this.handleRoomCreated(data);

        this.domain.updateRoomInfo({
          room: this.roomName,
          recordMode: this.isRecordMode,
          socket: this.socket,
          url: window.location.href,
          title: document.title,
        });
        return;
      }

      if (event === "ticketCreateSuccess") {
        // 티켓 생성 성공 시 커스텀 딥링크로 토스트 메시지 표시 (네이티브 앱 연동 시)
        // 필요한 경우 앱의 커스텀 스킴으로 변경 가능
        this.handleTicketSuccess();

        this.disconnect();
        return;
      }

      if (event === "ticketCreateError") {
        alert("티켓 생성에 실패했습니다");
      } else if (event === "protocol") {
        this.handleProtocolMessage(data);
      }
    };

    this.socket.onerror = (error) => {
      logger.remote.error("WebSocket error:", error);
    };

    this.socket.onclose = (_event) => {
      // WebSocket disconnected
      this.socket = null;
      this.recordId = null;
      this.roomName = null;

      // 도메인 리셋
      this.domain.resetForNewRecording();
    };
  }

  /**
   * 디바이스 ID 설정
   */
  public setDeviceId(deviceId: string): void {
    this.deviceId = deviceId;
  }

  /**
   * 버퍼 room의 deviceId만 업데이트 (room 이름은 유지)
   */
  private updateBufferRoom(deviceId: string): void {
    const currentRoom = this.domain.getCurrentRoom();

    if (!currentRoom) {
      // No current room found
      return;
    }

    // room 이름은 변경하지 않고, deviceId만 업데이트
    // Updating deviceId in buffer room

    // 도메인들의 deviceId 정보만 업데이트 (room은 그대로)
    this.domain.updateRoomInfo({
      room: currentRoom, // 기존 room 유지 (null 체크 완료)
      recordMode: this.isRecordMode,
      socket: this.socket,
      deviceId: deviceId, // deviceId만 업데이트
      url: window.location.href,
      title: document.title,
    });
  }

  /**
   * 녹화 세션 생성 완료 콜백 설정
   */
  public onRoomCreated(callback: (data: unknown) => void): void {
    this.onRoomCreatedCallback = callback;
  }

  /**
   * 서버에 버퍼링 모드임을 알림
   */
  private notifyBufferingMode(): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;

    if (!this.bufferRoomName) {
      this.bufferRoomName = `Buffer-${this.deviceId}-${Date.now()}`;
    }

    const payload = {
      event: "enableBuffering",
      data: {
        deviceId: this.deviceId,
        url: window.location.href,
        userAgent: navigator.userAgent,
        room: this.bufferRoomName,
        timestamp: Date.now(),
        title: document.title,
      },
    };

    // Notifying buffering mode
    this.socket.send(JSON.stringify(payload));
  }

  /**
   * 녹화 세션 생성
   */
  public createRoom(recordMode = true, commonInfo: CommonInfo | null): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      // Cannot create room - WebSocket not connected
      return;
    }

    // Buffer 모드가 실행 중이어도 녹화 세션 생성은 허용
    // (사용자가 명시적으로 기록 버튼을 클릭한 경우)
    if (this.isBuffering && recordMode) {
      // Switching from buffer mode to record mode

      // Buffer → Record 전환 시에는 S3에 저장하지 않음
      // Buffer 데이터는 Record 모드에서 DB로 직접 전송됨

      this.isBuffering = false; // Buffer 모드 종료
    }

    // commonInfo에서 deviceId 추출
    this.deviceId = commonInfo?.device?.deviceId || "unknown-device";

    const userData: UserData = {
      commonInfo,
      userAgent: navigator.userAgent,
      URL: window.location.href,
      webTitle: document.title,
    };

    const payload = {
      event: "createRoom",
      data: {
        recordMode,
        userData,
      },
    };

    console.log(logger.userData.info("\n" + createUserDataText(userData)));

    this.domain.updateDeviceId(this.deviceId);
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.updateBufferRoom(this.deviceId);
    }

    // Creating room
    this.socket.send(JSON.stringify(payload));
  }

  /**
   * 녹화 세션 생성 완료 처리
   */
  private handleRoomCreated(data: unknown): void {
    const roomData = data as {
      recordId: number;
      roomName: string;
      timestamp: number;
    };
    this.recordId = roomData.recordId;
    this.roomName = roomData.roomName;
    this.roomTimestamp = roomData.timestamp;
    // 도메인에 녹화 세션 정보 업데이트
    this.domain.updateRoomInfo({
      room: this.roomName,
      recordMode: this.isRecordMode,
      socket: this.socket,
      url: window.location.href,
      title: document.title,
    });

    if (this.isRecordMode) {
      this.domain.flushNetworkCacheForRecord();
      this.domain.flushConsoleCacheForRecord();
      this.domain.flushSessionReplayForRecord();
    }

    // 녹화 세션 생성 완료 플래그 설정
    this.roomOrTicketCreated = true;

    // 콜백 호출 (UI 업데이트용)
    if (this.onRoomCreatedCallback) {
      // Calling room created callback
      this.onRoomCreatedCallback(data);
    } else {
      // Room created callback not set
    }
  }

  /**
   * 프로토콜 메시지 처리
   */
  private handleProtocolMessage(data: unknown): void {
    const msgData = data as {
      message: { id?: number; method?: string; params?: unknown };
      devtoolsId?: string;
    };
    const result = this.domain.execute(msgData.message);

    if (msgData.devtoolsId) {
      this.sendMessageToDevtools(msgData.devtoolsId, result);
    }
  }

  /**
   * DevTools에 메시지 전송
   */
  private sendMessageToDevtools(devtoolsId: string, message: unknown): void {
    if (!this.socket || !this.roomName) {
      logger.remote.error(" WebSocket is not connected or room is not set");
      return;
    }

    const payload = {
      event: "messageToDevtools",
      data: {
        devtoolsId,
        room: this.roomName,
        message,
      },
    };

    this.socket.send(JSON.stringify(payload));
  }

  /**
   * 티켓 생성 성공 처리
   */
  private handleTicketSuccess(): void {
    // 티켓 생성 완료 플래그 설정
    this.roomOrTicketCreated = true;
    // Ticket created - stop buffering

    // 네이티브 앱과 연동 시 커스텀 딥링크로 토스트 메시지 표시 가능
    // 예: window.location.href = 'app-action://showToast?message=티켓이 생성되었습니다'
    alert("티켓이 생성되었습니다");
    this.disconnect();
  }

  /**
   * QA 티켓 생성
   */
  public createTicket({
    commonInfo,
    userAgent,
    URL,
    formData,
  }: {
    commonInfo: CommonInfo | null;
    userAgent: string;
    URL: string;
    formData?: unknown; // 타입 충돌 방지
  }): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      // Cannot create ticket - WebSocket not connected
      logger.remote.error(" WebSocket is not connected or room is not set");
      return;
    }

    // 티켓 생성 시에도 버퍼링 중지
    this.isBuffering = false;

    const userData: UserData = {
      commonInfo,
      userAgent,
      URL,
      webTitle: document.title,
    };

    const payload = {
      event: "createTicket",
      data: {
        userData,
        formData,
      },
    };

    console.log(logger.userData.info("\n" + createUserDataText(userData)));

    // Creating ticket
    this.socket.send(JSON.stringify(payload));
  }

  /**
   * WebSocket 연결 종료
   */
  public disconnect(): void {
    // 먼저 모든 도메인의 socket을 null로 설정하여 메시지 전송 방지
    this.domain.stopAllDomains();

    // 그 다음 WebSocket 연결 종료
    if (this.socket) {
      // 연결 종료 전 마지막 버퍼 저장
      if (this.isBuffering) {
        this.saveBufferToStorage("disconnect");
      }

      this.socket.close();
    }

    this.bufferRoomName = null;
  }

  /**
   * WebSocket 이벤트 리스너 추가
   */
  public addSocketEventListener(
    ...arg: Parameters<WebSocket["addEventListener"]>
  ): void {
    if (!this.socket) {
      logger.remote.error(" WebSocket is not initialized");
      return;
    }

    this.socket.addEventListener(...arg);
  }

  // Getter들
  public get Connected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  public get RoomName(): string | null {
    return this.roomName;
  }

  public get RecordId(): number | null {
    return this.recordId;
  }

  public get IsBuffering(): boolean {
    return this.isBuffering;
  }

  /**
   * Screen Preview 일시 중단 (디버거 UI 표시 시)
   */
  public pauseScreenPreview(): void {
    const screenPreview = this.domain.getScreenPreview();
    if (screenPreview) {
      screenPreview.pausePreview();
    }
  }

  /**
   * Screen Preview 재개 (디버거 UI 숨김 시)
   */
  public resumeScreenPreview(): void {
    const screenPreview = this.domain.getScreenPreview();
    if (screenPreview) {
      screenPreview.resumePreview();
    }
  }
}
