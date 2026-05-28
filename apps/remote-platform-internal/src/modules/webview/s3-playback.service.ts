import { Injectable, Logger } from '@nestjs/common';
import * as WebSocket from 'ws';

import { ProtocolEntry } from './webview.types';

type ResponseBodyCacheValue = { body: string; base64Encoded: boolean };

export type S3BackupSession = {
  room?: string;
  sessionStartTime?: number;
  timestamp?: number;
  bufferData?: unknown;
};

type S3BackupEvent = {
  method: string;
  params?: Record<string, unknown>;
  timestamp?: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isS3BackupEvent = (value: unknown): value is S3BackupEvent =>
  isRecord(value) && typeof value.method === 'string';

const getNumberParam = (
  params: Record<string, unknown> | undefined,
  key: string,
): number | undefined => {
  const value = params?.[key];
  return typeof value === 'number' ? value : undefined;
};

/**
 * Service responsible for S3 backup playback and data loading logic.
 * Handles loading backup data from S3, classifying events, and managing playback caches.
 */
@Injectable()
export class S3PlaybackService {
  private readonly logger = new Logger(S3PlaybackService.name);

  /** Caches response bodies per client for S3 backup playback. */
  private readonly s3ResponseBodyCache: Map<WebSocket, Map<number, ResponseBodyCacheValue>> =
    new Map();

  /** Caches full S3 backup data per client for on-demand queries. */
  private readonly s3BackupCache: Map<WebSocket, S3BackupSession[]> = new Map();

  // -------------------------------------------------------------------------
  // Public API - Cache Management
  // -------------------------------------------------------------------------

  /**
   * Initializes caches for a client session.
   */
  public initializeClientCaches(client: WebSocket, backupData: S3BackupSession[]): void {
    this.s3BackupCache.set(client, backupData);
    this.s3ResponseBodyCache.set(client, new Map<number, ResponseBodyCacheValue>());
  }

  /**
   * Clears all caches for a disconnected client.
   */
  public clearClientCaches(client: WebSocket): void {
    this.s3BackupCache.delete(client);
    this.s3ResponseBodyCache.delete(client);
  }

  /**
   * Gets the response body cache for a client.
   */
  public getResponseBodyCache(client: WebSocket): Map<number, ResponseBodyCacheValue> | undefined {
    return this.s3ResponseBodyCache.get(client);
  }

  /**
   * Gets the backup data cache for a client.
   */
  public getBackupCache(client: WebSocket): S3BackupSession[] | undefined {
    return this.s3BackupCache.get(client);
  }

  // -------------------------------------------------------------------------
  // Public API - Session Data Extraction
  // -------------------------------------------------------------------------

  /**
   * Extracts the session start time from backup data.
   */
  public extractSessionStartTime(backupData: S3BackupSession[]): number | null {
    if (backupData.length === 0) return null;

    const backupWithTime = backupData.find((backup) => backup.sessionStartTime);
    if (backupWithTime) return backupWithTime.sessionStartTime;
    if (backupData[0].timestamp) return backupData[0].timestamp;
    return null;
  }

  /**
   * Generates an S3 session ID from device ID and session start time.
   */
  public generateS3SessionId(deviceId: string, sessionStartTime: number | null): string | null {
    const encodedDeviceId = encodeURIComponent(deviceId || 'unknown-device');
    return sessionStartTime ? `s3-${encodedDeviceId}-${sessionStartTime}-0` : null;
  }

  // -------------------------------------------------------------------------
  // Public API - Event Classification
  // -------------------------------------------------------------------------

  /**
   * Classifies backup buffer events into domain-specific arrays.
   * Returns separate arrays for Network, Runtime, SessionReplay, and other protocols.
   */
  public classifyBackupEvents(
    backupData: S3BackupSession[],
    responseBodyCache: Map<number, ResponseBodyCacheValue>,
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

    this.logger.log(`[S3_PLAYBACK] Loading ${backupData.length} sessions from S3`);

    let totalEvents = 0;

    for (const backup of backupData) {
      if (!backup.bufferData || !Array.isArray(backup.bufferData)) {
        this.logger.warn(`[S3_PLAYBACK] Invalid bufferData in session ${backup.room}`);
        continue;
      }

      totalEvents += backup.bufferData.length;

      for (const event of backup.bufferData) {
        if (!isS3BackupEvent(event)) continue;

        // Skip metadata events (not real CDP events)
        if (event.method === 'buffering.saveSession') continue;

        // Cache updateResponseBody events (same lookup logic as DB playback)
        const requestId = getNumberParam(event.params, 'requestId');
        if (event.method === 'updateResponseBody' && requestId !== undefined) {
          responseBodyCache.set(requestId, {
            body: typeof event.params?.body === 'string' ? event.params.body : '',
            base64Encoded: event.params?.base64Encoded === true,
          });
        }

        const timestamp = typeof event.timestamp === 'number' ? event.timestamp : 0;

        // Classify Session Replay events separately
        if (event.method.startsWith('SessionReplay.')) {
          sessionReplayProtocols.push({
            protocol: { method: event.method, params: event.params ?? {} },
            timestamp,
            domain: 'SessionReplay',
          });
          continue;
        }

        // Standard CDP event classification
        const protocolData: ProtocolEntry = {
          protocol: { method: event.method, params: event.params ?? {} },
          timestamp,
          domain: event.method.split('.')[0],
          requestId,
        };

        if (event.method.startsWith('Network.')) {
          networkProtocols.push(protocolData);
        } else if (event.method.startsWith('Runtime.')) {
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

  /**
   * Sorts protocol arrays chronologically.
   */
  public sortProtocolsByTimestamp(protocols: ProtocolEntry[]): ProtocolEntry[] {
    return protocols.sort((a, b) => a.timestamp - b.timestamp);
  }

  // -------------------------------------------------------------------------
  // Public API - S3 Cache Lookup Helpers
  // -------------------------------------------------------------------------

  /**
   * Finds a cached response body for the given requestId.
   * Uses the per-client response body cache populated during backup event classification.
   */
  public findResponseBodyInS3Cache(
    client: WebSocket,
    requestId: number,
  ): { body: string; base64Encoded: boolean } | null {
    const responseBodyCache = this.s3ResponseBodyCache.get(client);
    if (!responseBodyCache) return null;

    const responseData = responseBodyCache.get(requestId);
    if (responseData) {
      this.logger.log(`[RESPONSE_BODY_FOUND] Found responseBody for requestId ${requestId}`);
      return responseData;
    }

    return null;
  }

  /**
   * Finds the latest DOM data from the S3 backup cache.
   */
  public findDomDataInS3Cache(client: WebSocket): unknown | null {
    const cachedBackupData = this.s3BackupCache.get(client);
    if (!cachedBackupData) return null;

    let latestDomData: unknown = null;
    let latestTimestamp = 0;

    for (const backup of cachedBackupData) {
      if (!backup.bufferData || !Array.isArray(backup.bufferData)) continue;

      for (const event of backup.bufferData) {
        if (!isS3BackupEvent(event)) continue;

        if (event.method === 'DOM.updated' && event.params && event.timestamp) {
          if (event.timestamp > latestTimestamp) {
            latestTimestamp = event.timestamp;
            latestDomData = event.params.root || event.params;
          }
        }

        const result = isRecord(event.params?.result) ? event.params.result : null;
        if (event.method === 'DOM.getDocument' && result?.root && event.timestamp) {
          if (event.timestamp > latestTimestamp) {
            latestTimestamp = event.timestamp;
            latestDomData = result.root;
          }
        }
      }
    }

    if (latestDomData) {
      this.logger.log(`[S3_LATEST_DOM] Found latest DOM with timestamp: ${latestTimestamp}`);
    }

    return latestDomData;
  }

  /**
   * Finds the latest screen capture data from the S3 backup cache.
   */
  public findScreenDataInS3Cache(client: WebSocket): unknown | null {
    const cachedBackupData = this.s3BackupCache.get(client);
    if (!cachedBackupData) return null;

    let latestScreenData: unknown = null;
    let latestTimestamp = 0;

    for (const backup of cachedBackupData) {
      if (!backup.bufferData || !Array.isArray(backup.bufferData)) continue;

      for (const event of backup.bufferData) {
        if (!isS3BackupEvent(event)) continue;

        if (event.method === 'ScreenPreview.captured' && event.params && event.timestamp) {
          if (event.timestamp > latestTimestamp) {
            latestTimestamp = event.timestamp;
            latestScreenData = {
              method: 'ScreenPreview.captured',
              params: event.params,
            };
          }
        }
      }
    }

    if (latestScreenData) {
      this.logger.log(`[S3_LATEST_SCREEN] Found latest screen with timestamp: ${latestTimestamp}`);
    }

    return latestScreenData;
  }

  // -------------------------------------------------------------------------
  // Public API - Logging Helpers
  // -------------------------------------------------------------------------

  /**
   * Logs the first few protocols in chronological send order.
   */
  public logProtocolSummary(allProtocols: ProtocolEntry[]): void {
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
}
