import { NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
      ],
    }).compile();

    service = moduleRef.get(SessionReplayService);
  });

  it("returns the new metadata fields (deviceId, url, recordMode, createdAt)", async () => {
    const createdAt = new Date("2026-04-27T10:00:00Z");
    recordRepo.findOne.mockResolvedValue({
      id: 42,
      name: "checkout-bug",
      duration: 9_000_000_000,
      deviceId: "device-abc",
      url: "https://shop.example.com/cart",
      recordMode: true,
      timestamp: createdAt,
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
    });
    // createdAt is serialised as ISO string
    expect(meta.createdAt).toBe(createdAt.toISOString());
  });

  it("omits deviceId/url when the record has no values", async () => {
    recordRepo.findOne.mockResolvedValue({
      id: 1,
      name: "headless",
      duration: 0,
      deviceId: null,
      url: null,
      recordMode: false,
      timestamp: new Date("2026-04-27T00:00:00Z"),
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
