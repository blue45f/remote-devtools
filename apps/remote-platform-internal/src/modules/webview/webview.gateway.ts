/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { v4 as uuidv4 } from "uuid";
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

@WebSocketGateway()
export class WebviewGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private rooms: Map<string, RoomData> = new Map();
  private clientMap: Map<WebSocket, string> = new Map();
  private devtoolsMap: Map<WebSocket, DevtoolsData> = new Map();

  @WebSocketServer() public server: Server;

  constructor(
    private readonly recordService: RecordService,
    private readonly networkService: NetworkService,
    private readonly domService: DomService,
    private readonly runtimeService: RuntimeService,
    private readonly screenService: ScreenService,
    private readonly s3Service: S3Service,
  ) {}

  private sendMessage(socket: WebSocket, data: any): void {
    try {
      if (socket.readyState !== WebSocket.OPEN) {
        console.warn(
          `[SOCKET_NOT_READY] WebSocket closed, skipping: ${data.method || data.event}`,
        );
        return;
      }

      const message = JSON.stringify(data);
      socket.send(message);

      // 초기화 및 오류 관련 메시지만 로깅 (상세 로그는 제거)
      if (
        data.event ||
        data.method?.includes("enable") ||
        data.method?.includes("Error")
      ) {
        console.log(`[SOCKET] ${data.method || data.event}`);
      }
    } catch (error) {
      console.error(
        `[SOCKET_ERROR] ${data.method || data.event}:`,
        error.message,
      );
    }
  }

  /**
   * 스냅샷 데이터로부터 객체를 재구성하여 JSON 문자열로 반환
   * Copy Object 기능에서 사용 (녹화 세션 재생 시)
   */
  private reconstructObjectAsJson(
    objectId: string,
    propertySnapshotsMap: Map<string, any[]>,
    args: any[],
  ): string {
    // 인자에서 indent 옵션 추출
    let indent: string | number = 2;
    if (args?.[0]?.value?.indent !== undefined) {
      indent = args[0].value.indent;
    }

    // 스냅샷 데이터가 없으면 빈 객체 반환
    const properties = propertySnapshotsMap.get(objectId);
    if (!properties || properties.length === 0) {
      console.log(
        `[DEBUG] No snapshot found for objectId: ${objectId}, returning empty object`,
      );
      return "{}";
    }

    try {
      // PropertyDescriptor[] 형태의 스냅샷으로부터 원본 객체 재구성
      const reconstructed = this.reconstructObjectFromProperties(
        properties,
        propertySnapshotsMap,
        new Set(),
      );
      return JSON.stringify(reconstructed, null, indent);
    } catch (error) {
      console.error(`[DEBUG] Failed to reconstruct object: ${error.message}`);
      // JSON.stringify 실패 시 (순환 참조 등) 스냅샷의 문자열 표현 반환
      return this.propertiesToSimpleString(properties);
    }
  }

  /**
   * PropertyDescriptor 배열로부터 JavaScript 객체 재구성
   */
  private reconstructObjectFromProperties(
    properties: any[],
    propertySnapshotsMap: Map<string, any[]>,
    visited: Set<string>,
  ): any {
    const result: any = {};

    for (const prop of properties) {
      // __proto__는 건너뛰기
      if (prop.name === "__proto__") continue;

      const value = prop.value;
      if (!value) continue;

      // 타입에 따라 값 처리
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
        // 객체인 경우 하위 프로퍼티로 재귀
        if (value.objectId && !visited.has(value.objectId)) {
          visited.add(value.objectId);
          const subProperties = propertySnapshotsMap.get(value.objectId);

          if (subProperties && subProperties.length > 0) {
            // 배열 처리
            if (value.subtype === "array" || value.className === "Array") {
              result[prop.name] = this.reconstructArrayFromProperties(
                subProperties,
                propertySnapshotsMap,
                visited,
              );
            } else {
              result[prop.name] = this.reconstructObjectFromProperties(
                subProperties,
                propertySnapshotsMap,
                visited,
              );
            }
          } else {
            // 하위 스냅샷이 없으면 preview에서 값 추출 시도
            result[prop.name] = this.extractValueFromPreview(value);
          }
        } else {
          // 방문한 객체이거나 objectId가 없으면 preview에서 추출
          result[prop.name] = this.extractValueFromPreview(value);
        }
      } else if (value.type === "function") {
        result[prop.name] = "[Function]";
      } else if (value.type === "symbol") {
        result[prop.name] = value.description || "[Symbol]";
      } else {
        // 그 외 타입
        result[prop.name] = value.value ?? value.description ?? null;
      }
    }

    return result;
  }

  /**
   * 배열 객체 재구성
   */
  private reconstructArrayFromProperties(
    properties: any[],
    propertySnapshotsMap: Map<string, any[]>,
    visited: Set<string>,
  ): any[] {
    const result: any[] = [];

    for (const prop of properties) {
      // 숫자 인덱스만 처리
      const index = parseInt(prop.name, 10);
      if (isNaN(index) || prop.name === "length" || prop.name === "__proto__")
        continue;

      const value = prop.value;
      if (!value) {
        result[index] = undefined;
        continue;
      }

      // 타입에 따라 값 처리 (객체 재구성과 동일한 로직)
      if (value.type === "undefined") {
        result[index] = undefined;
      } else if (
        value.type === "string" ||
        value.type === "number" ||
        value.type === "boolean"
      ) {
        result[index] = value.value;
      } else if (value.subtype === "null") {
        result[index] = null;
      } else if (value.type === "object") {
        if (value.objectId && !visited.has(value.objectId)) {
          visited.add(value.objectId);
          const subProperties = propertySnapshotsMap.get(value.objectId);

          if (subProperties && subProperties.length > 0) {
            if (value.subtype === "array" || value.className === "Array") {
              result[index] = this.reconstructArrayFromProperties(
                subProperties,
                propertySnapshotsMap,
                visited,
              );
            } else {
              result[index] = this.reconstructObjectFromProperties(
                subProperties,
                propertySnapshotsMap,
                visited,
              );
            }
          } else {
            result[index] = this.extractValueFromPreview(value);
          }
        } else {
          result[index] = this.extractValueFromPreview(value);
        }
      } else if (value.type === "function") {
        result[index] = "[Function]";
      } else {
        result[index] = value.value ?? value.description ?? null;
      }
    }

    return result;
  }

  /**
   * RemoteObject의 preview에서 값 추출
   */
  private extractValueFromPreview(remoteObject: any): any {
    // primitive 값이 있으면 바로 반환
    if (remoteObject.value !== undefined) {
      return remoteObject.value;
    }

    // preview가 있으면 preview에서 추출
    if (remoteObject.preview?.properties) {
      const result: any = remoteObject.subtype === "array" ? [] : {};

      for (const prop of remoteObject.preview.properties) {
        if (prop.name === "__proto__") continue;

        let value: any;
        if (prop.type === "undefined") {
          value = undefined;
        } else if (
          prop.type === "string" ||
          prop.type === "number" ||
          prop.type === "boolean"
        ) {
          value = prop.value;
        } else if (prop.subtype === "null") {
          value = null;
        } else if (prop.type === "object") {
          // 중첩 객체는 description 사용
          value = prop.value || prop.description || {};
        } else {
          value = prop.value ?? prop.description ?? null;
        }

        if (remoteObject.subtype === "array") {
          const index = parseInt(prop.name, 10);
          if (!isNaN(index)) {
            result[index] = value;
          }
        } else {
          result[prop.name] = value;
        }
      }

      return result;
    }

    // description을 파싱하거나 그대로 반환
    if (remoteObject.description) {
      // "Object" 또는 "Array(n)" 같은 경우 빈 객체/배열 반환
      if (remoteObject.description === "Object") return {};
      if (remoteObject.description.startsWith("Array(")) return [];
      return remoteObject.description;
    }

    return null;
  }

  /**
   * 프로퍼티 배열을 간단한 문자열로 변환 (fallback)
   */
  private propertiesToSimpleString(properties: any[]): string {
    const result: any = {};

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

  private async createRoom(
    roomName: string,
    client: WebSocket,
    recordMode: boolean,
  ): Promise<void> {
    let recordId: number | null = null;
    if (recordMode) {
      const { id } = await this.recordService.create({ name: roomName });
      recordId = id;
      // 직접 protocol 형태로 전송 (event wrapper 제거)
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

      // runtime
      this.sendMessage(client, {
        id: MSG_ID.Runtime.enable,
        method: "Runtime.enable",
        params: {},
      });

      // page
      this.sendMessage(client, {
        id: MSG_ID.Page.enable,
        method: "Page.enable",
        params: {},
      });
      this.sendMessage(client, {
        id: MSG_ID.Page.getResourceTree,
        method: "Page.getResourceTree",
        params: {},
      });
    }
    this.rooms.set(roomName, {
      client,
      devtools: new Map(),
      recordMode,
      recordId,
    });
    this.clientMap.set(client, roomName);

    // 녹화 세션 생성 시간 조회 (DB에서)
    let roomTimestamp = Date.now(); // 기본값
    if (recordId) {
      try {
        const record = await this.recordService.findOne(recordId);
        if (record && record.createdAt) {
          roomTimestamp = record.createdAt.getTime();
          console.log(
            `[ROOM_CREATED] 📅 Record ${recordId} created at: ${record.createdAt.toISOString()} (timestamp: ${roomTimestamp})`,
          );
        }
      } catch (error) {
        console.error(
          `[ROOM_CREATED_ERROR] Failed to get record timestamp: ${error}`,
        );
      }
    }

    this.sendMessage(client, {
      event: "roomCreated",
      roomName,
      recordId,
      timestamp: roomTimestamp, // 녹화 세션 생성 시간 추가
      createdAt: new Date(roomTimestamp).toISOString(), // 디버그용 ISO 문자열
    });

    // dom 초기화 - 직접 protocol 형태로 전송
    this.sendMessage(client, {
      id: MSG_ID.DOM.ENABLE,
      method: "DOM.enable",
      params: {},
    });
    this.sendMessage(client, {
      id: MSG_ID.Screen.startPreview,
      method: "ScreenPreview.startPreview",
      params: {},
    });

    // 세션 시작 이벤트 저장
    const timestamp = Date.now() * 1000000; // 밀리초를 나노초로 변환
    await this.screenService.upsert({
      recordId,
      protocol: {
        method: "session_start",
        params: { url: client.url, userAgent: client.protocol },
      },
      timestamp,
      type: null,
      event_type: "session_start",
    } as any);
  }

  @SubscribeMessage("createRoom")
  public async handleCreateRoom(
    @MessageBody() data: { recordMode?: boolean },
    @ConnectedSocket() client: WebSocket,
  ): Promise<void> {
    const { recordMode = false } = data;
    const room = `${recordMode ? "Record-" : "Live-"}${uuidv4()}`;
    await this.createRoom(room, client, recordMode);
  }

  // 버퍼 이벤트 저장 (실시간 스트리밍)
  private bufferStorage: Map<string, any[]> = new Map(); // deviceId별 버퍼 데이터 저장
  private flushCallCount: Map<string, number> = new Map(); // deviceId별 flush 호출 횟수 추적
  private s3ResponseBodyCache: Map<
    WebSocket,
    Map<number, { body: string; base64Encoded: boolean }>
  > = new Map(); // S3 백업용 responseBody 캐시

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

      // 녹화 세션 만들기 또는 티켓 생성 관련 room은 버퍼링하지 않음 (session.json 생성 방지)
      if (room.startsWith("Record-") || room.startsWith("Live-")) {
        console.log(
          `[BUFFER_SKIP] Skipping buffer event for ${room} - record/live room detected`,
        );
        return;
      }

      // deviceId별로 버퍼 데이터 누적
      if (!this.bufferStorage.has(deviceId)) {
        this.bufferStorage.set(deviceId, []);
      }

      const deviceBuffer = this.bufferStorage.get(deviceId);
      if (deviceBuffer) {
        deviceBuffer.push(event);
        console.log(
          `[BUFFER_EVENT] Stored event for device ${deviceId}: ${event.method}, total: ${deviceBuffer.length}`,
        );
      } else {
        console.error(
          `[BUFFER_EVENT_DEBUG] Failed to get device buffer for: ${deviceId}`,
        );
      }
    } catch (error) {
      console.error(`[BUFFER_EVENT] Error storing buffer event:`, error);
      console.error(`[BUFFER_EVENT_DEBUG] Full error:`, error);
    }
  }

  public async handleConnection(client: WebSocket, req: any): Promise<void> {
    console.log("[WS_CONNECTION] New connection attempt", {
      url: req?.url,
      headers: req?.headers,
    });

    const devtoolsId = uuidv4();
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

    console.log("[WS_CONNECTION] Parsed params:", {
      room,
      recordMode,
      recordId,
      playbackDevice,
      s3Backup,
      deviceId,
      date,
      filePaths,
    });

    // S3 백업 재생 모드 (s3Backup=true이고 filePaths가 있는 경우)
    if (s3Backup === "true" && filePaths) {
      console.log("[WS_CONNECTION] S3 backup playback mode detected");
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

    // 기존 백업 재생 모드 (playbackDevice가 있는 경우) - 호환성 유지
    if (playbackDevice && room && recordId) {
      console.log(
        `[WS_CONNECTION] Legacy backup playback mode for device: ${playbackDevice}`,
      );
      await this.handleBackupPlayback(client, room, recordId, playbackDevice);
      return;
    }

    // recordMode가 'true' 또는 true이고 recordId가 있는 경우
    if (recordMode === "true" && recordId) {
      // 네트워크 도메인 초기화 (재연결 시에도 필요) - 직접 protocol 형태로 전송
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

      // runtime 초기화
      this.sendMessage(client, {
        id: MSG_ID.Runtime.enable,
        method: "Runtime.enable",
        params: {},
      });

      // page 초기화
      this.sendMessage(client, {
        id: MSG_ID.Page.enable,
        method: "Page.enable",
        params: {},
      });
      this.sendMessage(client, {
        id: MSG_ID.Page.getResourceTree,
        method: "Page.getResourceTree",
        params: {},
      });

      // dom 초기화
      this.sendMessage(client, {
        id: MSG_ID.DOM.ENABLE,
        method: "DOM.enable",
        params: {},
      });
      this.sendMessage(client, {
        id: MSG_ID.Screen.startPreview,
        method: "ScreenPreview.startPreview",
        params: {},
      });

      // 자동으로 최신 화면 전송 (DB에서)
      setTimeout(async () => {
        const screen = await this.screenService.findLatestScreen(recordId);
        if (screen) {
          this.sendMessage(client, screen.protocol);
          console.log("[DB_AUTO_SCREEN] Automatically sent latest screen data");
        }
      }, 100); // 100ms 후 자동 전송

      client.on("message", async (message: string) => {
        const protocol = JSON.parse(message);
        if (protocol.method === "Page.getResourceTree") {
          this.sendMessage(client, { id: protocol.id });
        }
        if (protocol.method === "ScreenPreview.startPreview") {
          void this.screenService.findLatestScreen(recordId).then((screen) => {
            if (screen) {
              this.sendMessage(client, screen.protocol);
            }
          });
        }
        // NOTE: devtools가 dom데이터를 받을 준비가 되었을 때 DB데이터를 전송
        if (this.domService.isGetDomRequestMessage(protocol)) {
          const dom = await this.domService.findEntireDom(recordId);
          this.sendMessage(client, {
            result: dom.protocol,
            id: protocol["id"],
          });
        }
      });
      client.on("close", () => this.handleDisconnect(client));
      await this.handleRecordMode(client, recordId);
      return;
    }
    if (!room) {
      console.log(`[DEBUG] No room specified, closing connection`);
      client.close();
      return;
    }

    const roomData = this.rooms.get(room);
    if (roomData) {
      console.log(`[DEBUG] Adding devtools client to existing room: ${room}`);
      roomData.devtools.set(devtoolsId, client);
      this.devtoolsMap.set(client, { room, devtoolsId });
      client.on("message", (message: string) =>
        this.handleDevtoolsMessage(devtoolsId, room, JSON.parse(message)),
      );
      client.on("close", () => this.handleDisconnect(client));
    } else {
      console.log(`[DEBUG] Room ${room} not found, closing connection`);
      client.close();
    }
  }

  private async handleRecordMode(client: WebSocket, recordId: number) {
    // 기록 정보 조회 (URL 포함)
    const record = await this.recordService.findOne(recordId);
    if (record?.url) {
      // URL 정보 전송
      this.sendMessage(client, {
        method: "Page.navigatedWithinDocument",
        params: {
          frameId: "main",
          url: record.url,
        },
      });
    }

    const networks = await this.networkService.findNetworks(recordId);
    console.log(`[DEBUG] Found ${networks.length} network records`);
    networks.forEach(
      (network) =>
        network.protocol && this.sendMessage(client, network.protocol),
    );

    const runtimes = await this.runtimeService.findRuntimes(recordId);
    console.log(`[DEBUG] Found ${runtimes.length} runtime records`);

    // 프로퍼티 스냅샷을 objectId로 인덱싱하여 저장
    // CDP Runtime.getProperties 스펙 준수
    const propertySnapshotsMap = new Map<string, any[]>();

    runtimes.forEach((runtime) => {
      const protocol = runtime.protocol as any;
      this.sendMessage(client, protocol);

      // 프로퍼티 스냅샷 수집 (consoleAPICalled 이벤트에서)
      // 새 형식: _propertySnapshots가 objectId → PropertyDescriptor[] 맵
      if (
        protocol.method === "Runtime.consoleAPICalled" &&
        protocol.params?._propertySnapshots
      ) {
        const snapshots = protocol.params._propertySnapshots;

        // 새 형식 (objectId를 키로 하는 객체)
        if (typeof snapshots === "object" && !Array.isArray(snapshots)) {
          for (const [objectId, properties] of Object.entries(snapshots)) {
            if (Array.isArray(properties)) {
              propertySnapshotsMap.set(objectId, properties);
            }
          }
        }
        // 기존 형식 호환 (배열)
        else if (Array.isArray(snapshots)) {
          for (const snapshot of snapshots) {
            if (snapshot.objectId && Array.isArray(snapshot.properties)) {
              propertySnapshotsMap.set(snapshot.objectId, snapshot.properties);
            }
          }
        }
      }
    });

    console.log(
      `[DEBUG] Collected ${propertySnapshotsMap.size} property snapshots for object expansion`,
    );

    client.on("message", (message: string) => {
      const protocol = JSON.parse(message);

      // Network.getResponseBody 요청 처리
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

        const body = data.responseBody;

        // 이미 SDK에서 minified 형태로 저장한 것을 그대로 전송
        // DevTools가 자체적으로 pretty print를 수행함

        this.sendMessage(client, {
          id: protocol.id,
          result: { body: body, base64Encoded: data.base64Encoded },
        });
      }

      // Runtime.getProperties 요청 처리 (녹화 세션 재생 시 객체 확장용)
      if (protocol.method === "Runtime.getProperties") {
        const objectId = protocol.params?.objectId;
        const properties = propertySnapshotsMap.get(objectId);

        if (properties) {
          console.log(`[DEBUG] Found properties for objectId: ${objectId}`);
          this.sendMessage(client, {
            id: protocol.id,
            result: {
              result: properties,
              internalProperties: [],
              privateProperties: [],
            },
          });
        } else {
          console.log(`[DEBUG] No properties found for objectId: ${objectId}`);
          // 프로퍼티를 찾을 수 없는 경우 빈 배열 반환
          this.sendMessage(client, {
            id: protocol.id,
            result: {
              result: [],
              internalProperties: [],
              privateProperties: [],
            },
          });
        }
      }

      // Runtime.callFunctionOn 요청 처리 (녹화 세션 재생 시 Copy Object 기능)
      if (protocol.method === "Runtime.callFunctionOn") {
        const objectId = protocol.params?.objectId;
        const functionDeclaration = protocol.params?.functionDeclaration || "";
        const args = protocol.params?.arguments || [];

        console.log(
          `[DEBUG] Runtime.callFunctionOn called for objectId: ${objectId}`,
        );

        // Copy Object 기능인지 확인 (toStringForClipboard 함수 패턴 감지)
        const isCopyObjectCall =
          functionDeclaration.includes("toStringForClipboard") ||
          functionDeclaration.includes("JSON.stringify");

        if (isCopyObjectCall && objectId) {
          // 스냅샷 데이터로부터 객체 재구성 후 JSON 반환
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
          // 처리할 수 없는 callFunctionOn 요청
          this.sendMessage(client, {
            id: protocol.id,
            error: {
              code: -32601,
              message: "Method not supported in recording playback mode",
            },
          });
        }
      }
    });
  }

  private parseQueryParams(url?: string) {
    if (!url) {
      console.log("[DEBUG] No URL provided for parsing");
      return {
        room: null,
        recordMode: null,
        recordId: null,
        playbackDevice: null,
        s3Backup: null,
        deviceId: null,
        date: null,
        filePaths: null,
      };
    }

    const urlParts = url.split("?");
    if (urlParts.length < 2) {
      console.log(`[DEBUG] No query params in URL: ${url}`);
      return {
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

    console.log(`[DEBUG] Parsed params:`, result);
    return result;
  }

  // 백업 데이터 재생 처리 (DB 재생 로직과 동일하게)
  private async handleBackupPlayback(
    client: WebSocket,
    room: string,
    recordId: number,
    deviceId: string,
  ): Promise<void> {
    try {
      console.log(
        `[DEBUG] Loading backup data for device: ${deviceId}, room: ${room}, recordId: ${recordId}`,
      );

      // S3에서 특정 디바이스의 백업 데이터 조회
      const deviceData = await this.s3Service.getBufferDataByDeviceId(
        deviceId,
        room,
        recordId,
      );

      if (!deviceData || deviceData.length === 0) {
        this.sendMessage(client, {
          event: "error",
          message: `디바이스 ${deviceId}의 백업 데이터를 찾을 수 없습니다.`,
        });
        client.close();
        return;
      }

      console.log(
        `[DEBUG] Found ${deviceData.length} backup sessions for device ${deviceId}`,
      );

      // URL 정보 전송 (첫 번째 백업의 URL 사용)
      if (deviceData[0]?.url) {
        this.sendMessage(client, {
          method: "Page.navigatedWithinDocument",
          params: {
            frameId: "main",
            url: deviceData[0].url,
          },
        });
      }

      // S3 백업 데이터를 DB 형식으로 변환하여 스트리밍
      const allProtocols: any[] = [];
      for (const backup of deviceData) {
        for (const event of backup.bufferData) {
          // CDP 프로토콜 형식으로 변환
          allProtocols.push({
            protocol: {
              method: event.method,
              params: event.params,
            },
            timestamp: event.timestamp,
            domain: event.method.split(".")[0], // Network, Runtime 등
          });
        }
      }

      // timestamp 내림차순 정렬 (최신 먼저)
      allProtocols.sort((a, b) => b.timestamp - a.timestamp);

      console.log(
        `[DEBUG] Streaming ${allProtocols.length} protocols to DevTools`,
      );

      // DB 재생과 동일한 방식으로 프로토콜 전송
      allProtocols.forEach((protocolData) => {
        if (protocolData.protocol) {
          this.sendMessage(client, protocolData.protocol);
        }
      });

      // 클라이언트 메시지 핸들러 설정 (DB 모드와 동일)
      client.on("message", (message: string) => {
        const protocol = JSON.parse(message);

        // Page.getResourceTree 요청 처리
        if (protocol.method === "Page.getResourceTree") {
          this.sendMessage(client, { id: protocol.id });
        }

        // 기타 DevTools 요청 처리는 향후 필요시 추가
        console.log("[BACKUP_PLAYBACK] DevTools request:", protocol.method);
      });

      // 재생 완료 알림
      this.sendMessage(client, {
        event: "playbackComplete",
        data: {
          room,
          recordId,
          deviceId,
          totalEvents: allProtocols.length,
        },
      });

      console.log(`[DEBUG] Backup playback completed for device ${deviceId}`);
    } catch (error) {
      console.error("백업 재생 중 오류:", error);
      this.sendMessage(client, {
        event: "error",
        message: "백업 데이터 재생 중 오류가 발생했습니다.",
      });
      client.close();
    }
  }

  // 직접 파일 경로로 S3 백업 재생 (성능 개선)
  private async handleS3BackupPlaybackByPaths(
    client: WebSocket,
    room: string,
    recordId: number,
    deviceId: string,
    date: string,
    filePaths: string,
  ): Promise<void> {
    try {
      // 파일 경로들을 파싱
      const pathArray = filePaths.split(",").filter((path) => path.trim());

      // 파일 경로로 직접 백업 데이터 조회
      const backupData = await this.s3Service.getS3BackupByPaths(pathArray);

      if (!backupData || backupData.length === 0) {
        this.sendMessage(client, {
          event: "error",
          message: `지정된 파일 경로의 백업 데이터를 찾을 수 없습니다.`,
        });
        client.close();
        return;
      }

      console.log(
        `[S3_DIRECT_PLAYBACK] Found ${backupData.length} backup sessions via direct paths`,
      );

      // 기존 재생 로직과 동일한 처리
      await this.processS3BackupData(
        client,
        room,
        recordId,
        deviceId,
        date,
        backupData,
      );
    } catch (error) {
      console.error("[S3_DIRECT_PLAYBACK_ERROR]", error);
      this.sendMessage(client, {
        event: "error",
        message: "직접 경로 방식 S3 백업 데이터 재생 중 오류가 발생했습니다.",
      });
      client.close();
    }
  }

  // S3 백업 재생 처리 (메모리 캐시 활용, DB 재생과 동일한 프로토콜 형식)
  private async handleS3BackupPlayback(
    client: WebSocket,
    room: string,
    recordId: number,
    deviceId: string,
    date: string,
  ): Promise<void> {
    try {
      console.log(
        `[S3_PLAYBACK] Loading data: room=${room}, recordId=${recordId}, deviceId=${deviceId}, date=${date}`,
      );

      // Room 이름에서 현재 시간 추출하여 이전 기록들만 조회 (recordService 전달)
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
          message: `${date} 날짜의 ${deviceId} 백업 데이터를 찾을 수 없습니다.`,
        });
        client.close();
        return;
      }

      console.log(`[S3_PLAYBACK] Found ${backupData.length} backup sessions`);

      // 백업 데이터 처리 로직을 공통 메소드로 분리
      await this.processS3BackupData(
        client,
        room,
        recordId,
        deviceId,
        date,
        backupData,
      );
    } catch (error) {
      console.error("[S3_PLAYBACK_ERROR]", error);
      this.sendMessage(client, {
        event: "error",
        message: "S3 백업 데이터 재생 중 오류가 발생했습니다.",
      });
      client.close();
    }
  }

  // S3 백업 데이터를 메모리에 저장하여 요청에 응답할 수 있도록 함
  private s3BackupCache: Map<WebSocket, any[]> = new Map();

  // S3 백업 데이터 처리 공통 로직
  private async processS3BackupData(
    client: WebSocket,
    room: string,
    recordId: number,
    deviceId: string,
    date: string,
    backupData: any[],
  ): Promise<void> {
    // S3 백업에서 세션 시작 시간 추출 (가장 오래된 백업의 sessionStartTime 사용)
    let sessionStartTime = null;
    if (backupData.length > 0) {
      // sessionStartTime이 있는 백업 찾기
      const backupWithTime = backupData.find(
        (backup) => backup.sessionStartTime,
      );
      if (backupWithTime) {
        sessionStartTime = backupWithTime.sessionStartTime;
      } else if (backupData[0].timestamp) {
        // sessionStartTime이 없으면 timestamp 사용
        sessionStartTime = backupData[0].timestamp;
      }
    }

    // S3 세션 ID 생성 (s3-deviceId-timestamp-index 형태)
    const encodedDeviceId = encodeURIComponent(deviceId || "unknown-device");
    const s3SessionId = sessionStartTime
      ? `s3-${encodedDeviceId}-${sessionStartTime}-0`
      : null;
    console.log(`[S3_PLAYBACK] Generated S3 session ID: ${s3SessionId}`);

    // DevTools에 S3 세션 ID 전달 (Session Replay API가 올바른 데이터를 반환하도록)
    if (s3SessionId) {
      this.sendMessage(client, {
        method: "SessionReplay.setSessionId",
        params: { sessionId: s3SessionId },
      });
    }
    // DevTools 도메인 초기화 (DB 재생과 동일하게 한 번만)
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

    // runtime 초기화
    this.sendMessage(client, {
      id: MSG_ID.Runtime.enable,
      method: "Runtime.enable",
      params: {},
    });

    // page 초기화
    this.sendMessage(client, {
      id: MSG_ID.Page.enable,
      method: "Page.enable",
      params: {},
    });
    this.sendMessage(client, {
      id: MSG_ID.Page.getResourceTree,
      method: "Page.getResourceTree",
      params: {},
    });

    // dom 초기화
    this.sendMessage(client, {
      id: MSG_ID.DOM.ENABLE,
      method: "DOM.enable",
      params: {},
    });

    // screen 초기화
    this.sendMessage(client, {
      id: MSG_ID.Screen.startPreview,
      method: "ScreenPreview.startPreview",
      params: {},
    });

    // URL 정보 전송 (DB 재생과 동일하게)
    if (backupData[0]?.url) {
      this.sendMessage(client, {
        method: "Page.navigatedWithinDocument",
        params: {
          frameId: "main",
          url: backupData[0].url,
        },
      });
    }

    // 자동으로 최신 화면 전송 (S3에서)
    setTimeout(() => {
      const latestScreenData = this.findScreenDataInS3Cache(client);
      if (latestScreenData) {
        this.sendMessage(client, latestScreenData);
        console.log("[S3_AUTO_SCREEN] Automatically sent latest screen data");
      }
    }, 100); // 100ms 후 자동 전송

    // S3 백업 데이터를 client별로 캐시 (웹소켓 요청 응답용)
    this.s3BackupCache.set(client, backupData);

    // ResponseBody 캐시 초기화 (DB 방식과 동일한 조회를 위해)
    const responseBodyCache = new Map<
      number,
      { body: string; base64Encoded: boolean }
    >();
    this.s3ResponseBodyCache.set(client, responseBodyCache);

    // 백업 데이터 구조 확인 (요약만)
    console.log(`[S3_PLAYBACK] Loading ${backupData.length} sessions from S3`);
    if (backupData.length > 0) {
      const totalEvents = backupData.reduce(
        (sum, backup) =>
          sum +
          (Array.isArray(backup.bufferData) ? backup.bufferData.length : 0),
        0,
      );
      console.log(`[S3_PLAYBACK] Total events available: ${totalEvents}`);
    }

    // S3 백업 데이터를 DB와 동일한 형식으로 변환
    const networkProtocols: any[] = [];
    const runtimeProtocols: any[] = [];
    const sessionReplayProtocols: any[] = [];
    const otherProtocols: any[] = [];

    for (const backup of backupData) {
      // bufferData가 배열인지 확인 (방어 코드)
      if (!backup.bufferData || !Array.isArray(backup.bufferData)) {
        console.warn(
          `[S3_PLAYBACK] Invalid bufferData in session ${backup.room}`,
        );
        continue;
      }

      for (const event of backup.bufferData) {
        // event가 유효한 객체인지 확인
        if (!event || typeof event !== "object" || !event.method) {
          continue; // 조용히 스킵
        }

        // buffering.saveSession은 메타데이터이므로 스킵 (실제 CDP 이벤트만 처리)
        if (event.method === "buffering.saveSession") {
          continue;
        }

        // updateResponseBody 이벤트를 responseBody 캐시에 저장 (DB 방식과 동일하게)
        if (event.method === "updateResponseBody" && event.params?.requestId) {
          responseBodyCache.set(event.params.requestId, {
            body: event.params.body || "",
            base64Encoded: event.params.base64Encoded || false,
          });
        }

        // Session Replay 이벤트 별도 처리
        if (event.method.startsWith("SessionReplay.")) {
          sessionReplayProtocols.push({
            protocol: {
              method: event.method,
              params: event.params,
            },
            timestamp: event.timestamp,
            domain: "SessionReplay",
          });
          continue;
        }

        // 기존 CDP 이벤트 처리 (이전 시스템과의 호환성)
        const protocolData = {
          protocol: {
            method: event.method,
            params: event.params,
          },
          timestamp: event.timestamp,
          domain: event.method.split(".")[0],
          requestId: event.params?.requestId, // requestId 보존
        };

        // 도메인별로 분류 (DB 재생과 동일)
        if (event.method.startsWith("Network.")) {
          networkProtocols.push(protocolData);
        } else if (event.method.startsWith("Runtime.")) {
          runtimeProtocols.push(protocolData);
        } else {
          otherProtocols.push(protocolData);
        }
      }
    }

    // timestamp 정렬 (시간순)
    networkProtocols.sort((a, b) => a.timestamp - b.timestamp);
    runtimeProtocols.sort((a, b) => a.timestamp - b.timestamp);
    sessionReplayProtocols.sort((a, b) => a.timestamp - b.timestamp);
    otherProtocols.sort((a, b) => a.timestamp - b.timestamp);

    // DB playback과 동일: 이벤트가 없으면 없는 대로 처리 (기본 이벤트 생성 안함)

    // 프로토콜 개수 요약
    const totalProtocols =
      networkProtocols.length +
      runtimeProtocols.length +
      sessionReplayProtocols.length +
      otherProtocols.length;
    console.log(
      `[S3_PLAYBACK] Sending ${totalProtocols} protocols (N:${networkProtocols.length}, R:${runtimeProtocols.length}, SR:${sessionReplayProtocols.length}, O:${otherProtocols.length})`,
    );

    // DB 재생과 동일한 방식으로 프로토콜 전송
    let sentCount = 0;

    // 모든 프로토콜을 하나의 배열로 합치고 timestamp 순으로 정렬
    const allProtocols = [
      ...networkProtocols,
      ...runtimeProtocols,
      ...sessionReplayProtocols,
      ...otherProtocols,
    ].sort((a, b) => a.timestamp - b.timestamp); // 시간순 정렬

    console.log(
      `[S3_PROTOCOL_ORDER] Sending ${allProtocols.length} protocols in chronological order:`,
    );
    allProtocols.slice(0, 10).forEach((protocolData, index) => {
      const protocolDate = new Date(protocolData.timestamp);
      console.log(
        `  ${index + 1}. ${protocolData.protocol.method} → ${protocolDate.toISOString()} (${protocolData.timestamp})`,
      );
    });
    if (allProtocols.length > 10) {
      console.log(`  ... and ${allProtocols.length - 10} more protocols`);
    }

    allProtocols.forEach((protocolData) => {
      try {
        this.sendMessage(client, protocolData.protocol);
        sentCount += 1;
      } catch (error) {
        console.error(
          `[S3_PLAYBACK_ERROR] ${protocolData.protocol.method}:`,
          error.message,
        );
      }
    });

    console.log(
      `[S3_PLAYBACK] Sent ${sentCount}/${totalProtocols} protocols to DevTools`,
    );

    // 프로퍼티 스냅샷을 objectId로 인덱싱하여 저장 (S3 백업 재생용)
    // CDP Runtime.getProperties 스펙 준수
    const propertySnapshotsMap = new Map<string, any[]>();

    // Runtime 이벤트에서 프로퍼티 스냅샷 수집
    for (const protocolData of runtimeProtocols) {
      const proto = protocolData.protocol as any;
      if (
        proto.method === "Runtime.consoleAPICalled" &&
        proto.params?._propertySnapshots
      ) {
        const snapshots = proto.params._propertySnapshots;

        // 새 형식 (objectId를 키로 하는 객체)
        if (typeof snapshots === "object" && !Array.isArray(snapshots)) {
          for (const [objectId, properties] of Object.entries(snapshots)) {
            if (Array.isArray(properties)) {
              propertySnapshotsMap.set(objectId, properties);
            }
          }
        }
        // 기존 형식 호환 (배열)
        else if (Array.isArray(snapshots)) {
          for (const snapshot of snapshots) {
            if (snapshot.objectId && Array.isArray(snapshot.properties)) {
              propertySnapshotsMap.set(snapshot.objectId, snapshot.properties);
            }
          }
        }
      }
    }

    console.log(
      `[S3_PLAYBACK] Collected ${propertySnapshotsMap.size} property snapshots for object expansion`,
    );

    // DevTools 요청 핸들러 설정 (S3 백업 재생 전용 - 개선된 응답)
    client.on("message", async (message: string) => {
      const protocol = JSON.parse(message);

      // Page.getResourceTree 응답 (더 현실적인 페이지 구조)
      if (protocol.method === "Page.getResourceTree") {
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
                  {
                    url: mainUrl,
                    type: "Document",
                    mimeType: "text/html",
                  },
                ],
              },
            },
          });
        } catch (urlError) {
          // URL 파싱 실패 시 기본값 사용
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

      // DOM.getDocument 응답 (기본 HTML 구조 제공)
      if (protocol.method === "DOM.getDocument") {
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

      // ScreenPreview.startPreview 응답
      if (protocol.method === "ScreenPreview.startPreview") {
        const screenData = this.findScreenDataInS3Cache(client);
        if (screenData) {
          this.sendMessage(client, screenData);
        } else {
          // 화면 데이터가 없는 경우 플레이스홀더 응답
          this.sendMessage(client, {
            id: protocol.id,
            result: {
              message: "No screen capture available in buffered session",
            },
          });
        }
      }

      // Network.getResponseBody 응답 (DB 방식과 동일한 로직)
      if (protocol.method === "Network.getResponseBody") {
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
    <p>Device: ${deviceId}</p>
    <p>Sessions: ${backupData.length}</p>
    <p>URL: ${backupData[0]?.url || "Unknown"}</p>
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

      // Runtime.getProperties 요청 처리 (S3 백업 재생 시 객체 확장용)
      if (protocol.method === "Runtime.getProperties") {
        const objectId = protocol.params?.objectId;
        const properties = propertySnapshotsMap.get(objectId);

        if (properties) {
          console.log(
            `[S3_PLAYBACK] Found properties for objectId: ${objectId}`,
          );
          this.sendMessage(client, {
            id: protocol.id,
            result: {
              result: properties,
              internalProperties: [],
              privateProperties: [],
            },
          });
        } else {
          console.log(
            `[S3_PLAYBACK] No properties found for objectId: ${objectId}`,
          );
          // 프로퍼티를 찾을 수 없는 경우 빈 배열 반환
          this.sendMessage(client, {
            id: protocol.id,
            result: {
              result: [],
              internalProperties: [],
              privateProperties: [],
            },
          });
        }
      }

      // Runtime.callFunctionOn 요청 처리 (S3 백업 재생 시 Copy Object 기능)
      if (protocol.method === "Runtime.callFunctionOn") {
        const objectId = protocol.params?.objectId;
        const functionDeclaration = protocol.params?.functionDeclaration || "";
        const args = protocol.params?.arguments || [];

        console.log(
          `[S3_PLAYBACK] Runtime.callFunctionOn called for objectId: ${objectId}`,
        );

        // Copy Object 기능인지 확인 (toStringForClipboard 함수 패턴 감지)
        const isCopyObjectCall =
          functionDeclaration.includes("toStringForClipboard") ||
          functionDeclaration.includes("JSON.stringify");

        if (isCopyObjectCall && objectId) {
          // 스냅샷 데이터로부터 객체 재구성 후 JSON 반환
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
          // 처리할 수 없는 callFunctionOn 요청
          this.sendMessage(client, {
            id: protocol.id,
            error: {
              code: -32601,
              message: "Method not supported in S3 backup playback mode",
            },
          });
        }
      }
    });
  }

  // S3 백업 캐시에서 requestId에 해당하는 응답 데이터 찾기 (DB 방식과 동일한 로직)
  private findResponseBodyInS3Cache(
    client: WebSocket,
    requestId: number,
  ): { body: string; base64Encoded: boolean } | null {
    const responseBodyCache = this.s3ResponseBodyCache.get(client);
    if (!responseBodyCache) {
      return null;
    }

    const responseData = responseBodyCache.get(requestId);
    if (responseData) {
      console.log(
        `[RESPONSE_BODY_FOUND] Found responseBody for requestId ${requestId}`,
      );
      return responseData;
    }

    return null;
  }

  // S3 백업 캐시에서 DOM 데이터 찾기
  private findDomDataInS3Cache(client: WebSocket): any | null {
    const cachedBackupData = this.s3BackupCache.get(client);
    if (!cachedBackupData) {
      return null;
    }

    // 모든 DOM.updated 이벤트를 수집하고 timestamp로 정렬해서 최신 것을 반환
    let latestDomData: any = null;
    let latestTimestamp = 0;

    for (const backup of cachedBackupData) {
      // bufferData가 배열인지 확인 (방어 코드)
      if (!backup.bufferData || !Array.isArray(backup.bufferData)) {
        continue;
      }

      for (const event of backup.bufferData) {
        // event가 유효한 객체인지 확인
        if (!event || typeof event !== "object" || !event.method) {
          continue;
        }

        if (event.method === "DOM.updated" && event.params && event.timestamp) {
          // timestamp가 가장 큰 것(최신)을 찾기
          if (event.timestamp > latestTimestamp) {
            latestTimestamp = event.timestamp;
            latestDomData = event.params.root || event.params;
          }
        }
        // 또는 DOM.getDocument 결과 찾기
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
      console.log(
        `[S3_LATEST_DOM] Found latest DOM with timestamp: ${latestTimestamp}`,
      );
    }

    return latestDomData;
  }

  // S3 백업 캐시에서 Screen 데이터 찾기 (로그 최소화)
  private findScreenDataInS3Cache(client: WebSocket): any | null {
    const cachedBackupData = this.s3BackupCache.get(client);
    if (!cachedBackupData) {
      return null;
    }

    // 모든 ScreenPreview.captured 이벤트를 수집하고 timestamp로 정렬해서 최신 것을 반환
    let latestScreenData: any = null;
    let latestTimestamp = 0;

    for (const backup of cachedBackupData) {
      // bufferData가 배열인지 확인 (방어 코드)
      if (!backup.bufferData || !Array.isArray(backup.bufferData)) {
        continue;
      }

      for (const event of backup.bufferData) {
        if (
          event.method === "ScreenPreview.captured" &&
          event.params &&
          event.timestamp
        ) {
          // timestamp가 가장 큰 것(최신)을 찾기
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
      console.log(
        `[S3_LATEST_SCREEN] Found latest screen with timestamp: ${latestTimestamp}`,
      );
    }

    return latestScreenData;
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

    if (roomData.recordMode) {
      const protocol =
        typeof data.message === "string"
          ? JSON.parse(data.message)
          : data.message;
      if (this.domService.isEnableDomResponseMessage(protocol.id)) {
        // dom이 enable되면 dom 데이터를 요청함
        this.sendMessage(client, {
          id: MSG_ID.DOM.GET_DOCUMENT,
          method: "DOM.getDocument",
          params: {},
        });
      } else if (this.domService.isGetDomResponseMessage(protocol.id)) {
        // dom 데이터를 받으면 DB에 저장
        const timestamp = Date.now() * 1000000; // 밀리초를 나노초로 변환
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
    const protocol = JSON.parse(data.message);
    const roomData = this.rooms.get(data.room);
    if (roomData) {
      roomData.devtools.forEach((devtools) => devtools.send(data.message));
      if (roomData.recordMode) {
        const timestamp = Date.now() * 1000000; // 밀리초를 나노초로 변환
        // TODO: 도메인별로 메시지를 구분할 수 있도록 수정 필요
        if (protocol.params.requestId) {
          await this.networkService.create({
            recordId: roomData.recordId,
            protocol,
            requestId: protocol.params?.requestId || null, // requestId가 없을 수도 있음
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
          // 이벤트 타입 결정
          let eventType = "incremental_snapshot";
          if (protocol.params?.isFirstSnapshot) {
            eventType = "full_snapshot";
          }

          await this.screenService.upsert({
            recordId: roomData.recordId,
            protocol,
            timestamp,
            type: "screenPreview",
            event_type: eventType,
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

  public async handleDisconnect(client: WebSocket): Promise<void> {
    const room = this.clientMap.get(client);
    if (room) {
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
        } as any);

        // duration 계산 및 업데이트
        const startEvent = await this.screenService.findScreens(
          roomData.recordId,
        );
        if (startEvent && startEvent.length > 0) {
          const startTime = startEvent[0].timestamp;
          const duration = endTime - Number(startTime);
          await this.recordService.updateDuration(roomData.recordId, duration);
        }
      }

      this.rooms.get(room).devtools.forEach((devtools) => devtools.close());
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

    // S3 백업 관련 캐시 정리
    this.s3BackupCache.delete(client);
    this.s3ResponseBodyCache.delete(client);
  }

  public getLiveRoomList(): { id: number; name: string }[] {
    return Array.from(this.rooms.entries())
      .filter(([_, roomData]) => !roomData.recordMode)
      .map(([name]) => ({ id: 0, name }));
  }

  private handleDevtoolsMessage(
    devtoolsId: string,
    room: string,
    message: string,
  ) {
    const roomData = this.rooms.get(room);
    // devtools 메시지는 그대로 전달 (protocol wrapper 없이)
    roomData?.client.send(message);
  }
}
