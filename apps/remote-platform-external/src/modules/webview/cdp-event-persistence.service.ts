import { Injectable, Logger } from "@nestjs/common";

import {
  DomService,
  NetworkService,
  RuntimeService,
  ScreenService,
} from "@remote-platform/core";

import type { BufferEvent } from "../buffer/buffer.service";

/**
 * CDP 이벤트를 도메인별로 DB에 저장하는 서비스.
 *
 * WebSocket 게이트웨이에서 분리되어 이벤트 영속화 로직만 담당한다.
 * Network, DOM, Runtime, ScreenPreview, SessionReplay 이벤트를 처리한다.
 */
@Injectable()
export class CdpEventPersistenceService {
  private readonly logger = new Logger(CdpEventPersistenceService.name);

  /** rrweb 이벤트 타임스탬프 추적 (이벤트 순서 보장용) */
  private lastEventTimestamp = 0;

  constructor(
    private readonly networkService: NetworkService,
    private readonly domService: DomService,
    private readonly runtimeService: RuntimeService,
    private readonly screenService: ScreenService,
  ) {}

  // -------------------------------------------------------------------------
  // rrweb 이벤트 타입 매핑
  // -------------------------------------------------------------------------

  /**
   * rrweb 숫자 이벤트 타입을 문자열 라벨로 변환한다.
   */
  mapRrwebEventType(rrwebType: number): string {
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
  // Timestamp conversion
  // -------------------------------------------------------------------------

  /**
   * 밀리초 타임스탬프를 나노초로 변환한다.
   */
  toTimestampNs(value?: number | string): number {
    const parsed = typeof value === "string" ? Number(value) : value;
    if (!Number.isFinite(parsed)) {
      const [seconds, nanoseconds] = process.hrtime();
      return seconds * 1e9 + nanoseconds;
    }
    return Math.trunc(parsed! * 1_000_000);
  }

  // -------------------------------------------------------------------------
  // Protocol event persistence (protocolToAllDevtools)
  // -------------------------------------------------------------------------

  /**
   * 프로토콜 메시지를 도메인별로 DB에 저장한다.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async persistProtocolEvent(protocol: any, recordId: number): Promise<void> {
    const timestamp = Date.now() * 1_000_000;

    if (protocol.params?.requestId) {
      await this.networkService.create({
        recordId,
        protocol,
        requestId: protocol.params.requestId,
        timestamp,
      });
    }

    if (protocol.method.startsWith("DOM.updated")) {
      await this.domService.upsert({
        recordId,
        protocol: { root: protocol.params },
        timestamp,
        type: "entireDom",
      });
    }

    if (protocol.method.startsWith("Runtime.")) {
      await this.runtimeService.create({
        recordId,
        protocol,
        timestamp,
      });
    }

    if (protocol.method.startsWith("ScreenPreview.captured")) {
      let eventType: "full_snapshot" | "incremental_snapshot" =
        "incremental_snapshot";
      if (protocol.params?.isFirstSnapshot) {
        eventType = "full_snapshot";
      }

      await this.screenService.upsert({
        recordId,
        protocol,
        timestamp,
        type: "screenPreview",
        eventType,
      });
    }

    if (protocol.method === "user.interaction") {
      await this.screenService.upsert({
        recordId,
        protocol,
        timestamp,
        type: null,
        eventType: "user_interaction",
      });
    }

    if (protocol.method === "user.scroll") {
      await this.screenService.upsert({
        recordId,
        protocol,
        timestamp,
        type: null,
        eventType: "viewport_change",
      });
    }
  }

  // -------------------------------------------------------------------------
  // SessionReplay event handling
  // -------------------------------------------------------------------------

  /**
   * 단일 rrweb 이벤트를 DB에 저장한다.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async persistSingleRrwebEvent(protocol: any, recordId: number | null): Promise<{
    sessionTimestamp: bigint;
  } | null> {
    const event = protocol.params?.event;
    if (!event) return null;

    const sessionTimestamp =
      BigInt(event.timestamp || Date.now()) * BigInt(1_000_000);
    const eventType = this.mapRrwebEventType(event.type);

    await this.screenService.upsert({
      recordId,
      protocol,
      timestamp: sessionTimestamp.toString(),
      type: null,
      eventType,
      sequence: event.data?.sequence || null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    return { sessionTimestamp };
  }

  /**
   * 배치 rrweb 이벤트를 DB에 저장한다. 각 이벤트의 타임스탬프를 반환한다.
   */
  async persistBatchRrwebEvents(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protocol: any,
    recordId: number | null,
  ): Promise<Array<{ event: unknown; sessionTimestamp: bigint }>> {
    const events = protocol.params?.events || [];
    this.logger.log(`[SessionReplay] Saving batch of ${events.length} events`);

    const results: Array<{ event: unknown; sessionTimestamp: bigint }> = [];

    for (const event of events) {
      const sessionTimestamp =
        BigInt(event.timestamp || Date.now()) * BigInt(1_000_000);
      const eventType = this.mapRrwebEventType(event.type);

      await this.screenService.upsert({
        recordId,
        protocol: {
          method: "SessionReplay.rrwebEvent",
          params: { event },
        },
        timestamp: sessionTimestamp.toString(),
        type: null,
        eventType,
        sequence: event.data?.sequence || null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      results.push({ event, sessionTimestamp });
    }

    return results;
  }

  /**
   * 레거시 세션 리플레이 형식을 DB에 저장한다.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async persistLegacySessionReplay(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protocol: any,
    recordId: number | null,
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
      recordId,
      protocol,
      timestamp: sessionTimestamp.toString(),
      type: null,
      eventType,
      sequence: protocol.params?.sequence,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  }

  // -------------------------------------------------------------------------
  // Buffered event persistence (buffer → record transfer)
  // -------------------------------------------------------------------------

  /**
   * 단일 버퍼 이벤트를 메서드 종류에 따라 적절한 서비스로 DB에 저장한다.
   */
  async persistBufferedEvent(recordId: number, event: BufferEvent): Promise<void> {
    const method = event.method;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      await this.persistBufferedSingleRrwebEvent(recordId, params);
      return;
    }

    if (method === "SessionReplay.rrwebEvents") {
      await this.persistBufferedBatchRrwebEvents(recordId, params);
      return;
    }

    if (
      method === "SessionReplay.snapshot" ||
      method === "SessionReplay.interaction"
    ) {
      await this.persistBufferedLegacySessionReplay(recordId, method, params);
      return;
    }
  }

  /**
   * 최신 ScreenPreview.captured 이벤트를 DB에 저장한다.
   */
  async persistLatestScreenPreview(
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
      eventType,
    });

    this.logger.log(
      `[BUFFER_TRANSFER_SCREEN_PREVIEW] deviceId=${deviceId}, recordId=${recordId}, timestamp=${previewTimestampMs}`,
    );
  }

  // -------------------------------------------------------------------------
  // Private helpers for buffered event persistence
  // -------------------------------------------------------------------------

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async persistBufferedSingleRrwebEvent(recordId: number, params: any): Promise<void> {
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
      eventType,
      sequence: eventData.data?.sequence || null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async persistBufferedBatchRrwebEvents(recordId: number, params: any): Promise<void> {
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
        eventType,
        sequence: rrEvent.data?.sequence || null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
    }
  }

  private async persistBufferedLegacySessionReplay(
    recordId: number,
    method: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      eventType,
      sequence: params?.sequence,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  }
}
