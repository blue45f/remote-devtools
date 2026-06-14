import { Test } from '@nestjs/testing';
import {
  DomService,
  NetworkService,
  RecordService,
  RuntimeService,
  ScreenService,
} from '@remote-platform/core';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { S3Service } from '../s3/s3.service';

import { ObjectReconstructionService } from './object-reconstruction.service';
import { S3PlaybackService } from './s3-playback.service';
import { WebviewGateway } from './webview.gateway';

import type { RoomData } from './webview.types';
import type { TestingModule } from '@nestjs/testing';
import type * as WebSocket from 'ws';

describe('WebviewGateway (Internal)', () => {
  let gateway: WebviewGateway;

  const mockRecordService = { findAll: vi.fn(), updateDuration: vi.fn() };
  const mockNetworkService = { create: vi.fn() };
  const mockDomService = { upsert: vi.fn() };
  const mockRuntimeService = { create: vi.fn() };
  const mockScreenService = { upsert: vi.fn(), findScreens: vi.fn() };
  const mockS3Service = { listBackupFiles: vi.fn() };
  const mockObjectReconstruction = {
    reconstructObjectAsJson: vi.fn(),
    collectPropertySnapshots: vi.fn(),
  };
  const mockS3Playback = { clearClientCaches: vi.fn() };
  const setRoom = (room: string, roomData: RoomData) => {
    (gateway as unknown as { readonly rooms: Map<string, RoomData> }).rooms.set(room, roomData);
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebviewGateway,
        { provide: RecordService, useValue: mockRecordService },
        { provide: NetworkService, useValue: mockNetworkService },
        { provide: DomService, useValue: mockDomService },
        { provide: RuntimeService, useValue: mockRuntimeService },
        { provide: ScreenService, useValue: mockScreenService },
        { provide: S3Service, useValue: mockS3Service },
        {
          provide: ObjectReconstructionService,
          useValue: mockObjectReconstruction,
        },
        { provide: S3PlaybackService, useValue: mockS3Playback },
      ],
    }).compile();
    gateway = module.get<WebviewGateway>(WebviewGateway);
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(gateway).toBeDefined();
    });
  });

  describe('getLiveRoomList', () => {
    it('should return empty array when no rooms', () => {
      const result = gateway.getLiveRoomList();
      expect(result).toEqual([]);
    });
  });

  describe('handleConnection', () => {
    it('should be defined', () => {
      expect(gateway.handleConnection).toBeDefined();
    });
  });

  describe('handleDisconnect', () => {
    it('should be defined', () => {
      expect(gateway.handleDisconnect).toBeDefined();
    });

    it('should clean up S3 playback caches on disconnect', async () => {
      const mockClient = { readyState: 3 } as WebSocket;
      await gateway.handleDisconnect(mockClient);
      expect(mockS3Playback.clearClientCaches).toHaveBeenCalledWith(mockClient);
    });
  });

  describe('handleProtocolToAllDevtools', () => {
    it('persists Network messages with requestId to the network service', async () => {
      const devtools = { send: vi.fn() } as unknown as WebSocket;
      const client = { send: vi.fn() } as unknown as WebSocket;
      setRoom('Record-1', {
        client,
        devtools: new Map([['devtools-1', devtools]]),
        recordMode: true,
        recordId: 42,
      });

      await gateway.handleProtocolToAllDevtools(
        {
          room: 'Record-1',
          message: JSON.stringify({
            method: 'Network.responseReceived',
            params: { requestId: '7' },
          }),
        },
        client,
      );

      expect(devtools.send).toHaveBeenCalledTimes(1);
      expect(mockNetworkService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          recordId: 42,
          requestId: 7,
        }),
      );
      expect(mockRuntimeService.create).not.toHaveBeenCalled();
    });

    it('does not persist non-Network messages with requestId to the network service', async () => {
      const devtools = { send: vi.fn() } as unknown as WebSocket;
      const client = { send: vi.fn() } as unknown as WebSocket;
      setRoom('Record-2', {
        client,
        devtools: new Map([['devtools-1', devtools]]),
        recordMode: true,
        recordId: 84,
      });

      await gateway.handleProtocolToAllDevtools(
        {
          room: 'Record-2',
          message: JSON.stringify({
            method: 'Runtime.consoleAPICalled',
            params: { requestId: '7' },
          }),
        },
        client,
      );

      expect(mockNetworkService.create).not.toHaveBeenCalled();
      expect(mockRuntimeService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          recordId: 84,
        }),
      );
    });
  });
});
