import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import { describe, it, expect, beforeEach, vi } from "vitest";

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
import { WebviewGateway } from "./webview.gateway";

describe("WebviewGateway (Internal)", () => {
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

  describe("initialization", () => {
    it("should be defined", () => {
      expect(gateway).toBeDefined();
    });
  });

  describe("getLiveRoomList", () => {
    it("should return empty array when no rooms", () => {
      const result = gateway.getLiveRoomList();
      expect(result).toEqual([]);
    });
  });

  describe("handleConnection", () => {
    it("should be defined", () => {
      expect(gateway.handleConnection).toBeDefined();
    });
  });

  describe("handleDisconnect", () => {
    it("should be defined", () => {
      expect(gateway.handleDisconnect).toBeDefined();
    });

    it("should clean up S3 playback caches on disconnect", async () => {
      const mockClient = { readyState: 3 } as any;
      await gateway.handleDisconnect(mockClient);
      expect(mockS3Playback.clearClientCaches).toHaveBeenCalledWith(mockClient);
    });
  });
});
