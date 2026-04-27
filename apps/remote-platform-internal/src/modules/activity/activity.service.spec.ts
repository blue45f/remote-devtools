import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { RecordEntity, TicketLogEntity } from "@remote-platform/entity";

import { ActivityService } from "./activity.service";

describe("ActivityService", () => {
  let service: ActivityService;
  let recordRepo: { find: ReturnType<typeof vi.fn> };
  let ticketRepo: { find: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    recordRepo = { find: vi.fn() };
    ticketRepo = { find: vi.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ActivityService,
        {
          provide: getRepositoryToken(RecordEntity),
          useValue: recordRepo as unknown as Repository<RecordEntity>,
        },
        {
          provide: getRepositoryToken(TicketLogEntity),
          useValue: ticketRepo as unknown as Repository<TicketLogEntity>,
        },
      ],
    }).compile();

    service = moduleRef.get(ActivityService);
  });

  it("returns recorded sessions as session entries", async () => {
    recordRepo.find.mockResolvedValue([
      {
        id: 42,
        name: "checkout",
        url: "https://shop.example.com/cart",
        deviceId: "dev-1",
        recordMode: true,
        timestamp: new Date("2026-04-27T10:00:00Z"),
      },
    ]);
    ticketRepo.find.mockResolvedValue([]);

    const feed = await service.getFeed(20);
    expect(feed).toHaveLength(1);
    expect(feed[0]).toMatchObject({
      id: "session-42",
      kind: "session",
      title: "Recorded session · checkout",
      subtitle: "https://shop.example.com/cart",
      device: "dev-1",
      sessionId: 42,
    });
    expect(feed[0].at).toBe("2026-04-27T10:00:00.000Z");
  });

  it("labels live sessions distinctly and omits sessionId", async () => {
    recordRepo.find.mockResolvedValue([
      {
        id: 7,
        name: "live-debug",
        url: "https://app.example.com",
        deviceId: "dev-2",
        recordMode: false,
        timestamp: new Date("2026-04-27T09:00:00Z"),
      },
    ]);
    ticketRepo.find.mockResolvedValue([]);

    const feed = await service.getFeed(20);
    expect(feed[0].kind).toBe("session");
    expect(feed[0].title).toBe("Live session · live-debug");
    expect(feed[0].sessionId).toBeUndefined();
  });

  it("merges tickets and records, ordered by recency", async () => {
    recordRepo.find.mockResolvedValue([
      {
        id: 1,
        name: "older-session",
        recordMode: true,
        timestamp: new Date("2026-04-27T08:00:00Z"),
      },
    ]);
    ticketRepo.find.mockResolvedValue([
      {
        id: 99,
        name: "fresh-bug",
        ticketUrl: "https://jira.example.com/T-1",
        createdAt: new Date("2026-04-27T11:00:00Z"),
      },
    ]);

    const feed = await service.getFeed(20);
    expect(feed.map((e) => e.id)).toEqual(["ticket-99", "session-1"]);
    expect(feed[0].kind).toBe("ticket");
  });

  it("survives a ticket repository that throws", async () => {
    recordRepo.find.mockResolvedValue([]);
    ticketRepo.find.mockRejectedValue(new Error("table missing"));
    const feed = await service.getFeed();
    expect(feed).toEqual([]);
  });

  it("respects the limit", async () => {
    const records = Array.from({ length: 30 }, (_, i) => ({
      id: i + 1,
      name: `s-${i}`,
      recordMode: false,
      timestamp: new Date(2026, 3, 27, 10, i),
    }));
    recordRepo.find.mockResolvedValue(records);
    ticketRepo.find.mockResolvedValue([]);

    const feed = await service.getFeed(5);
    expect(feed.length).toBe(5);
  });

  describe("getFeedPage (cursor pagination)", () => {
    it("returns a nextCursor when the page is full", async () => {
      const records = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        name: `s-${i}`,
        recordMode: false,
        timestamp: new Date(2026, 3, 27, 10, 30 - i),
      }));
      recordRepo.find.mockResolvedValue(records);
      ticketRepo.find.mockResolvedValue([]);

      const page = await service.getFeedPage(5);
      expect(page.rows).toHaveLength(5);
      // Cursor is the timestamp of the LAST (oldest) row in the page.
      expect(page.nextCursor).toBe(page.rows[4]?.at);
    });

    it("returns null nextCursor when fewer rows than limit", async () => {
      recordRepo.find.mockResolvedValue([
        {
          id: 1,
          name: "lone",
          recordMode: false,
          timestamp: new Date("2026-04-27T10:00:00Z"),
        },
      ]);
      ticketRepo.find.mockResolvedValue([]);

      const page = await service.getFeedPage(5);
      expect(page.rows).toHaveLength(1);
      expect(page.nextCursor).toBeNull();
    });

    it("passes a `before` filter to the repos when cursor provided", async () => {
      recordRepo.find.mockResolvedValue([]);
      ticketRepo.find.mockResolvedValue([]);

      await service.getFeedPage(20, null, "2026-04-27T10:00:00.000Z");

      // The where clause should contain a LessThan operator on timestamp.
      const args = recordRepo.find.mock.calls.at(0)?.[0];
      expect(args?.where).toBeDefined();
      expect(args?.where?.timestamp).toBeDefined();
    });

    it("ignores an invalid `before` value rather than throwing", async () => {
      recordRepo.find.mockResolvedValue([]);
      ticketRepo.find.mockResolvedValue([]);

      const page = await service.getFeedPage(5, null, "not-a-date");
      expect(page.rows).toEqual([]);
      // No where clause should have been added for an invalid date.
      const args = recordRepo.find.mock.calls.at(0)?.[0];
      expect(args?.where?.timestamp).toBeUndefined();
    });
  });
});
