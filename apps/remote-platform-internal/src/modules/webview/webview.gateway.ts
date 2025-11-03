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

/** Represents a CDP-style protocol message forwarded over WebSocket. */
type ProtocolMessage = {
  id?: number;
  method?: string;
  params?: Record<string, any>;
  result?: Record<string, any>;
  error?: { code?: number; message: string };
  event?: string;
  [key: string]: any;
};

/** A single item produced when converting S3 backup data into a sendable protocol entry. */
type ProtocolEntry = {
  protocol: { method: string; params: Record<string, any> };
  timestamp: number;
  domain: string;
  requestId?: number;
};

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
  /** Tracks flush call counts per device. */
  private readonly flushCallCount: Map<string, number> = new Map();
  /** Caches response bodies per client for S3 backup playback. */
  private readonly s3ResponseBodyCache: Map<
    WebSocket,
    Map<number, { body: string; base64Encoded: boolean }>
  > = new Map();
  /** Caches full S3 backup data per client for on-demand queries. */
  private readonly s3BackupCache: Map<WebSocket, any[]> = new Map();

  @WebSocketServer() public server: Server;

  constructor(
    private readonly recordService: RecordService,
    private readonly networkService: NetworkService,
    private readonly domService: DomService,
    private readonly runtimeService: RuntimeService,
    private readonly screenService: ScreenService,
    private readonly s3Service: S3Service,
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
  // Helpers -- object reconstruction (Copy Object in playback)
  // -------------------------------------------------------------------------

  /**
   * Reconstructs an object from property snapshots and returns it as a JSON string.
   * Used by the Copy Object feature during recording session playback.
   */
  private reconstructObjectAsJson(
    objectId: string,
    propertySnapshotsMap: Map<string, any[]>,
    args: any[],
  ): string {
    // Extract indentation option from arguments
    let indent: string | number = 2;
    if (args?.[0]?.value?.indent !== undefined) {
      indent = args[0].value.indent;
    }

    // Return empty object when no snapshot data is available
    const properties = propertySnapshotsMap.get(objectId);
    if (!properties || properties.length === 0) {
      this.logger.debug(
        `No snapshot found for objectId: ${objectId}, returning empty object`,
      );
      return "{}";
    }

    try {
      // Rebuild original object from PropertyDescriptor[] snapshots
      const reconstructed = this.reconstructObjectFromProperties(
        properties,
        propertySnapshotsMap,
        new Set(),
      );
      return JSON.stringify(reconstructed, null, indent);
    } catch (error) {
      this.logger.error(
        `Failed to reconstruct object: ${(error as Error).message}`,
      );
      // Fallback to a simple string representation on circular reference etc.
      return this.propertiesToSimpleString(properties);
    }
  }

  /**
   * Recursively rebuilds a JavaScript object from an array of PropertyDescriptors.
   */
  private reconstructObjectFromProperties(
    properties: any[],
    propertySnapshotsMap: Map<string, any[]>,
    visited: Set<string>,
  ): Record<string, any> {
    const result: Record<string, any> = {};

    for (const prop of properties) {
      if (prop.name === "__proto__") continue;

      const value = prop.value;
      if (!value) continue;

      result[prop.name] = this.resolvePropertyValue(
        value,
        propertySnapshotsMap,
        visited,
      );
    }

    return result;
  }

  /**
   * Rebuilds an array object from property descriptors (numeric indices only).
   */
  private reconstructArrayFromProperties(
    properties: any[],
    propertySnapshotsMap: Map<string, any[]>,
    visited: Set<string>,
  ): any[] {
    const result: any[] = [];

    for (const prop of properties) {
      const index = parseInt(prop.name, 10);
      if (isNaN(index) || prop.name === "length" || prop.name === "__proto__")
        continue;

      const value = prop.value;
      if (!value) {
        result[index] = undefined;
        continue;
      }

      result[index] = this.resolvePropertyValue(
        value,
        propertySnapshotsMap,
        visited,
      );
    }

    return result;
  }

  /**
   * Resolves a single RemoteObject value into its JavaScript equivalent.
   * Handles primitives, null, objects, arrays, functions, and symbols.
   */
  private resolvePropertyValue(
    value: any,
    propertySnapshotsMap: Map<string, any[]>,
    visited: Set<string>,
  ): any {
    if (value.type === "undefined") return undefined;

    if (
      value.type === "string" ||
      value.type === "number" ||
      value.type === "boolean"
    ) {
      return value.value;
    }

    if (value.subtype === "null") return null;

    if (value.type === "object") {
      return this.resolveObjectValue(value, propertySnapshotsMap, visited);
    }

    if (value.type === "function") return "[Function]";
    if (value.type === "symbol") return value.description || "[Symbol]";

    // Fallback for other types
    return value.value ?? value.description ?? null;
  }

  /**
   * Resolves a RemoteObject of type "object" -- either recursing into child
   * properties or falling back to the preview / description.
   */
  private resolveObjectValue(
    value: any,
    propertySnapshotsMap: Map<string, any[]>,
    visited: Set<string>,
  ): any {
    if (value.objectId && !visited.has(value.objectId)) {
      visited.add(value.objectId);
      const subProperties = propertySnapshotsMap.get(value.objectId);

      if (subProperties && subProperties.length > 0) {
        if (value.subtype === "array" || value.className === "Array") {
          return this.reconstructArrayFromProperties(
            subProperties,
            propertySnapshotsMap,
            visited,
          );
        }
        return this.reconstructObjectFromProperties(
          subProperties,
          propertySnapshotsMap,
          visited,
        );
      }

      // No child snapshot available -- extract from preview
      return this.extractValueFromPreview(value);
    }

    // Already visited or no objectId -- extract from preview
    return this.extractValueFromPreview(value);
  }

  /**
   * Extracts a value from a RemoteObject's preview (or description fallback).
   */
  private extractValueFromPreview(remoteObject: any): any {
    // Primitive value present -- return it directly
    if (remoteObject.value !== undefined) {
      return remoteObject.value;
    }

    // Build from preview properties when available
    if (remoteObject.preview?.properties) {
      const result: any = remoteObject.subtype === "array" ? [] : {};

      for (const prop of remoteObject.preview.properties) {
        if (prop.name === "__proto__") continue;

        let resolved: any;
        if (prop.type === "undefined") {
          resolved = undefined;
        } else if (
          prop.type === "string" ||
          prop.type === "number" ||
          prop.type === "boolean"
        ) {
          resolved = prop.value;
        } else if (prop.subtype === "null") {
          resolved = null;
        } else if (prop.type === "object") {
          // Nested objects use the description
          resolved = prop.value || prop.description || {};
        } else {
          resolved = prop.value ?? prop.description ?? null;
        }

        if (remoteObject.subtype === "array") {
          const index = parseInt(prop.name, 10);
          if (!isNaN(index)) {
            result[index] = resolved;
          }
        } else {
          result[prop.name] = resolved;
        }
      }

      return result;
    }

    // Parse description or return it as-is
    if (remoteObject.description) {
      if (remoteObject.description === "Object") return {};
      if (remoteObject.description.startsWith("Array(")) return [];
      return remoteObject.description;
    }

    return null;
  }

  /**
   * Converts a property array to a simple string representation (fallback).
   */
  private propertiesToSimpleString(properties: any[]): string {
    const result: Record<string, any> = {};

    for (const prop of properties) {
      if (prop.name === "__proto__") continue;

      const value = prop.value;
      if (!value) {
        result[prop.name] = null;
        continue;
      }

      if (value.type === "undefined") {
        result[prop.name] = undefined;
      } else if (
        value.type === "string" ||
        value.type === "number" ||
        value.type === "boolean"
      ) {
        result[prop.name] = value.value;
      } else if (value.subtype === "null") {
        result[prop.name] = null;
      } else if (value.type === "object") {
        result[prop.name] = value.description || "[Object]";
      } else if (value.type === "function") {
        result[prop.name] = "[Function]";
      } else {
        result[prop.name] = value.value ?? value.description ?? null;
      }
    }

    try {
      return JSON.stringify(result, null, 2);
    } catch {
      return "{}";
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
  // Helpers -- property snapshot collection
  // -------------------------------------------------------------------------

  /**
   * Collects property snapshots from Runtime.consoleAPICalled events and
   * indexes them by objectId for later use during object expansion.
   * Supports both the new format (objectId-keyed object) and the legacy format (array).
   */
  private collectPropertySnapshots(
    runtimeProtocols: Array<{ protocol: any }>,
  ): Map<string, any[]> {
    const propertySnapshotsMap = new Map<string, any[]>();

    for (const protocolData of runtimeProtocols) {
      const proto = protocolData.protocol;
      if (
        proto.method !== "Runtime.consoleAPICalled" ||
        !proto.params?._propertySnapshots
      ) {
        continue;
      }

      const snapshots = proto.params._propertySnapshots;

      // New format: objectId-keyed object
      if (typeof snapshots === "object" && !Array.isArray(snapshots)) {
        for (const [objectId, properties] of Object.entries(snapshots)) {
          if (Array.isArray(properties)) {
            propertySnapshotsMap.set(objectId, properties);
          }
        }
      }
      // Legacy format: array of { objectId, properties }
      else if (Array.isArray(snapshots)) {
        for (const snapshot of snapshots) {
          if (snapshot.objectId && Array.isArray(snapshot.properties)) {
            propertySnapshotsMap.set(snapshot.objectId, snapshot.properties);
          }
        }
      }
    }

    this.logger.log(
      `Collected ${propertySnapshotsMap.size} property snapshots for object expansion`,
    );
    return propertySnapshotsMap;
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
      const jsonResult = this.reconstructObjectAsJson(
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
      date,
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
        room || "unknown",
        recordId || 0,
        deviceId || "unknown",
        date || "",
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
          this.logger.error(`[RECORD_MODE_RECONNECT] Failed to parse message: ${(error as Error).message}`);
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
          this.logger.error(`[DEVTOOLS_MESSAGE] Failed to parse message: ${(error as Error).message}`);
          return;
        }
        this.handleDevtoolsMessage(devtoolsId, room, parsed);
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

    const propertySnapshotsMap = this.collectPropertySnapshots(runtimeEntries);

    // Handle subsequent DevTools requests
    client.on("message", (message: string) => {
      let protocol: any;
      try {
        protocol = JSON.parse(message);
      } catch (error) {
        this.logger.error(`[RECORD_PLAYBACK] Failed to parse message: ${(error as Error).message}`);
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
          this.logger.error(`[BACKUP_PLAYBACK] Failed to parse message: ${(error as Error).message}`);
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
    room: string,
    recordId: number,
    deviceId: string,
    date: string,
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

      await this.processS3BackupData(
        client,
        room,
        recordId,
        deviceId,
        date,
        backupData,
      );
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
  // S3 backup playback -- by room / device lookup
  // -------------------------------------------------------------------------

  private async handleS3BackupPlayback(
    client: WebSocket,
    room: string,
    recordId: number,
    deviceId: string,
    date: string,
  ): Promise<void> {
    try {
      this.logger.log(
        `[S3_PLAYBACK] Loading data: room=${room}, recordId=${recordId}, deviceId=${deviceId}, date=${date}`,
      );

      // Retrieve backup data filtered by room creation time
      const backupData = await this.s3Service.getS3BackupForPlayback(
        room,
        recordId,
        deviceId,
        date,
        undefined,
        this.recordService,
      );

      if (!backupData || backupData.length === 0) {
        this.sendMessage(client, {
          event: "error",
          message: `No backup data found for device ${deviceId} on ${date}.`,
        });
        client.close();
        return;
      }

      this.logger.log(
        `[S3_PLAYBACK] Found ${backupData.length} backup sessions`,
      );

      await this.processS3BackupData(
        client,
        room,
        recordId,
        deviceId,
        date,
        backupData,
      );
    } catch (error) {
      this.logger.error(`[S3_PLAYBACK_ERROR] ${(error as Error).message}`);
      this.sendMessage(client, {
        event: "error",
        message: "An error occurred during S3 backup data playback.",
      });
      client.close();
    }
  }

  // -------------------------------------------------------------------------
  // S3 backup playback -- shared processing logic
  // -------------------------------------------------------------------------

  private async processS3BackupData(
    client: WebSocket,
    room: string,
    recordId: number,
    deviceId: string,
    date: string,
    backupData: any[],
  ): Promise<void> {
    // Extract session start time from the oldest backup
    const sessionStartTime = this.extractSessionStartTime(backupData);

    // Generate an S3 session ID (s3-deviceId-timestamp-index format)
    const encodedDeviceId = encodeURIComponent(deviceId || "unknown-device");
    const s3SessionId = sessionStartTime
      ? `s3-${encodedDeviceId}-${sessionStartTime}-0`
      : null;
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
      const latestScreenData = this.findScreenDataInS3Cache(client);
      if (latestScreenData) {
        this.sendMessage(client, latestScreenData);
        this.logger.log(
          "[S3_AUTO_SCREEN] Automatically sent latest screen data",
        );
      }
    }, 100);

    // Cache backup data per client for subsequent WebSocket request handling
    this.s3BackupCache.set(client, backupData);

    // Initialise response body cache (same lookup logic as DB playback)
    const responseBodyCache = new Map<
      number,
      { body: string; base64Encoded: boolean }
    >();
    this.s3ResponseBodyCache.set(client, responseBodyCache);

    // Classify backup events into domain-specific protocol arrays
    const {
      networkProtocols,
      runtimeProtocols,
      sessionReplayProtocols,
      otherProtocols,
    } = this.classifyBackupEvents(backupData, responseBodyCache);

    // Sort each group chronologically
    networkProtocols.sort((a, b) => a.timestamp - b.timestamp);
    runtimeProtocols.sort((a, b) => a.timestamp - b.timestamp);
    sessionReplayProtocols.sort((a, b) => a.timestamp - b.timestamp);
    otherProtocols.sort((a, b) => a.timestamp - b.timestamp);

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
    ].sort((a, b) => a.timestamp - b.timestamp);

    this.logProtocolSummary(allProtocols);

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
      this.collectPropertySnapshots(runtimeProtocols);

    // Register DevTools request handler for this S3 playback session
    this.registerS3PlaybackMessageHandler(
      client,
      backupData,
      deviceId,
      propertySnapshotsMap,
    );
  }

  // -------------------------------------------------------------------------
  // S3 backup helpers
  // -------------------------------------------------------------------------

  /** Extracts the session start time from backup data. */
  private extractSessionStartTime(backupData: any[]): number | null {
    if (backupData.length === 0) return null;

    const backupWithTime = backupData.find((backup) => backup.sessionStartTime);
    if (backupWithTime) return backupWithTime.sessionStartTime;
    if (backupData[0].timestamp) return backupData[0].timestamp;
    return null;
  }

  /** Classifies backup buffer events into domain-specific arrays. */
  private classifyBackupEvents(
    backupData: any[],
    responseBodyCache: Map<number, { body: string; base64Encoded: boolean }>,
  ): {
    networkProtocols: ProtocolEntry[];
    runtimeProtocols: ProtocolEntry[];
    sessionReplayProtocols: ProtocolEntry[];
    otherProtocols: ProtocolEntry[];
  } {
    const networkProtocols: ProtocolEntry[] = [];
    const runtimeProtocols: ProtocolEntry[] = [];
    const sessionReplayProtocols: ProtocolEntry[] = [];
    const otherProtocols: ProtocolEntry[] = [];

    this.logger.log(
      `[S3_PLAYBACK] Loading ${backupData.length} sessions from S3`,
    );

    let totalEvents = 0;

    for (const backup of backupData) {
      if (!backup.bufferData || !Array.isArray(backup.bufferData)) {
        this.logger.warn(
          `[S3_PLAYBACK] Invalid bufferData in session ${backup.room}`,
        );
        continue;
      }

      totalEvents += backup.bufferData.length;

      for (const event of backup.bufferData) {
        if (!event || typeof event !== "object" || !event.method) continue;

        // Skip metadata events (not real CDP events)
        if (event.method === "buffering.saveSession") continue;

        // Cache updateResponseBody events (same lookup logic as DB playback)
        if (event.method === "updateResponseBody" && event.params?.requestId) {
          responseBodyCache.set(event.params.requestId, {
            body: event.params.body || "",
            base64Encoded: event.params.base64Encoded || false,
          });
        }

        // Classify Session Replay events separately
        if (event.method.startsWith("SessionReplay.")) {
          sessionReplayProtocols.push({
            protocol: { method: event.method, params: event.params },
            timestamp: event.timestamp,
            domain: "SessionReplay",
          });
          continue;
        }

        // Standard CDP event classification
        const protocolData: ProtocolEntry = {
          protocol: { method: event.method, params: event.params },
          timestamp: event.timestamp,
          domain: event.method.split(".")[0],
          requestId: event.params?.requestId,
        };

        if (event.method.startsWith("Network.")) {
          networkProtocols.push(protocolData);
        } else if (event.method.startsWith("Runtime.")) {
          runtimeProtocols.push(protocolData);
        } else {
          otherProtocols.push(protocolData);
        }
      }
    }

    this.logger.log(`[S3_PLAYBACK] Total events available: ${totalEvents}`);

    return {
      networkProtocols,
      runtimeProtocols,
      sessionReplayProtocols,
      otherProtocols,
    };
  }

  /** Logs the first few protocols in chronological send order. */
  private logProtocolSummary(allProtocols: ProtocolEntry[]): void {
    this.logger.log(
      `[S3_PROTOCOL_ORDER] Sending ${allProtocols.length} protocols in chronological order`,
    );
    allProtocols.slice(0, 10).forEach((protocolData, index) => {
      const protocolDate = new Date(protocolData.timestamp);
      this.logger.log(
        `  ${index + 1}. ${protocolData.protocol.method} -> ${protocolDate.toISOString()} (${protocolData.timestamp})`,
      );
    });
    if (allProtocols.length > 10) {
      this.logger.log(`  ... and ${allProtocols.length - 10} more protocols`);
    }
  }

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
        this.logger.error(`[S3_PLAYBACK] Failed to parse message: ${(error as Error).message}`);
        return;
      }

      if (protocol.method === "Page.getResourceTree") {
        this.handlePageGetResourceTree(client, protocol, backupData);
      }

      if (protocol.method === "DOM.getDocument") {
        this.handleDomGetDocument(client, protocol, deviceId);
      }

      if (protocol.method === "ScreenPreview.startPreview") {
        const screenData = this.findScreenDataInS3Cache(client);
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
    const domData = this.findDomDataInS3Cache(client);
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
    const responseData = this.findResponseBodyInS3Cache(
      client,
      protocol.params?.requestId,
    );

    const finalResponse = responseData || {
      body: `<!DOCTYPE html>
<html>
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
  // S3 cache lookup helpers
  // -------------------------------------------------------------------------

  /**
   * Finds a cached response body for the given requestId.
   * Uses the per-client response body cache populated during backup event classification.
   */
  private findResponseBodyInS3Cache(
    client: WebSocket,
    requestId: number,
  ): { body: string; base64Encoded: boolean } | null {
    const responseBodyCache = this.s3ResponseBodyCache.get(client);
    if (!responseBodyCache) return null;

    const responseData = responseBodyCache.get(requestId);
    if (responseData) {
      this.logger.log(
        `[RESPONSE_BODY_FOUND] Found responseBody for requestId ${requestId}`,
      );
      return responseData;
    }

    return null;
  }

  /** Finds the latest DOM data from the S3 backup cache. */
  private findDomDataInS3Cache(client: WebSocket): any | null {
    const cachedBackupData = this.s3BackupCache.get(client);
    if (!cachedBackupData) return null;

    let latestDomData: any = null;
    let latestTimestamp = 0;

    for (const backup of cachedBackupData) {
      if (!backup.bufferData || !Array.isArray(backup.bufferData)) continue;

      for (const event of backup.bufferData) {
        if (!event || typeof event !== "object" || !event.method) continue;

        if (event.method === "DOM.updated" && event.params && event.timestamp) {
          if (event.timestamp > latestTimestamp) {
            latestTimestamp = event.timestamp;
            latestDomData = event.params.root || event.params;
          }
        }

        if (
          event.method === "DOM.getDocument" &&
          event.params?.result?.root &&
          event.timestamp
        ) {
          if (event.timestamp > latestTimestamp) {
            latestTimestamp = event.timestamp;
            latestDomData = event.params.result.root;
          }
        }
      }
    }

    if (latestDomData) {
      this.logger.log(
        `[S3_LATEST_DOM] Found latest DOM with timestamp: ${latestTimestamp}`,
      );
    }

    return latestDomData;
  }

  /** Finds the latest screen capture data from the S3 backup cache. */
  private findScreenDataInS3Cache(client: WebSocket): any | null {
    const cachedBackupData = this.s3BackupCache.get(client);
    if (!cachedBackupData) return null;

    let latestScreenData: any = null;
    let latestTimestamp = 0;

    for (const backup of cachedBackupData) {
      if (!backup.bufferData || !Array.isArray(backup.bufferData)) continue;

      for (const event of backup.bufferData) {
        if (
          event.method === "ScreenPreview.captured" &&
          event.params &&
          event.timestamp
        ) {
          if (event.timestamp > latestTimestamp) {
            latestTimestamp = event.timestamp;
            latestScreenData = {
              method: "ScreenPreview.captured",
              params: event.params,
            };
          }
        }
      }
    }

    if (latestScreenData) {
      this.logger.log(
        `[S3_LATEST_SCREEN] Found latest screen with timestamp: ${latestTimestamp}`,
      );
    }

    return latestScreenData;
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
      this.logger.error(`[PROTOCOL_TO_ALL] Failed to parse message: ${(error as Error).message}`);
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
    this.s3BackupCache.delete(client);
    this.s3ResponseBodyCache.delete(client);
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

  private handleDevtoolsMessage(
    devtoolsId: string,
    room: string,
    message: string,
  ): void {
    const roomData = this.rooms.get(room);
    // Forward devtools messages directly (no protocol wrapper)
    roomData?.client.send(message);
  }
}
