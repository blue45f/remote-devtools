import { Injectable, Logger } from "@nestjs/common";

export interface BufferEvent {
  readonly method: string;
  readonly params: unknown;
  readonly timestamp: number;
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
  sessionStartTime: number;
  screenPreviewIndexes: Record<string, number>;
}

@Injectable()
export class BufferService {
  private readonly logger = new Logger(BufferService.name);

  /** In-memory buffer storage keyed by "room_recordId". */
  private readonly buffers = new Map<string, SessionBuffer>();

  /** Buffers currently being flushed (prevents data loss during async operations). */
  private readonly flushingBuffers = new Map<string, SessionBuffer>();

  /** Maximum number of events a single buffer can hold. */
  private readonly maxBufferSize = 50000;

  /** Event count threshold for auto-flush (disabled: uses periodic flush only). */
  private readonly flushThreshold = Infinity;

  /** Maximum age of a buffer before it is cleaned up (30 minutes). */
  private readonly maxBufferAge = 30 * 60 * 1000;

  constructor() {
    // Periodically clean up stale buffers every 5 minutes
    setInterval(() => this.cleanupOldBuffers(), 5 * 60 * 1000);

    this.logger.log(
      "[BUFFER_SERVICE] Periodic auto-save disabled - only save on disconnect",
    );
  }

  /**
   * Generates a buffer key from the room name and record ID.
   */
  private getBufferKey(room: string, recordId: number | null): string {
    const safeRecordId = recordId ?? 0;
    return `${room}_${safeRecordId}`;
  }

  /**
   * Attempts to find a buffer by the current key format, falling back to
   * a legacy key format if necessary. Migrates the buffer if found under
   * a legacy key.
   */
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
          `[BUFFER_SERVICE_MIGRATE_KEY] Migrating legacy buffer key ${legacyKey} -> ${key} (device: ${preferredDeviceId ?? legacyBuffer.deviceId})`,
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

  /**
   * After removing an event at `removedIndex`, adjusts the
   * ScreenPreview index map so all subsequent indexes shift down by 1.
   */
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

  /**
   * After shifting the first event off the ring buffer, adjusts all
   * ScreenPreview indexes down by 1 (removing any that become negative).
   */
  private adjustScreenPreviewIndexesAfterShift(buffer: SessionBuffer): void {
    for (const [method, index] of Object.entries(buffer.screenPreviewIndexes)) {
      if (index === 0) {
        delete buffer.screenPreviewIndexes[method];
      } else if (index > 0) {
        buffer.screenPreviewIndexes[method] = index - 1;
      }
    }
  }

  /**
   * Fully rebuilds the ScreenPreview index map by scanning all events.
   */
  private rebuildScreenPreviewIndexes(buffer: SessionBuffer): void {
    buffer.screenPreviewIndexes = {};

    buffer.events.forEach((bufferEvent, idx) => {
      if (this.isScreenPreviewEvent(bufferEvent)) {
        buffer.screenPreviewIndexes[bufferEvent.method] = idx;
      }
    });
  }

  /**
   * Adds an event to the buffer for the given session.
   * For ScreenPreview events, the previous event with the same method
   * is replaced rather than appended.
   *
   * Returns whether the buffer should be flushed and the current event count.
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
    // Record/Live rooms are not buffered
    if (room.startsWith("Record-") || room.startsWith("Live-")) {
      this.logger.log(
        `[BUFFER_SERVICE_SKIP] Ignoring buffer event for ${room}`,
      );
      return { shouldFlush: false, eventCount: 0 };
    }

    const { key, buffer: resolvedBuffer } = this.maybeMigrateLegacyKey(
      room,
      recordId,
      deviceId,
    );
    const safeRecordId = recordId ?? 0;

    let buffer = resolvedBuffer;
    if (!buffer) {
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
        `[BUFFER_SERVICE_DEVICE_UPDATE] Updating deviceId ${buffer.deviceId} -> ${deviceId} for room ${room}`,
      );
      buffer.deviceId = deviceId;
    }

    const isScreenPreview = this.isScreenPreviewEvent(event);
    const screenPreviewMethod = isScreenPreview ? event.method : null;
    let newScreenPreviewIndex: number | null = null;

    // Replace existing ScreenPreview event with the same method
    if (isScreenPreview && screenPreviewMethod) {
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
    if (isScreenPreview) {
      newScreenPreviewIndex = buffer.events.length - 1;
    }

    buffer.lastUpdated = new Date();
    buffer.url = url;
    buffer.userAgent = userAgent;
    if (typeof title === "string") {
      buffer.title = title;
    }

    // Evict the oldest event when the ring buffer is full
    if (buffer.events.length > this.maxBufferSize) {
      buffer.events.shift();
      this.adjustScreenPreviewIndexesAfterShift(buffer);
      if (newScreenPreviewIndex !== null) {
        newScreenPreviewIndex -= 1;
      }
    }

    if (isScreenPreview && screenPreviewMethod) {
      if (newScreenPreviewIndex !== null && newScreenPreviewIndex >= 0) {
        buffer.screenPreviewIndexes[screenPreviewMethod] =
          newScreenPreviewIndex;
      } else {
        delete buffer.screenPreviewIndexes[screenPreviewMethod];
      }
    }

    const shouldFlush = buffer.events.length >= this.flushThreshold;

    if (shouldFlush) {
      this.logger.log(
        `[BUFFER_AUTO_FLUSH_TRIGGERED] key: ${key}, eventCount: ${buffer.events.length}, threshold: ${this.flushThreshold}`,
      );
    }

    return { shouldFlush, eventCount: buffer.events.length };
  }

  /**
   * Force-flushes a buffer regardless of event count.
   * Returns null if the buffer is empty or does not exist.
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

    this.setFlushingBuffer(key, buffer);
    this.buffers.delete(key);

    if (deviceId && buffer.deviceId !== deviceId) {
      this.logger.log(
        `[BUFFER_SERVICE_DEVICE_UPDATE] Updating deviceId ${buffer.deviceId} -> ${deviceId} during force flush (room: ${room})`,
      );
      buffer.deviceId = deviceId;
    }

    return { ...buffer, events: [...buffer.events] };
  }

  /**
   * Flushes (retrieves and clears) the buffer for a given session.
   * The buffer is moved to flushing state to prevent data loss.
   */
  public flushBuffer(
    room: string,
    recordId: number | null,
    deviceId: string,
  ): SessionBuffer | null {
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

    this.setFlushingBuffer(key, buffer);
    this.buffers.delete(key);

    if (deviceId && buffer.deviceId !== deviceId) {
      this.logger.log(
        `[BUFFER_SERVICE_DEVICE_UPDATE] Updating deviceId ${buffer.deviceId} -> ${deviceId} during flush (room: ${room})`,
      );
      buffer.deviceId = deviceId;
    }

    const flushedBuffer: SessionBuffer = {
      ...buffer,
      events: [...buffer.events],
    };

    this.logger.log(
      `[FLUSH_BUFFER_SUCCESS] key: ${key}, eventCount: ${flushedBuffer.events.length}, ` +
        `firstEvent: ${flushedBuffer.events[0]?.method}, lastEvent: ${flushedBuffer.events[flushedBuffer.events.length - 1]?.method}`,
    );

    // Remove from flushing state asynchronously
    setTimeout(() => {
      this.deleteFlushingBuffer(key);
    }, 0);

    return flushedBuffer;
  }

  /**
   * Retrieves all buffers belonging to a specific room and record.
   */
  public getSessionBuffers(
    room: string,
    recordId: number | null,
  ): SessionBuffer[] {
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
   * Removes buffers that have not been updated within the maximum age threshold.
   */
  private cleanupOldBuffers(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, buffer] of this.buffers) {
      const age = now - buffer.lastUpdated.getTime();
      if (age > this.maxBufferAge) {
        this.buffers.delete(key);
        cleanedCount += 1;
      }
    }

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
   * Deletes all buffers for a given session without flushing.
   */
  public clearSessionBuffers(room: string, recordId: number | null): void {
    const safeRecordId = recordId ?? 0;
    const keysToDelete: string[] = [];

    for (const [key, buffer] of this.buffers) {
      if (buffer.room === room && buffer.recordId === safeRecordId) {
        keysToDelete.push(key);
      }
    }

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
   * Returns aggregate statistics about all active buffers.
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
   * Loads events from a previous session for the same device/room/record,
   * enabling session continuity.
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
      return [...previousBuffer.events];
    }

    this.logger.log(
      `[LOAD_PREVIOUS_SESSION] No previous session data found for device: ${deviceId}`,
    );
    return [];
  }

  /**
   * Retrieves all session buffers for a specific device.
   */
  public getDeviceSessionBuffers(deviceId: string): SessionBuffer[] {
    const deviceBuffers: SessionBuffer[] = [];

    for (const [, buffer] of this.buffers) {
      if (buffer.deviceId === deviceId) {
        deviceBuffers.push({ ...buffer, events: [...buffer.events] });
      }
    }

    return deviceBuffers.sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );
  }

  /**
   * Checks whether the given device has a recent session on the same domain,
   * indicating a session continuation.
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

    const latestBuffer = deviceBuffers[deviceBuffers.length - 1];

    const currentDomain = new URL(url).hostname;
    const previousDomain = new URL(latestBuffer.url).hostname;

    return currentDomain === previousDomain;
  }

  /**
   * Merges events from a previous session into the current session buffer,
   * maintaining chronological order by timestamp.
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
        `[BUFFER_SERVICE_DEVICE_UPDATE] Updating deviceId ${currentBuffer.deviceId} -> ${deviceId} while merging session (room: ${currentRoom})`,
      );
      currentBuffer.deviceId = deviceId;
    }

    // Prepend previous events and sort by timestamp
    const mergedEvents = [...previousEvents, ...currentBuffer.events];
    mergedEvents.sort((a, b) => a.timestamp - b.timestamp);

    currentBuffer.events = mergedEvents;
    currentBuffer.lastUpdated = new Date();
    this.rebuildScreenPreviewIndexes(currentBuffer);

    this.logger.log(
      `[SESSION_MERGE_SUCCESS] Merged ${previousEvents.length} previous events into current session. Total: ${mergedEvents.length} events`,
    );
  }
}
