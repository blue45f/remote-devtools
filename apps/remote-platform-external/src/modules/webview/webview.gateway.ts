import { randomUUID } from 'node:crypto';

import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { MSG_ID } from '@remote-platform/constants';
import { DomService, NetworkService, RecordService, ScreenService } from '@remote-platform/core';
import { TicketComponentEntity, TicketLabelEntity, TicketLogEntity } from '@remote-platform/entity';
import { Repository } from 'typeorm';
import * as WebSocket from 'ws';
import { Server } from 'ws';

import { getDefaultCommonInfo } from '../../utils/common-info';
import { BufferService, type BufferEvent } from '../buffer/buffer.service';
import { JiraService, type CreateTicketRequestBody } from '../jira/jira.service';
import { SlackService } from '../slack/slack.service';
import { UserInfoService } from '../user-info/user-info.service';

import { BufferFlushService } from './buffer-flush.service';
import { CdpEventPersistenceService } from './cdp-event-persistence.service';

import type {
  BufferRoomInfo,
  CommonInfo,
  DevtoolsData,
  LastBufferInfo,
  RoomData,
  TicketFormData,
  UserData,
} from './webview.types';

// Re-export types for backward compatibility
export type { CommonInfo, AgentInfo, TicketFormData, UserData } from './webview.types';

type ProtocolMessage = {
  id?: number;
  method?: string;
  params?: Record<string, unknown>;
  result?: object;
  [key: string]: unknown;
};

type TicketUserInfo = NonNullable<Awaited<ReturnType<UserInfoService['getUserInfoByDeviceId']>>>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const parseProtocolMessage = (message: string | object): ProtocolMessage | null => {
  try {
    const parsed = typeof message === 'string' ? JSON.parse(message) : message;
    return isRecord(parsed) ? (parsed as ProtocolMessage) : null;
  } catch {
    return null;
  }
};

const hasProtocolMethod = (
  protocol: ProtocolMessage,
): protocol is ProtocolMessage & { method: string } => typeof protocol.method === 'string';

// ---------------------------------------------------------------------------
// Gateway -- SDK와 DevTools 간 WebSocket 통신 게이트웨이
// ---------------------------------------------------------------------------

/**
 * SDK와 DevTools 간 WebSocket 통신을 처리하는 메인 게이트웨이.
 *
 * 주요 기능:
 * - 룸 기반 WebSocket 세션 관리 (Record/Live/Buffer 모드)
 * - CDP(Chrome DevTools Protocol) 메시지 라우팅
 * - Jira 티켓 생성 및 Slack 알림
 *
 * 이벤트 영속화 로직은 {@link CdpEventPersistenceService},
 * 버퍼 플러시 로직은 {@link BufferFlushService}로 분리되었다.
 */
// Path-scoped so the dev Vite proxy (`/socket.io` -> external) and the prod
// nginx route (`location /socket.io`) reach this gateway. NestJS `WsAdapter`
// matches the *exact* request pathname against `normalizePath(path)`, which
// strips the trailing slash — so the path is `/socket.io` (no trailing slash)
// and SDK clients MUST connect to `/socket.io` (not `/socket.io/`).
@WebSocketGateway({ path: '/socket.io' })
export class WebviewGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(WebviewGateway.name);

  /** 활성 WebSocket 룸 관리 */
  private readonly rooms: Map<string, RoomData> = new Map();
  /** SDK 클라이언트 WebSocket을 룸 이름에 매핑 */
  private readonly clientMap: Map<WebSocket, string> = new Map();
  /** DevTools WebSocket 연결을 룸 정보에 매핑 */
  private readonly devtoolsMap: Map<WebSocket, DevtoolsData> = new Map();

  /** 버퍼 모드 룸의 메타데이터 관리 */
  private readonly bufferRooms: Map<string, BufferRoomInfo> = new Map();
  /** deviceId를 현재 룸에 매핑 */
  private readonly deviceToRoom: Map<string, string> = new Map();
  /** 연결 해제 후에도 유지되는 디바이스별 최근 버퍼 정보 */
  private readonly lastBufferInfoByDevice: Map<string, LastBufferInfo> = new Map();
  /** visibility change로 이미 저장된 룸 추적 */
  private readonly visibilityExitSavedRooms: Set<string> = new Set();

  @WebSocketServer() public server: Server;

  constructor(
    private readonly recordService: RecordService,
    private readonly networkService: NetworkService,
    private readonly domService: DomService,
    private readonly screenService: ScreenService,
    private readonly bufferService: BufferService,
    private readonly jiraService: JiraService,
    private readonly slackService: SlackService,
    private readonly userInfoService: UserInfoService,
    private readonly cdpEventPersistence: CdpEventPersistenceService,
    private readonly bufferFlushService: BufferFlushService,

    @InjectRepository(TicketLogEntity)
    private readonly ticketLogRepository: Repository<TicketLogEntity>,
    @InjectRepository(TicketComponentEntity)
    private readonly ticketComponentRepository: Repository<TicketComponentEntity>,
    @InjectRepository(TicketLabelEntity)
    private readonly ticketLabelRepository: Repository<TicketLabelEntity>,
  ) {}

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private sendMessage(socket: WebSocket, data: unknown): void {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(data));
    }
  }

  // -------------------------------------------------------------------------
  // Room management
  // -------------------------------------------------------------------------

  private async createRoom({
    client,
    recordMode,
    roomName,
    url,
    deviceId,
    referrer,
    userAgent,
  }: {
    roomName: string;
    client: WebSocket;
    recordMode: boolean;
    url?: string;
    deviceId: string;
    referrer?: string;
    userAgent?: string;
  }): Promise<number | null> {
    let recordId: number | null = null;

    if (recordMode) {
      const { id } = await this.recordService.create({
        name: roomName,
        url: url || undefined,
        deviceId,
        recordMode,
        referrer,
        userAgent: userAgent ?? null,
      });
      recordId = id;

      this.sendMessage(client, { event: 'roomCreated', roomName, recordId });
      this.sendRecordModeInitMessages(client);
    }

    this.rooms.set(roomName, {
      client,
      devtools: new Map(),
      recordMode,
      recordId,
    });
    this.clientMap.set(client, roomName);

    this.sendDomAndScreenInitMessages(client);

    if (recordId) {
      const timestamp = Date.now() * 1_000_000;
      await this.screenService.upsert({
        recordId,
        protocol: {
          method: 'session_start',
          params: {
            url: 'http://localhost:3001',
            userAgent: 'Session Recording',
          },
        },
        timestamp,
        type: null,
        eventType: 'session_start',
      });
    }

    return recordId;
  }

  private sendRecordModeInitMessages(client: WebSocket): void {
    this.sendMessage(client, {
      event: 'protocol',
      message: {
        id: MSG_ID.NETWORK.ENABLE,
        method: 'Network.enable',
        params: { maxPostDataSize: 65536 },
      },
    });
    // These two were previously sent WITHOUT the `{ event: 'protocol', message }`
    // envelope, so the SDK's parseSocketMessage rejected them ("missing event")
    // and the CDP commands never applied. Wrap them like the others.
    this.sendMessage(client, {
      event: 'protocol',
      message: {
        id: MSG_ID.NETWORK.SET_ATTACH_DEBUG_STACK,
        method: 'Network.setAttachDebugStack',
        params: { enabled: true },
      },
    });
    this.sendMessage(client, {
      event: 'protocol',
      message: {
        id: MSG_ID.NETWORK.CLEAR_ACCEPTED_ENCODINGS_OVERRIDE,
        method: 'Network.clearAcceptedEncodingsOverride',
        params: {},
      },
    });
    this.sendMessage(client, {
      event: 'protocol',
      message: {
        id: MSG_ID.RUNTIME.ENABLE,
        method: 'Runtime.enable',
        params: {},
      },
    });
    this.sendMessage(client, {
      event: 'protocol',
      message: { id: MSG_ID.PAGE.ENABLE, method: 'Page.enable', params: {} },
    });
    this.sendMessage(client, {
      event: 'protocol',
      message: {
        id: MSG_ID.PAGE.GET_RESOURCE_TREE,
        method: 'Page.getResourceTree',
        params: {},
      },
    });
  }

  private sendDomAndScreenInitMessages(client: WebSocket): void {
    this.sendMessage(client, {
      event: 'protocol',
      message: { id: MSG_ID.DOM.ENABLE, method: 'DOM.enable', params: {} },
    });
    this.sendMessage(client, {
      event: 'protocol',
      message: {
        id: MSG_ID.SCREEN.START_PREVIEW,
        method: 'ScreenPreview.startPreview',
        params: {},
      },
    });
  }

  private registerBufferRoom(
    roomName: string,
    deviceId: string,
    url: string,
    userAgent: string,
    title?: string,
  ): void {
    const bufferInfo: BufferRoomInfo = {
      deviceId,
      url,
      userAgent,
      title,
      sessionStartTime: Date.now(),
    };

    this.bufferRooms.set(roomName, bufferInfo);
    this.lastBufferInfoByDevice.set(deviceId, {
      room: roomName,
      ...bufferInfo,
    });
    this.visibilityExitSavedRooms.delete(roomName);
  }

  // -------------------------------------------------------------------------
  // Create Room handler
  // -------------------------------------------------------------------------

  @SubscribeMessage('createRoom')
  public async handleCreateRoom(
    @MessageBody() data: { recordMode?: boolean; userData: UserData },
    @ConnectedSocket() client: WebSocket,
  ): Promise<void> {
    const { recordMode = false, userData } = data;

    if (!userData.commonInfo) {
      userData.commonInfo = getDefaultCommonInfo();
    }

    userData.commonInfo.URL = userData.URL || userData.commonInfo.URL;
    userData.commonInfo.userAgent = userData.userAgent || userData.commonInfo.userAgent;

    const { commonInfo } = userData;
    const roomName = `${recordMode ? 'Record-' : 'Live-'}${randomUUID()}`;

    if (!recordMode) {
      this.registerBufferRoom(
        roomName,
        commonInfo.device.deviceId,
        commonInfo.URL,
        commonInfo.userAgent,
      );
    }

    this.logger.log(
      `[ROOM_CREATE_START] ${JSON.stringify({
        roomName,
        recordMode,
        deviceId: commonInfo.device.deviceId,
        memberId: commonInfo.user.memberId,
        isDefaultCommonInfo: commonInfo.device.deviceId.startsWith('unknown-'),
      })}`,
    );

    const recordId = await this.createRoom({
      roomName,
      client,
      recordMode,
      url: commonInfo.URL,
      deviceId: commonInfo.device.deviceId,
      referrer: userData.URL?.split('?')[0],
      userAgent: commonInfo.userAgent,
    });

    if (recordMode && recordId) {
      await this.sendSlackDMForRoom(commonInfo, recordId, roomName, userData);
      await this.bufferFlushService.transferBufferedDataToRecord(
        commonInfo.device.deviceId,
        recordId,
        this.bufferRooms,
        this.deviceToRoom,
        this.lastBufferInfoByDevice,
        this.visibilityExitSavedRooms,
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

  private async sendSlackDMForRoom(
    commonInfo: CommonInfo,
    recordId: number,
    roomName: string,
    userData: UserData,
  ): Promise<void> {
    if (commonInfo.device.deviceId.startsWith('unknown-')) return;

    try {
      const userInfo = await this.userInfoService.getUserInfoByDeviceId(commonInfo.device.deviceId);

      if (userInfo?.slackUserId) {
        await this.slackService.sendCreateRoomDM({
          slackUserId: userInfo.slackUserId,
          userData,
          recordId,
          roomName,
        });
      }
    } catch (error) {
      this.logger.error(
        `[SLACK_DM_ERROR] ${JSON.stringify({
          roomName,
          recordId,
          deviceId: commonInfo.device.deviceId,
          error: error instanceof Error ? error.message : JSON.stringify(error),
        })}`,
      );
    }
  }

  // -------------------------------------------------------------------------
  // Connection / disconnection
  // -------------------------------------------------------------------------

  public handleConnection(client: WebSocket): void {
    this.clientMap.set(client, 'pending');

    client.on('error', (error) => {
      this.logger.error(
        `[CLIENT_ERROR] ${JSON.stringify({
          error: error.message,
          stack: error.stack,
        })}`,
      );
    });

    client.on('close', (code, reason) => {
      this.logger.log(
        `[CLIENT_CLOSE] ${JSON.stringify({
          code,
          reason: reason?.toString(),
          timestamp: new Date().toISOString(),
        })}`,
      );
    });
  }

  // -------------------------------------------------------------------------
  // Message to DevTools
  // -------------------------------------------------------------------------

  @SubscribeMessage('messageToDevtools')
  public handleMessageToDevtools(
    @MessageBody()
    data: { room: string; devtoolsId: string; message: string | object },
    @ConnectedSocket() client: WebSocket,
  ): void {
    const roomData = this.rooms.get(data.room);
    if (!roomData) {
      this.sendMessage(client, { event: 'error', message: 'Room not found' });
      return;
    }

    const devtools = roomData.devtools.get(data.devtoolsId);
    if (devtools) {
      this.sendMessage(devtools, data.message);
    } else {
      this.sendMessage(client, {
        event: 'error',
        message: 'Devtools not found',
      });
    }

    if (roomData.recordId) {
      const protocol = parseProtocolMessage(data.message);
      if (!protocol) {
        this.logger.warn(`[messageToDevtools] Invalid JSON message in room ${data.room}`);
        return;
      }

      const protocolId = typeof protocol.id === 'number' ? protocol.id : undefined;
      if (this.domService.isEnableDomResponseMessage(protocolId)) {
        this.sendMessage(client, {
          event: 'protocol',
          message: {
            id: MSG_ID.DOM.GET_DOCUMENT,
            method: 'DOM.getDocument',
            params: {},
          },
        });
      } else if (this.domService.isGetDomResponseMessage(protocolId)) {
        const [seconds, nanoseconds] = process.hrtime();
        void this.domService.upsert({
          recordId: roomData.recordId,
          protocol: protocol.result ?? {},
          timestamp: seconds * 1e9 + nanoseconds,
          type: 'entireDom',
        });
      }
    }
  }

  // -------------------------------------------------------------------------
  // Save entire DOM (proactive, sent by the SDK on record start)
  // -------------------------------------------------------------------------

  /**
   * Persists the full DOM document the SDK pushes when a recording starts, so a
   * recorded session's Elements panel populates during playback even when no
   * live viewer ever requested DOM.getDocument. Stored as the same `entireDom`
   * row that {@link handleMessageToDevtools} writes for the live-viewer path.
   */
  @SubscribeMessage('saveEntireDom')
  public async handleSaveEntireDom(
    @MessageBody() data: { room?: string; dom?: object },
    @ConnectedSocket() client: WebSocket,
  ): Promise<void> {
    try {
      const room = data.room || this.clientMap.get(client);
      const roomData = room ? this.rooms.get(room) : undefined;
      if (!roomData?.recordId) return;

      const [seconds, nanoseconds] = process.hrtime();
      await this.domService.upsert({
        recordId: roomData.recordId,
        protocol: data.dom ?? {},
        timestamp: seconds * 1e9 + nanoseconds,
        type: 'entireDom',
      });
    } catch (error) {
      this.logger.warn(
        `[SAVE_ENTIRE_DOM] ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // -------------------------------------------------------------------------
  // Protocol to all DevTools
  // -------------------------------------------------------------------------

  @SubscribeMessage('protocolToAllDevtools')
  public async handleProtocolToAllDevtools(
    @MessageBody() data: { room: string; message: string },
    @ConnectedSocket() client: WebSocket,
  ): Promise<void> {
    const protocol = parseProtocolMessage(data.message);
    if (!protocol) {
      this.logger.warn(`[protocolToAllDevtools] Invalid JSON message in room ${data.room}`);
      return;
    }
    const roomData = this.rooms.get(data.room);

    if (!roomData) {
      this.sendMessage(client, { event: 'error', message: 'Room not found' });
      return;
    }

    roomData.devtools.forEach((devtools) => devtools.send(data.message));

    if (!roomData.recordId) return;
    if (!hasProtocolMethod(protocol)) return;

    // Delegate persistence to CdpEventPersistenceService
    await this.cdpEventPersistence.persistProtocolEvent(protocol, roomData.recordId);

    // rrweb-based SessionReplay events
    if (protocol.method.startsWith('SessionReplay.')) {
      await this.handleSessionReplayProtocol(protocol, roomData, data.room);
    }
  }

  // -------------------------------------------------------------------------
  // SessionReplay event handling
  // -------------------------------------------------------------------------

  private async handleSessionReplayProtocol(
    protocol: ProtocolMessage & { method: string },
    roomData: RoomData,
    roomName: string,
  ): Promise<void> {
    if (protocol.method === 'SessionReplay.rrwebEvent') {
      const result = await this.cdpEventPersistence.persistSingleRrwebEvent(
        protocol,
        roomData.recordId,
      );
      if (result && roomData.recordId && roomName.startsWith('Buffer-')) {
        this.addRrwebEventToBuffer(roomName, roomData.recordId, protocol, result.sessionTimestamp);
      }
      return;
    }

    if (protocol.method === 'SessionReplay.rrwebEvents') {
      const results = await this.cdpEventPersistence.persistBatchRrwebEvents(
        protocol,
        roomData.recordId,
      );

      if (roomData.recordId && roomName.startsWith('Buffer-')) {
        const bufferInfo = this.bufferRooms.get(roomName);
        const deviceId = bufferInfo?.deviceId || 'unknown-device';
        const url = bufferInfo?.url || 'unknown-url';
        const userAgent = bufferInfo?.userAgent || 'unknown-useragent';
        const title = bufferInfo?.title;
        const sessionStartTime = bufferInfo?.sessionStartTime;

        for (const { event, sessionTimestamp } of results) {
          const bufferEvent = {
            method: 'SessionReplay.rrwebEvent',
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
      return;
    }

    // Legacy format compatibility
    if (
      protocol.method === 'SessionReplay.snapshot' ||
      protocol.method === 'SessionReplay.interaction'
    ) {
      const timestamp = Date.now() * 1_000_000;
      await this.cdpEventPersistence.persistLegacySessionReplay(
        protocol,
        roomData.recordId,
        timestamp,
      );
    }
  }

  private addRrwebEventToBuffer(
    roomName: string,
    recordId: number,
    protocol: ProtocolMessage & { method: string },
    sessionTimestamp: bigint,
  ): void {
    const bufferInfo = this.bufferRooms.get(roomName);
    const deviceId = bufferInfo?.deviceId || 'unknown-device';
    const url = bufferInfo?.url || 'unknown-url';
    const userAgent = bufferInfo?.userAgent || 'unknown-useragent';
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
  // Buffer events
  // -------------------------------------------------------------------------

  @SubscribeMessage('bufferEvent')
  public async handleBufferEvent(
    @MessageBody()
    data: {
      room: string;
      recordId: number;
      deviceId: string;
      url: string;
      userAgent: string;
      title?: string;
      event: BufferEvent;
    },
    @ConnectedSocket() client: WebSocket,
  ): Promise<void> {
    try {
      const { room, deviceId, event, url, userAgent, title } = data;

      if (room.startsWith('Record-') || room.startsWith('Live-')) {
        return;
      }

      const existingInfo = this.bufferRooms.get(room) || this.lastBufferInfoByDevice.get(deviceId);
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
        ...bufferInfo,
      });
      this.visibilityExitSavedRooms.delete(room);

      if (!room.startsWith('Record-')) {
        this.deviceToRoom.set(deviceId, room);
      }

      if (this.visibilityExitSavedRooms.has(room)) {
        this.visibilityExitSavedRooms.delete(room);
        this.logger.log(
          `[BUFFER_VISIBILITY_REENTRY] deviceId: ${deviceId}, room: ${room} - user returned, reset save state`,
        );
      }

      const bufferEvent = {
        method: event.method,
        params: event.params,
        timestamp: event.timestamp || Date.now(),
      };

      this.bufferService.addEvent(
        room,
        0,
        deviceId,
        url,
        userAgent,
        title,
        bufferInfo.sessionStartTime,
        bufferEvent,
      );

      if (this.clientMap.get(client) === 'pending') {
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
  // Enable buffering
  // -------------------------------------------------------------------------

  @SubscribeMessage('enableBuffering')
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
      this.logger.log(`[ENABLE_BUFFERING] Buffer mode enabled for device: ${data.deviceId}`);

      const sessionStartTime = data.timestamp || Date.now();
      const bufferRoom = data.room || `Buffer-${data.deviceId}-${sessionStartTime}`;

      this.clientMap.set(client, bufferRoom);
      this.deviceToRoom.set(data.deviceId, bufferRoom);

      this.registerBufferRoom(bufferRoom, data.deviceId, data.url, data.userAgent, data.title);
      // Override sessionStartTime from client
      const info = this.bufferRooms.get(bufferRoom);
      if (!info) {
        this.logger.warn(`Buffer room not found: ${bufferRoom}`);
        return;
      }
      info.sessionStartTime = sessionStartTime;
      const lastBufferInfo = this.lastBufferInfoByDevice.get(data.deviceId);
      if (lastBufferInfo) {
        lastBufferInfo.sessionStartTime = sessionStartTime;
      }

      this.sendMessage(client, {
        event: 'bufferingEnabled',
        message: 'Buffer mode activated successfully',
      });
    } catch (error) {
      this.logger.error(
        `[ENABLE_BUFFERING_ERROR] ${error instanceof Error ? error.message : String(error)}`,
      );
      this.sendMessage(client, {
        event: 'error',
        message: 'Failed to enable buffer mode',
      });
    }
  }

  // -------------------------------------------------------------------------
  // Save buffer
  // -------------------------------------------------------------------------

  @SubscribeMessage('saveBuffer')
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

    if (trigger === 'visibilitychange') {
      const bufferRoom = this.deviceToRoom.get(deviceId);
      if (bufferRoom) {
        this.visibilityExitSavedRooms.add(bufferRoom);
      }
    }

    const success = await this.bufferFlushService.triggerBufferSave(
      deviceId,
      trigger,
      title,
      timestamp,
      room,
      url,
      this.bufferRooms,
      this.deviceToRoom,
      this.lastBufferInfoByDevice,
      this.visibilityExitSavedRooms,
    );

    if (!success) {
      this.logger.warn(`[SAVE_BUFFER_WS_FAIL] deviceId: ${deviceId}, trigger: ${trigger}`);
    }
  }

  /**
   * triggerBufferSave를 외부 컨트롤러(Beacon API)에서 호출할 수 있도록 공개한다.
   */
  public async triggerBufferSave(
    deviceId: string,
    trigger?: string,
    title?: string,
    referenceTimestamp?: number,
    roomName?: string,
    requestUrl?: string,
  ): Promise<boolean> {
    return this.bufferFlushService.triggerBufferSave(
      deviceId,
      trigger,
      title,
      referenceTimestamp,
      roomName,
      requestUrl,
      this.bufferRooms,
      this.deviceToRoom,
      this.lastBufferInfoByDevice,
      this.visibilityExitSavedRooms,
    );
  }

  // -------------------------------------------------------------------------
  // Update response body
  // -------------------------------------------------------------------------

  @SubscribeMessage('updateResponseBody')
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
  // Ticket creation
  // -------------------------------------------------------------------------

  @SubscribeMessage('createTicket')
  public async handleCreateTicket(
    @MessageBody()
    data: { userData: UserData; formData?: TicketFormData },
    @ConnectedSocket() client: WebSocket,
  ): Promise<void> {
    try {
      const { userData, formData } = data;

      if (!userData.commonInfo) {
        userData.commonInfo = getDefaultCommonInfo();
      }

      userData.commonInfo.URL = userData.URL || userData.commonInfo.URL;
      userData.commonInfo.userAgent = userData.userAgent || userData.commonInfo.userAgent;

      const { commonInfo, URL } = userData;
      const roomName = `Record-${randomUUID()}`;

      this.registerBufferRoom(
        roomName,
        commonInfo.device.deviceId,
        commonInfo.URL,
        commonInfo.userAgent,
      );

      this.logger.log(
        `[TICKET_CREATE_START] ${JSON.stringify({
          deviceId: commonInfo.device.deviceId,
          memberId: commonInfo.user.memberId,
          URL,
          isDefaultCommonInfo: commonInfo.device.deviceId.startsWith('unknown-'),
        })}`,
      );

      const recordId = await this.createRoom({
        roomName,
        client,
        recordMode: true,
        url: commonInfo.URL,
        deviceId: commonInfo.device.deviceId,
        referrer: URL?.split('?')[0],
        userAgent: commonInfo.userAgent,
      });

      const { requestBody, ticketKey, ticketUrl } = await this.jiraService.createTicket({
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

      if (recordId) {
        await this.bufferFlushService.transferBufferedDataToRecord(
          commonInfo.device.deviceId,
          recordId,
          this.bufferRooms,
          this.deviceToRoom,
          this.lastBufferInfoByDevice,
          this.visibilityExitSavedRooms,
        );
      }
    } catch (error) {
      this.handleTicketCreationError(data, client, error as Error);
    }
  }

  private async handlePostTicketCreation(
    client: WebSocket,
    commonInfo: CommonInfo,
    recordId: number,
    roomName: string,
    URL: string,
    requestBody: CreateTicketRequestBody,
    ticketKey: string,
    ticketUrl: string,
    formData?: TicketFormData,
  ): Promise<void> {
    const userInfo = !commonInfo.device.deviceId.startsWith('unknown-')
      ? await this.userInfoService.getUserInfoByDeviceId(commonInfo.device.deviceId)
      : null;

    if (userInfo?.slackUserId) {
      await this.slackService.sendCreateTicketDM({
        slackUserId: userInfo.slackUserId,
        requestBody,
        ticketKey,
        ticketUrl,
      });
    }

    this.sendMessage(client, {
      event: 'ticketCreateSuccess',
      message: 'QA ticket created successfully.',
    });

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

  private async persistTicketLog(
    commonInfo: CommonInfo,
    recordId: number,
    roomName: string,
    URL: string,
    requestBody: CreateTicketRequestBody,
    ticketUrl: string,
    userInfo: TicketUserInfo,
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
        jiraProjectKey: userInfo.jiraProjectKey || 'N/A',
        assignee,
        parentEpic: formData?.Epic || null,
        title: requestBody.title,
        sessionName: roomName,
        url: URL.split('?')[0],
      });

      await this.ticketLogRepository.save(ticketLog);

      if (formData?.components && formData.components.length > 0) {
        const componentEntities = formData.components.map((componentName) =>
          this.ticketComponentRepository.create({
            ticketLogId: ticketLog.id,
            componentName: componentName.trim(),
          }),
        );
        await this.ticketComponentRepository.save(componentEntities);
      }

      if (formData?.labels && formData.labels.length > 0) {
        const labelEntities = formData.labels.map((labelName) =>
          this.ticketLabelRepository.create({
            ticketLogId: ticketLog.id,
            labelName: labelName.trim(),
          }),
        );
        await this.ticketLabelRepository.save(labelEntities);
      }
    } catch (logError) {
      this.logger.error(
        `[TICKET_LOG_ERROR] ${JSON.stringify({
          deviceId: commonInfo.device.deviceId,
          ticketUrl,
          error:
            logError instanceof Error
              ? { message: logError.message, stack: logError.stack }
              : JSON.stringify(logError),
        })}`,
      );
    }
  }

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
        error: { message: error.message, stack: error.stack, name: error.name },
      })}`,
    );
    this.sendMessage(client, {
      event: 'ticketCreateError',
      message: `Ticket creation failed: ${error.message}`,
    });
  }

  // -------------------------------------------------------------------------
  // Disconnection handling
  // -------------------------------------------------------------------------

  public async handleDisconnect(client: WebSocket): Promise<void> {
    const room = this.clientMap.get(client);

    if (room) {
      if (room.startsWith('Buffer-')) {
        await this.handleBufferRoomDisconnect(room);
        this.clientMap.delete(client);
        return;
      }

      const roomData = this.rooms.get(room);

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
      this.rooms.get(devtoolsInfo.room)?.devtools.delete(devtoolsInfo.devtoolsId);
      this.devtoolsMap.delete(client);
    }

    await this.flushRemainingBufferRooms();
  }

  private async handleBufferRoomDisconnect(room: string): Promise<void> {
    const directInfo = this.bufferRooms.get(room);
    const lastInfo =
      [...this.lastBufferInfoByDevice.values()].find((info) => info.room === room) || null;

    const resolvedDeviceId = directInfo?.deviceId ?? lastInfo?.deviceId ?? 'unknown-device';
    const resolvedUrl = directInfo?.url ?? lastInfo?.url ?? 'unknown-url';
    const resolvedUserAgent = directInfo?.userAgent ?? lastInfo?.userAgent ?? 'unknown-useragent';
    const resolvedTitle = directInfo?.title ?? lastInfo?.title;

    try {
      await this.bufferFlushService.flushBufferToFileForce(
        room,
        0,
        resolvedDeviceId,
        resolvedUrl,
        resolvedUserAgent,
        resolvedTitle,
        this.visibilityExitSavedRooms,
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

  private async handleRecordRoomDisconnect(room: string, roomData: RoomData): Promise<void> {
    const endTime = Date.now() * 1_000_000;

    await this.screenService.upsert({
      recordId: roomData.recordId,
      protocol: { method: 'session_end', params: {} },
      timestamp: endTime,
      type: null,
      eventType: 'session_end',
    });

    const startEvent = await this.screenService.findScreens(roomData.recordId);
    if (startEvent && startEvent.length > 0) {
      const startTime = startEvent[0].timestamp;
      const duration = endTime - Number(startTime);
      await this.recordService.updateDuration(roomData.recordId, duration);
    }

    if (!room.startsWith('Record-') && !room.startsWith('Live-')) {
      try {
        const bufferInfo = this.bufferRooms.get(room);
        if (roomData.recordId === undefined || roomData.recordId === null) {
          this.logger.warn(`Cannot flush buffer without recordId: ${room}`);
          return;
        }
        await this.bufferFlushService.flushBufferToFile(
          room,
          roomData.recordId,
          bufferInfo?.deviceId || 'unknown-device',
          bufferInfo?.url || 'unknown-url',
          bufferInfo?.userAgent || 'unknown-useragent',
          bufferInfo?.title,
          this.visibilityExitSavedRooms,
        );
      } catch (error) {
        this.logger.error(
          `[DISCONNECT_FLUSH_ERROR] ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  private async flushRemainingBufferRooms(): Promise<void> {
    try {
      for (const [bufferRoom, bufferInfo] of this.bufferRooms.entries()) {
        if (bufferRoom.startsWith('Buffer-') && !this.visibilityExitSavedRooms.has(bufferRoom)) {
          await this.bufferFlushService.flushBufferToFile(
            bufferRoom,
            0,
            bufferInfo.deviceId,
            bufferInfo.url,
            bufferInfo.userAgent,
            bufferInfo.title,
            this.visibilityExitSavedRooms,
          );
          this.bufferRooms.delete(bufferRoom);
        } else if (this.visibilityExitSavedRooms.has(bufferRoom)) {
          this.bufferRooms.delete(bufferRoom);
          this.visibilityExitSavedRooms.delete(bufferRoom);
        }
      }
    } catch (error) {
      this.logger.error(`[DISCONNECT_BUFFER_FLUSH_ERROR] ${(error as Error).message}`);
    }
  }
}
