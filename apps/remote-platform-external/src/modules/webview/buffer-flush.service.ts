import { Injectable, Logger } from "@nestjs/common";

import { ScreenService } from "@remote-platform/core";

import { BufferService, type BufferEvent } from "../buffer/buffer.service";
import { S3Service } from "../s3/s3.service";

import { CdpEventPersistenceService } from "./cdp-event-persistence.service";
import type { BufferRoomInfo, LastBufferInfo } from "./webview.types";

/** 최소 의미 있는 이벤트 수 */
const MIN_MEANINGFUL_EVENTS = 5;

/**
 * 버퍼 데이터를 S3에 플러시하고, 버퍼 → 레코드 이전을 오케스트레이션하는 서비스.
 *
 * WebSocket 게이트웨이에서 분리되어 버퍼 저장/이전 로직만 담당한다.
 */
@Injectable()
export class BufferFlushService {
  private readonly logger = new Logger(BufferFlushService.name);

  constructor(
    private readonly bufferService: BufferService,
    private readonly s3Service: S3Service,
    private readonly screenService: ScreenService,
    private readonly cdpEventPersistence: CdpEventPersistenceService,
  ) {}

  // -------------------------------------------------------------------------
  // Buffer save orchestration
  // -------------------------------------------------------------------------

  /**
   * 버퍼 저장을 오케스트레이션한다.
   * deviceId에 해당하는 모든 플러시 대상 룸을 수집하고, 각 룸의 버퍼 데이터를 S3에 강제 저장한다.
   */
  async triggerBufferSave(
    deviceId: string,
    trigger: string | undefined,
    title: string | undefined,
    referenceTimestamp: number | undefined,
    roomName: string | undefined,
    requestUrl: string | undefined,
    bufferRooms: Map<string, BufferRoomInfo>,
    deviceToRoom: Map<string, string>,
    lastBufferInfoByDevice: Map<string, LastBufferInfo>,
    visibilityExitSavedRooms: Set<string>,
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
        bufferRooms,
        deviceToRoom,
        lastBufferInfoByDevice,
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

        if (bufferRooms.has(room)) {
          bufferRooms.set(room, { ...updatedInfo });
        }

        const lastInfo = lastBufferInfoByDevice.get(updatedInfo.deviceId);
        if (lastInfo?.room === room) {
          lastBufferInfoByDevice.set(updatedInfo.deviceId, {
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
          visibilityExitSavedRooms,
        );

        if (result) {
          flushed = true;
        }

        this.cleanupBufferRoomAfterFlush(
          room,
          updatedInfo.deviceId,
          bufferRooms,
          deviceToRoom,
          lastBufferInfoByDevice,
          visibilityExitSavedRooms,
        );
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
  // Buffer flush methods
  // -------------------------------------------------------------------------

  /**
   * 버퍼 데이터를 S3에 강제 저장한다 (최소 이벤트 수 무시).
   */
  async flushBufferToFileForce(
    room: string,
    recordId: number,
    deviceId: string,
    url: string,
    userAgent: string,
    title: string | undefined,
    visibilityExitSavedRooms: Set<string>,
  ): Promise<boolean> {
    try {
      if (visibilityExitSavedRooms.has(room)) {
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
   */
  async flushBufferToFile(
    room: string,
    recordId: number,
    deviceId: string,
    url: string,
    userAgent: string,
    title: string | undefined,
    visibilityExitSavedRooms: Set<string>,
  ): Promise<boolean> {
    try {
      if (visibilityExitSavedRooms.has(room)) {
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

  // -------------------------------------------------------------------------
  // Buffer transfer to record
  // -------------------------------------------------------------------------

  /**
   * Buffer 룸의 버퍼 이벤트를 영구 레코드로 이전한다.
   */
  async transferBufferedDataToRecord(
    deviceId: string,
    recordId: number,
    bufferRooms: Map<string, BufferRoomInfo>,
    deviceToRoom: Map<string, string>,
    lastBufferInfoByDevice: Map<string, LastBufferInfo>,
    visibilityExitSavedRooms: Set<string>,
  ): Promise<void> {
    try {
      const bufferRoom = this.findBufferRoomForDevice(
        deviceId,
        deviceToRoom,
        bufferRooms,
        lastBufferInfoByDevice,
      );
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
          await this.cdpEventPersistence.persistBufferedEvent(recordId, event);
        } catch (error) {
          this.logger.error(
            `[BUFFER_TRANSFER_EVENT_ERROR] recordId=${recordId}, method=${event.method}, error=${error instanceof Error ? error.message : error}`,
            error instanceof Error ? error.stack : undefined,
          );
        }
      }

      if (latestScreenPreview?.params) {
        await this.cdpEventPersistence.persistLatestScreenPreview(
          recordId,
          deviceId,
          latestScreenPreview,
        );
      }

      // Cleanup buffer state
      this.bufferService.clearSessionBuffers(bufferRoom, 0);
      bufferRooms.delete(bufferRoom);
      deviceToRoom.delete(deviceId);
      visibilityExitSavedRooms.delete(bufferRoom);
      lastBufferInfoByDevice.delete(deviceId);

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

  // -------------------------------------------------------------------------
  // Room collection / cleanup helpers
  // -------------------------------------------------------------------------

  /**
   * 지정된 deviceId에 대해 플러시할 모든 룸을 수집한다.
   */
  collectRoomsToFlush(
    deviceId: string,
    options: {
      referenceTimestamp?: number;
      roomName?: string;
      url?: string;
      bufferRooms: Map<string, BufferRoomInfo>;
      deviceToRoom: Map<string, string>;
      lastBufferInfoByDevice: Map<string, LastBufferInfo>;
    },
  ): Array<{ room: string; info: BufferRoomInfo }> {
    const {
      referenceTimestamp,
      roomName,
      url,
      bufferRooms,
      deviceToRoom,
      lastBufferInfoByDevice,
    } = options;
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

    const directRoom = deviceToRoom.get(deviceId);
    if (directRoom) {
      const info =
        bufferRooms.get(directRoom) || lastBufferInfoByDevice.get(deviceId);
      maybeIncludeRoom(directRoom, info);
    }

    for (const [room, info] of bufferRooms.entries()) {
      if (info.deviceId === deviceId) {
        maybeIncludeRoom(room, info);
      }
    }

    for (const info of lastBufferInfoByDevice.values()) {
      if (info.deviceId === deviceId) {
        maybeIncludeRoom(info.room, info);
      }
    }

    return Array.from(rooms.values());
  }

  /**
   * 버퍼 플러시 완료 후 해당 룸의 모든 추적 데이터를 제거한다.
   */
  cleanupBufferRoomAfterFlush(
    room: string,
    deviceId: string,
    bufferRooms: Map<string, BufferRoomInfo>,
    deviceToRoom: Map<string, string>,
    lastBufferInfoByDevice: Map<string, LastBufferInfo>,
    visibilityExitSavedRooms: Set<string>,
  ): void {
    if (bufferRooms.has(room)) {
      bufferRooms.delete(room);
    }

    if (deviceToRoom.get(deviceId) === room) {
      deviceToRoom.delete(deviceId);
    }

    const lastInfo = lastBufferInfoByDevice.get(deviceId);
    if (lastInfo?.room === room) {
      lastBufferInfoByDevice.delete(deviceId);
    }

    visibilityExitSavedRooms.delete(room);
  }

  /**
   * 디바이스에 연결된 Buffer 룸을 찾는다.
   */
  findBufferRoomForDevice(
    deviceId: string,
    deviceToRoom: Map<string, string>,
    bufferRooms: Map<string, BufferRoomInfo>,
    lastBufferInfoByDevice: Map<string, LastBufferInfo>,
  ): string | null {
    const direct = deviceToRoom.get(deviceId);
    if (direct) return direct;

    for (const [room, info] of bufferRooms.entries()) {
      if (info.deviceId === deviceId) return room;
    }

    const lastInfo = lastBufferInfoByDevice.get(deviceId);
    return lastInfo?.room ?? null;
  }

  // -------------------------------------------------------------------------
  // Buffer persistence eligibility
  // -------------------------------------------------------------------------

  /**
   * 버퍼가 저장할 만큼 충분한 의미 있는 이벤트를 포함하는지 판단한다.
   */
  shouldPersistBuffer(events: BufferEvent[]): boolean {
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
      return screenPreviewEvents.some(
        (event) => event.method === "ScreenPreview.captured",
      );
    }

    const rrwebEvents = nonScreenPreviewEvents.filter((event) =>
      event.method.startsWith("SessionReplay.rrweb"),
    );

    const hasFullSnapshot = rrwebEvents.some((event) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const params = event.params as any;

      if (Array.isArray(params?.events)) {
        return params.events.some(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (rrEvent: any) =>
            typeof rrEvent?.type === "number" && rrEvent.type === 2,
        );
      }

      const rrEvent = params?.event;
      return typeof rrEvent?.type === "number" && rrEvent.type === 2;
    });

    if (hasFullSnapshot) return true;

    return nonScreenPreviewEvents.length >= MIN_MEANINGFUL_EVENTS;
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

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
}
