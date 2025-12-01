/* eslint-disable @typescript-eslint/no-explicit-any */

import { Logger } from "@nestjs/common";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { randomUUID } from "node:crypto";
import { Server } from "ws";
import * as WebSocket from "ws";

import { MSG_ID } from "@remote-platform/constants";
import {
  DomService,
  NetworkService,
  RecordService,
  RuntimeService,
  ScreenService,
} from "@remote-platform/core";

import { S3Service } from "../s3/s3.service";

import { ObjectReconstructionService } from "./object-reconstruction.service";
import { S3PlaybackService } from "./s3-playback.service";
import {
  DevtoolsData,
  ProtocolEntry,
  ProtocolMessage,
  RoomData,
} from "./webview.types";

// Re-export types for backward compatibility
export type {
  DevtoolsData,
  ProtocolEntry,
  ProtocolMessage,
  RoomData,
} from "./webview.types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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

  /** Per-device buffer data storage (used during live streaming). */
  private readonly bufferStorage: Map<string, any[]> = new Map();

  @WebSocketServer() public server: Server;

  constructor(
    private readonly recordService: RecordService,
    private readonly networkService: NetworkService,
    private readonly domService: DomService,
    private readonly runtimeService: RuntimeService,
    private readonly screenService: ScreenService,
    private readonly s3Service: S3Service,
    private readonly objectReconstructionService: ObjectReconstructionService,
    private readonly s3PlaybackService: S3PlaybackService,
  ) {}

  // -------------------------------------------------------------------------
  // Helpers -- sending messages
  // -------------------------------------------------------------------------

  /**
   * Safely serialises and sends data over a WebSocket.
   * Only logs initialisation / error-related messages to reduce noise.
   */
  private sendMessage(socket: WebSocket, data: ProtocolMessage): void {
    try {
      if (socket.readyState !== WebSocket.OPEN) {
        this.logger.warn(
          `[SOCKET_NOT_READY] WebSocket closed, skipping: ${data.method || data.event}`,
        );
        return;
      }

      const message = JSON.stringify(data);
      socket.send(message);

      // Only log initialisation and error-related messages
      if (
        data.event ||
        data.method?.includes("enable") ||
        data.method?.includes("Error")
      ) {
        this.logger.log(`[SOCKET] ${data.method || data.event}`);
      }
    } catch (error) {
      this.logger.error(
        `[SOCKET_ERROR] ${data.method || data.event}: ${(error as Error).message}`,
      );
    }
  }

  // -------------------------------------------------------------------------
  // Helpers -- DevTools request handlers (shared by DB & S3 playback)
  // -------------------------------------------------------------------------

  /**
   * Handles Runtime.getProperties requests during playback.
   * Returns stored snapshot data or an empty result when unavailable.
   */
  private handleGetPropertiesRequest(
    client: WebSocket,
    protocol: any,
    propertySnapshotsMap: Map<string, any[]>,
  ): void {
    const objectId = protocol.params?.objectId;
    const properties = propertySnapshotsMap.get(objectId);

    if (properties) {
      this.logger.debug(`Found properties for objectId: ${objectId}`);
    } else {
      this.logger.debug(`No properties found for objectId: ${objectId}`);
    }

    this.sendMessage(client, {
      id: protocol.id,
      result: {
        result: properties || [],
        internalProperties: [],
        privateProperties: [],
      },
    });
  }

  /**
   * Handles Runtime.callFunctionOn requests during playback.
   * Supports the Copy Object feature (toStringForClipboard / JSON.stringify).
   */
  private handleCallFunctionOnRequest(
    client: WebSocket,
    protocol: any,
    propertySnapshotsMap: Map<string, any[]>,
    modeLabel: string,
  ): void {
    const objectId = protocol.params?.objectId;
    const functionDeclaration = protocol.params?.functionDeclaration || "";
    const args = protocol.params?.arguments || [];

    this.logger.debug(
      `Runtime.callFunctionOn called for objectId: ${objectId}`,
    );

    const isCopyObjectCall =
      functionDeclaration.includes("toStringForClipboard") ||
      functionDeclaration.includes("JSON.stringify");

    if (isCopyObjectCall && objectId) {
      const jsonResult = this.objectReconstructionService.reconstructObjectAsJson(
        objectId,
        propertySnapshotsMap,
        args,
      );

      this.sendMessage(client, {
        id: protocol.id,
        result: {
          result: {
            type: "string",
            value: jsonResult,
          },
        },
      });
    } else {
      // Unsupported callFunctionOn request in playback mode
      this.sendMessage(client, {
        id: protocol.id,
        error: {
          code: -32601,
          message: `Method not supported in ${modeLabel} playback mode`,
        },
      });
    }
  }

  // -------------------------------------------------------------------------
  // Helpers -- CDP domain initialisation messages
  // -------------------------------------------------------------------------

  /** Sends the standard set of Network / Runtime / Page enable messages. */
  private sendRecordModeInitMessages(client: WebSocket): void {
    // Network domain
    this.sendMessage(client, {
      id: MSG_ID.NETWORK.ENABLE,
      method: "Network.enable",
      params: { maxPostDataSize: 65536 },
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
      id: MSG_ID.RUNTIME.ENABLE,
      method: "Runtime.enable",
      params: {},
    });

    // Page domain
    this.sendMessage(client, {
      id: MSG_ID.PAGE.ENABLE,
      method: "Page.enable",
      params: {},
    });
    this.sendMessage(client, {
      id: MSG_ID.PAGE.GET_RESOURCE_TREE,
      method: "Page.getResourceTree",
      params: {},
    });
  }

  /** Sends DOM.enable and ScreenPreview.startPreview messages. */
  private sendDomAndScreenInitMessages(client: WebSocket): void {
    this.sendMessage(client, {
      id: MSG_ID.DOM.ENABLE,
      method: "DOM.enable",
      params: {},
    });
    this.sendMessage(client, {
      id: MSG_ID.SCREEN.START_PREVIEW,
      method: "ScreenPreview.startPreview",
      params: {},
    });
  }

  // -------------------------------------------------------------------------
  // Room management
  // -------------------------------------------------------------------------

  private async createRoom(
    roomName: string,
    client: WebSocket,
    recordMode: boolean,
  ): Promise<void> {
    let recordId: number | null = null;

    if (recordMode) {
      const { id } = await this.recordService.create({ name: roomName });
      recordId = id;

      // Send protocol initialisation messages directly (no event wrapper)
      this.sendRecordModeInitMessages(client);
    }

    this.rooms.set(roomName, {
      client,
      devtools: new Map(),
      recordMode,
      recordId,
    });
    this.clientMap.set(client, roomName);

    // Retrieve the recording session creation timestamp from DB
    let roomTimestamp = Date.now();
    if (recordId) {
      try {
        const record = await this.recordService.findOne(recordId);
        if (record?.createdAt) {
          roomTimestamp = record.createdAt.getTime();
          this.logger.log(
            `[ROOM_CREATED] Record ${recordId} created at: ${record.createdAt.toISOString()} (timestamp: ${roomTimestamp})`,
          );
        }
      } catch (error) {
        this.logger.error(
          `[ROOM_CREATED_ERROR] Failed to get record timestamp: ${error}`,
        );
      }
    }

    this.sendMessage(client, {
      event: "roomCreated",
      roomName,
      recordId,
      timestamp: roomTimestamp,
      createdAt: new Date(roomTimestamp).toISOString(),
    });

    // Initialise DOM and Screen Preview
    this.sendDomAndScreenInitMessages(client);

    // Persist session start event (milliseconds -> nanoseconds)
    const timestamp = Date.now() * 1_000_000;
    await this.screenService.upsert({
      recordId,
      protocol: {
        method: "session_start",
        params: { url: client.url, userAgent: client.protocol },
      },
      timestamp,
      type: null,
      eventType: "session_start",
    } as any);
  }

  @SubscribeMessage("createRoom")
  public async handleCreateRoom(
    @MessageBody() data: { recordMode?: boolean },
    @ConnectedSocket() client: WebSocket,
  ): Promise<void> {
    const { recordMode = false } = data;
    const room = `${recordMode ? "Record-" : "Live-"}${randomUUID()}`;
    await this.createRoom(room, client, recordMode);
  }

  // -------------------------------------------------------------------------
  // Buffer events (live streaming)
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
      event: any;
    },
  ): Promise<void> {
    try {
      const { room, deviceId, event } = data;

      // Skip buffer events for Record / Live rooms (prevent session.json creation)
      if (room.startsWith("Record-") || room.startsWith("Live-")) {
        this.logger.log(
          `[BUFFER_SKIP] Skipping buffer event for ${room} - record/live room detected`,
        );
        return;
      }

      // Accumulate buffer data per device
      if (!this.bufferStorage.has(deviceId)) {
        this.bufferStorage.set(deviceId, []);
      }

      const deviceBuffer = this.bufferStorage.get(deviceId);
      if (deviceBuffer) {
        deviceBuffer.push(event);
        this.logger.log(
          `[BUFFER_EVENT] Stored event for device ${deviceId}: ${event.method}, total: ${deviceBuffer.length}`,
        );
      } else {
        this.logger.error(
          `[BUFFER_EVENT] Failed to get device buffer for: ${deviceId}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `[BUFFER_EVENT] Error storing buffer event: ${(error as Error).message}`,
      );
    }
  }

  // -------------------------------------------------------------------------
  // Connection handling
  // -------------------------------------------------------------------------

  public async handleConnection(client: WebSocket, req: any): Promise<void> {
    this.logger.log(`[WS_CONNECTION] New connection attempt (url=${req?.url})`);

    const devtoolsId = randomUUID();
    const {
      room,
      recordMode,
      recordId,
      playbackDevice,
      s3Backup,
      deviceId,
      filePaths,
    } = this.parseQueryParams(req?.url || "");

    this.logger.log(
      `[WS_CONNECTION] Parsed params: room=${room}, recordMode=${recordMode}, recordId=${recordId}, s3Backup=${s3Backup}`,
    );

    // S3 backup playback mode (s3Backup=true with filePaths)
    if (s3Backup === "true" && filePaths) {
      this.logger.log("[WS_CONNECTION] S3 backup playback mode detected");
      await this.handleS3BackupPlaybackByPaths(
        client,
        deviceId || "unknown",
        filePaths,
      );
      return;
    }

    // Legacy backup playback mode (playbackDevice present) -- kept for compatibility
    if (playbackDevice && room && recordId) {
      this.logger.log(
        `[WS_CONNECTION] Legacy backup playback mode for device: ${playbackDevice}`,
      );
      await this.handleBackupPlayback(client, room, recordId, playbackDevice);
      return;
    }

    // Record mode reconnection: recordMode=true and a recordId is provided
    if (recordMode === "true" && recordId) {
      this.sendRecordModeInitMessages(client);
      this.sendDomAndScreenInitMessages(client);

      // Track whether screen preview is active for this client
      let screenPreviewActive = true;

      // Automatically send the latest screen data from DB after a short delay
      setTimeout(async () => {
        if (!screenPreviewActive) return;
        const screen = await this.screenService.findLatestScreen(recordId);
        if (screen) {
          this.sendMessage(client, screen.protocol);
          this.logger.log(
            "[DB_AUTO_SCREEN] Automatically sent latest screen data",
          );
        }
      }, 100);

      client.on("message", async (message: string) => {
        let protocol: any;
        try {
          protocol = JSON.parse(message);
        } catch (error) {
          this.logger.error(
            `[RECORD_MODE_RECONNECT] Failed to parse message: ${(error as Error).message}`,
          );
          return;
        }
        if (protocol.method === "Page.getResourceTree") {
          this.sendMessage(client, { id: protocol.id });
        }
        if (protocol.method === "ScreenPreview.startPreview") {
          screenPreviewActive = true;
          void this.screenService.findLatestScreen(recordId).then((screen) => {
            if (screen) {
              this.sendMessage(client, screen.protocol);
            }
          });
        }
        if (protocol.method === "ScreenPreview.stopPreview") {
          screenPreviewActive = false;
        }
        // When DevTools is ready to receive DOM data, send from DB
        if (this.domService.isGetDomRequestMessage(protocol)) {
          const dom = await this.domService.findEntireDom(recordId);
          if (dom) {
            this.sendMessage(client, {
              result: dom.protocol,
              id: protocol["id"],
            });
          } else {
            this.logger.warn(
              `[RECORD_MODE] No DOM data found for recordId=${recordId}`,
            );
            this.sendMessage(client, {
              id: protocol["id"],
              result: { root: null },
            });
          }
        }
      });
      client.on("close", () => this.handleDisconnect(client));
      await this.handleRecordMode(client, recordId);
      return;
    }

    if (!room) {
      this.logger.log("No room specified, closing connection");
      client.close();
      return;
    }

    const roomData = this.rooms.get(room);
    if (roomData) {
      this.logger.log(`Adding devtools client to existing room: ${room}`);
      roomData.devtools.set(devtoolsId, client);
      this.devtoolsMap.set(client, { room, devtoolsId });
      client.on("message", (message: string) => {
        let parsed: any;
        try {
          parsed = JSON.parse(message);
        } catch (error) {
          this.logger.error(
            `[DEVTOOLS_MESSAGE] Failed to parse message: ${(error as Error).message}`,
          );
          return;
        }
        this.handleDevtoolsMessage(room, parsed);
      });
      client.on("close", () => this.handleDisconnect(client));
    } else {
      this.logger.log(`Room ${room} not found, closing connection`);
      client.close();
    }
  }

  // -------------------------------------------------------------------------
  // Record mode playback (DB-based)
  // -------------------------------------------------------------------------

  private async handleRecordMode(
    client: WebSocket,
    recordId: number,
  ): Promise<void> {
    // Send URL information if available
    const record = await this.recordService.findOne(recordId);
    if (record?.url) {
      this.sendMessage(client, {
        method: "Page.navigatedWithinDocument",
        params: { frameId: "main", url: record.url },
      });
    }

    // Send stored network records
    const networks = await this.networkService.findNetworks(recordId);
    this.logger.log(`Found ${networks.length} network records`);
    networks.forEach(
      (network) =>
        network.protocol && this.sendMessage(client, network.protocol),
    );

    // Send stored runtime records and collect property snapshots
    const runtimes = await this.runtimeService.findRuntimes(recordId);
    this.logger.log(`Found ${runtimes.length} runtime records`);

    const runtimeEntries = runtimes.map((runtime) => {
      const protocol = runtime.protocol as any;
      this.sendMessage(client, protocol);
      return { protocol };
    });

    const propertySnapshotsMap =
      this.objectReconstructionService.collectPropertySnapshots(runtimeEntries);

    // Handle subsequent DevTools requests
    client.on("message", (message: string) => {
      let protocol: any;
      try {
        protocol = JSON.parse(message);
      } catch (error) {
        this.logger.error(
          `[RECORD_PLAYBACK] Failed to parse message: ${(error as Error).message}`,
        );
        return;
      }

      // Network.getResponseBody
      if (protocol.method === "Network.getResponseBody") {
        const data = networks.find(
          (network) =>
            network.requestId === protocol.params.requestId &&
            network.base64Encoded !== null,
        );

        if (!data) {
          this.sendMessage(client, {
            id: protocol.id,
            error: { message: "No response body found" },
          });
          return;
        }

        // Send the stored body as-is; DevTools handles pretty-printing
        this.sendMessage(client, {
          id: protocol.id,
          result: {
            body: data.responseBody,
            base64Encoded: data.base64Encoded,
          },
        });
      }

      // Runtime.getProperties (object expansion in playback)
      if (protocol.method === "Runtime.getProperties") {
        this.handleGetPropertiesRequest(client, protocol, propertySnapshotsMap);
      }

      // Runtime.callFunctionOn (Copy Object in playback)
      if (protocol.method === "Runtime.callFunctionOn") {
        this.handleCallFunctionOnRequest(
          client,
          protocol,
          propertySnapshotsMap,
          "recording",
        );
      }
    });
  }

  // -------------------------------------------------------------------------
  // Query parameter parsing
  // -------------------------------------------------------------------------

  private parseQueryParams(url?: string): {
    room: string | null;
    recordMode: string | null;
    recordId: number | null;
    playbackDevice: string | null;
    s3Backup: string | null;
    deviceId: string | null;
    date: string | null;
    fileCount: number | null;
    filePaths: string | null;
  } {
    const empty = {
      room: null,
      recordMode: null,
      recordId: null,
      playbackDevice: null,
      s3Backup: null,
      deviceId: null,
      date: null,
      fileCount: null,
      filePaths: null,
    };

    if (!url) {
      this.logger.debug("No URL provided for parsing");
      return empty;
    }

    const urlParts = url.split("?");
    if (urlParts.length < 2) {
      this.logger.debug(`No query params in URL: ${url}`);
      return empty;
    }

    const queryParams = new URLSearchParams(urlParts[1]);
    const recordIdParam = queryParams.get("recordId");
    const fileCountParam = queryParams.get("fileCount");

    const result = {
      room: queryParams.get("room"),
      recordMode: queryParams.get("recordMode"),
      recordId: recordIdParam ? Number(recordIdParam) : null,
      playbackDevice: queryParams.get("playbackDevice"),
      s3Backup: queryParams.get("s3Backup"),
      deviceId: queryParams.get("deviceId"),
      date: queryParams.get("date"),
      fileCount: fileCountParam ? Number(fileCountParam) : null,
      filePaths: queryParams.get("filePaths"),
    };

    this.logger.debug(`Parsed params: ${JSON.stringify(result)}`);
    return result;
  }

  // -------------------------------------------------------------------------
  // Backup playback (legacy DB-based approach)
  // -------------------------------------------------------------------------

  private async handleBackupPlayback(
    client: WebSocket,
    room: string,
    recordId: number,
    deviceId: string,
  ): Promise<void> {
    try {
      this.logger.log(
        `Loading backup data for device: ${deviceId}, room: ${room}, recordId: ${recordId}`,
      );

      // Retrieve device-specific backup data from S3
      const deviceData = await this.s3Service.getBufferDataByDeviceId(
        deviceId,
        room,
        recordId,
      );

      if (!deviceData || deviceData.length === 0) {
        this.sendMessage(client, {
          event: "error",
          message: `No backup data found for device ${deviceId}.`,
        });
        client.close();
        return;
      }

      this.logger.log(
        `Found ${deviceData.length} backup sessions for device ${deviceId}`,
      );

      // Send URL information from the first backup
      if (deviceData[0]?.url) {
        this.sendMessage(client, {
          method: "Page.navigatedWithinDocument",
          params: { frameId: "main", url: deviceData[0].url },
        });
      }

      // Convert S3 backup data to DB-compatible protocol format and stream
      const allProtocols: ProtocolEntry[] = [];
      for (const backup of deviceData) {
        for (const event of backup.bufferData) {
          allProtocols.push({
            protocol: { method: event.method, params: event.params },
            timestamp: event.timestamp,
            domain: event.method.split(".")[0],
          });
        }
      }

      // Sort by timestamp descending (newest first)
      allProtocols.sort((a, b) => b.timestamp - a.timestamp);

      this.logger.log(`Streaming ${allProtocols.length} protocols to DevTools`);

      allProtocols.forEach((protocolData) => {
        if (protocolData.protocol) {
          this.sendMessage(client, protocolData.protocol);
        }
      });

      // Handle subsequent DevTools requests
      client.on("message", (message: string) => {
        let protocol: any;
        try {
          protocol = JSON.parse(message);
        } catch (error) {
          this.logger.error(
            `[BACKUP_PLAYBACK] Failed to parse message: ${(error as Error).message}`,
          );
          return;
        }

        if (protocol.method === "Page.getResourceTree") {
          this.sendMessage(client, { id: protocol.id });
        }

        this.logger.log(
          `[BACKUP_PLAYBACK] DevTools request: ${protocol.method}`,
        );
      });

      // Notify playback completion
      this.sendMessage(client, {
        event: "playbackComplete",
        data: { room, recordId, deviceId, totalEvents: allProtocols.length },
      });

      this.logger.log(`Backup playback completed for device ${deviceId}`);
    } catch (error) {
      this.logger.error(`Backup playback error: ${(error as Error).message}`);
      this.sendMessage(client, {
        event: "error",
        message: "An error occurred during backup data playback.",
      });
      client.close();
    }
  }

  // -------------------------------------------------------------------------
  // S3 backup playback -- by direct file paths
  // -------------------------------------------------------------------------

  private async handleS3BackupPlaybackByPaths(
    client: WebSocket,
    deviceId: string,
    filePaths: string,
  ): Promise<void> {
    try {
      const pathArray = filePaths.split(",").filter((path) => path.trim());

      const backupData = await this.s3Service.getS3BackupByPaths(pathArray);

      if (!backupData || backupData.length === 0) {
        this.sendMessage(client, {
          event: "error",
          message: "No backup data found for the specified file paths.",
        });
        client.close();
        return;
      }

      this.logger.log(
        `[S3_DIRECT_PLAYBACK] Found ${backupData.length} backup sessions via direct paths`,
      );

      await this.processS3BackupData(client, deviceId, backupData);
    } catch (error) {
      this.logger.error(
        `[S3_DIRECT_PLAYBACK_ERROR] ${(error as Error).message}`,
      );
      this.sendMessage(client, {
        event: "error",
        message:
          "An error occurred during S3 backup playback via direct paths.",
      });
      client.close();
    }
  }

  // -------------------------------------------------------------------------
  // S3 backup playback -- shared processing logic
  // -------------------------------------------------------------------------

  private async processS3BackupData(
    client: WebSocket,
    deviceId: string,
    backupData: any[],
  ): Promise<void> {
    // Extract session start time from the oldest backup
    const sessionStartTime =
      this.s3PlaybackService.extractSessionStartTime(backupData);

    // Generate an S3 session ID (s3-deviceId-timestamp-index format)
    const s3SessionId = this.s3PlaybackService.generateS3SessionId(
      deviceId,
      sessionStartTime,
    );
    this.logger.log(`[S3_PLAYBACK] Generated S3 session ID: ${s3SessionId}`);

    // Send S3 session ID to DevTools so the Session Replay API returns correct data
    if (s3SessionId) {
      this.sendMessage(client, {
        method: "SessionReplay.setSessionId",
        params: { sessionId: s3SessionId },
      });
    }

    // Initialise DevTools domains (same as DB playback)
    this.sendRecordModeInitMessages(client);
    this.sendDomAndScreenInitMessages(client);

    // Send URL information
    if (backupData[0]?.url) {
      this.sendMessage(client, {
        method: "Page.navigatedWithinDocument",
        params: { frameId: "main", url: backupData[0].url },
      });
    }

    // Automatically send the latest screen data from S3 cache after a short delay
    setTimeout(() => {
      const latestScreenData =
        this.s3PlaybackService.findScreenDataInS3Cache(client);
      if (latestScreenData) {
        this.sendMessage(client, latestScreenData);
        this.logger.log(
          "[S3_AUTO_SCREEN] Automatically sent latest screen data",
        );
      }
    }, 100);

    // Cache backup data per client for subsequent WebSocket request handling
    this.s3PlaybackService.initializeClientCaches(client, backupData);

    // Get the response body cache for this client
    const responseBodyCache =
      this.s3PlaybackService.getResponseBodyCache(client);
    if (!responseBodyCache) {
      this.logger.error("[S3_PLAYBACK] Failed to initialize response body cache");
      return;
    }

    // Classify backup events into domain-specific protocol arrays
    const {
      networkProtocols,
      runtimeProtocols,
      sessionReplayProtocols,
      otherProtocols,
    } = this.s3PlaybackService.classifyBackupEvents(
      backupData,
      responseBodyCache,
    );

    // Sort each group chronologically
    this.s3PlaybackService.sortProtocolsByTimestamp(networkProtocols);
    this.s3PlaybackService.sortProtocolsByTimestamp(runtimeProtocols);
    this.s3PlaybackService.sortProtocolsByTimestamp(sessionReplayProtocols);
    this.s3PlaybackService.sortProtocolsByTimestamp(otherProtocols);

    const totalProtocols =
      networkProtocols.length +
      runtimeProtocols.length +
      sessionReplayProtocols.length +
      otherProtocols.length;

    this.logger.log(
      `[S3_PLAYBACK] Sending ${totalProtocols} protocols (Network:${networkProtocols.length}, Runtime:${runtimeProtocols.length}, SessionReplay:${sessionReplayProtocols.length}, Other:${otherProtocols.length})`,
    );

    // Merge all protocols and send them in chronological order
    const allProtocols = [
      ...networkProtocols,
      ...runtimeProtocols,
      ...sessionReplayProtocols,
      ...otherProtocols,
    ];
    this.s3PlaybackService.sortProtocolsByTimestamp(allProtocols);

    this.s3PlaybackService.logProtocolSummary(allProtocols);

    let sentCount = 0;
    allProtocols.forEach((protocolData) => {
      try {
        this.sendMessage(client, protocolData.protocol);
        sentCount += 1;
      } catch (error) {
        this.logger.error(
          `[S3_PLAYBACK_ERROR] ${protocolData.protocol.method}: ${(error as Error).message}`,
        );
      }
    });

    this.logger.log(
      `[S3_PLAYBACK] Sent ${sentCount}/${totalProtocols} protocols to DevTools`,
    );

    // Collect property snapshots from runtime events (for object expansion)
    const propertySnapshotsMap =
      this.objectReconstructionService.collectPropertySnapshots(runtimeProtocols);

    // Register DevTools request handler for this S3 playback session
    this.registerS3PlaybackMessageHandler(
      client,
      backupData,
      deviceId,
      propertySnapshotsMap,
    );
  }

  // -------------------------------------------------------------------------
  // S3 backup playback -- message handler registration
  // -------------------------------------------------------------------------

  /**
   * Registers the on-message handler for a client in S3 backup playback mode.
   * Handles Page.getResourceTree, DOM.getDocument, ScreenPreview.startPreview,
   * Network.getResponseBody, Runtime.getProperties, and Runtime.callFunctionOn.
   */
  private registerS3PlaybackMessageHandler(
    client: WebSocket,
    backupData: any[],
    deviceId: string,
    propertySnapshotsMap: Map<string, any[]>,
  ): void {
    client.on("message", async (message: string) => {
      let protocol: any;
      try {
        protocol = JSON.parse(message);
      } catch (error) {
        this.logger.error(
          `[S3_PLAYBACK] Failed to parse message: ${(error as Error).message}`,
        );
        return;
      }

      if (protocol.method === "Page.getResourceTree") {
        this.handlePageGetResourceTree(client, protocol, backupData);
      }

      if (protocol.method === "DOM.getDocument") {
        this.handleDomGetDocument(client, protocol, deviceId);
      }

      if (protocol.method === "ScreenPreview.startPreview") {
        const screenData =
          this.s3PlaybackService.findScreenDataInS3Cache(client);
        if (screenData) {
          this.sendMessage(client, screenData);
        } else {
          this.sendMessage(client, {
            id: protocol.id,
            result: {
              message: "No screen capture available in buffered session",
            },
          });
        }
      }

      if (protocol.method === "Network.getResponseBody") {
        this.handleNetworkGetResponseBody(
          client,
          protocol,
          backupData,
          deviceId,
        );
      }

      if (protocol.method === "Runtime.getProperties") {
        this.handleGetPropertiesRequest(client, protocol, propertySnapshotsMap);
      }

      if (protocol.method === "Runtime.callFunctionOn") {
        this.handleCallFunctionOnRequest(
          client,
          protocol,
          propertySnapshotsMap,
          "S3 backup",
        );
      }
    });
  }

  /** Responds to Page.getResourceTree with a realistic page structure. */
  private handlePageGetResourceTree(
    client: WebSocket,
    protocol: any,
    backupData: any[],
  ): void {
    const mainUrl = backupData[0]?.url || "https://buffered-session.local";

    try {
      const parsedUrl = new URL(mainUrl);
      this.sendMessage(client, {
        id: protocol.id,
        result: {
          frameTree: {
            frame: {
              id: "main",
              loaderId: `loader-${Date.now()}`,
              url: mainUrl,
              domainAndRegistry: parsedUrl.hostname,
              securityOrigin: parsedUrl.origin,
              mimeType: "text/html",
              secureContextType: "Secure",
              crossOriginIsolatedContextType: "NotIsolated",
              gatedAPIFeatures: [],
            },
            resources: [
              { url: mainUrl, type: "Document", mimeType: "text/html" },
            ],
          },
        },
      });
    } catch {
      // Fallback when URL parsing fails
      this.sendMessage(client, {
        id: protocol.id,
        result: {
          frameTree: {
            frame: {
              id: "main",
              loaderId: `loader-${Date.now()}`,
              url: "https://buffered-session.local",
              domainAndRegistry: "buffered-session.local",
              securityOrigin: "https://buffered-session.local",
              mimeType: "text/html",
              secureContextType: "Secure",
              crossOriginIsolatedContextType: "NotIsolated",
              gatedAPIFeatures: [],
            },
            resources: [
              {
                url: "https://buffered-session.local",
                type: "Document",
                mimeType: "text/html",
              },
            ],
          },
        },
      });
    }
  }

  /** Responds to DOM.getDocument with cached DOM or a default structure. */
  private handleDomGetDocument(
    client: WebSocket,
    protocol: any,
    deviceId: string,
  ): void {
    const domData = this.s3PlaybackService.findDomDataInS3Cache(client);
    const defaultDom = {
      root: {
        nodeId: 1,
        nodeType: 9, // DOCUMENT_NODE
        nodeName: "#document",
        localName: "",
        nodeValue: "",
        children: [
          {
            nodeId: 2,
            nodeType: 1, // ELEMENT_NODE
            nodeName: "HTML",
            localName: "html",
            nodeValue: "",
            children: [
              {
                nodeId: 3,
                nodeType: 1,
                nodeName: "HEAD",
                localName: "head",
                nodeValue: "",
                children: [
                  {
                    nodeId: 4,
                    nodeType: 1,
                    nodeName: "TITLE",
                    localName: "title",
                    nodeValue: "",
                    children: [
                      {
                        nodeId: 5,
                        nodeType: 3, // TEXT_NODE
                        nodeName: "#text",
                        nodeValue: "Buffered Session",
                      },
                    ],
                  },
                ],
              },
              {
                nodeId: 6,
                nodeType: 1,
                nodeName: "BODY",
                localName: "body",
                nodeValue: "",
                children: [
                  {
                    nodeId: 7,
                    nodeType: 1,
                    nodeName: "DIV",
                    localName: "div",
                    nodeValue: "",
                    attributes: [
                      "id",
                      "app",
                      "class",
                      "remote-debugger-session",
                    ],
                    children: [
                      {
                        nodeId: 8,
                        nodeType: 3,
                        nodeName: "#text",
                        nodeValue: `Buffered session from device: ${deviceId}`,
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    };

    this.sendMessage(client, {
      id: protocol.id,
      result: domData || defaultDom,
    });
  }

  /** Responds to Network.getResponseBody with cached data or a fallback HTML page. */
  private handleNetworkGetResponseBody(
    client: WebSocket,
    protocol: any,
    backupData: any[],
    deviceId: string,
  ): void {
    const responseData = this.s3PlaybackService.findResponseBodyInS3Cache(
      client,
      protocol.params?.requestId,
    );

    const finalResponse = responseData || {
      body: `<!DOCTYPE html>
<html lang="en">
<head><title>Buffered Session</title></head>
<body>
  <div id="app" class="remote-debugger-session">
    <h1>Buffered Session Data</h1>
    <p>Device: ${escapeHtml(deviceId)}</p>
    <p>Sessions: ${backupData.length}</p>
    <p>URL: ${escapeHtml(backupData[0]?.url || "Unknown")}</p>
  </div>
</body>
</html>`,
      base64Encoded: false,
    };

    this.sendMessage(client, {
      id: protocol.id,
      result: finalResponse,
    });
  }

  // -------------------------------------------------------------------------
  // Message handlers
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
      this.sendMessage(devtools, data.message as ProtocolMessage);
    } else {
      this.sendMessage(client, {
        event: "error",
        message: "Devtools not found",
      });
    }

    if (roomData?.recordMode) {
      const protocol =
        typeof data.message === "string"
          ? JSON.parse(data.message)
          : data.message;
      if (this.domService.isEnableDomResponseMessage(protocol.id)) {
        // DOM is enabled -- request DOM data
        this.sendMessage(client, {
          id: MSG_ID.DOM.GET_DOCUMENT,
          method: "DOM.getDocument",
          params: {},
        });
      } else if (this.domService.isGetDomResponseMessage(protocol.id)) {
        // DOM data received -- persist to DB (milliseconds -> nanoseconds)
        const timestamp = Date.now() * 1_000_000;
        void this.domService.upsert({
          recordId: roomData.recordId,
          protocol,
          timestamp,
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
    let protocol: any;
    try {
      protocol = JSON.parse(data.message);
    } catch (error) {
      this.logger.error(
        `[PROTOCOL_TO_ALL] Failed to parse message: ${(error as Error).message}`,
      );
      return;
    }
    const roomData = this.rooms.get(data.room);
    if (roomData) {
      roomData.devtools.forEach((devtools) => devtools.send(data.message));

      if (roomData.recordMode) {
        const timestamp = Date.now() * 1_000_000; // milliseconds -> nanoseconds

        // TODO: Improve domain-based message routing
        if (protocol.params.requestId) {
          await this.networkService.create({
            recordId: roomData.recordId,
            protocol,
            requestId: protocol.params?.requestId || null,
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

        if (protocol.method.startsWith("ScreenPreview.captured")) {
          // Determine event type
          let eventType = "incremental_snapshot";
          if (protocol.params?.isFirstSnapshot) {
            eventType = "full_snapshot";
          }

          await this.screenService.upsert({
            recordId: roomData.recordId,
            protocol,
            timestamp,
            type: "screenPreview",
            eventType: eventType,
          } as any);
        }
      }
    } else {
      this.sendMessage(client, { event: "error", message: "Room not found" });
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

  // -------------------------------------------------------------------------
  // Disconnection handling
  // -------------------------------------------------------------------------

  public async handleDisconnect(client: WebSocket): Promise<void> {
    const room = this.clientMap.get(client);
    if (room) {
      const roomData = this.rooms.get(room);

      // Persist session end event
      if (roomData?.recordId) {
        const endTime = Date.now() * 1_000_000; // milliseconds -> nanoseconds

        await this.screenService.upsert({
          recordId: roomData.recordId,
          protocol: { method: "session_end", params: {} },
          timestamp: endTime,
          type: null,
          eventType: "session_end",
        } as any);

        // Calculate and update session duration
        const startEvent = await this.screenService.findScreens(
          roomData.recordId,
        );
        if (startEvent && startEvent.length > 0) {
          const startTime = startEvent[0].timestamp;
          const duration = endTime - Number(startTime);
          await this.recordService.updateDuration(roomData.recordId, duration);
        }
      }

      this.rooms.get(room)?.devtools?.forEach((devtools) => devtools.close());
      this.rooms.delete(room);
      this.clientMap.delete(client);
      this.bufferStorage.delete(room);
      return;
    }

    const devtoolsInfo = this.devtoolsMap.get(client);
    if (devtoolsInfo) {
      this.rooms
        .get(devtoolsInfo.room)
        ?.devtools.delete(devtoolsInfo.devtoolsId);
      this.devtoolsMap.delete(client);
    }

    // Clean up S3 backup caches
    this.s3PlaybackService.clearClientCaches(client);
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  public getLiveRoomList(): { id: number; name: string }[] {
    return Array.from(this.rooms.entries())
      .filter(([_, roomData]) => !roomData.recordMode)
      .map(([name]) => ({ id: 0, name }));
  }

  // -------------------------------------------------------------------------
  // DevTools message relay
  // -------------------------------------------------------------------------

  private handleDevtoolsMessage(room: string, message: unknown): void {
    const roomData = this.rooms.get(room);
    // Forward devtools messages directly (no protocol wrapper)
    const raw = typeof message === "string" ? message : JSON.stringify(message);
    roomData?.client.send(raw);
  }
}
