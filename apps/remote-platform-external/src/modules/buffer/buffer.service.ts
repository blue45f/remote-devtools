import { Injectable, Logger } from "@nestjs/common";

export interface BufferEvent {
  method: string;
  params: unknown;
  timestamp: number;
}

export interface SessionBuffer {
  room: string;
  recordId: number;
  deviceId: string;
  url: string;
  userAgent: string;
  title?: string;
  events: BufferEvent[];
  createdAt: Date;
  lastUpdated: Date;
  sessionStartTime: number; // 세션 시작 시간 (timestamp)
  screenPreviewIndexes: Record<string, number>; // ScreenPreview.* 최신 이벤트 위치
}

@Injectable()
export class BufferService {
  private readonly logger = new Logger(BufferService.name);

  // 세션별 버퍼 저장소 (메모리)
  private buffers = new Map<string, SessionBuffer>();

  // flush 진행 중인 버퍼 관리 (데이터 유실 방지)
  private flushingBuffers = new Map<string, SessionBuffer>();

  // 버퍼 설정
  private readonly maxBufferSize = 50000; // 최대 50,000개 이벤트
  private readonly flushThreshold = Infinity; // 자동 flush 비활성화 (주기적 flush만 사용)
  private readonly maxBufferAge = 30 * 60 * 1000; // 30분

  // 자동 저장 간격 (밀리초) - 더 이상 사용하지 않음
  // private readonly autoSaveInterval = 60 * 1000 // 1분마다

  constructor() {
    // 주기적으로 오래된 버퍼 정리
    setInterval(() => this.cleanupOldBuffers(), 5 * 60 * 1000); // 5분마다

    // 주기적인 자동 저장 비활성화
    // Note: 연결 해제 시에만 저장하도록 변경
    this.logger.log(
      "[BUFFER_SERVICE] Periodic auto-save disabled - only save on disconnect",
    );
  }

  /**
   * 버퍼 키 생성
   */
  private getBufferKey(room: string, recordId: number | null): string {
    // recordId가 null인 경우 0으로 처리
    const safeRecordId = recordId ?? 0;
    return `${room}_${safeRecordId}`;
  }

  private maybeMigrateLegacyKey(
    room: string,
    recordId: number | null,
    preferredDeviceId?: string,
  ): { key: string; buffer?: SessionBuffer } {
    const key = this.getBufferKey(room, recordId);
    let buffer = this.buffers.get(key);

    if (!buffer) {
      const safeRecordId = recordId ?? 0;
      const legacyPrefix = `${room}_${safeRecordId}_`;

      for (const [legacyKey, legacyBuffer] of this.buffers.entries()) {
        if (!legacyKey.startsWith(legacyPrefix)) {
          continue;
        }

        this.logger.log(
          `[BUFFER_SERVICE_MIGRATE_KEY] Migrating legacy buffer key ${legacyKey} → ${key} (device: ${preferredDeviceId ?? legacyBuffer.deviceId})`,
        );

        this.buffers.delete(legacyKey);
        buffer = legacyBuffer;
        this.buffers.set(key, legacyBuffer);
        break;
      }
    }

    return { key, buffer };
  }

  private setFlushingBuffer(key: string, buffer: SessionBuffer): void {
    this.flushingBuffers.set(key, buffer);
  }

  private deleteFlushingBuffer(key: string): void {
    this.flushingBuffers.delete(key);
  }

  private isScreenPreviewEvent(event: BufferEvent): boolean {
    return (
      typeof event.method === "string" &&
      event.method.startsWith("ScreenPreview.")
    );
  }

  private adjustScreenPreviewIndexesAfterRemoval(
    buffer: SessionBuffer,
    removedIndex: number,
    excludedMethod?: string,
  ): void {
    for (const [method, index] of Object.entries(buffer.screenPreviewIndexes)) {
      if (excludedMethod && method === excludedMethod) {
        continue;
      }

      if (index > removedIndex) {
        buffer.screenPreviewIndexes[method] = index - 1;
      }
    }

    if (excludedMethod) {
      delete buffer.screenPreviewIndexes[excludedMethod];
    }
  }

  private adjustScreenPreviewIndexesAfterShift(buffer: SessionBuffer): void {
    for (const [method, index] of Object.entries(buffer.screenPreviewIndexes)) {
      if (index === 0) {
        delete buffer.screenPreviewIndexes[method];
      } else if (index > 0) {
        buffer.screenPreviewIndexes[method] = index - 1;
      }
    }
  }

  private rebuildScreenPreviewIndexes(buffer: SessionBuffer): void {
    buffer.screenPreviewIndexes = {};

    buffer.events.forEach((bufferEvent, idx) => {
      if (this.isScreenPreviewEvent(bufferEvent)) {
        buffer.screenPreviewIndexes[bufferEvent.method] = idx;
      }
    });
  }

  /**
   * 이벤트 추가
   */
  public addEvent(
    room: string,
    recordId: number | null,
    deviceId: string,
    url: string,
    userAgent: string,
    title: string | undefined,
    sessionStartTime: number | undefined,
    event: BufferEvent,
  ): { shouldFlush: boolean; eventCount: number } {
    // Record/Live 방은 버퍼링 안함
    if (room.startsWith("Record-") || room.startsWith("Live-")) {
      this.logger.log(
        `[BUFFER_SERVICE_SKIP] Ignoring buffer event for ${room}`,
      );
      return { shouldFlush: false, eventCount: 0 };
    }

    // recordId가 null인 경우 0으로 처리
    const { key, buffer: resolvedBuffer } = this.maybeMigrateLegacyKey(
      room,
      recordId,
      deviceId,
    );
    const safeRecordId = recordId ?? 0;

    let buffer = resolvedBuffer;
    if (!buffer) {
      // 새로운 버퍼 생성
      const now = new Date();
      const sessionStartMs = sessionStartTime ?? now.getTime();
      buffer = {
        room,
        recordId: safeRecordId,
        deviceId,
        url,
        userAgent,
        title,
        events: [],
        createdAt: now,
        lastUpdated: now,
        sessionStartTime: sessionStartMs,
        screenPreviewIndexes: {},
      };
      this.logger.log(
        `[BUFFER_SERVICE_SESSION_START] room=${room}, recordId=${safeRecordId}, deviceId=${deviceId}, sessionStart=${sessionStartMs}`,
      );
      this.buffers.set(key, buffer);
    } else if (!buffer.screenPreviewIndexes) {
      buffer.screenPreviewIndexes = {};
    }

    if (buffer.deviceId !== deviceId) {
      this.logger.log(
        `[BUFFER_SERVICE_DEVICE_UPDATE] Updating deviceId ${buffer.deviceId} → ${deviceId} for room ${room}`,
      );
      buffer.deviceId = deviceId;
    }

    const isScreenPreviewEvent = this.isScreenPreviewEvent(event);
    const screenPreviewMethod = isScreenPreviewEvent ? event.method : null;
    let newScreenPreviewIndex: number | null = null;

    if (isScreenPreviewEvent && screenPreviewMethod) {
      const existingIndex = buffer.screenPreviewIndexes[screenPreviewMethod];
      if (
        typeof existingIndex === "number" &&
        existingIndex >= 0 &&
        existingIndex < buffer.events.length
      ) {
        buffer.events.splice(existingIndex, 1);
        this.adjustScreenPreviewIndexesAfterRemoval(
          buffer,
          existingIndex,
          screenPreviewMethod,
        );
      } else if (existingIndex !== undefined) {
        delete buffer.screenPreviewIndexes[screenPreviewMethod];
      }
    }

    buffer.events.push(event);
    if (isScreenPreviewEvent) {
      newScreenPreviewIndex = buffer.events.length - 1;
    }

    buffer.lastUpdated = new Date();
    buffer.url = url; // 최신 URL로 업데이트
    buffer.userAgent = userAgent;
    if (typeof title === "string") {
      buffer.title = title;
    }

    // 오래된 이벤트 제거 (링 버퍼)
    if (buffer.events.length > this.maxBufferSize) {
      buffer.events.shift();
      this.adjustScreenPreviewIndexesAfterShift(buffer);
      if (newScreenPreviewIndex !== null) {
        newScreenPreviewIndex -= 1;
      }
    }

    if (isScreenPreviewEvent && screenPreviewMethod) {
      if (newScreenPreviewIndex !== null && newScreenPreviewIndex >= 0) {
        buffer.screenPreviewIndexes[screenPreviewMethod] =
          newScreenPreviewIndex;
      } else {
        delete buffer.screenPreviewIndexes[screenPreviewMethod];
      }
    }

    // 플러시 필요 여부 확인
    const shouldFlush = buffer.events.length >= this.flushThreshold;

    if (shouldFlush) {
      this.logger.log(
        `[BUFFER_AUTO_FLUSH_TRIGGERED] key: ${key}, eventCount: ${buffer.events.length}, threshold: ${this.flushThreshold}`,
      );
    }

    return { shouldFlush, eventCount: buffer.events.length };
  }

  /**
   * 버퍼 강제 flush (이벤트 수 관계없이)
   */
  public flushBufferForce(
    room: string,
    recordId: number | null,
    deviceId: string,
  ): SessionBuffer | null {
    const { key, buffer } = this.maybeMigrateLegacyKey(
      room,
      recordId,
      deviceId,
    );

    if (!buffer || buffer.events.length === 0) {
      return null;
    }

    // 이벤트 수 관계없이 강제 flush
    this.setFlushingBuffer(key, buffer);
    this.buffers.delete(key);

    if (deviceId && buffer.deviceId !== deviceId) {
      this.logger.log(
        `[BUFFER_SERVICE_DEVICE_UPDATE] Updating deviceId ${buffer.deviceId} → ${deviceId} during force flush (room: ${room})`,
      );
      buffer.deviceId = deviceId;
    }

    const flushedBuffer: SessionBuffer = {
      ...buffer,
      events: [...buffer.events], // 이벤트 배열도 복사
    };

    return flushedBuffer;
  }

  /**
   * 버퍼 가져오기 및 초기화
   */
  public flushBuffer(
    room: string,
    recordId: number | null,
    deviceId: string,
  ): SessionBuffer | null {
    // recordId가 null인 경우 0으로 처리
    const { key, buffer } = this.maybeMigrateLegacyKey(
      room,
      recordId,
      deviceId,
    );

    this.logger.log(
      `[FLUSH_BUFFER_CALLED] key: ${key}, timestamp: ${Date.now()}`,
    );

    if (!buffer || buffer.events.length === 0) {
      this.logger.log(
        `[FLUSH_BUFFER_EMPTY] No events to flush for key: ${key}`,
      );
      return null;
    }

    // 현재 버퍼를 flushingBuffers로 이동 (데이터 유실 방지)
    this.setFlushingBuffer(key, buffer);

    // 원본 버퍼는 Map에서 삭제 (새로운 이벤트는 새 버퍼에 저장됨)
    this.buffers.delete(key);

    if (deviceId && buffer.deviceId !== deviceId) {
      this.logger.log(
        `[BUFFER_SERVICE_DEVICE_UPDATE] Updating deviceId ${buffer.deviceId} → ${deviceId} during flush (room: ${room})`,
      );
      buffer.deviceId = deviceId;
    }

    // flush할 버퍼 복사본 생성
    const flushedBuffer = {
      ...buffer,
      events: [...buffer.events], // 이벤트 배열도 복사
    };

    this.logger.log(
      `[FLUSH_BUFFER_SUCCESS] key: ${key}, eventCount: ${flushedBuffer.events.length}, ` +
        `firstEvent: ${flushedBuffer.events[0]?.method}, lastEvent: ${flushedBuffer.events[flushedBuffer.events.length - 1]?.method}`,
    );

    // flush 완료 후 flushingBuffers에서도 제거
    // 실제로는 S3 업로드 완료 후에 제거해야 하지만, 현재는 동기적으로 처리
    setTimeout(() => {
      this.deleteFlushingBuffer(key);
    }, 0);

    return flushedBuffer;
  }

  /**
   * 특정 세션의 모든 버퍼 가져오기
   */
  public getSessionBuffers(
    room: string,
    recordId: number | null,
  ): SessionBuffer[] {
    // recordId가 null인 경우 0으로 처리
    const safeRecordId = recordId ?? 0;
    const buffers: SessionBuffer[] = [];

    for (const [, buffer] of this.buffers) {
      if (buffer.room === room && buffer.recordId === safeRecordId) {
        buffers.push({ ...buffer, events: [...buffer.events] });
      }
    }

    return buffers.sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );
  }

  /**
   * 오래된 버퍼 정리
   */
  private cleanupOldBuffers(): void {
    const now = Date.now();
    let cleanedCount = 0;

    // 일반 버퍼 정리
    for (const [key, buffer] of this.buffers) {
      const age = now - buffer.lastUpdated.getTime();
      if (age > this.maxBufferAge) {
        this.buffers.delete(key);
        cleanedCount += 1;
      }
    }

    // flush 중인 버퍼도 정리 (너무 오래 걸리는 경우)
    for (const [key, buffer] of this.flushingBuffers) {
      const age = now - buffer.lastUpdated.getTime();
      if (age > this.maxBufferAge) {
        this.flushingBuffers.delete(key);
        cleanedCount += 1;
      }
    }

    if (cleanedCount > 0) {
      this.logger.log(`[BUFFER_CLEANUP] Removed ${cleanedCount} old buffers`);
    }
  }

  /**
   * 특정 세션의 모든 버퍼 삭제 (flush하지 않고 단순 삭제)
   */
  public clearSessionBuffers(room: string, recordId: number | null): void {
    const safeRecordId = recordId ?? 0;
    const keysToDelete: string[] = [];

    // 일반 버퍼에서 삭제
    for (const [key, buffer] of this.buffers) {
      if (buffer.room === room && buffer.recordId === safeRecordId) {
        keysToDelete.push(key);
      }
    }

    // flush 중인 버퍼에서도 삭제
    for (const [key, buffer] of this.flushingBuffers) {
      if (buffer.room === room && buffer.recordId === safeRecordId) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => {
      this.buffers.delete(key);
      this.flushingBuffers.delete(key);
    });

    this.logger.log(
      `[BUFFER_CLEAR_SESSION] Cleared ${keysToDelete.length} buffers for room: ${room}, recordId: ${safeRecordId}`,
    );
  }

  /**
   * 버퍼 상태 조회
   */
  public getBufferStats(): {
    totalBuffers: number;
    totalEvents: number;
    buffersByRoom: Map<string, number>;
  } {
    let totalEvents = 0;
    const buffersByRoom = new Map<string, number>();

    for (const buffer of this.buffers.values()) {
      totalEvents += buffer.events.length;
      const count = buffersByRoom.get(buffer.room) || 0;
      buffersByRoom.set(buffer.room, count + 1);
    }

    return {
      totalBuffers: this.buffers.size,
      totalEvents,
      buffersByRoom,
    };
  }

  /**
   * 주기적인 자동 저장 - 비활성화됨
   * Note: 더 이상 사용하지 않음. 연결 해제 시에만 저장
   */
  // private autoSaveBuffers(): void {
  //   const buffersToSave: Array<{ key: string; buffer: SessionBuffer }> = []
  //   const minEventsForAutoSave = 50 // 최소 50개 이상일 때만 자동 저장

  //   // 자동 저장이 필요한 버퍼 찾기
  //   for (const [key, buffer] of this.buffers) {
  //     if (buffer.events.length >= minEventsForAutoSave) {
  //       buffersToSave.push({ key, buffer })
  //     }
  //   }

  //   if (buffersToSave.length > 0) {
  //     this.logger.log(`[AUTO_SAVE_START] Found ${buffersToSave.length} buffers to auto-save`)

  //     // autoSaveCallback이 설정되어 있다면 호출
  //     buffersToSave.forEach(({ key, buffer }) => {
  //       this.logger.log(
  //         `[AUTO_SAVE_BUFFER] ${JSON.stringify({
  //           key,
  //           room: buffer.room,
  //           recordId: buffer.recordId,
  //           deviceId: buffer.deviceId,
  //           eventCount: buffer.events.length,
  //         })}`,
  //       )

  //       // 자동 저장은 WebviewGateway에서 처리하도록 이벤트 발행
  //       // 여기서는 로그만 남김
  //     })
  //   }
  // }

  /**
   * 자동 저장이 필요한 버퍼 목록 조회 - 비활성화됨
   * Note: 더 이상 사용하지 않음
   */
  // public getBuffersForAutoSave(minEvents: number = 50): Array<{
  //   room: string
  //   recordId: number
  //   deviceId: string
  //   eventCount: number
  // }> {
  //   const buffers: Array<{
  //     room: string
  //     recordId: number
  //     deviceId: string
  //     eventCount: number
  //   }> = []

  //   for (const buffer of this.buffers.values()) {
  //     if (buffer.events.length >= minEvents) {
  //       buffers.push({
  //         room: buffer.room,
  //         recordId: buffer.recordId,
  //         deviceId: buffer.deviceId,
  //         eventCount: buffer.events.length,
  //       })
  //     }
  //   }

  //   return buffers
  // }

  /**
   * 이전 세션의 버퍼 데이터를 현재 세션에 추가 (세션 연속성)
   */
  public loadPreviousSessionData(
    deviceId: string,
    room: string,
    recordId: number | null,
  ): BufferEvent[] {
    const { buffer: previousBuffer } = this.maybeMigrateLegacyKey(
      room,
      recordId,
      deviceId,
    );

    if (previousBuffer && previousBuffer.events.length > 0) {
      this.logger.log(
        `[LOAD_PREVIOUS_SESSION] Found ${previousBuffer.events.length} events from previous session for device: ${deviceId}`,
      );

      // 이전 세션 데이터 복사본 반환 (원본은 유지)
      return [...previousBuffer.events];
    }

    this.logger.log(
      `[LOAD_PREVIOUS_SESSION] No previous session data found for device: ${deviceId}`,
    );
    return [];
  }

  /**
   * 특정 디바이스의 모든 세션 버퍼 데이터 조회
   */
  public getDeviceSessionBuffers(deviceId: string): SessionBuffer[] {
    const deviceBuffers: SessionBuffer[] = [];

    for (const [, buffer] of this.buffers) {
      if (buffer.deviceId === deviceId) {
        deviceBuffers.push({ ...buffer, events: [...buffer.events] });
      }
    }

    // 생성 시간순으로 정렬
    return deviceBuffers.sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );
  }

  /**
   * 세션 연속성 확인 (같은 디바이스, 같은 URL 패턴)
   */
  public isSessionContinuation(
    deviceId: string,
    url: string,
    _room: string,
  ): boolean {
    const deviceBuffers = this.getDeviceSessionBuffers(deviceId);

    if (deviceBuffers.length === 0) {
      return false;
    }

    // 가장 최근 세션 확인
    const latestBuffer = deviceBuffers[deviceBuffers.length - 1];

    // URL 패턴 비교 (도메인과 경로가 유사한지)
    const currentDomain = new URL(url).hostname;
    const previousDomain = new URL(latestBuffer.url).hostname;

    return currentDomain === previousDomain;
  }

  /**
   * 세션 병합 (이전 세션 데이터를 현재 세션에 통합)
   */
  public mergeSessionData(
    currentRoom: string,
    currentRecordId: number | null,
    deviceId: string,
    previousEvents: BufferEvent[],
  ): void {
    if (previousEvents.length === 0) {
      return;
    }

    const safeRecordId = currentRecordId ?? 0;
    const { key: currentKey, buffer: resolvedBuffer } =
      this.maybeMigrateLegacyKey(currentRoom, safeRecordId, deviceId);

    let currentBuffer = resolvedBuffer;

    if (!currentBuffer) {
      // 현재 버퍼가 없으면 새로 생성
      const now = new Date();
      currentBuffer = {
        room: currentRoom,
        recordId: safeRecordId,
        deviceId,
        url: "",
        userAgent: "",
        events: [],
        createdAt: now,
        lastUpdated: now,
        sessionStartTime: now.getTime(),
        screenPreviewIndexes: {},
      };
      this.buffers.set(currentKey, currentBuffer);
    }

    if (currentBuffer.deviceId !== deviceId) {
      this.logger.log(
        `[BUFFER_SERVICE_DEVICE_UPDATE] Updating deviceId ${currentBuffer.deviceId} → ${deviceId} while merging session (room: ${currentRoom})`,
      );
      currentBuffer.deviceId = deviceId;
    }

    // 이전 이벤트들을 현재 버퍼 앞에 추가 (시간순 정렬)
    const mergedEvents = [...previousEvents, ...currentBuffer.events];

    // timestamp 기준으로 정렬
    mergedEvents.sort((a, b) => a.timestamp - b.timestamp);

    currentBuffer.events = mergedEvents;
    currentBuffer.lastUpdated = new Date();
    this.rebuildScreenPreviewIndexes(currentBuffer);

    this.logger.log(
      `[SESSION_MERGE_SUCCESS] Merged ${previousEvents.length} previous events into current session. Total: ${mergedEvents.length} events`,
    );
  }
}
