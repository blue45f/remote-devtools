/* eslint-disable @typescript-eslint/no-explicit-any */

import { Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Repository } from "typeorm";
import { randomUUID } from "node:crypto";
import * as WebSocket from "ws";
import { Server } from "ws";

import { MSG_ID } from "@remote-platform/constants";
import {
  DomService,
  NetworkService,
  RecordService,
  RuntimeService,
  ScreenService,
} from "@remote-platform/core";
import {
  TicketComponentEntity,
  TicketLabelEntity,
  TicketLogEntity,
} from "@remote-platform/entity";

import { getDefaultCommonInfo } from "../../utils/common-info";
import { BufferService, type BufferEvent } from "../buffer/buffer.service";
import { JiraService } from "../jira/jira.service";
import { S3Service } from "../s3/s3.service";
import { SlackService } from "../slack/slack.service";
import { UserInfoService } from "../user-info/user-info.service";

// ---------------------------------------------------------------------------
// Types -- WebSocket 룸 및 연결 상태 관련 타입 정의
// ---------------------------------------------------------------------------

/**
 * WebSocket 룸의 상태를 나타내는 타입.
 *
 * @property client - 룸에 연결된 SDK(클라이언트) WebSocket
 * @property devtools - 룸에 연결된 DevTools WebSocket 맵 (devtoolsId -> WebSocket)
 * @property recordMode - 녹화 모드 여부
 * @property recordId - 녹화 모드일 때 생성된 레코드 ID (비녹화 시 null)
 */
type RoomData = {
  client: WebSocket;
  devtools: Map<string, WebSocket>;
  recordMode: boolean;
  recordId: number | null;
};

/**
 * DevTools 연결 정보를 룸에 매핑하는 타입.
 *
 * @property room - DevTools가 속한 룸 이름
 * @property devtoolsId - DevTools 고유 식별자
 */
type DevtoolsData = {
  room: string;
  devtoolsId: string;
};

/**
 * 버퍼 모드 룸의 메타데이터를 나타내는 타입.
 *
 * @property deviceId - 디바이스 고유 식별자
 * @property url - 현재 페이지 URL
 * @property userAgent - 사용자 에이전트 문자열
 * @property title - 페이지 제목 (선택)
 * @property sessionStartTime - 세션 시작 시간 (밀리초, 선택)
 */
type BufferRoomInfo = {
  deviceId: string;
  url: string;
  userAgent: string;
  title?: string;
  sessionStartTime?: number;
};

/**
 * 연결 해제 후에도 유지되는 버퍼 정보 타입.
 * {@link BufferRoomInfo}를 확장하여 룸 이름을 포함하며,
 * Beacon API 등 연결 해제 후 저장 요청 시 사용된다.
 *
 * @property room - 버퍼 룸 이름
 */
type LastBufferInfo = BufferRoomInfo & { room: string };

// ---------------------------------------------------------------------------
// Gateway -- SDK와 DevTools 간 WebSocket 통신 게이트웨이
// ---------------------------------------------------------------------------

/**
 * SDK와 DevTools 간 WebSocket 통신을 처리하는 메인 게이트웨이.
 *
 * 주요 기능:
 * - 룸 기반 WebSocket 세션 관리 (Record/Live/Buffer 모드)
 * - CDP(Chrome DevTools Protocol) 메시지 라우팅
 * - 네트워크, DOM, 런타임, 스크린 데이터 실시간 수집 및 저장
 * - rrweb 기반 세션 리플레이 녹화
 * - Jira 티켓 생성 및 Slack 알림
 * - 페이지 이탈 시 버퍼 데이터 자동 저장 (S3)
 */
@WebSocketGateway()
export class WebviewGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  /** NestJS 로거 인스턴스 */
  private readonly logger = new Logger(WebviewGateway.name);

  /** 활성 WebSocket 룸 관리 (룸 이름 -> 룸 상태) */
  private readonly rooms: Map<string, RoomData> = new Map();
  /** SDK 클라이언트 WebSocket을 룸 이름에 매핑 */
  private readonly clientMap: Map<WebSocket, string> = new Map();
  /** DevTools WebSocket 연결을 룸 정보에 매핑 */
  private readonly devtoolsMap: Map<WebSocket, DevtoolsData> = new Map();

  /** rrweb 이벤트 타임스탬프 추적 (이벤트 순서 보장용) */
  private lastEventTimestamp = 0;

  /** 버퍼 모드 룸의 메타데이터 관리 (룸 이름 -> 버퍼 룸 정보) */
  private readonly bufferRooms: Map<string, BufferRoomInfo> = new Map();
  /** deviceId를 현재 룸에 빠르게 매핑 (deviceId -> 룸 이름) */
  private readonly deviceToRoom: Map<string, string> = new Map();
  /** 연결 해제 후에도 유지되는 디바이스별 최근 버퍼 정보 (Beacon API 대응) */
  private readonly lastBufferInfoByDevice: Map<string, LastBufferInfo> =
    new Map();
  /** visibility change로 이미 저장된 룸 추적 (중복 저장 방지) */
  private readonly visibilityExitSavedRooms: Set<string> = new Set();

  /** WebSocket 서버 인스턴스 */
  @WebSocketServer() public server: Server;

  /**
   * 의존성 주입을 통해 각 서비스 및 리포지토리를 초기화한다.
   *
   * @param recordService - 녹화 레코드 CRUD 서비스
   * @param networkService - 네트워크 요청/응답 저장 서비스
   * @param domService - DOM 스냅샷 저장 서비스
   * @param runtimeService - 런타임 로그 저장 서비스
   * @param screenService - 스크린 프리뷰 및 세션 리플레이 저장 서비스
   * @param bufferService - 버퍼 이벤트 관리 서비스
   * @param s3Service - S3 파일 업로드 서비스
   * @param jiraService - Jira 티켓 생성 서비스
   * @param slackService - Slack 알림 서비스
   * @param userInfoService - 사용자 정보 조회 서비스
   * @param ticketLogRepository - 티켓 로그 엔티티 리포지토리
   * @param ticketComponentRepository - 티켓 컴포넌트 엔티티 리포지토리
   * @param ticketLabelRepository - 티켓 라벨 엔티티 리포지토리
   */
  constructor(
    private readonly recordService: RecordService,
    private readonly networkService: NetworkService,
    private readonly domService: DomService,
    private readonly runtimeService: RuntimeService,
    private readonly screenService: ScreenService,
    private readonly bufferService: BufferService,
    private readonly s3Service: S3Service,
    private readonly jiraService: JiraService,
    private readonly slackService: SlackService,
    private readonly userInfoService: UserInfoService,

    @InjectRepository(TicketLogEntity)
    private readonly ticketLogRepository: Repository<TicketLogEntity>,
    @InjectRepository(TicketComponentEntity)
    private readonly ticketComponentRepository: Repository<TicketComponentEntity>,
    @InjectRepository(TicketLabelEntity)
    private readonly ticketLabelRepository: Repository<TicketLabelEntity>,
  ) {}

  // -------------------------------------------------------------------------
  // Helpers -- WebSocket 메시지 전송
  // -------------------------------------------------------------------------

  /**
   * WebSocket을 통해 JSON 직렬화된 메시지를 전송하는 헬퍼 메서드.
   *
   * @param socket - 메시지를 전송할 WebSocket 인스턴스
   * @param data - 전송할 데이터 (JSON.stringify로 직렬화됨)
   */
  private sendMessage(socket: WebSocket, data: any): void {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(data));
    }
  }

  // -------------------------------------------------------------------------
  // Room management -- 룸 생성 및 초기화
  // -------------------------------------------------------------------------

  /**
   * 새로운 녹화(Record) 또는 라이브(Live) 룸을 생성한다.
   *
   * 녹화 모드일 경우 DB에 레코드를 생성하고, 클라이언트에 roomCreated 메시지를 전송한 뒤
   * CDP 도메인 활성화 메시지를 보낸다. 이후 DOM/스크린 프리뷰 초기화 메시지를 전송하고
   * 세션 시작 이벤트를 저장한다.
   *
   * @param options - 룸 생성 옵션
   * @param options.roomName - 생성할 룸 이름
   * @param options.client - SDK 클라이언트 WebSocket
   * @param options.recordMode - 녹화 모드 여부
   * @param options.url - 현재 페이지 URL (선택)
   * @param options.deviceId - 디바이스 고유 식별자
   * @param options.referrer - 리퍼러 URL (선택)
   * @returns 녹화 모드일 경우 생성된 recordId, 아니면 null
   */
  private async createRoom({
    client,
    recordMode,
    roomName,
    url,
    deviceId,
    referrer,
  }: {
    roomName: string;
    client: WebSocket;
    recordMode: boolean;
    url?: string;
    deviceId: string;
    referrer?: string;
  }): Promise<number | null> {
    let recordId: number | null = null;

    if (recordMode) {
      const { id } = await this.recordService.create({
        name: roomName,
        url: url || undefined,
        deviceId,
        recordMode,
        referrer,
      });
      recordId = id;

      // IMPORTANT: The roomCreated message must be sent first so the client
      // can assign the socket. Protocol messages must follow in order.
      this.sendMessage(client, { event: "roomCreated", roomName, recordId });

      this.sendRecordModeInitMessages(client);
    }

    this.rooms.set(roomName, {
      client,
      devtools: new Map(),
      recordMode,
      recordId,
    });
    this.clientMap.set(client, roomName);

    // Initialise DOM and Screen Preview domains
    this.sendDomAndScreenInitMessages(client);

    // Persist session start event
    if (recordId) {
      const timestamp = Date.now() * 1_000_000; // milliseconds -> nanoseconds
      await this.screenService.upsert({
        recordId,
        protocol: {
          method: "session_start",
          params: {
            url: "http://localhost:3001",
            userAgent: "Session Recording",
          },
        },
        timestamp,
        type: null,
        eventType: "session_start",
      });
    }

    return recordId;
  }

  // -------------------------------------------------------------------------
  // Helpers -- CDP 도메인 초기화 메시지 전송
  // -------------------------------------------------------------------------

  /**
   * 녹화 모드 시 필요한 CDP 도메인 활성화 메시지를 전송한다.
   * Network, Runtime, Page 도메인의 enable 메시지를 순서대로 보낸다.
   *
   * @param client - 메시지를 전송할 SDK 클라이언트 WebSocket
   */
  private sendRecordModeInitMessages(client: WebSocket): void {
    this.sendMessage(client, {
      event: "protocol",
      message: {
        id: MSG_ID.NETWORK.ENABLE,
        method: "Network.enable",
        params: { maxPostDataSize: 65536 },
      },
    });
    this.sendMessage(client, {
      id: MSG_ID.NETWORK.SET_ATTACH_DEBUG_STACK,
      method: "Network.setAttachDebugStack",
      params: { enabled: true },
    });
    this.sendMessage(client, {
      id: MSG_ID.NETWORK.CLEAR_ACCEPTED_ENCODINGS_OVERRIDE,
      method: "Network.clearAcceptedEncodingsOverride",
      params: {},
    });

    // Runtime domain
    this.sendMessage(client, {
      event: "protocol",
      message: {
        id: MSG_ID.RUNTIME.ENABLE,
        method: "Runtime.enable",
        params: {},
      },
    });

    // Page domain
    this.sendMessage(client, {
      event: "protocol",
      message: { id: MSG_ID.PAGE.ENABLE, method: "Page.enable", params: {} },
    });
    this.sendMessage(client, {
      event: "protocol",
      message: {
        id: MSG_ID.PAGE.GET_RESOURCE_TREE,
        method: "Page.getResourceTree",
        params: {},
      },
    });
  }

  /**
   * DOM 및 스크린 프리뷰 초기화 메시지를 전송한다.
   * DOM.enable과 ScreenPreview.startPreview 메시지를 보낸다.
   *
   * @param client - 메시지를 전송할 SDK 클라이언트 WebSocket
   */
  private sendDomAndScreenInitMessages(client: WebSocket): void {
    this.sendMessage(client, {
      event: "protocol",
      message: { id: MSG_ID.DOM.ENABLE, method: "DOM.enable", params: {} },
    });
    this.sendMessage(client, {
      event: "protocol",
      message: {
        id: MSG_ID.SCREEN.START_PREVIEW,
        method: "ScreenPreview.startPreview",
        params: {},
      },
    });
  }

  // -------------------------------------------------------------------------
  // rrweb 이벤트 타입 매핑
  // -------------------------------------------------------------------------

  /**
   * rrweb 숫자 이벤트 타입을 문자열 라벨로 변환한다.
   *
   * - 0: DomContentLoaded -> "dom_loaded"
   * - 1: Load -> "page_loaded"
   * - 2: FullSnapshot -> "full_snapshot"
   * - 3: IncrementalSnapshot -> "incremental_snapshot"
   * - 4: Meta -> "meta"
   * - 5: Custom -> "custom"
   * - 기타: "rrweb_{type}"
   *
   * @param rrwebType - rrweb 이벤트 숫자 타입
   * @returns 매핑된 문자열 라벨
   */
  private mapRrwebEventType(rrwebType: number): string {
    switch (rrwebType) {
      case 0:
        return "dom_loaded";
      case 1:
        return "page_loaded";
      case 2:
        return "full_snapshot";
      case 3:
        return "incremental_snapshot";
      case 4:
        return "meta";
      case 5:
        return "custom";
      default:
        return `rrweb_${rrwebType}`;
    }
  }

  // -------------------------------------------------------------------------
  // Create Room -- "createRoom" WebSocket 메시지 핸들러
  // -------------------------------------------------------------------------

  /**
   * "createRoom" WebSocket 메시지를 처리하여 새 룸을 생성한다.
   *
   * 비녹화 모드일 경우 버퍼 룸 정보를 등록하고, 녹화 모드일 경우
   * Slack DM 전송 및 기존 버퍼 데이터를 새 레코드로 이전한다.
   *
   * @param data - 클라이언트에서 전달받은 룸 생성 데이터
   * @param data.recordMode - 녹화 모드 여부 (기본값: false)
   * @param data.userData - 사용자 및 디바이스 정보
   * @param client - 요청을 보낸 SDK 클라이언트 WebSocket
   */
  @SubscribeMessage("createRoom")
  public async handleCreateRoom(
    @MessageBody() data: { recordMode?: boolean; userData: UserData },
    @ConnectedSocket() client: WebSocket,
  ): Promise<void> {
    const { recordMode = false, userData } = data;

    // Ensure commonInfo defaults are present
    if (!userData.commonInfo) {
      userData.commonInfo = getDefaultCommonInfo();
    }

    // Reflect userData URL and userAgent into commonInfo
    userData.commonInfo.URL = userData.URL || userData.commonInfo.URL;
    userData.commonInfo.userAgent =
      userData.userAgent || userData.commonInfo.userAgent;

    const { commonInfo } = userData;
    const roomName = `${recordMode ? "Record-" : "Live-"}${randomUUID()}`;

    // For non-Record mode, register the buffer room
    if (!recordMode) {
      const bufferInfo: BufferRoomInfo = {
        deviceId: commonInfo.device.deviceId,
        url: commonInfo.URL,
        userAgent: commonInfo.userAgent,
        sessionStartTime: Date.now(),
      };

      this.bufferRooms.set(roomName, bufferInfo);
      this.lastBufferInfoByDevice.set(commonInfo.device.deviceId, {
        room: roomName,
        deviceId: commonInfo.device.deviceId,
        url: bufferInfo.url,
        userAgent: bufferInfo.userAgent,
        title: bufferInfo.title,
        sessionStartTime: bufferInfo.sessionStartTime,
      });
      // Reset visibility-exit save state for the new session
      this.visibilityExitSavedRooms.delete(roomName);
    }

    this.logger.log(
      `[ROOM_CREATE_START] ${JSON.stringify({
        roomName,
        recordMode,
        deviceId: commonInfo.device.deviceId,
        memberId: commonInfo.user.memberId,
        requestData: JSON.stringify(data),
        isDefaultCommonInfo: commonInfo.device.deviceId.startsWith("unknown-"),
      })}`,
    );

    const recordId = await this.createRoom({
      roomName,
      client,
      recordMode,
      url: commonInfo.URL,
      deviceId: commonInfo.device.deviceId,
      referrer: userData.URL?.split("?")[0],
    });

    // Send Slack DM when creating a record room
    if (recordMode && recordId) {
      // Only look up user info when deviceId is not the default placeholder
      if (!commonInfo.device.deviceId.startsWith("unknown-")) {
        try {
          const userInfo = await this.userInfoService.getUserInfoByDeviceId(
            commonInfo.device.deviceId,
          );

          this.logger.log(
            `[USER_INFO_FETCH] ${JSON.stringify({
              deviceId: commonInfo.device.deviceId,
              userInfoFound: !!userInfo,
              userInfo: userInfo ? JSON.stringify(userInfo) : null,
            })}`,
          );

          if (userInfo?.slackUserId) {
            await this.slackService.sendCreateRoomDM({
              slackUserId: userInfo.slackUserId,
              userData,
              recordId,
              roomName,
            });
            this.logger.log(
              `[SLACK_DM_SENT] ${JSON.stringify({
                slackUserId: userInfo.slackUserId,
                roomName,
                recordId,
              })}`,
            );
          }
        } catch (error) {
          this.logger.error(
            `[SLACK_DM_ERROR] ${JSON.stringify({
              roomName,
              recordId,
              deviceId: commonInfo.device.deviceId,
              error:
                error instanceof Error ? error.message : JSON.stringify(error),
            })}`,
          );
        }
      }
    }

    // Transfer buffered data to the new record (for recording session creation)
    if (recordMode && recordId) {
      await this.transferBufferedDataToRecord(
        commonInfo.device.deviceId,
        recordId,
      );
    }

    this.logger.log(
      `[ROOM_CREATE_SUCCESS] ${JSON.stringify({
        roomName,
        recordId,
        deviceId: commonInfo.device.deviceId,
      })}`,
    );
  }

  // -------------------------------------------------------------------------
  // Connection / disconnection -- WebSocket 연결 및 해제 처리
  // -------------------------------------------------------------------------

  /**
   * 새로운 WebSocket 연결을 처리한다.
   *
   * 클라이언트를 "pending" 상태로 등록하고, 에러 및 종료 이벤트 리스너를 설정한다.
   * 실제 룸 배정은 createRoom 또는 bufferEvent 메시지 수신 시 이루어진다.
   *
   * @param client - 새로 연결된 WebSocket 클라이언트
   */
  public handleConnection(client: WebSocket): void {
    this.logger.log(
      `[CLIENT_CONNECTED] ${JSON.stringify({
        clientId: client.toString(),
        timestamp: new Date().toISOString(),
      })}`,
    );

    // Register the client in a pending state until a room is created
    this.clientMap.set(client, "pending");

    // Client error handling
    client.on("error", (error) => {
      this.logger.error(
        `[CLIENT_ERROR] ${JSON.stringify({
          clientId: client.toString(),
          error: error.message,
          stack: error.stack,
        })}`,
      );
    });

    // Log close reason
    client.on("close", (code, reason) => {
      this.logger.log(
        `[CLIENT_CLOSE] ${JSON.stringify({
          clientId: client.toString(),
          code,
          reason: reason?.toString(),
          timestamp: new Date().toISOString(),
        })}`,
      );
    });
  }

  // -------------------------------------------------------------------------
  // Message to DevTools -- SDK에서 특정 DevTools로 메시지 전달
  // -------------------------------------------------------------------------

  /**
   * SDK에서 특정 DevTools로 메시지를 전달하는 핸들러.
   *
   * 대상 DevTools를 찾아 메시지를 전송하고, 녹화 모드일 경우
   * DOM enable/getDocument 응답을 처리하여 DB에 저장한다.
   *
   * @param data - 전달할 메시지 데이터
   * @param data.room - 대상 룸 이름
   * @param data.devtoolsId - 대상 DevTools 식별자
   * @param data.message - 전달할 메시지 (문자열 또는 객체)
   * @param client - 요청을 보낸 SDK 클라이언트 WebSocket
   */
  @SubscribeMessage("messageToDevtools")
  public handleMessageToDevtools(
    @MessageBody()
    data: { room: string; devtoolsId: string; message: string | object },
    @ConnectedSocket() client: WebSocket,
  ): void {
    const roomData = this.rooms.get(data.room);
    if (!roomData) {
      this.sendMessage(client, { event: "error", message: "Room not found" });
      return;
    }

    const devtools = roomData.devtools.get(data.devtoolsId);
    if (devtools) {
      this.sendMessage(devtools, data.message);
    } else {
      this.sendMessage(client, {
        event: "error",
        message: "Devtools not found",
      });
    }

    if (roomData.recordId) {
      let protocol: any;
      try {
        protocol =
          typeof data.message === "string"
            ? JSON.parse(data.message)
            : data.message;
      } catch {
        this.logger.warn(`[messageToDevtools] Invalid JSON message in room ${data.room}`);
        return;
      }

      if (this.domService.isEnableDomResponseMessage(protocol.id)) {
        // DOM is enabled -- request DOM data
        this.sendMessage(client, {
          event: "protocol",
          message: {
            id: MSG_ID.DOM.GET_DOCUMENT,
            method: "DOM.getDocument",
            params: {},
          },
        });
      } else if (this.domService.isGetDomResponseMessage(protocol.id)) {
        // DOM data received -- persist to DB
        const [seconds, nanoseconds] = process.hrtime();
        void this.domService.upsert({
          recordId: roomData.recordId,
          protocol: protocol.result,
          timestamp: seconds * 1e9 + nanoseconds,
          type: "entireDom",
        });
      }
    }
  }

  // -------------------------------------------------------------------------
  // Protocol to all DevTools -- SDK에서 모든 DevTools로 브로드캐스트 및 DB 저장
  // -------------------------------------------------------------------------

  /**
   * SDK에서 수신한 프로토콜 메시지를 룸 내 모든 DevTools에 브로드캐스트하고,
   * 녹화 모드일 경우 도메인별로 DB에 저장한다.
   *
   * 처리하는 도메인: Network, DOM, Runtime, ScreenPreview, SessionReplay,
   * user.interaction, user.scroll, viewport.change
   *
   * @param data - 브로드캐스트할 메시지 데이터
   * @param data.room - 대상 룸 이름
   * @param data.message - CDP 프로토콜 메시지 (JSON 문자열)
   * @param client - 요청을 보낸 SDK 클라이언트 WebSocket
   */
  @SubscribeMessage("protocolToAllDevtools")
  public async handleProtocolToAllDevtools(
    @MessageBody() data: { room: string; message: string },
    @ConnectedSocket() client: WebSocket,
  ): Promise<void> {
    let protocol: any;
    try {
      protocol = JSON.parse(data.message);
    } catch {
      this.logger.warn(`[protocolToAllDevtools] Invalid JSON message in room ${data.room}`);
      return;
    }
    const roomData = this.rooms.get(data.room);

    if (!roomData) {
      this.sendMessage(client, { event: "error", message: "Room not found" });
      return;
    }

    roomData.devtools.forEach((devtools) => devtools.send(data.message));

    if (!roomData.recordId) return;

    const timestamp = Date.now() * 1_000_000; // milliseconds -> nanoseconds

    // TODO: Improve domain-based message routing
    if (protocol.params?.requestId) {
      await this.networkService.create({
        recordId: roomData.recordId,
        protocol,
        requestId: protocol.params.requestId,
        timestamp,
      });
    }

    if (protocol.method.startsWith("DOM.updated")) {
      await this.domService.upsert({
        recordId: roomData.recordId,
        protocol: { root: protocol.params },
        timestamp,
        type: "entireDom",
      });
    }

    if (protocol.method.startsWith("Runtime.")) {
      await this.runtimeService.create({
        recordId: roomData.recordId,
        protocol,
        timestamp,
      });
    }

    // ScreenPreview -- real-time mirroring (only keep the latest frame)
    if (protocol.method.startsWith("ScreenPreview.captured")) {
      let eventType: "full_snapshot" | "incremental_snapshot" =
        "incremental_snapshot";
      if (protocol.params?.isFirstSnapshot) {
        eventType = "full_snapshot";
      }

      await this.screenService.upsert({
        recordId: roomData.recordId,
        protocol,
        timestamp,
        type: "screenPreview",
        eventType: eventType,
      });
    }

    // rrweb-based SessionReplay events
    if (protocol.method.startsWith("SessionReplay.")) {
      await this.handleSessionReplayProtocol(
        protocol,
        roomData,
        data.room,
        timestamp,
      );
    }

    // User interaction events
    if (protocol.method === "user.interaction") {
      await this.screenService.upsert({
        recordId: roomData.recordId,
        protocol,
        timestamp,
        type: null,
        eventType: "user_interaction",
      });
    }

    // Scroll events
    if (protocol.method === "user.scroll") {
      await this.screenService.upsert({
        recordId: roomData.recordId,
        protocol,
        timestamp,
        type: null,
        eventType: "viewport_change",
      });
    }
  }

  // -------------------------------------------------------------------------
  // SessionReplay event handling -- 세션 리플레이 프로토콜 처리
  // -------------------------------------------------------------------------

  /**
   * 세션 리플레이 프로토콜 메시지를 처리한다.
   * rrweb 단일 이벤트, 배치 이벤트, 레거시 스냅샷/인터랙션 형식을 분기하여 처리한다.
   *
   * @param protocol - 수신된 CDP 프로토콜 객체
   * @param roomData - 현재 룸 상태 데이터
   * @param roomName - 현재 룸 이름
   * @param timestamp - 이벤트 타임스탬프 (나노초)
   */
  private async handleSessionReplayProtocol(
    protocol: any,
    roomData: RoomData,
    roomName: string,
    timestamp: number,
  ): Promise<void> {
    // Single rrweb event
    if (protocol.method === "SessionReplay.rrwebEvent") {
      await this.handleSingleRrwebEvent(protocol, roomData, roomName);
      return;
    }

    // Batch rrweb events
    if (protocol.method === "SessionReplay.rrwebEvents") {
      await this.handleBatchRrwebEvents(protocol, roomData, roomName);
      return;
    }

    // Legacy format compatibility (migration period)
    if (
      protocol.method === "SessionReplay.snapshot" ||
      protocol.method === "SessionReplay.interaction"
    ) {
      await this.handleLegacySessionReplay(protocol, roomData, timestamp);
    }
  }

  /**
   * 단일 rrweb 이벤트(SessionReplay.rrwebEvent)를 처리한다.
   * DB에 저장하고, Buffer 룸일 경우 버퍼 서비스에도 추가한다.
   *
   * @param protocol - rrweb 이벤트가 포함된 프로토콜 객체
   * @param roomData - 현재 룸 상태 데이터
   * @param roomName - 현재 룸 이름
   */
  private async handleSingleRrwebEvent(
    protocol: any,
    roomData: RoomData,
    roomName: string,
  ): Promise<void> {
    const event = protocol.params?.event;
    if (!event) return;

    const sessionTimestamp =
      BigInt(event.timestamp || Date.now()) * BigInt(1_000_000);
    const eventType = this.mapRrwebEventType(event.type);

    await this.screenService.upsert({
      recordId: roomData.recordId,
      protocol,
      timestamp: sessionTimestamp.toString(),
      type: null,
      eventType: eventType,
      sequence: event.data?.sequence || null,
    } as any);

    // Add event to buffer (Buffer rooms only)
    if (roomData.recordId && roomName.startsWith("Buffer-")) {
      this.addRrwebEventToBuffer(
        roomName,
        roomData.recordId,
        protocol,
        sessionTimestamp,
      );
    }
  }

  /**
   * 배치 rrweb 이벤트(SessionReplay.rrwebEvents)를 처리한다.
   * 여러 이벤트를 순회하며 DB에 저장하고, Buffer 룸일 경우 버퍼 서비스에도 추가한다.
   *
   * @param protocol - rrweb 이벤트 배열이 포함된 프로토콜 객체
   * @param roomData - 현재 룸 상태 데이터
   * @param roomName - 현재 룸 이름
   */
  private async handleBatchRrwebEvents(
    protocol: any,
    roomData: RoomData,
    roomName: string,
  ): Promise<void> {
    const events = protocol.params?.events || [];
    this.logger.log(`[SessionReplay] Saving batch of ${events.length} events`);

    // Retrieve common buffer info upfront
    const bufferInfo = this.bufferRooms.get(roomName);
    const deviceId = bufferInfo?.deviceId || "unknown-device";
    const url = bufferInfo?.url || "unknown-url";
    const userAgent = bufferInfo?.userAgent || "unknown-useragent";
    const title = bufferInfo?.title;
    const sessionStartTime = bufferInfo?.sessionStartTime;

    for (const event of events) {
      const sessionTimestamp =
        BigInt(event.timestamp || Date.now()) * BigInt(1_000_000);
      const eventType = this.mapRrwebEventType(event.type);

      await this.screenService.upsert({
        recordId: roomData.recordId,
        protocol: {
          method: "SessionReplay.rrwebEvent",
          params: { event },
        },
        timestamp: sessionTimestamp.toString(),
        type: null,
        eventType: eventType,
        sequence: event.data?.sequence || null,
      } as any);

      // Add event to buffer (Buffer rooms only)
      if (roomData.recordId && roomName.startsWith("Buffer-")) {
        const bufferEvent = {
          method: "SessionReplay.rrwebEvent",
          params: { event },
          timestamp: Number(sessionTimestamp / BigInt(1_000_000)),
        };

        this.bufferService.addEvent(
          roomName,
          roomData.recordId,
          deviceId,
          url,
          userAgent,
          title,
          sessionStartTime,
          bufferEvent,
        );
      }
    }
  }

  /**
   * 레거시 세션 리플레이 형식(SessionReplay.snapshot / SessionReplay.interaction)을 처리한다.
   * 마이그레이션 기간 동안의 호환성을 위해 유지된다.
   *
   * @param protocol - 레거시 형식의 프로토콜 객체
   * @param roomData - 현재 룸 상태 데이터
   * @param timestamp - 기본 타임스탬프 (나노초)
   */
  private async handleLegacySessionReplay(
    protocol: any,
    roomData: RoomData,
    timestamp: number,
  ): Promise<void> {
    const sdkTimestamp = protocol.params?.timestamp;
    let sessionTimestamp: bigint;

    if (sdkTimestamp) {
      sessionTimestamp = BigInt(sdkTimestamp) * BigInt(1_000_000);
      this.lastEventTimestamp = sdkTimestamp;
    } else {
      sessionTimestamp = BigInt(timestamp);
    }

    let eventType: string | null = null;
    if (protocol.method === "SessionReplay.snapshot") {
      eventType =
        protocol.params?.type === "full_snapshot"
          ? "full_snapshot"
          : "incremental_snapshot";
    } else if (protocol.method === "SessionReplay.interaction") {
      eventType = "interaction";
    }

    await this.screenService.upsert({
      recordId: roomData.recordId,
      protocol,
      timestamp: sessionTimestamp.toString(),
      type: null,
      eventType: eventType,
      sequence: protocol.params?.sequence,
    } as any);
  }

  /**
   * 단일 rrweb 이벤트를 버퍼 서비스에 추가한다.
   * Buffer 룸에서만 호출되며, 버퍼 서비스를 통해 메모리에 이벤트를 축적한다.
   *
   * @param roomName - 버퍼 룸 이름
   * @param recordId - 레코드 ID
   * @param protocol - rrweb 이벤트가 포함된 프로토콜 객체
   * @param sessionTimestamp - 세션 타임스탬프 (나노초, BigInt)
   */
  private addRrwebEventToBuffer(
    roomName: string,
    recordId: number,
    protocol: any,
    sessionTimestamp: bigint,
  ): void {
    const bufferInfo = this.bufferRooms.get(roomName);
    const deviceId = bufferInfo?.deviceId || "unknown-device";
    const url = bufferInfo?.url || "unknown-url";
    const userAgent = bufferInfo?.userAgent || "unknown-useragent";
    const title = bufferInfo?.title;
    const sessionStartTime = bufferInfo?.sessionStartTime;

    const bufferEvent = {
      method: protocol.method,
      params: protocol.params,
      timestamp: Number(sessionTimestamp / BigInt(1_000_000)),
    };

    this.bufferService.addEvent(
      roomName,
      recordId,
      deviceId,
      url,
      userAgent,
      title,
      sessionStartTime,
      bufferEvent,
    );
  }

  // -------------------------------------------------------------------------
  // Buffer events -- 버퍼 이벤트 처리
  // -------------------------------------------------------------------------

  /**
   * "bufferEvent" WebSocket 메시지를 처리하여 이벤트를 버퍼에 추가한다.
   *
   * Record/Live 룸의 이벤트는 무시하고, Buffer 룸의 이벤트만 처리한다.
   * 버퍼 룸 정보를 갱신하고, visibility 재진입을 감지하며,
   * pending 상태의 클라이언트를 룸에 할당한다.
   *
   * @param data - 버퍼 이벤트 데이터
   * @param data.room - 버퍼 룸 이름
   * @param data.recordId - 레코드 ID
   * @param data.deviceId - 디바이스 고유 식별자
   * @param data.url - 현재 페이지 URL
   * @param data.userAgent - 사용자 에이전트 문자열
   * @param data.title - 페이지 제목 (선택)
   * @param data.event - 버퍼링할 이벤트 객체
   * @param client - 요청을 보낸 SDK 클라이언트 WebSocket
   */
  @SubscribeMessage("bufferEvent")
  public async handleBufferEvent(
    @MessageBody()
    data: {
      room: string;
      recordId: number;
      deviceId: string;
      url: string;
      userAgent: string;
      title?: string;
      event: any;
    },
    @ConnectedSocket() client: WebSocket,
  ): Promise<void> {
    try {
      const { room, deviceId, event, url, userAgent, title } = data;

      // Ignore buffer events after a recording session or ticket has been created
      if (room.startsWith("Record-") || room.startsWith("Live-")) {
        return;
      }

      // Persist buffer room info (Buffer- rooms only)
      const existingInfo =
        this.bufferRooms.get(room) || this.lastBufferInfoByDevice.get(deviceId);
      const sessionStartTime = existingInfo?.sessionStartTime ?? Date.now();

      const bufferInfo: BufferRoomInfo = {
        deviceId,
        url,
        userAgent,
        title,
        sessionStartTime,
      };
      this.bufferRooms.set(room, bufferInfo);
      this.lastBufferInfoByDevice.set(deviceId, {
        room,
        deviceId,
        url,
        userAgent,
        title,
        sessionStartTime,
      });
      // Reset visibility-exit save state for the new session
      this.visibilityExitSavedRooms.delete(room);

      // Store deviceId -> room mapping (Buffer mode only)
      if (!room.startsWith("Record-")) {
        this.deviceToRoom.set(deviceId, room);
      }

      // Detect visibility re-entry (user returned after leaving the page)
      if (this.visibilityExitSavedRooms.has(room)) {
        this.visibilityExitSavedRooms.delete(room);
        this.logger.log(
          `[BUFFER_VISIBILITY_REENTRY] deviceId: ${deviceId}, room: ${room} - user returned, reset save state`,
        );
      }

      // Add event to buffer
      const bufferEvent = {
        method: event.method,
        params: event.params,
        timestamp: event.timestamp || Date.now(),
      };

      this.bufferService.addEvent(
        room,
        0, // Buffer mode uses recordId=0
        deviceId,
        url,
        userAgent,
        title,
        bufferInfo.sessionStartTime,
        bufferEvent,
      );

      if (this.clientMap.get(client) === "pending") {
        this.clientMap.set(client, room);
      }
    } catch (error) {
      this.logger.error(
        `[BUFFER_EVENT] Error handling buffer event: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

  // -------------------------------------------------------------------------
  // Enable buffering -- 버퍼링 모드 활성화
  // -------------------------------------------------------------------------

  /**
   * "enableBuffering" WebSocket 메시지를 처리하여 버퍼링 모드를 활성화한다.
   *
   * 새로운 Buffer 룸을 생성하고, 클라이언트와 디바이스 매핑을 설정한 뒤
   * 버퍼 룸 메타데이터를 저장한다. 성공 시 "bufferingEnabled" 응답을 전송한다.
   *
   * @param data - 버퍼링 활성화 데이터
   * @param data.deviceId - 디바이스 고유 식별자
   * @param data.url - 현재 페이지 URL
   * @param data.userAgent - 사용자 에이전트 문자열
   * @param data.timestamp - 세션 시작 타임스탬프
   * @param data.room - 버퍼 룸 이름 (선택, 미지정 시 자동 생성)
   * @param data.title - 페이지 제목 (선택)
   * @param client - 요청을 보낸 SDK 클라이언트 WebSocket
   */
  @SubscribeMessage("enableBuffering")
  public async handleEnableBuffering(
    @MessageBody()
    data: {
      deviceId: string;
      url: string;
      userAgent: string;
      timestamp: number;
      room?: string;
      title?: string;
    },
    @ConnectedSocket() client: WebSocket,
  ): Promise<void> {
    try {
      this.logger.log(
        `[ENABLE_BUFFERING] Buffer mode enabled for device: ${data.deviceId}`,
      );

      const sessionStartTime = data.timestamp || Date.now();
      const bufferRoom =
        data.room || `Buffer-${data.deviceId}-${sessionStartTime}`;

      this.clientMap.set(client, bufferRoom);
      this.deviceToRoom.set(data.deviceId, bufferRoom);

      const bufferInfo: BufferRoomInfo = {
        deviceId: data.deviceId,
        url: data.url,
        userAgent: data.userAgent,
        title: data.title,
        sessionStartTime,
      };
      this.bufferRooms.set(bufferRoom, bufferInfo);
      this.lastBufferInfoByDevice.set(data.deviceId, {
        room: bufferRoom,
        deviceId: data.deviceId,
        url: data.url,
        userAgent: data.userAgent,
        title: data.title,
        sessionStartTime,
      });
      // Reset visibility-exit save state for the new session
      this.visibilityExitSavedRooms.delete(bufferRoom);

      // Send success response
      this.sendMessage(client, {
        event: "bufferingEnabled",
        message: "Buffer mode activated successfully",
      });
    } catch (error) {
      this.logger.error(`[ENABLE_BUFFERING_ERROR] ${error}`);
      this.sendMessage(client, {
        event: "error",
        message: "Failed to enable buffer mode",
      });
    }
  }

  // -------------------------------------------------------------------------
  // Save buffer -- 버퍼 저장 트리거
  // -------------------------------------------------------------------------

  /**
   * "saveBuffer" WebSocket 메시지를 처리하여 버퍼 데이터 저장을 트리거한다.
   *
   * visibilitychange 트리거일 경우 중복 저장 방지를 위해 해당 룸을 추적한다.
   * 실제 저장은 {@link triggerBufferSave}에 위임한다.
   *
   * @param data - 버퍼 저장 요청 데이터
   * @param data.deviceId - 디바이스 고유 식별자
   * @param data.url - 현재 페이지 URL
   * @param data.trigger - 저장 트리거 원인 (예: "visibilitychange", "beforeunload")
   * @param data.timestamp - 저장 요청 타임스탬프
   * @param data.title - 페이지 제목 (선택)
   * @param data.room - 버퍼 룸 이름 (선택)
   */
  @SubscribeMessage("saveBuffer")
  public async handleSaveBuffer(
    @MessageBody()
    data: {
      deviceId: string;
      url: string;
      trigger: string;
      timestamp: number;
      title?: string;
      room?: string;
    },
  ): Promise<void> {
    const { deviceId, trigger, title, timestamp, room, url } = data;

    // Track visibility-exit saves for re-entry detection
    if (trigger === "visibilitychange") {
      const bufferRoom = this.deviceToRoom.get(deviceId);
      if (bufferRoom) {
        this.visibilityExitSavedRooms.add(bufferRoom);
        this.logger.log(
          `[SAVE_BUFFER_VISIBILITY_EXIT] deviceId: ${deviceId}, room: ${bufferRoom} - saved on visibility change`,
        );
      }
    }

    const success = await this.triggerBufferSave(
      deviceId,
      trigger,
      title,
      timestamp,
      room,
      url,
    );

    if (!success) {
      this.logger.warn(
        `[SAVE_BUFFER_WS_FAIL] deviceId: ${deviceId}, trigger: ${trigger}, roomsTracked: ${this.bufferRooms.size}`,
      );
    }
  }

  // -------------------------------------------------------------------------
  // Buffer save orchestration -- 버퍼 저장 오케스트레이션
  // -------------------------------------------------------------------------

  /**
   * 버퍼 저장을 오케스트레이션하는 메서드.
   *
   * deviceId에 해당하는 모든 플러시 대상 룸을 수집하고,
   * 각 룸의 버퍼 데이터를 S3에 강제 저장한 뒤 관련 상태를 정리한다.
   * HTTP Beacon API 엔드포인트에서도 호출될 수 있다.
   *
   * @param deviceId - 디바이스 고유 식별자
   * @param trigger - 저장 트리거 원인 (선택)
   * @param title - 페이지 제목 (선택)
   * @param referenceTimestamp - 기준 타임스탬프 (선택, 이보다 늦게 시작된 세션 제외)
   * @param roomName - 특정 룸 이름 필터 (선택)
   * @param requestUrl - 요청 URL 필터 (선택)
   * @returns 하나 이상의 버퍼가 성공적으로 저장되었으면 true
   */
  public async triggerBufferSave(
    deviceId: string,
    trigger?: string,
    title?: string,
    referenceTimestamp?: number,
    roomName?: string,
    requestUrl?: string,
  ): Promise<boolean> {
    if (!deviceId) {
      this.logger.warn("[SAVE_BUFFER_TRIGGER_INVALID] deviceId is required");
      return false;
    }

    try {
      this.logger.log(
        `[SAVE_BUFFER_TRIGGER] deviceId: ${deviceId}, trigger: ${trigger}, roomHint=${roomName}, urlHint=${requestUrl}`,
      );

      const roomsToFlush = this.collectRoomsToFlush(deviceId, {
        referenceTimestamp,
        roomName,
        url: requestUrl,
      });

      if (roomsToFlush.length === 0) {
        this.logger.warn(
          `[SAVE_BUFFER_TRIGGER_MISS] No room/buffer info for deviceId: ${deviceId}`,
        );
        return false;
      }

      let flushed = false;

      for (const { room, info } of roomsToFlush) {
        const updatedInfo: BufferRoomInfo = { ...info };

        if (title !== undefined) {
          updatedInfo.title = title;
        }

        if (this.bufferRooms.has(room)) {
          this.bufferRooms.set(room, { ...updatedInfo });
        }

        const lastInfo = this.lastBufferInfoByDevice.get(updatedInfo.deviceId);
        if (lastInfo?.room === room) {
          this.lastBufferInfoByDevice.set(updatedInfo.deviceId, {
            ...updatedInfo,
            room,
          });
        }

        const result = await this.flushBufferToFileForce(
          room,
          0,
          updatedInfo.deviceId,
          updatedInfo.url,
          updatedInfo.userAgent,
          updatedInfo.title,
        );

        if (result) {
          flushed = true;
        }

        this.cleanupBufferRoomAfterFlush(room, updatedInfo.deviceId);
      }

      return flushed;
    } catch (error) {
      this.logger.error(
        `[SAVE_BUFFER_TRIGGER_ERROR] ${(error as Error).message}`,
        (error as Error).stack,
      );
      return false;
    }
  }

  // -------------------------------------------------------------------------
  // Buffer room collection / cleanup helpers -- 플러시 대상 룸 수집 및 정리
  // -------------------------------------------------------------------------

  /**
   * 지정된 deviceId에 대해 플러시할 모든 룸을 수집한다.
   *
   * deviceToRoom 직접 매핑, bufferRooms 스캔, lastBufferInfoByDevice 스캔 세 가지
   * 경로로 후보 룸을 탐색하며, referenceTimestamp/roomName/URL 경로로 필터링한다.
   *
   * @param deviceId - 디바이스 고유 식별자
   * @param options - 필터 옵션
   * @param options.referenceTimestamp - 기준 타임스탬프 (이보다 늦게 시작된 세션 제외, 선택)
   * @param options.roomName - 특정 룸 이름 필터 (선택)
   * @param options.url - URL 경로 필터 (선택)
   * @returns 플러시 대상 룸과 버퍼 정보 배열
   */
  private collectRoomsToFlush(
    deviceId: string,
    options: { referenceTimestamp?: number; roomName?: string; url?: string },
  ): Array<{ room: string; info: BufferRoomInfo }> {
    const { referenceTimestamp, roomName, url } = options;
    const normalizedRequestedPath = this.normalizeUrlPath(url);

    const rooms = new Map<string, { room: string; info: BufferRoomInfo }>();

    const maybeIncludeRoom = (
      room: string | undefined | null,
      info?: BufferRoomInfo | LastBufferInfo,
    ): void => {
      if (!room || !info) return;
      if (roomName && room !== roomName) return;

      const normalizedInfo: BufferRoomInfo = {
        deviceId: info.deviceId,
        url: info.url,
        userAgent: info.userAgent,
        title: info.title,
        sessionStartTime: info.sessionStartTime,
      };

      if (
        referenceTimestamp &&
        normalizedInfo.sessionStartTime &&
        normalizedInfo.sessionStartTime > referenceTimestamp
      ) {
        return;
      }

      if (normalizedRequestedPath) {
        const infoPath = this.normalizeUrlPath(normalizedInfo.url);
        if (!infoPath || infoPath !== normalizedRequestedPath) {
          this.logger.log(
            `[SAVE_BUFFER_TRIGGER_SKIP] room=${room}, infoPath=${infoPath}, requestedPath=${normalizedRequestedPath}`,
          );
          return;
        }
      }

      rooms.set(room, { room, info: normalizedInfo });
    };

    // 1. Direct deviceId -> room mapping
    const directRoom = this.deviceToRoom.get(deviceId);
    if (directRoom) {
      const info =
        this.bufferRooms.get(directRoom) ||
        this.lastBufferInfoByDevice.get(deviceId);
      maybeIncludeRoom(directRoom, info);
    }

    // 2. Scan bufferRooms for matching deviceId
    for (const [room, info] of this.bufferRooms.entries()) {
      if (info.deviceId === deviceId) {
        maybeIncludeRoom(room, info);
      }
    }

    // 3. Scan lastBufferInfoByDevice for matching deviceId
    for (const info of this.lastBufferInfoByDevice.values()) {
      if (info.deviceId === deviceId) {
        maybeIncludeRoom(info.room, info);
      }
    }

    return Array.from(rooms.values());
  }

  /**
   * 버퍼 플러시 완료 후 해당 룸의 모든 추적 데이터를 제거한다.
   * bufferRooms, deviceToRoom, lastBufferInfoByDevice, visibilityExitSavedRooms에서 삭제한다.
   *
   * @param room - 정리할 버퍼 룸 이름
   * @param deviceId - 관련 디바이스 식별자
   */
  private cleanupBufferRoomAfterFlush(room: string, deviceId: string): void {
    if (this.bufferRooms.has(room)) {
      this.bufferRooms.delete(room);
    }

    if (this.deviceToRoom.get(deviceId) === room) {
      this.deviceToRoom.delete(deviceId);
    }

    const lastInfo = this.lastBufferInfoByDevice.get(deviceId);
    if (lastInfo?.room === room) {
      this.lastBufferInfoByDevice.delete(deviceId);
    }

    this.visibilityExitSavedRooms.delete(room);
  }

  /**
   * URL을 origin + pathname으로 정규화한다.
   * 쿼리 파라미터와 프래그먼트를 제거하여 경로만 반환한다.
   *
   * @param url - 정규화할 URL 문자열 (선택)
   * @returns 정규화된 URL 경로, 또는 유효하지 않은 경우 null
   */
  private normalizeUrlPath(url?: string): string | null {
    if (!url) return null;

    try {
      const parsed = new URL(url);
      return `${parsed.origin}${parsed.pathname}`;
    } catch {
      try {
        const [base] = url.split("?");
        return base || null;
      } catch {
        return null;
      }
    }
  }

  // -------------------------------------------------------------------------
  // Update response body -- 네트워크 응답 본문 업데이트
  // -------------------------------------------------------------------------

  /**
   * "updateResponseBody" WebSocket 메시지를 처리하여 네트워크 응답 본문을 업데이트한다.
   * 녹화 모드에서 수집된 네트워크 요청의 응답 본문을 DB에 저장한다.
   *
   * @param data - 응답 본문 업데이트 데이터
   * @param data.room - 룸 이름
   * @param data.requestId - 네트워크 요청 ID
   * @param data.body - 응답 본문 문자열
   * @param data.base64Encoded - Base64 인코딩 여부
   */
  @SubscribeMessage("updateResponseBody")
  public async handleResponseBody(
    @MessageBody()
    data: {
      room: string;
      requestId: number;
      body: string;
      base64Encoded: boolean;
    },
  ): Promise<void> {
    const roomData = this.rooms.get(data.room);
    const recordId = roomData?.recordId;
    await this.networkService.updateResponseBody({ recordId, ...data });
  }

  // -------------------------------------------------------------------------
  // Ticket creation -- Jira 티켓 생성 처리
  // -------------------------------------------------------------------------

  /**
   * "createTicket" WebSocket 메시지를 처리하여 Jira 티켓을 생성한다.
   *
   * 녹화 룸을 생성하고, Jira API를 통해 티켓을 생성한 뒤
   * Slack DM 전송, 티켓 로그 저장, 버퍼 데이터 이전을 수행한다.
   * 에러 발생 시 클라이언트에 에러 메시지를 전송한다.
   *
   * @param data - 티켓 생성 요청 데이터
   * @param data.userData - 사용자 및 디바이스 정보
   * @param data.formData - 티켓 폼 데이터 (선택, Epic/컴포넌트/라벨 등)
   * @param client - 요청을 보낸 SDK 클라이언트 WebSocket
   */
  @SubscribeMessage("createTicket")
  public async handleCreateTicket(
    @MessageBody()
    data: { userData: UserData; formData?: TicketFormData },
    @ConnectedSocket() client: WebSocket,
  ): Promise<void> {
    try {
      const { userData, formData } = data;

      // Ensure commonInfo defaults are present
      if (!userData.commonInfo) {
        userData.commonInfo = getDefaultCommonInfo();
      }

      // Reflect userData URL and userAgent into commonInfo
      userData.commonInfo.URL = userData.URL || userData.commonInfo.URL;
      userData.commonInfo.userAgent =
        userData.userAgent || userData.commonInfo.userAgent;

      const { commonInfo, URL } = userData;
      const roomName = `Record-${randomUUID()}`;

      // Register buffer room info
      const bufferInfo: BufferRoomInfo = {
        deviceId: commonInfo.device.deviceId,
        url: commonInfo.URL,
        userAgent: commonInfo.userAgent,
        sessionStartTime: Date.now(),
      };

      this.bufferRooms.set(roomName, bufferInfo);
      this.lastBufferInfoByDevice.set(commonInfo.device.deviceId, {
        room: roomName,
        deviceId: commonInfo.device.deviceId,
        url: bufferInfo.url,
        userAgent: bufferInfo.userAgent,
        title: bufferInfo.title,
        sessionStartTime: bufferInfo.sessionStartTime,
      });
      // Reset visibility-exit save state for the new session
      this.visibilityExitSavedRooms.delete(roomName);

      this.logger.log(
        `[TICKET_CREATE_START] ${JSON.stringify({
          deviceId: commonInfo.device.deviceId,
          memberId: commonInfo.user.memberId,
          URL,
          formData: formData ? JSON.stringify(formData) : null,
          userData: JSON.stringify(userData),
          isDefaultCommonInfo:
            commonInfo.device.deviceId.startsWith("unknown-"),
        })}`,
      );

      const recordId = await this.createRoom({
        roomName,
        client,
        recordMode: true,
        url: commonInfo.URL,
        deviceId: commonInfo.device.deviceId,
        referrer: URL?.split("?")[0],
      });

      const { requestBody, ticketKey, ticketUrl } =
        await this.jiraService.createTicket({
          roomName,
          recordId,
          userData,
          formData,
        });

      this.logger.log(
        `[TICKET_CREATE_SUCCESS] ${JSON.stringify({
          ticketUrl,
          recordId,
          roomName,
          deviceId: commonInfo.device.deviceId,
        })}`,
      );

      if (recordId) {
        await this.handlePostTicketCreation(
          client,
          commonInfo,
          recordId,
          roomName,
          URL,
          requestBody,
          ticketKey,
          ticketUrl,
          formData,
        );
      }

      // Transfer buffered data to the new record
      if (recordId) {
        await this.transferBufferedDataToRecord(
          commonInfo.device.deviceId,
          recordId,
        );
      }

      this.logger.log(
        `[TICKET_CREATE_COMPLETE] ${JSON.stringify({
          ticketUrl,
          deviceId: commonInfo.device.deviceId,
        })}`,
      );
    } catch (error) {
      this.handleTicketCreationError(data, client, error as Error);
    }
  }

  /**
   * 티켓 생성 후 후처리를 수행한다.
   * Slack DM 전송, 클라이언트에 성공 메시지 전송, 티켓 로그를 DB에 저장한다.
   *
   * @param client - SDK 클라이언트 WebSocket
   * @param commonInfo - 공통 사용자/디바이스 정보
   * @param recordId - 생성된 레코드 ID
   * @param roomName - 룸 이름
   * @param URL - 페이지 URL
   * @param requestBody - Jira API 요청 본문
   * @param ticketKey - 생성된 Jira 티켓 키 (예: "PROJ-123")
   * @param ticketUrl - 생성된 Jira 티켓 URL
   * @param formData - 티켓 폼 데이터 (선택)
   */
  private async handlePostTicketCreation(
    client: WebSocket,
    commonInfo: CommonInfo,
    recordId: number,
    roomName: string,
    URL: string,
    requestBody: any,
    ticketKey: string,
    ticketUrl: string,
    formData?: TicketFormData,
  ): Promise<void> {
    // Only look up user info when deviceId is not the default placeholder
    const userInfo = !commonInfo.device.deviceId.startsWith("unknown-")
      ? await this.userInfoService.getUserInfoByDeviceId(
          commonInfo.device.deviceId,
        )
      : null;

    this.logger.log(
      `[TICKET_USER_INFO] ${JSON.stringify({
        deviceId: commonInfo.device.deviceId,
        userInfoFound: !!userInfo,
        username: userInfo?.username,
        slackUserId: userInfo?.slackUserId,
      })}`,
    );

    if (userInfo?.slackUserId) {
      await this.slackService.sendCreateTicketDM({
        slackUserId: userInfo.slackUserId,
        requestBody,
        ticketKey,
        ticketUrl,
      });
      this.logger.log(
        `[TICKET_SLACK_DM_SENT] ${JSON.stringify({
          slackUserId: userInfo.slackUserId,
          ticketUrl,
        })}`,
      );
    }

    this.sendMessage(client, {
      event: "ticketCreateSuccess",
      message: "QA ticket created successfully.",
    });

    // Persist ticket log
    if (userInfo) {
      await this.persistTicketLog(
        commonInfo,
        recordId,
        roomName,
        URL,
        requestBody,
        ticketUrl,
        userInfo,
        formData,
      );
    }
  }

  /**
   * 티켓 생성 로그를 DB에 저장한다.
   * 티켓 로그 엔티티와 함께 관련 컴포넌트 및 라벨 레코드도 저장한다.
   * 로그 저장 실패 시에도 티켓 생성 성공에는 영향을 주지 않는다.
   *
   * @param commonInfo - 공통 사용자/디바이스 정보
   * @param recordId - 레코드 ID
   * @param roomName - 룸 이름
   * @param URL - 페이지 URL
   * @param requestBody - Jira API 요청 본문
   * @param ticketUrl - 생성된 Jira 티켓 URL
   * @param userInfo - 사용자 정보 (사용자명, Slack ID, Jira 프로젝트 키 등)
   * @param formData - 티켓 폼 데이터 (선택)
   */
  private async persistTicketLog(
    commonInfo: CommonInfo,
    recordId: number,
    roomName: string,
    URL: string,
    requestBody: any,
    ticketUrl: string,
    userInfo: any,
    formData?: TicketFormData,
  ): Promise<void> {
    try {
      const assignee = formData?.assignee ?? userInfo.username;

      const ticketLog = this.ticketLogRepository.create({
        deviceId: commonInfo.device.deviceId,
        username: userInfo.username,
        userDisplayName: userInfo.userDisplayName,
        recordId,
        ticketUrl,
        jiraProjectKey: userInfo.jiraProjectKey || "N/A",
        assignee,
        parentEpic: formData?.Epic || null,
        title: requestBody.title,
        sessionName: roomName,
        url: URL.split("?")[0],
      });

      await this.ticketLogRepository.save(ticketLog);

      // Persist component entries
      if (formData?.components && formData.components.length > 0) {
        const componentEntities = formData.components.map((componentName) =>
          this.ticketComponentRepository.create({
            ticketLogId: ticketLog.id,
            componentName: componentName.trim(),
          }),
        );
        await this.ticketComponentRepository.save(componentEntities);
      }

      // Persist label entries
      if (formData?.labels && formData.labels.length > 0) {
        const labelEntities = formData.labels.map((labelName) =>
          this.ticketLabelRepository.create({
            ticketLogId: ticketLog.id,
            labelName: labelName.trim(),
          }),
        );
        await this.ticketLabelRepository.save(labelEntities);
      }

      this.logger.log(
        `[TICKET_LOG_SAVED] ${JSON.stringify({
          ticketLogId: ticketLog.id,
          URL,
          deviceId: commonInfo.device.deviceId,
          assignee,
          parentEpic: formData?.Epic,
          components: formData?.components,
          labels: formData?.labels,
          jiraProjectKey: userInfo.jiraProjectKey,
        })}`,
      );
    } catch (logError) {
      this.logger.error(
        `[TICKET_LOG_ERROR] ${JSON.stringify({
          deviceId: commonInfo.device.deviceId,
          ticketUrl,
          error:
            logError instanceof Error
              ? {
                  message: logError.message,
                  stack: logError.stack,
                  name: logError.name,
                }
              : JSON.stringify(logError),
        })}`,
      );
      // Log persistence failure must not affect ticket creation success
    }
  }

  /**
   * 티켓 생성 중 발생한 에러를 처리하고 클라이언트에 에러 메시지를 전송한다.
   *
   * @param data - 원본 티켓 생성 요청 데이터
   * @param client - SDK 클라이언트 WebSocket
   * @param error - 발생한 에러 객체
   */
  private handleTicketCreationError(
    data: { userData: UserData; formData?: TicketFormData },
    client: WebSocket,
    error: Error,
  ): void {
    const originUserData = { ...data.userData };
    if (!originUserData.commonInfo) {
      originUserData.commonInfo = getDefaultCommonInfo();
    }

    this.logger.error(
      `[TICKET_CREATE_ERROR] ${JSON.stringify({
        deviceId: originUserData.commonInfo.device.deviceId,
        URL: originUserData.URL,
        formData: data.formData ? JSON.stringify(data.formData) : null,
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      })}`,
    );
    this.sendMessage(client, {
      event: "ticketCreateError",
      message: `Ticket creation failed: ${error.message}`,
    });
  }

  // -------------------------------------------------------------------------
  // Buffer flush helpers -- 버퍼 S3 저장 헬퍼
  // -------------------------------------------------------------------------

  /**
   * 버퍼 데이터를 S3에 강제 저장한다 (최소 이벤트 수 무시).
   *
   * visibility exit으로 이미 저장된 룸은 중복 저장을 방지한다.
   * 의미 있는 이벤트가 부족한 경우에도 저장을 건너뛸 수 있다.
   *
   * @param room - 버퍼 룸 이름
   * @param recordId - 레코드 ID
   * @param deviceId - 디바이스 고유 식별자
   * @param url - 페이지 URL
   * @param userAgent - 사용자 에이전트 문자열
   * @param title - 페이지 제목 (선택)
   * @returns 저장 성공 여부
   */
  private async flushBufferToFileForce(
    room: string,
    recordId: number,
    deviceId: string,
    url: string,
    userAgent: string,
    title?: string,
  ): Promise<boolean> {
    try {
      if (this.visibilityExitSavedRooms.has(room)) {
        this.logger.log(
          `[FLUSH_SKIP_VISIBILITY_SAVED] Room ${room} already saved on visibility exit and no reentry, skipping duplicate save`,
        );
        return false;
      }

      const flushedBuffer = this.bufferService.flushBufferForce(
        room,
        recordId,
        deviceId,
      );

      if (!flushedBuffer || flushedBuffer.events.length === 0) {
        return false;
      }

      if (!this.shouldPersistBuffer(flushedBuffer.events)) {
        this.logger.log(
          `[FLUSH_SKIP_LIGHT_BUFFER] deviceId: ${deviceId}, room: ${room}, eventCount: ${flushedBuffer.events.length}`,
        );
        return false;
      }

      await this.uploadBufferToS3(
        room,
        recordId,
        deviceId,
        url,
        userAgent,
        title || flushedBuffer.title,
        flushedBuffer,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `[FLUSH_FORCE_ERROR] Failed to force flush buffer: ${(error as Error).message}`,
        (error as Error).stack,
      );
      return false;
    }
  }

  /**
   * 버퍼 데이터를 S3에 저장한다 (최소 이벤트 수 기준 적용).
   *
   * {@link flushBufferToFileForce}와 달리 최소 이벤트 수 기준을 준수한다.
   * visibility exit으로 이미 저장된 룸은 중복 저장을 방지한다.
   *
   * @param room - 버퍼 룸 이름
   * @param recordId - 레코드 ID
   * @param deviceId - 디바이스 고유 식별자
   * @param url - 페이지 URL
   * @param userAgent - 사용자 에이전트 문자열
   * @param title - 페이지 제목 (선택)
   * @returns 저장 성공 여부
   */
  private async flushBufferToFile(
    room: string,
    recordId: number,
    deviceId: string,
    url: string,
    userAgent: string,
    title?: string,
  ): Promise<boolean> {
    try {
      if (this.visibilityExitSavedRooms.has(room)) {
        this.logger.log(
          `[FLUSH_SKIP_VISIBILITY_SAVED] Room ${room} already saved on visibility exit and no reentry, skipping duplicate save`,
        );
        return false;
      }

      const flushedBuffer = this.bufferService.flushBuffer(
        room,
        recordId,
        deviceId,
      );

      if (!flushedBuffer || flushedBuffer.events.length === 0) {
        return false;
      }

      if (!this.shouldPersistBuffer(flushedBuffer.events)) {
        this.logger.log(
          `[FLUSH_SKIP_LIGHT_BUFFER] deviceId: ${deviceId}, room: ${room}, eventCount: ${flushedBuffer.events.length}`,
        );
        return false;
      }

      await this.uploadBufferToS3(
        room,
        recordId,
        deviceId,
        url,
        userAgent,
        title || flushedBuffer.title,
        flushedBuffer,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `[FLUSH_TO_FILE_ERROR] Failed to flush buffer to file: ${(error as Error).message}`,
        (error as Error).stack,
      );
      return false;
    }
  }

  /**
   * S3 업로드 페이로드를 구성하고 S3에 저장한다.
   *
   * @param room - 버퍼 룸 이름
   * @param recordId - 레코드 ID
   * @param deviceId - 디바이스 고유 식별자
   * @param url - 페이지 URL
   * @param userAgent - 사용자 에이전트 문자열
   * @param title - 페이지 제목 (선택)
   * @param flushedBuffer - 플러시된 버퍼 데이터 (이벤트 배열, 세션 시작 시간, 제목)
   */
  private async uploadBufferToS3(
    room: string,
    recordId: number,
    deviceId: string,
    url: string,
    userAgent: string,
    title: string | undefined,
    flushedBuffer: {
      events: BufferEvent[];
      sessionStartTime: number;
      title?: string;
    },
  ): Promise<void> {
    const uploadData = {
      room,
      recordId,
      deviceId,
      url,
      userAgent,
      title,
      bufferData: flushedBuffer.events,
      timestamp: flushedBuffer.sessionStartTime,
      date: new Date(flushedBuffer.sessionStartTime + 9 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      sessionStartTime: flushedBuffer.sessionStartTime,
    };

    await this.s3Service.saveBufferDataToFile(uploadData);
  }

  // -------------------------------------------------------------------------
  // Buffer transfer to record -- 버퍼 데이터를 레코드로 이전
  // -------------------------------------------------------------------------

  /**
   * 디바이스에 연결된 Buffer 룸을 찾는다.
   * deviceToRoom, bufferRooms, lastBufferInfoByDevice 순으로 탐색한다.
   *
   * @param deviceId - 디바이스 고유 식별자
   * @returns Buffer 룸 이름, 찾지 못한 경우 null
   */
  private findBufferRoomForDevice(deviceId: string): string | null {
    const direct = this.deviceToRoom.get(deviceId);
    if (direct) return direct;

    for (const [room, info] of this.bufferRooms.entries()) {
      if (info.deviceId === deviceId) return room;
    }

    const lastInfo = this.lastBufferInfoByDevice.get(deviceId);
    return lastInfo?.room ?? null;
  }

  /**
   * Buffer 룸의 버퍼 이벤트를 영구 레코드로 이전한다.
   * 녹화 세션 또는 티켓 생성 시 호출되며, 버퍼에 축적된 이벤트를
   * 도메인별 서비스를 통해 DB에 저장하고 버퍼 상태를 정리한다.
   *
   * @param deviceId - 디바이스 고유 식별자
   * @param recordId - 이전 대상 레코드 ID
   */
  private async transferBufferedDataToRecord(
    deviceId: string,
    recordId: number,
  ): Promise<void> {
    try {
      const bufferRoom = this.findBufferRoomForDevice(deviceId);
      if (!bufferRoom) {
        this.logger.log(
          `[BUFFER_TRANSFER] No buffer room found for deviceId: ${deviceId}`,
        );
        return;
      }

      const sessionBuffers = this.bufferService.getSessionBuffers(
        bufferRoom,
        0,
      );
      if (!sessionBuffers || sessionBuffers.length === 0) {
        this.logger.log(
          `[BUFFER_TRANSFER] No buffer data found for room: ${bufferRoom}`,
        );
        return;
      }

      const events = sessionBuffers.flatMap((buffer) => buffer.events);
      if (events.length === 0) {
        this.logger.log(
          `[BUFFER_TRANSFER] Buffer events empty for room: ${bufferRoom}`,
        );
        return;
      }

      let latestScreenPreview: BufferEvent | null = null;

      for (const event of events) {
        if (!event?.method) continue;

        if (event.method === "ScreenPreview.captured") {
          if (
            !latestScreenPreview ||
            (event.timestamp || 0) > (latestScreenPreview.timestamp || 0)
          ) {
            latestScreenPreview = event;
          }
          continue;
        }

        try {
          await this.persistBufferedEvent(recordId, event);
        } catch (error) {
          this.logger.error(
            `[BUFFER_TRANSFER_EVENT_ERROR] recordId=${recordId}, method=${event.method}, error=${error instanceof Error ? error.message : error}`,
            error instanceof Error ? error.stack : undefined,
          );
        }
      }

      // Persist the latest screen preview separately
      if (latestScreenPreview?.params) {
        await this.persistLatestScreenPreview(
          recordId,
          deviceId,
          latestScreenPreview,
        );
      }

      // Cleanup buffer state
      this.bufferService.clearSessionBuffers(bufferRoom, 0);
      this.bufferRooms.delete(bufferRoom);
      this.deviceToRoom.delete(deviceId);
      this.visibilityExitSavedRooms.delete(bufferRoom);
      this.lastBufferInfoByDevice.delete(deviceId);

      this.logger.log(
        `[BUFFER_TRANSFER_COMPLETE] deviceId=${deviceId}, recordId=${recordId}, eventCount=${events.length}, room=${bufferRoom}`,
      );
    } catch (error) {
      this.logger.error(
        `[BUFFER_TRANSFER_ERROR] Failed to transfer buffer data to record. deviceId=${deviceId}, recordId=${recordId}, error=${error instanceof Error ? error.message : error}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * 버퍼에서 가장 최신의 ScreenPreview.captured 이벤트를 DB에 저장한다.
   *
   * @param recordId - 레코드 ID
   * @param deviceId - 디바이스 고유 식별자
   * @param latestScreenPreview - 최신 스크린 프리뷰 이벤트
   */
  private async persistLatestScreenPreview(
    recordId: number,
    deviceId: string,
    latestScreenPreview: BufferEvent,
  ): Promise<void> {
    const previewParams = latestScreenPreview.params as {
      isFirstSnapshot?: boolean;
    } & Record<string, unknown>;

    let eventType: "full_snapshot" | "incremental_snapshot" =
      "incremental_snapshot";
    if (previewParams.isFirstSnapshot) {
      eventType = "full_snapshot";
    }

    const previewTimestampMs =
      typeof latestScreenPreview.timestamp === "number"
        ? latestScreenPreview.timestamp
        : Number(latestScreenPreview.timestamp);

    await this.screenService.upsert({
      recordId,
      protocol: {
        method: latestScreenPreview.method,
        params: previewParams,
      },
      timestamp: this.toTimestampNs(previewTimestampMs),
      type: "screenPreview",
      eventType: eventType,
    });

    this.logger.log(
      `[BUFFER_TRANSFER_SCREEN_PREVIEW] deviceId=${deviceId}, recordId=${recordId}, timestamp=${previewTimestampMs}`,
    );
  }

  // -------------------------------------------------------------------------
  // Event persistence helpers -- 버퍼 이벤트 영속화 헬퍼
  // -------------------------------------------------------------------------

  /**
   * 단일 버퍼 이벤트를 메서드 종류에 따라 적절한 서비스로 DB에 저장한다.
   *
   * 처리하는 도메인: Network, updateResponseBody, DOM, Runtime,
   * user.interaction, user.scroll, SessionReplay (단일/배치/레거시)
   *
   * @param recordId - 레코드 ID
   * @param event - 저장할 버퍼 이벤트
   */
  private async persistBufferedEvent(
    recordId: number,
    event: BufferEvent,
  ): Promise<void> {
    const method = event.method;
    const params: any = event.params ?? {};
    const protocol = { method, params };
    const timestampNs = this.toTimestampNs(event.timestamp);

    if (method.startsWith("Network.")) {
      const requestId = params?.requestId;
      if (requestId !== undefined && requestId !== null) {
        await this.networkService.create({
          recordId,
          protocol,
          requestId,
          timestamp: timestampNs,
        });
      }
      return;
    }

    if (method === "updateResponseBody") {
      if (params?.requestId !== undefined) {
        await this.networkService.updateResponseBody({
          recordId,
          requestId: params.requestId,
          body: params.body ?? "",
          base64Encoded: Boolean(params.base64Encoded),
        });
      }
      return;
    }

    if (method.startsWith("DOM.updated")) {
      await this.domService.upsert({
        recordId,
        protocol: { root: params },
        timestamp: timestampNs,
        type: "entireDom",
      });
      return;
    }

    if (method.startsWith("Runtime.")) {
      await this.runtimeService.create({
        recordId,
        protocol,
        timestamp: timestampNs,
      });
      return;
    }

    if (method === "user.interaction") {
      await this.screenService.upsert({
        recordId,
        protocol,
        timestamp: timestampNs,
        type: null,
        eventType: "user_interaction",
      });
      return;
    }

    if (method === "user.scroll") {
      await this.screenService.upsert({
        recordId,
        protocol,
        timestamp: timestampNs,
        type: null,
        eventType: "viewport_change",
      });
      return;
    }

    if (method === "SessionReplay.rrwebEvent") {
      await this.persistSingleRrwebEvent(recordId, params);
      return;
    }

    if (method === "SessionReplay.rrwebEvents") {
      await this.persistBatchRrwebEvents(recordId, params);
      return;
    }

    if (
      method === "SessionReplay.snapshot" ||
      method === "SessionReplay.interaction"
    ) {
      await this.persistLegacySessionReplayEvent(recordId, method, params);
      return;
    }
  }

  /**
   * 버퍼에서 단일 rrweb 이벤트를 DB에 저장한다.
   *
   * @param recordId - 레코드 ID
   * @param params - rrweb 이벤트 파라미터 (event 객체 포함)
   */
  private async persistSingleRrwebEvent(
    recordId: number,
    params: any,
  ): Promise<void> {
    const eventData = params?.event;
    if (!eventData) return;

    const sessionTimestamp =
      BigInt(eventData.timestamp || Date.now()) * BigInt(1_000_000);
    const eventType = this.mapRrwebEventType(eventData.type);

    await this.screenService.upsert({
      recordId,
      protocol: {
        method: "SessionReplay.rrwebEvent",
        params: { event: eventData },
      },
      timestamp: sessionTimestamp.toString(),
      type: null,
      eventType: eventType,
      sequence: eventData.data?.sequence || null,
    } as any);
  }

  /**
   * 버퍼에서 배치 rrweb 이벤트를 DB에 저장한다.
   *
   * @param recordId - 레코드 ID
   * @param params - rrweb 이벤트 배열이 포함된 파라미터 (events 배열 포함)
   */
  private async persistBatchRrwebEvents(
    recordId: number,
    params: any,
  ): Promise<void> {
    const events = Array.isArray(params?.events) ? params.events : [];

    for (const rrEvent of events) {
      const sessionTimestamp =
        BigInt(rrEvent.timestamp || Date.now()) * BigInt(1_000_000);
      const eventType = this.mapRrwebEventType(rrEvent.type);

      await this.screenService.upsert({
        recordId,
        protocol: {
          method: "SessionReplay.rrwebEvent",
          params: { event: rrEvent },
        },
        timestamp: sessionTimestamp.toString(),
        type: null,
        eventType: eventType,
        sequence: rrEvent.data?.sequence || null,
      } as any);
    }
  }

  /**
   * 레거시 SessionReplay.snapshot 또는 SessionReplay.interaction 이벤트를 DB에 저장한다.
   *
   * @param recordId - 레코드 ID
   * @param method - 프로토콜 메서드 이름
   * @param params - 이벤트 파라미터
   */
  private async persistLegacySessionReplayEvent(
    recordId: number,
    method: string,
    params: any,
  ): Promise<void> {
    const sdkTimestamp = params?.timestamp;
    let sessionTimestamp: bigint;

    if (sdkTimestamp) {
      sessionTimestamp = BigInt(sdkTimestamp) * BigInt(1_000_000);
      this.lastEventTimestamp = Number(sdkTimestamp);
    } else {
      sessionTimestamp = BigInt(Date.now()) * BigInt(1_000_000);
    }

    let eventType: string | null = null;
    if (method === "SessionReplay.snapshot") {
      eventType =
        params?.type === "full_snapshot"
          ? "full_snapshot"
          : "incremental_snapshot";
    } else if (method === "SessionReplay.interaction") {
      eventType = "interaction";
    }

    await this.screenService.upsert({
      recordId,
      protocol: { method, params },
      timestamp: sessionTimestamp.toString(),
      type: null,
      eventType: eventType,
      sequence: params?.sequence,
    } as any);
  }

  // -------------------------------------------------------------------------
  // Timestamp conversion -- 타임스탬프 변환
  // -------------------------------------------------------------------------

  /**
   * 밀리초 타임스탬프를 나노초로 변환한다.
   * 유효하지 않은 값일 경우 process.hrtime()을 사용하여 현재 시간을 반환한다.
   *
   * @param value - 밀리초 타임스탬프 (숫자 또는 문자열, 선택)
   * @returns 나노초 단위의 타임스탬프
   */
  private toTimestampNs(value?: number | string): number {
    const parsed = typeof value === "string" ? Number(value) : value;
    if (!Number.isFinite(parsed)) {
      const [seconds, nanoseconds] = process.hrtime();
      return seconds * 1e9 + nanoseconds;
    }
    return Math.trunc(parsed * 1_000_000);
  }

  // -------------------------------------------------------------------------
  // Buffer persistence eligibility -- 버퍼 저장 적격성 판단
  // -------------------------------------------------------------------------

  /**
   * 버퍼가 저장할 만큼 충분한 의미 있는 이벤트를 포함하는지 판단한다.
   *
   * - ScreenPreview 이벤트만 있는 경우: captured 스냅샷이 있어야 저장
   * - FullSnapshot(type=2)이 포함된 경우: 즉시 저장 대상
   * - 그 외: 최소 의미 있는 이벤트 수(5개) 이상이어야 저장
   *
   * @param events - 판단할 버퍼 이벤트 배열
   * @returns 저장할 가치가 있으면 true
   */
  private shouldPersistBuffer(events: BufferEvent[]): boolean {
    if (!Array.isArray(events) || events.length === 0) {
      return false;
    }

    const nonScreenPreviewEvents = events.filter(
      (event) => !event.method.startsWith("ScreenPreview."),
    );
    const screenPreviewEvents = events.filter((event) =>
      event.method.startsWith("ScreenPreview."),
    );

    if (nonScreenPreviewEvents.length === 0) {
      // Only ScreenPreview events -- persist only if a captured snapshot exists
      return screenPreviewEvents.some(
        (event) => event.method === "ScreenPreview.captured",
      );
    }

    const rrwebEvents = nonScreenPreviewEvents.filter((event) =>
      event.method.startsWith("SessionReplay.rrweb"),
    );

    const hasFullSnapshot = rrwebEvents.some((event) => {
      const params = event.params as any;

      if (Array.isArray(params?.events)) {
        return params.events.some(
          (rrEvent: any) =>
            typeof rrEvent?.type === "number" && rrEvent.type === 2,
        );
      }

      const rrEvent = params?.event;
      return typeof rrEvent?.type === "number" && rrEvent.type === 2;
    });

    if (hasFullSnapshot) return true;

    // Persist even without a FullSnapshot if there are enough meaningful events
    const MIN_MEANINGFUL_EVENTS = 5;
    return nonScreenPreviewEvents.length >= MIN_MEANINGFUL_EVENTS;
  }

  // -------------------------------------------------------------------------
  // Disconnection handling -- WebSocket 연결 해제 처리
  // -------------------------------------------------------------------------

  /**
   * WebSocket 연결 해제를 처리한다.
   *
   * 클라이언트 유형에 따라 분기 처리:
   * - Buffer 룸: 버퍼 데이터를 S3에 강제 저장 후 상태 정리
   * - Record/Live 룸: 세션 종료 이벤트 저장, DevTools 연결 해제, 룸 삭제
   * - DevTools: devtoolsMap에서 제거
   * - 이후 미저장 Buffer 룸 잔여 플러시 수행
   *
   * @param client - 연결 해제된 WebSocket 클라이언트
   */
  public async handleDisconnect(client: WebSocket): Promise<void> {
    const room = this.clientMap.get(client);

    if (room) {
      // Handle Buffer room disconnect
      if (room.startsWith("Buffer-")) {
        await this.handleBufferRoomDisconnect(room);
        this.clientMap.delete(client);
        return;
      }

      const roomData = this.rooms.get(room);

      // Persist session end event
      if (roomData?.recordId) {
        await this.handleRecordRoomDisconnect(room, roomData);
      }

      if (roomData) {
        roomData.devtools.forEach((devtools) => devtools.close());
        this.rooms.delete(room);
      }
      this.clientMap.delete(client);
      this.bufferRooms.delete(room);
      return;
    }

    const devtoolsInfo = this.devtoolsMap.get(client);
    if (devtoolsInfo) {
      this.rooms
        .get(devtoolsInfo.room)
        ?.devtools.delete(devtoolsInfo.devtoolsId);
      this.devtoolsMap.delete(client);
    }

    // Flush remaining Buffer rooms that were not saved on visibility exit
    await this.flushRemainingBufferRooms();
  }

  /**
   * Buffer 룸의 연결 해제 시 정리 작업을 수행한다.
   * 버퍼 데이터를 S3에 강제 저장하고, 관련 매핑 데이터를 모두 삭제한다.
   *
   * @param room - 연결 해제된 Buffer 룸 이름
   */
  private async handleBufferRoomDisconnect(room: string): Promise<void> {
    const directInfo = this.bufferRooms.get(room);
    const lastInfo =
      [...this.lastBufferInfoByDevice.values()].find(
        (info) => info.room === room,
      ) || null;

    const resolvedDeviceId =
      directInfo?.deviceId ?? lastInfo?.deviceId ?? "unknown-device";
    const resolvedUrl = directInfo?.url ?? lastInfo?.url ?? "unknown-url";
    const resolvedUserAgent =
      directInfo?.userAgent ?? lastInfo?.userAgent ?? "unknown-useragent";
    const resolvedTitle = directInfo?.title ?? lastInfo?.title;

    try {
      await this.flushBufferToFileForce(
        room,
        0,
        resolvedDeviceId,
        resolvedUrl,
        resolvedUserAgent,
        resolvedTitle,
      );
    } catch (error) {
      this.logger.error(
        `[BUFFER_DISCONNECT_FLUSH_ERROR] ${(error as Error).message}`,
        (error as Error).stack,
      );
    }

    this.bufferRooms.delete(room);
    this.deviceToRoom.delete(resolvedDeviceId);
    this.visibilityExitSavedRooms.delete(room);
    if (directInfo) {
      this.lastBufferInfoByDevice.delete(directInfo.deviceId);
    } else if (lastInfo) {
      this.lastBufferInfoByDevice.delete(lastInfo.deviceId);
    }
  }

  /**
   * Record/Live 룸의 연결 해제 시 정리 작업을 수행한다.
   * 세션 종료 이벤트를 저장하고, 세션 길이를 계산하여 업데이트하며,
   * Record/Live가 아닌 룸의 경우 버퍼를 S3에 플러시한다.
   *
   * @param room - 연결 해제된 룸 이름
   * @param roomData - 룸 상태 데이터
   */
  private async handleRecordRoomDisconnect(
    room: string,
    roomData: RoomData,
  ): Promise<void> {
    const endTime = Date.now() * 1_000_000; // milliseconds -> nanoseconds

    await this.screenService.upsert({
      recordId: roomData.recordId,
      protocol: { method: "session_end", params: {} },
      timestamp: endTime,
      type: null,
      eventType: "session_end",
    });

    // Calculate and update session duration
    const startEvent = await this.screenService.findScreens(roomData.recordId);
    if (startEvent && startEvent.length > 0) {
      const startTime = startEvent[0].timestamp;
      const duration = endTime - Number(startTime);
      await this.recordService.updateDuration(roomData.recordId, duration);
    }

    // Flush buffer for non-Record, non-Live rooms on disconnect
    if (!room.startsWith("Record-") && !room.startsWith("Live-")) {
      try {
        const bufferInfo = this.bufferRooms.get(room);
        await this.flushBufferToFile(
          room,
          roomData.recordId,
          bufferInfo?.deviceId || "unknown-device",
          bufferInfo?.url || "unknown-url",
          bufferInfo?.userAgent || "unknown-useragent",
          bufferInfo?.title,
        );
      } catch (error) {
        this.logger.error(
          `[DISCONNECT_FLUSH_ERROR] ${(error as Error).message}`,
        );
      }
    }
  }

  /**
   * visibility exit 시 저장되지 않은 잔여 Buffer 룸의 데이터를 플러시한다.
   * 이미 visibility exit으로 저장된 룸은 건너뛰고 상태만 정리한다.
   */
  private async flushRemainingBufferRooms(): Promise<void> {
    try {
      for (const [bufferRoom, bufferInfo] of this.bufferRooms.entries()) {
        if (
          bufferRoom.startsWith("Buffer-") &&
          !this.visibilityExitSavedRooms.has(bufferRoom)
        ) {
          await this.flushBufferToFile(
            bufferRoom,
            0,
            bufferInfo.deviceId,
            bufferInfo.url,
            bufferInfo.userAgent,
            bufferInfo.title,
          );
          this.bufferRooms.delete(bufferRoom);
        } else if (this.visibilityExitSavedRooms.has(bufferRoom)) {
          this.logger.log(
            `[DISCONNECT_SKIP_VISIBILITY_SAVED] Room ${bufferRoom} already saved on visibility exit, skipping`,
          );
          this.bufferRooms.delete(bufferRoom);
          this.visibilityExitSavedRooms.delete(bufferRoom);
        }
      }
    } catch (error) {
      this.logger.error(
        `[DISCONNECT_BUFFER_FLUSH_ERROR] ${(error as Error).message}`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Exported Types -- 외부 모듈에서 사용하는 공유 타입
// ---------------------------------------------------------------------------

/**
 * SDK에서 전달되는 공통 사용자/디바이스 정보 타입.
 * 사용자 인증, 디바이스 식별, 지원 데이터 등을 포함한다.
 */
export type CommonInfo = {
  /** 사용자 인증 및 식별 정보 */
  user: {
    /** 암호화된 사용자 앱 데이터 */
    userAppData?: string;
    /** 레거시 호환성을 위해 유지되는 필드 */
    userBaedal?: string;
    /** 인증 토큰 */
    authorization: string;
    /** 회원 ID */
    memberId: string;
    /** 회원 번호 */
    memberNumber: string;
    /** Perseus 클라이언트 ID (선택) */
    perseusClientId?: string;
    /** Perseus 세션 ID (선택) */
    perseusSessionId?: string;
  };
  /** 디바이스 하드웨어 및 환경 정보 */
  device: {
    /** 광고 식별자 (ADID) */
    adid: string;
    /** ATT 상태값 (iOS 14 이상, 선택) */
    att?: number;
    /** AppsFlyer 식별자 */
    appsflyerId: string;
    /** 에뮬레이터/루팅 플래그 (Android 전용, 선택) */
    deviceBaedal?: string;
    /** 디바이스 고유 식별자 */
    deviceId: string;
    /** 세션 식별자 */
    sessionId: string;
    /** 마케팅 플랫폼 키 (v12.20.0 이상, 선택) */
    actionTrackingKey?: string;
    /** OS 버전 */
    osVersion: string;
    /** 웹 User-Agent 문자열 */
    webUserAgent: string;
    /** 디바이스 모델명 */
    deviceModel: string;
    /** 통신사 정보 */
    carrier: string;
    /** IDFV (v14.4.0 이상, 선택) */
    idfv?: string;
  };
  /** 지원 데이터 문자열 (v12.5.0 이상) */
  supportData: string;
  /** 웹뷰에서 접근한 URL */
  URL: string;
  /** User-Agent 문자열 */
  userAgent: string;
};

/**
 * 에이전트(브라우저/OS) 정보 타입.
 *
 * @property os - 운영 체제 이름
 * @property browser - 브라우저 이름
 * @property URL - 접근한 URL
 */
export type AgentInfo = {
  os: string;
  browser: string;
  URL: string;
};

/**
 * Jira 티켓 생성 시 사용되는 폼 데이터 타입.
 *
 * @property Epic - 상위 에픽 키
 * @property assignee - 담당자
 * @property title - 티켓 제목 (선택)
 * @property components - 컴포넌트 목록
 * @property labels - 라벨 목록 (선택)
 */
export type TicketFormData = {
  Epic: string;
  assignee: string;
  title?: string;
  components: string[];
  labels?: string[];
};

/**
 * SDK에서 전달되는 사용자 데이터 타입.
 *
 * @property commonInfo - 공통 사용자/디바이스 정보 (선택)
 * @property userAgent - User-Agent 문자열
 * @property URL - 현재 페이지 URL
 * @property webTitle - 웹 페이지 제목
 */
export type UserData = {
  commonInfo?: CommonInfo;
  userAgent: string;
  URL: string;
  webTitle: string;
};
