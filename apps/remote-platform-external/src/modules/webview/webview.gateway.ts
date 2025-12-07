/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-call */
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
import { v4 as uuidv4 } from "uuid";
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

import { getDefaultCommonInfo } from "../../utils/commonInfo";
import { BufferService, type BufferEvent } from "../buffer/buffer.service";
import { JiraService } from "../jira/jira.service";
import { S3Service } from "../s3/s3.service";
import { SlackService } from "../slack/slack.service";
import { UserInfoService } from "../user-info/user-info.service";

type RoomData = {
  client: WebSocket;
  devtools: Map<string, WebSocket>;
  recordMode: boolean;
  recordId: number | null;
};

type DevtoolsData = {
  room: string;
  devtoolsId: string;
};

type BufferRoomInfo = {
  deviceId: string;
  url: string;
  userAgent: string;
  title?: string;
  sessionStartTime?: number;
};

type LastBufferInfo = BufferRoomInfo & { room: string };

@WebSocketGateway()
export class WebviewGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(WebviewGateway.name);
  private rooms: Map<string, RoomData> = new Map();
  private clientMap: Map<WebSocket, string> = new Map();
  private devtoolsMap: Map<WebSocket, DevtoolsData> = new Map();
  private lastEventTimestamp = 0; // rrweb 이벤트 타임스탬프 추적용

  // Buffer 모드용 room 관리
  private bufferRooms: Map<string, BufferRoomInfo> = new Map();
  // deviceId → room 매핑 (빠른 조회용)
  private deviceToRoom: Map<string, string> = new Map();
  // 최근 버퍼 정보 보존 (disconnect 이후 Beacon 용)
  private lastBufferInfoByDevice: Map<string, LastBufferInfo> = new Map();
  // 화면 이탈로 인해 저장된 버퍼 room 추적 (재진입 시 초기화)
  private visibilityExitSavedRooms: Set<string> = new Set();

  @WebSocketServer() public server: Server;

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

  private sendMessage(socket: WebSocket, data: any): void {
    socket.send(JSON.stringify(data));
  }

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

      // NOTE: 중요! roomCreated 메시지를 보내야 클라이언트에서 socket 을 할당할 수 있음. 그 뒤에 protocol 메시지들을 보내야 순서가 보장됨 (중요!)
      this.sendMessage(client, { event: "roomCreated", roomName, recordId });

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

      // runtime
      this.sendMessage(client, {
        event: "protocol",
        message: {
          id: MSG_ID.Runtime.enable,
          method: "Runtime.enable",
          params: {},
        },
      });

      // page
      this.sendMessage(client, {
        event: "protocol",
        message: { id: MSG_ID.Page.enable, method: "Page.enable", params: {} },
      });
      this.sendMessage(client, {
        event: "protocol",
        message: {
          id: MSG_ID.Page.getResourceTree,
          method: "Page.getResourceTree",
          params: {},
        },
      });
    }
    this.rooms.set(roomName, {
      client,
      devtools: new Map(),
      recordMode,
      recordId,
    });
    this.clientMap.set(client, roomName);

    // dom
    this.sendMessage(client, {
      event: "protocol",
      message: { id: MSG_ID.DOM.ENABLE, method: "DOM.enable", params: {} },
    });
    this.sendMessage(client, {
      event: "protocol",
      message: {
        id: MSG_ID.Screen.startPreview,
        method: "ScreenPreview.startPreview",
        params: {},
      },
    });

    // 세션 시작 이벤트 저장
    if (recordId) {
      const timestamp = Date.now() * 1000000; // 밀리초를 나노초로 변환
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
        event_type: "session_start",
      });
    }

    return recordId;
  }

  @SubscribeMessage("createRoom")
  public async handleCreateRoom(
    @MessageBody() data: { recordMode?: boolean; userData: UserData },
    @ConnectedSocket() client: WebSocket,
  ): Promise<void> {
    const { recordMode = false, userData } = data;

    // commonInfo가 없으면 디폴트값 세팅
    if (!userData.commonInfo) {
      userData.commonInfo = getDefaultCommonInfo();
    }

    // userData의 URL과 userAgent를 commonInfo에 반영
    userData.commonInfo.URL = userData.URL || userData.commonInfo.URL;
    userData.commonInfo.userAgent =
      userData.userAgent || userData.commonInfo.userAgent;

    const { commonInfo } = userData;
    const roomName = `${recordMode ? "Record-" : "Live-"}${uuidv4()}`;

    // Record 모드가 아닌 경우에만 bufferRooms에 추가
    if (!recordMode) {
      // Room 정보 저장 (버퍼 flush 시 사용)
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
      // 새 버퍼 room 생성 시 화면 이탈 저장 상태 초기화 (새 세션 시작)
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

    // Slack DM 전송
    if (recordMode && recordId) {
      // deviceId가 'unknown-'로 시작하지 않는 경우에만 사용자 정보 조회 및 Slack DM 전송
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

    // 버퍼에서 Screen Preview를 DB로 전송 (녹화 세션 만들기 시)
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

  public handleConnection(client: WebSocket): void {
    this.logger.log(
      `[CLIENT_CONNECTED] ${JSON.stringify({
        clientId: client.toString(),
        timestamp: new Date().toISOString(),
      })}`,
    );

    // Buffer 모드 클라이언트를 위한 임시 맵핑
    // 실제 room이 생성되기 전까지 'pending' 상태로 관리
    this.clientMap.set(client, "pending");

    // 클라이언트 에러 핸들링
    client.on("error", (error) => {
      this.logger.error(
        `[CLIENT_ERROR] ${JSON.stringify({
          clientId: client.toString(),
          error: error.message,
          stack: error.stack,
        })}`,
      );
    });

    // 클라이언트 연결 종료 시 이유 로깅
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

  @SubscribeMessage("messageToDevtools")
  public handleMessageToDevtools(
    @MessageBody()
    data: { room: string; devtoolsId: string; message: string | object },
    @ConnectedSocket() client: WebSocket,
  ): void {
    const roomData = this.rooms.get(data.room);
    const devtools = roomData?.devtools.get(data.devtoolsId);
    if (devtools) {
      this.sendMessage(devtools, data.message);
    } else {
      this.sendMessage(client, {
        event: "error",
        message: "Devtools not found",
      });
    }

    if (roomData.recordId) {
      const protocol =
        typeof data.message === "string"
          ? JSON.parse(data.message)
          : data.message;
      if (this.domService.isEnableDomResponseMessage(protocol.id)) {
        // dom이 enable되면 dom 데이터를 요청함
        this.sendMessage(client, {
          event: "protocol",
          message: {
            id: MSG_ID.DOM.GET_DOCUMENT,
            method: "DOM.getDocument",
            params: {},
          },
        });
      } else if (this.domService.isGetDomResponseMessage(protocol.id)) {
        // dom 데이터를 받으면 DB에 저장
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

  @SubscribeMessage("protocolToAllDevtools")
  public async handleProtocolToAllDevtools(
    @MessageBody() data: { room: string; message: string },
    @ConnectedSocket() client: WebSocket,
  ): Promise<void> {
    const protocol = JSON.parse(data.message);
    const roomData = this.rooms.get(data.room);
    if (roomData) {
      roomData.devtools.forEach((devtools) => devtools.send(data.message));
      if (roomData.recordId) {
        const timestamp = Date.now() * 1000000; // 밀리초를 나노초로 변환
        // TODO: 도메인별로 메시지를 구분할 수 있도록 수정 필요
        if (protocol.params.requestId) {
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

        // ScreenPreview는 실시간 미러링용 (마지막 화면만 유지)
        if (protocol.method.startsWith("ScreenPreview.captured")) {
          // 이벤트 타입 결정 (Internal과 동일한 로직)
          let eventType = "incremental_snapshot";
          if (protocol.params?.isFirstSnapshot) {
            eventType = "full_snapshot";
          }

          await this.screenService.upsert({
            recordId: roomData.recordId,
            protocol,
            timestamp,
            type: "screenPreview", // 실시간 미러링용
            event_type: eventType as "full_snapshot" | "incremental_snapshot", // 타입 캐스팅
          });
        }

        // rrweb 기반 SessionReplay 이벤트 처리
        if (protocol.method.startsWith("SessionReplay.")) {
          let eventType = null;

          // rrweb 단일 이벤트 처리
          if (protocol.method === "SessionReplay.rrwebEvent") {
            const event = protocol.params?.event;
            if (event) {
              const sessionTimestamp =
                BigInt(event.timestamp || Date.now()) * BigInt(1000000);

              // rrweb 이벤트 타입 매핑
              const rrwebEventType = event.type;
              switch (rrwebEventType) {
                case 0: // DomContentLoaded
                  eventType = "dom_loaded";
                  break;
                case 1: // Load
                  eventType = "page_loaded";
                  break;
                case 2: // FullSnapshot
                  eventType = "full_snapshot";
                  break;
                case 3: // IncrementalSnapshot
                  eventType = "incremental_snapshot";
                  break;
                case 4: // Meta
                  eventType = "meta";
                  break;
                case 5: // Custom
                  eventType = "custom";
                  break;
                default:
                  eventType = `rrweb_${rrwebEventType}`;
              }

              await this.screenService.upsert({
                recordId: roomData.recordId,
                protocol,
                timestamp: sessionTimestamp.toString(),
                type: null,
                event_type: eventType,
                sequence: event.data?.sequence || null,
              } as any);

              // 버퍼에 이벤트 추가 (Buffer 모드만)
              if (roomData.recordId && data.room.startsWith("Buffer-")) {
                // Buffer room 정보에서 가져오기
                const bufferInfo = this.bufferRooms.get(data.room);
                const deviceId = bufferInfo?.deviceId || "unknown-device";
                const url = bufferInfo?.url || "unknown-url";
                const userAgent = bufferInfo?.userAgent || "unknown-useragent";
                const title = bufferInfo?.title;
                const sessionStartTime = bufferInfo?.sessionStartTime;

                const bufferEvent = {
                  method: protocol.method,
                  params: protocol.params,
                  timestamp: Number(sessionTimestamp / BigInt(1000000)), // 나노초를 밀리초로 변환
                };

                this.bufferService.addEvent(
                  data.room,
                  roomData.recordId,
                  deviceId,
                  url,
                  userAgent,
                  title,
                  sessionStartTime,
                  bufferEvent,
                );

                // 자동 flush 제거 - 주기적 flush만 사용
              }
            }
          }
          // rrweb 배치 이벤트 처리
          else if (protocol.method === "SessionReplay.rrwebEvents") {
            const events = protocol.params?.events || [];
            console.log(`[SessionReplay] 배치 이벤트 저장: ${events.length}개`);

            // 버퍼용 공통 정보 가져오기
            const bufferInfo = this.bufferRooms.get(data.room);
            const deviceId = bufferInfo?.deviceId || "unknown-device";
            const url = bufferInfo?.url || "unknown-url";
            const userAgent = bufferInfo?.userAgent || "unknown-useragent";
            const title = bufferInfo?.title;
            const sessionStartTime = bufferInfo?.sessionStartTime;

            for (const event of events) {
              const sessionTimestamp =
                BigInt(event.timestamp || Date.now()) * BigInt(1000000);

              // rrweb 이벤트 타입 매핑
              const rrwebEventType = event.type;
              let eventType = null;
              switch (rrwebEventType) {
                case 0:
                  eventType = "dom_loaded";
                  break;
                case 1:
                  eventType = "page_loaded";
                  break;
                case 2:
                  eventType = "full_snapshot";
                  break;
                case 3:
                  eventType = "incremental_snapshot";
                  break;
                case 4:
                  eventType = "meta";
                  break;
                case 5:
                  eventType = "custom";
                  break;
                default:
                  eventType = `rrweb_${rrwebEventType}`;
              }

              await this.screenService.upsert({
                recordId: roomData.recordId,
                protocol: {
                  method: "SessionReplay.rrwebEvent",
                  params: { event },
                },
                timestamp: sessionTimestamp.toString(),
                type: null,
                event_type: eventType,
                sequence: event.data?.sequence || null,
              } as any);

              // 버퍼에 이벤트 추가 (Buffer 모드만)
              if (roomData.recordId && data.room.startsWith("Buffer-")) {
                const bufferEvent = {
                  method: "SessionReplay.rrwebEvent",
                  params: { event },
                  timestamp: Number(sessionTimestamp / BigInt(1000000)), // 나노초를 밀리초로 변환
                };

                this.bufferService.addEvent(
                  data.room,
                  roomData.recordId,
                  deviceId,
                  url,
                  userAgent,
                  title,
                  sessionStartTime,
                  bufferEvent,
                );

                // 자동 flush 제거 - 주기적 flush만 사용
              }
            }
          }
          // 이전 형식 호환성 유지 (마이그레이션 기간 동안)
          else if (
            protocol.method === "SessionReplay.snapshot" ||
            protocol.method === "SessionReplay.interaction"
          ) {
            const sdkTimestamp = protocol.params?.timestamp;
            let sessionTimestamp: bigint;

            if (sdkTimestamp) {
              sessionTimestamp = BigInt(sdkTimestamp) * BigInt(1000000);
              this.lastEventTimestamp = sdkTimestamp;
            } else {
              sessionTimestamp = BigInt(timestamp);
            }

            if (protocol.method === "SessionReplay.snapshot") {
              if (protocol.params?.type === "full_snapshot") {
                eventType = "full_snapshot";
              } else {
                eventType = "incremental_snapshot";
              }
            } else if (protocol.method === "SessionReplay.interaction") {
              eventType = "interaction";
            }

            await this.screenService.upsert({
              recordId: roomData.recordId,
              protocol,
              timestamp: sessionTimestamp.toString(),
              type: null,
              event_type: eventType,
              sequence: protocol.params?.sequence,
            } as any);
          }
        }

        // 사용자 인터랙션 이벤트 저장
        if (protocol.method === "user.interaction") {
          await this.screenService.upsert({
            recordId: roomData.recordId,
            protocol,
            timestamp,
            type: null,
            event_type: "user_interaction",
          });
        }

        // 스크롤 이벤트 저장
        if (protocol.method === "user.scroll") {
          await this.screenService.upsert({
            recordId: roomData.recordId,
            protocol,
            timestamp,
            type: null,
            event_type: "viewport_change",
          });
        }
      }
    } else {
      this.sendMessage(client, { event: "error", message: "Room not found" });
    }
  }

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

      // 녹화 세션/티켓 생성 후에는 버퍼 이벤트 무시
      if (room.startsWith("Record-") || room.startsWith("Live-")) {
        return;
      }

      // Buffer room 정보 저장 (Buffer- 방만)
      const existingInfo =
        this.bufferRooms.get(room) || this.lastBufferInfoByDevice.get(deviceId);
      let sessionStartTime = existingInfo?.sessionStartTime ?? Date.now();

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
      // 새 버퍼 room 생성 시 화면 이탈 저장 상태 초기화 (새 세션 시작)
      this.visibilityExitSavedRooms.delete(room);
      // deviceId → room 매핑도 저장 (Buffer 모드만)
      if (!room.startsWith("Record-")) {
        this.deviceToRoom.set(deviceId, room);
      }

      // 화면 재진입 감지 (화면 이탈 후 다시 이벤트가 들어오면 재진입)
      if (this.visibilityExitSavedRooms.has(room)) {
        this.visibilityExitSavedRooms.delete(room);
        sessionStartTime = Date.now();
        this.logger.log(
          `[BUFFER_VISIBILITY_REENTRY] deviceId: ${deviceId}, room: ${room} - user returned, reset save state`,
        );
      }

      // 버퍼에 이벤트 추가
      const bufferEvent = {
        method: event.method,
        params: event.params,
        timestamp: event.timestamp || Date.now(),
      };

      this.bufferService.addEvent(
        room,
        0, // Buffer 모드에서는 recordId가 0
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

      // 자동 flush 제거 - 주기적 flush만 사용
    } catch (error) {
      console.error(`[BUFFER_EVENT_ERROR] ❌`, error);
      this.logger.error(
        `[BUFFER_EVENT] Error handling buffer event: ${error.message}`,
        error.stack,
      );
    }
  }

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
      console.log(
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
      // 새 버퍼 room 생성 시 화면 이탈 저장 상태 초기화 (새 세션 시작)
      this.visibilityExitSavedRooms.delete(bufferRoom);

      // 성공 응답 전송
      this.sendMessage(client, {
        event: "bufferingEnabled",
        message: "Buffer mode activated successfully",
      });
    } catch (error) {
      console.error(`[ENABLE_BUFFERING_ERROR] ${error}`);
      this.sendMessage(client, {
        event: "error",
        message: "Failed to enable buffer mode",
      });
    }
  }

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

    // 화면 이탈 시 저장 후 상태 추적 (재진입 감지용)
    if (trigger === "visibilitychange") {
      const bufferRoom = this.deviceToRoom.get(deviceId);
      if (bufferRoom) {
        // 화면 이탈로 인한 저장임을 기록
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
        `[SAVE_BUFFER_TRIGGER_ERROR] ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

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
    ) => {
      if (!room || !info) {
        return;
      }

      if (roomName && room !== roomName) {
        return;
      }

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

    const directRoom = this.deviceToRoom.get(deviceId);
    if (directRoom) {
      const info =
        this.bufferRooms.get(directRoom) ||
        this.lastBufferInfoByDevice.get(deviceId);
      maybeIncludeRoom(directRoom, info);
    }

    for (const [room, info] of this.bufferRooms.entries()) {
      if (info.deviceId === deviceId) {
        maybeIncludeRoom(room, info);
      }
    }

    for (const info of this.lastBufferInfoByDevice.values()) {
      if (info.deviceId === deviceId) {
        maybeIncludeRoom(info.room, info);
      }
    }

    return Array.from(rooms.values());
  }

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

  private normalizeUrlPath(url?: string): string | null {
    if (!url) {
      return null;
    }

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

  @SubscribeMessage("createTicket")
  public async handleCreateTicket(
    @MessageBody()
    data: { userData: UserData; formData?: TicketFormData },
    @ConnectedSocket() client: WebSocket,
  ): Promise<void> {
    try {
      const { userData, formData } = data;

      // commonInfo가 없으면 디폴트값 세팅
      if (!userData.commonInfo) {
        userData.commonInfo = getDefaultCommonInfo();
      }

      // userData의 URL과 userAgent를 commonInfo에 반영
      userData.commonInfo.URL = userData.URL || userData.commonInfo.URL;
      userData.commonInfo.userAgent =
        userData.userAgent || userData.commonInfo.userAgent;

      const { commonInfo, URL } = userData;
      const roomName = `Record-${uuidv4()}`;

      // Room 정보 저장 (버퍼 flush 시 사용)
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
      // 새 버퍼 room 생성 시 화면 이탈 저장 상태 초기화 (새 세션 시작)
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

      const { requestBody, ticketKey, ticketURL } =
        await this.jiraService.createTicket({
          roomName,
          recordId,
          userData,
          formData,
        });

      this.logger.log(
        `[TICKET_CREATE_SUCCESS] ${JSON.stringify({
          ticketURL,
          recordId,
          roomName,
          deviceId: commonInfo.device.deviceId,
        })}`,
      );

      if (recordId) {
        // deviceId가 'unknown-'로 시작하지 않는 경우에만 사용자 정보 조회
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
            ticketURL,
          });
          this.logger.log(
            `[TICKET_SLACK_DM_SENT] ${JSON.stringify({
              slackUserId: userInfo.slackUserId,
              ticketURL,
            })}`,
          );
        }

        this.sendMessage(client, {
          event: "ticketCreateSuccess",
          message: "QA 티켓이 성공적으로 생성되었습니다.",
        });

        // 티켓 생성 로그 저장
        if (userInfo) {
          try {
            const assignee = formData?.assignee ?? userInfo.username;

            const ticketLog = this.ticketLogRepository.create({
              deviceId: commonInfo.device.deviceId,
              username: userInfo.username,
              userDisplayName: userInfo.userDisplayName,
              recordId,
              ticketURL,
              jiraProjectKey: userInfo.jiraProjectKey || "N/A",
              assignee,
              parentEpic: formData?.Epic || null,
              title: requestBody.title,
              roomName,
              URL: URL.split("?")[0],
            });

            await this.ticketLogRepository.save(ticketLog);

            // 컴포넌트들을 별도 테이블에 저장
            if (formData?.components && formData.components.length > 0) {
              const componentEntities = formData.components.map(
                (componentName) =>
                  this.ticketComponentRepository.create({
                    ticketLogId: ticketLog.id,
                    componentName: componentName.trim(), // 공백 제거로 일관성 확보
                  }),
              );
              await this.ticketComponentRepository.save(componentEntities);
            }

            // 라벨들을 별도 테이블에 저장
            if (formData?.labels && formData.labels.length > 0) {
              const labelEntities = formData.labels.map((labelName) =>
                this.ticketLabelRepository.create({
                  ticketLogId: ticketLog.id,
                  labelName: labelName.trim(), // 공백 제거로 일관성 확보
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
                ticketURL,
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
            // 로그 저장 실패가 티켓 생성 성공에 영향을 주지 않도록 에러를 throw하지 않음
          }
        }
      }

      // 버퍼에서 기록 데이터를 DB로 전송 (티켓 생성 시)
      if (recordId) {
        await this.transferBufferedDataToRecord(
          commonInfo.device.deviceId,
          recordId,
        );
      }

      this.logger.log(
        `[TICKET_CREATE_COMPLETE] ${JSON.stringify({
          ticketURL,
          deviceId: commonInfo.device.deviceId,
        })}`,
      );
    } catch (error) {
      const originUserData = { ...data.userData };
      if (!originUserData.commonInfo) {
        originUserData.commonInfo = getDefaultCommonInfo();
      }

      this.logger.error(
        `[TICKET_CREATE_ERROR] ${JSON.stringify({
          deviceId: originUserData.commonInfo.device.deviceId,
          URL: originUserData.URL,
          formData: data.formData ? JSON.stringify(data.formData) : null,
          error:
            error instanceof Error
              ? {
                  message: error.message,
                  stack: error.stack,
                  name: error.name,
                }
              : JSON.stringify(error),
        })}`,
      );
      this.sendMessage(client, {
        event: "ticketCreateError",
        message: `티켓 생성 실패: ${error.message}`,
      });
    }
  }

  /**
   * 버퍼를 파일로 강제 flush하는 메서드 (이벤트 수 조건 무시)
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

      const uploadData = {
        room,
        recordId,
        deviceId,
        url,
        userAgent,
        title: title || flushedBuffer.title,
        bufferData: flushedBuffer.events,
        timestamp: flushedBuffer.sessionStartTime,
        date: new Date(flushedBuffer.sessionStartTime + 9 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        sessionStartTime: flushedBuffer.sessionStartTime,
      };

      await this.s3Service.saveBufferDataToFile(uploadData);
      return true;
    } catch (error) {
      this.logger.error(
        `[FLUSH_FORCE_ERROR] Failed to force flush buffer: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * 버퍼를 파일로 flush하는 메서드
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

      const uploadData = {
        room,
        recordId,
        deviceId,
        url,
        userAgent,
        title: title || flushedBuffer.title,
        bufferData: flushedBuffer.events,
        timestamp: flushedBuffer.sessionStartTime,
        date: new Date(flushedBuffer.sessionStartTime + 9 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        sessionStartTime: flushedBuffer.sessionStartTime,
      };

      await this.s3Service.saveBufferDataToFile(uploadData);
      return true;
    } catch (error) {
      this.logger.error(
        `[FLUSH_TO_FILE_ERROR] Failed to flush buffer to file: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * 버퍼에서 Screen Preview를 가져와서 실제 recordId로 DB에 저장
   */
  private findBufferRoomForDevice(deviceId: string): string | null {
    const direct = this.deviceToRoom.get(deviceId);
    if (direct) {
      return direct;
    }

    for (const [room, info] of this.bufferRooms.entries()) {
      if (info.deviceId === deviceId) {
        return room;
      }
    }

    const lastInfo = this.lastBufferInfoByDevice.get(deviceId);
    return lastInfo?.room ?? null;
  }

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
        if (!event?.method) {
          continue;
        }

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

      if (latestScreenPreview?.params) {
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
          event_type: eventType,
        });

        this.logger.log(
          `[BUFFER_TRANSFER_SCREEN_PREVIEW] deviceId=${deviceId}, recordId=${recordId}, timestamp=${previewTimestampMs}`,
        );
      }

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
        event_type: "user_interaction",
      });
      return;
    }

    if (method === "user.scroll") {
      await this.screenService.upsert({
        recordId,
        protocol,
        timestamp: timestampNs,
        type: null,
        event_type: "viewport_change",
      });
      return;
    }

    if (method === "SessionReplay.rrwebEvent") {
      const eventData = params?.event;
      if (!eventData) {
        return;
      }

      const sessionTimestamp =
        BigInt(eventData.timestamp || Date.now()) * BigInt(1_000_000);
      const rrwebEventType = eventData.type;
      let eventType: string | null = null;

      switch (rrwebEventType) {
        case 0:
          eventType = "dom_loaded";
          break;
        case 1:
          eventType = "page_loaded";
          break;
        case 2:
          eventType = "full_snapshot";
          break;
        case 3:
          eventType = "incremental_snapshot";
          break;
        case 4:
          eventType = "meta";
          break;
        case 5:
          eventType = "custom";
          break;
        default:
          eventType = `rrweb_${rrwebEventType}`;
      }

      await this.screenService.upsert({
        recordId,
        protocol: {
          method: "SessionReplay.rrwebEvent",
          params: { event: eventData },
        },
        timestamp: sessionTimestamp.toString(),
        type: null,
        event_type: eventType,
        sequence: eventData.data?.sequence || null,
      } as any);
      return;
    }

    if (method === "SessionReplay.rrwebEvents") {
      const events = Array.isArray(params?.events) ? params.events : [];
      for (const rrEvent of events) {
        const sessionTimestamp =
          BigInt(rrEvent.timestamp || Date.now()) * BigInt(1_000_000);
        let eventType: string | null = null;

        switch (rrEvent.type) {
          case 0:
            eventType = "dom_loaded";
            break;
          case 1:
            eventType = "page_loaded";
            break;
          case 2:
            eventType = "full_snapshot";
            break;
          case 3:
            eventType = "incremental_snapshot";
            break;
          case 4:
            eventType = "meta";
            break;
          case 5:
            eventType = "custom";
            break;
          default:
            eventType = `rrweb_${rrEvent.type}`;
        }

        await this.screenService.upsert({
          recordId,
          protocol: {
            method: "SessionReplay.rrwebEvent",
            params: { event: rrEvent },
          },
          timestamp: sessionTimestamp.toString(),
          type: null,
          event_type: eventType,
          sequence: rrEvent.data?.sequence || null,
        } as any);
      }
      return;
    }

    if (
      method === "SessionReplay.snapshot" ||
      method === "SessionReplay.interaction"
    ) {
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
        if (params?.type === "full_snapshot") {
          eventType = "full_snapshot";
        } else {
          eventType = "incremental_snapshot";
        }
      } else if (method === "SessionReplay.interaction") {
        eventType = "interaction";
      }

      await this.screenService.upsert({
        recordId,
        protocol,
        timestamp: sessionTimestamp.toString(),
        type: null,
        event_type: eventType,
        sequence: params?.sequence,
      } as any);
      return;
    }
  }

  private toTimestampNs(value?: number | string): number {
    const parsed = typeof value === "string" ? Number(value) : value;
    if (!Number.isFinite(parsed)) {
      const [seconds, nanoseconds] = process.hrtime();
      return seconds * 1e9 + nanoseconds;
    }
    return Math.trunc(parsed * 1_000_000);
  }

  /**
   * 저장해도 되는 버퍼인지 판단 (너무 적은 이벤트나 의미 없는 이벤트만 있을 때는 저장하지 않음)
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
      // ScreenPreview 이벤트만 있는 경우에는 화면 캡처가 포함돼 있을 때만 저장
      const hasCapturedSnapshot = screenPreviewEvents.some(
        (event) => event.method === "ScreenPreview.captured",
      );
      return hasCapturedSnapshot;
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

    if (hasFullSnapshot) {
      return true;
    }

    // FullSnapshot이 없어도 이벤트가 충분히 많으면 저장 (부분 저장 방지용 임계값)
    const MIN_MEANINGFUL_EVENTS = 5;
    return nonScreenPreviewEvents.length >= MIN_MEANINGFUL_EVENTS;
  }

  public async handleDisconnect(client: WebSocket): Promise<void> {
    const room = this.clientMap.get(client);

    if (room) {
      if (room.startsWith("Buffer-")) {
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
            `[BUFFER_DISCONNECT_FLUSH_ERROR] ${error.message}`,
            error.stack,
          );
        }

        this.bufferRooms.delete(room);
        this.deviceToRoom.delete(resolvedDeviceId);
        // 화면 이탈 저장 상태도 정리 (세션 완전 종료)
        this.visibilityExitSavedRooms.delete(room);
        if (directInfo) {
          this.lastBufferInfoByDevice.delete(directInfo.deviceId);
        } else if (lastInfo) {
          this.lastBufferInfoByDevice.delete(lastInfo.deviceId);
        }
        this.clientMap.delete(client);
        return;
      }

      const roomData = this.rooms.get(room);

      // 세션 종료 이벤트 저장
      if (roomData?.recordId) {
        const endTime = Date.now() * 1000000; // 밀리초를 나노초로 변환

        await this.screenService.upsert({
          recordId: roomData.recordId,
          protocol: { method: "session_end", params: {} },
          timestamp: endTime,
          type: null,
          event_type: "session_end",
        });

        // duration 계산 및 업데이트
        const startEvent = await this.screenService.findScreens(
          roomData.recordId,
        );
        if (startEvent && startEvent.length > 0) {
          const startTime = startEvent[0].timestamp;
          const duration = endTime - Number(startTime);
          await this.recordService.updateDuration(roomData.recordId, duration);
        }

        // 녹화 세션/티켓 생성된 경우에는 버퍼 flush 하지 않음
        if (!room.startsWith("Record-") && !room.startsWith("Live-")) {
          // 연결 해제 시 버퍼 flush (일반 Buffer room만)
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
            this.logger.error(`[DISCONNECT_FLUSH_ERROR] ${error.message}`);
          }
        }
      }

      if (roomData) {
        roomData.devtools.forEach((devtools) => devtools.close());
        this.rooms.delete(room);
      }
      this.clientMap.delete(client);
      this.bufferRooms.delete(room); // Buffer room 정보도 삭제
      return;
    }
    const devtoolsInfo = this.devtoolsMap.get(client);
    if (devtoolsInfo) {
      this.rooms
        .get(devtoolsInfo.room)
        ?.devtools.delete(devtoolsInfo.devtoolsId);
      this.devtoolsMap.delete(client);
    }

    // Buffer room들 flush (화면 이탈로 저장되지 않은 것들만)
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
      this.logger.error(`[DISCONNECT_BUFFER_FLUSH_ERROR] ${error.message}`);
    }
  }
}

export type CommonInfo = {
  user: {
    userAppData?: string; // 암호화된 사용자 앱 데이터
    userBaedal?: string; // 레거시 호환성을 위해 유지
    authorization: string;
    memberId: string;
    memberNumber: string;
    perseusClientId?: string;
    perseusSessionId?: string;
  };
  device: {
    adid: string;
    att?: number; // ATT 상태 값. iOS 14이상에서만 사용 됨.
    appsflyerId: string;
    deviceBaedal?: string; // 에뮬레이터/루팅 여부, AOS 에서만 제공됨.
    deviceId: string;
    sessionId: string;
    /** 12.20.0 이상 */
    actionTrackingKey?: string; // 마케팅 플랫폼 키
    osVersion: string;
    webUserAgent: string;
    deviceModel: string;
    carrier: string; // 통신사 정보,
    /** 14.4.0 이상 */
    idfv?: string;
  };
  /** 12.5.0 이상 */
  supportData: string;
  /** 웹뷰에서 접근한 URL */
  URL: string;
  /** 사용자 에이전트 정보 */
  userAgent: string;
};

export type AgentInfo = {
  os: string;
  browser: string;
  URL: string;
};

export type TicketFormData = {
  Epic: string;
  assignee: string;
  title?: string;
  components: string[];
  labels?: string[];
};

export type UserData = {
  commonInfo?: CommonInfo; // optional로 변경
  userAgent: string;
  URL: string;
  webTitle: string;
};
