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
// Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Gateway
// ---------------------------------------------------------------------------

@WebSocketGateway()
export class WebviewGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(WebviewGateway.name);

  private readonly rooms: Map<string, RoomData> = new Map();
  private readonly clientMap: Map<WebSocket, string> = new Map();
  private readonly devtoolsMap: Map<WebSocket, DevtoolsData> = new Map();

  /** Tracks rrweb event timestamps for ordering. */
  private lastEventTimestamp = 0;

  // Buffer mode room management
  private readonly bufferRooms: Map<string, BufferRoomInfo> = new Map();
  /** Maps deviceId to its current room for fast lookup. */
  private readonly deviceToRoom: Map<string, string> = new Map();
  /** Preserves the most recent buffer info per device (survives disconnect for Beacon use). */
  private readonly lastBufferInfoByDevice: Map<string, LastBufferInfo> =
    new Map();
  /** Tracks rooms already saved due to visibility change (prevents duplicate saves on re-entry). */
  private readonly visibilityExitSavedRooms: Set<string> = new Set();

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

  // -------------------------------------------------------------------------
  // Helpers -- sending messages
  // -------------------------------------------------------------------------

  private sendMessage(socket: WebSocket, data: any): void {
    socket.send(JSON.stringify(data));
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
  // Helpers -- CDP domain initialisation messages
  // -------------------------------------------------------------------------

  /** Sends the standard set of Network / Runtime / Page enable messages (wrapped in event: "protocol"). */
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

  /** Sends DOM.enable and ScreenPreview.startPreview messages (wrapped in event: "protocol"). */
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
  // rrweb event type mapping
  // -------------------------------------------------------------------------

  /**
   * Maps an rrweb numeric event type to its string label.
   * 0=DomContentLoaded, 1=Load, 2=FullSnapshot, 3=IncrementalSnapshot,
   * 4=Meta, 5=Custom, others=rrweb_{type}.
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
  // Create Room
  // -------------------------------------------------------------------------

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
  // Connection / disconnection
  // -------------------------------------------------------------------------

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
  // Message to DevTools
  // -------------------------------------------------------------------------

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
  // Protocol to all DevTools
  // -------------------------------------------------------------------------

  @SubscribeMessage("protocolToAllDevtools")
  public async handleProtocolToAllDevtools(
    @MessageBody() data: { room: string; message: string },
    @ConnectedSocket() client: WebSocket,
  ): Promise<void> {
    const protocol = JSON.parse(data.message);
    const roomData = this.rooms.get(data.room);

    if (!roomData) {
      this.sendMessage(client, { event: "error", message: "Room not found" });
      return;
    }

    roomData.devtools.forEach((devtools) => devtools.send(data.message));

    if (!roomData.recordId) return;

    const timestamp = Date.now() * 1_000_000; // milliseconds -> nanoseconds

    // TODO: Improve domain-based message routing
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
  // SessionReplay event handling (extracted for readability)
  // -------------------------------------------------------------------------

  /**
   * Processes SessionReplay protocol messages (rrweb single events, batch events,
   * and legacy snapshot / interaction formats).
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

  /** Handles a single SessionReplay.rrwebEvent. */
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

  /** Handles a batch of SessionReplay.rrwebEvents. */
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

  /** Handles legacy SessionReplay.snapshot / SessionReplay.interaction formats. */
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

  /** Adds a single rrweb event to the buffer service. */
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
  // Buffer events
  // -------------------------------------------------------------------------

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
  // Enable buffering
  // -------------------------------------------------------------------------

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
  // Save buffer
  // -------------------------------------------------------------------------

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
  // Buffer save orchestration
  // -------------------------------------------------------------------------

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
  // Buffer room collection / cleanup helpers
  // -------------------------------------------------------------------------

  /**
   * Gathers all rooms that should be flushed for a given deviceId,
   * optionally filtered by reference timestamp, room name, and URL path.
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

  /** Removes all tracking data for a buffer room after it has been flushed. */
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

  /** Normalises a URL to origin + pathname (strips query params and fragments). */
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
  // Update response body
  // -------------------------------------------------------------------------

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
  // Ticket creation
  // -------------------------------------------------------------------------

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
   * Post-ticket-creation tasks: send Slack DM, notify client, and persist ticket log.
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
   * Persists a ticket creation log entry along with component and label records.
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
        roomName,
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

  /** Handles errors during ticket creation and notifies the client. */
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
  // Buffer flush helpers
  // -------------------------------------------------------------------------

  /** Force-flushes the buffer to S3 storage (ignores minimum event count). */
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

  /** Flushes the buffer to S3 storage (respects minimum event count). */
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

  /** Builds the upload payload and saves it to S3. */
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
  // Buffer transfer to record
  // -------------------------------------------------------------------------

  /** Finds the Buffer room associated with a device. */
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
   * Transfers buffered events from a Buffer room into a permanent record.
   * Used when a recording session or ticket is created.
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

  /** Persists the latest ScreenPreview.captured event from the buffer. */
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
  // Event persistence helpers
  // -------------------------------------------------------------------------

  /**
   * Persists a single buffered event to the appropriate service based on its method.
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

  /** Persists a single rrweb event from the buffer. */
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

  /** Persists a batch of rrweb events from the buffer. */
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

  /** Persists a legacy SessionReplay.snapshot or SessionReplay.interaction event. */
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
  // Timestamp conversion
  // -------------------------------------------------------------------------

  /** Converts a millisecond timestamp (number or string) to nanoseconds. */
  private toTimestampNs(value?: number | string): number {
    const parsed = typeof value === "string" ? Number(value) : value;
    if (!Number.isFinite(parsed)) {
      const [seconds, nanoseconds] = process.hrtime();
      return seconds * 1e9 + nanoseconds;
    }
    return Math.trunc(parsed * 1_000_000);
  }

  // -------------------------------------------------------------------------
  // Buffer persistence eligibility
  // -------------------------------------------------------------------------

  /**
   * Determines whether a buffer contains enough meaningful events to be worth persisting.
   * Filters out buffers that are too small or contain only noise.
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
  // Disconnection handling
  // -------------------------------------------------------------------------

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

  /** Handles disconnect cleanup for Buffer rooms. */
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

  /** Handles disconnect cleanup for Record/Live rooms (session end + optional buffer flush). */
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

  /** Flushes any remaining Buffer rooms that were not already saved on visibility exit. */
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
// Exported Types
// ---------------------------------------------------------------------------

export type CommonInfo = {
  user: {
    userAppData?: string; // Encrypted user app data
    userBaedal?: string; // Kept for legacy compatibility
    authorization: string;
    memberId: string;
    memberNumber: string;
    perseusClientId?: string;
    perseusSessionId?: string;
  };
  device: {
    adid: string;
    att?: number; // ATT status value (iOS 14+ only)
    appsflyerId: string;
    deviceBaedal?: string; // Emulator/rooting flag (Android only)
    deviceId: string;
    sessionId: string;
    /** Available since version 12.20.0 */
    actionTrackingKey?: string; // Marketing platform key
    osVersion: string;
    webUserAgent: string;
    deviceModel: string;
    carrier: string; // Carrier information
    /** Available since version 14.4.0 */
    idfv?: string;
  };
  /** Available since version 12.5.0 */
  supportData: string;
  /** URL accessed from the webview */
  URL: string;
  /** User-Agent string */
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
  commonInfo?: CommonInfo;
  userAgent: string;
  URL: string;
  webTitle: string;
};
