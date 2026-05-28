import { NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { NetworkService } from "@remote-platform/core";
import { RecordEntity, ScreenEntity } from "@remote-platform/entity";

import { S3Service } from "../s3/s3.service";

import { SessionReplayService } from "./session-replay.service";

describe("SessionReplayService.getSessionMetadata", () => {
  let service: SessionReplayService;
  let recordRepo: { findOne: ReturnType<typeof vi.fn> };
  let screenRepo: { createQueryBuilder: ReturnType<typeof vi.fn> };

  function makeQueryBuilder(stats: Record<string, unknown>) {
    return {
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      addOrderBy: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      addSelect: vi.fn().mockReturnThis(),
      getRawOne: vi.fn().mockResolvedValue(stats),
      getMany: vi.fn().mockResolvedValue([]),
    };
  }

  beforeEach(async () => {
    recordRepo = { findOne: vi.fn() };
    screenRepo = { createQueryBuilder: vi.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        SessionReplayService,
        { provide: getRepositoryToken(RecordEntity), useValue: recordRepo },
        { provide: getRepositoryToken(ScreenEntity), useValue: screenRepo },
        { provide: S3Service, useValue: {} },
        {
          provide: NetworkService,
          useValue: { findByRecordId: vi.fn().mockResolvedValue([]) },
        },
      ],
    }).compile();

    service = moduleRef.get(SessionReplayService);
  });

  it("returns the new metadata fields (deviceId, url, recordMode, createdAt, userAgent)", async () => {
    const createdAt = new Date("2026-04-27T10:00:00Z");
    recordRepo.findOne.mockResolvedValue({
      id: 42,
      name: "checkout-bug",
      duration: 9_000_000_000,
      deviceId: "device-abc",
      url: "https://shop.example.com/cart",
      recordMode: true,
      timestamp: createdAt,
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/127",
    });
    screenRepo.createQueryBuilder.mockReturnValue(
      makeQueryBuilder({
        count: 7,
        startTime: 1000n,
        endTime: 9000n,
        fullSnapshots: 1,
      }),
    );

    const meta = await service.getSessionMetadata(42);
    expect(meta).toMatchObject({
      id: 42,
      name: "checkout-bug",
      duration: 9_000_000_000,
      eventCount: 7,
      hasFullSnapshot: true,
      deviceId: "device-abc",
      url: "https://shop.example.com/cart",
      recordMode: true,
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/127",
    });
    // createdAt is serialised as ISO string
    expect(meta.createdAt).toBe(createdAt.toISOString());
  });

  it("omits deviceId/url/userAgent when the record has no values", async () => {
    recordRepo.findOne.mockResolvedValue({
      id: 1,
      name: "headless",
      duration: 0,
      deviceId: null,
      url: null,
      recordMode: false,
      timestamp: new Date("2026-04-27T00:00:00Z"),
      userAgent: null,
    });
    screenRepo.createQueryBuilder.mockReturnValue(
      makeQueryBuilder({
        count: 0,
        startTime: 0,
        endTime: 0,
        fullSnapshots: 0,
      }),
    );

    const meta = await service.getSessionMetadata(1);
    expect(meta.deviceId).toBeUndefined();
    expect(meta.url).toBeUndefined();
    expect(meta.userAgent).toBeUndefined();
    expect(meta.recordMode).toBe(false);
    expect(meta.hasFullSnapshot).toBe(false);
  });

  it("throws NotFound when the record id does not exist", async () => {
    recordRepo.findOne.mockResolvedValue(null);
    await expect(service.getSessionMetadata(404)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe("SessionReplayService.getSessionNetwork", () => {
  let service: SessionReplayService;
  let networkService: { findByRecordId: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    networkService = {
      findByRecordId: vi.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        SessionReplayService,
        {
          provide: getRepositoryToken(RecordEntity),
          useValue: { findOne: vi.fn() },
        },
        {
          provide: getRepositoryToken(ScreenEntity),
          useValue: { createQueryBuilder: vi.fn() },
        },
        { provide: S3Service, useValue: {} },
        { provide: NetworkService, useValue: networkService },
      ],
    }).compile();

    service = moduleRef.get(SessionReplayService);
  });

  it("returns [] for S3-backed session ids", async () => {
    const out = await service.getSessionNetwork("s3-foo-12345-0");
    expect(out).toEqual([]);
    expect(networkService.findByRecordId).not.toHaveBeenCalled();
  });

  it("returns [] for non-integer ids", async () => {
    expect(await service.getSessionNetwork("garbage")).toEqual([]);
    expect(await service.getSessionNetwork(0)).toEqual([]);
    expect(networkService.findByRecordId).not.toHaveBeenCalled();
  });

  it("flattens a Network.responseReceived row into a table-friendly shape", async () => {
    networkService.findByRecordId.mockResolvedValue([
      {
        id: 1,
        requestId: 42,
        timestamp: "1700000000000",
        protocol: {
          method: "Network.responseReceived",
          params: {
            type: "Fetch",
            response: {
              url: "https://api.example.com/cart",
              status: 200,
              statusText: "OK",
              mimeType: "application/json",
              encodedDataLength: 1234,
            },
            request: { method: "POST" },
          },
        },
        responseBody: '{"ok":true}',
        base64Encoded: false,
      },
    ]);

    const [row] = await service.getSessionNetwork(7);
    expect(row).toMatchObject({
      id: 1,
      requestId: 42,
      timestamp: 1700000000000,
      method: "POST",
      url: "https://api.example.com/cart",
      status: 200,
      statusText: "OK",
      resourceType: "Fetch",
      mimeType: "application/json",
      encodedDataLength: 1234,
      responseBody: '{"ok":true}',
      base64Encoded: false,
    });
  });

  it("falls back gracefully when the protocol envelope is missing", async () => {
    networkService.findByRecordId.mockResolvedValue([
      {
        id: 9,
        requestId: 99,
        timestamp: 100,
        protocol: null,
        responseBody: null,
        base64Encoded: null,
      },
    ]);

    const [row] = await service.getSessionNetwork(7);
    expect(row.id).toBe(9);
    expect(row.url).toBe("");
    expect(row.method).toBe("GET");
    expect(row.status).toBeUndefined();
  });
});
