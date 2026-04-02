import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import { describe, it, expect, beforeEach, vi } from "vitest";

import {
  DomService,
  NetworkService,
  RuntimeService,
  ScreenService,
} from "@remote-platform/core";

import { CdpEventPersistenceService } from "./cdp-event-persistence.service";

describe("CdpEventPersistenceService", () => {
  let service: CdpEventPersistenceService;
  const mockNetworkService = { create: vi.fn(), updateResponseBody: vi.fn() };
  const mockDomService = { upsert: vi.fn() };
  const mockRuntimeService = { create: vi.fn() };
  const mockScreenService = { upsert: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CdpEventPersistenceService,
        { provide: NetworkService, useValue: mockNetworkService },
        { provide: DomService, useValue: mockDomService },
        { provide: RuntimeService, useValue: mockRuntimeService },
        { provide: ScreenService, useValue: mockScreenService },
      ],
    }).compile();

    service = module.get<CdpEventPersistenceService>(
      CdpEventPersistenceService,
    );
  });

  describe("mapRrwebEventType", () => {
    it("should map known rrweb event types", () => {
      expect(service.mapRrwebEventType(0)).toBe("dom_loaded");
      expect(service.mapRrwebEventType(1)).toBe("page_loaded");
      expect(service.mapRrwebEventType(2)).toBe("full_snapshot");
      expect(service.mapRrwebEventType(3)).toBe("incremental_snapshot");
      expect(service.mapRrwebEventType(4)).toBe("meta");
      expect(service.mapRrwebEventType(5)).toBe("custom");
    });

    it("should return fallback for unknown types", () => {
      expect(service.mapRrwebEventType(99)).toBe("rrweb_99");
    });
  });

  describe("toTimestampNs", () => {
    it("should convert milliseconds to nanoseconds", () => {
      expect(service.toTimestampNs(1000)).toBe(1000_000_000);
    });

    it("should handle string input", () => {
      expect(service.toTimestampNs("1000")).toBe(1000_000_000);
    });

    it("should return hrtime-based timestamp for invalid input", () => {
      const result = service.toTimestampNs(undefined);
      expect(result).toBeGreaterThan(0);
    });
  });

  describe("persistProtocolEvent", () => {
    it("should persist network events", async () => {
      const protocol = {
        method: "Network.requestWillBeSent",
        params: { requestId: "1" },
      };

      await service.persistProtocolEvent(protocol, 100);

      expect(mockNetworkService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          recordId: 100,
          protocol,
          requestId: "1",
        }),
      );
    });

    it("should persist DOM events", async () => {
      const protocol = {
        method: "DOM.updated",
        params: { nodeId: 1 },
      };

      await service.persistProtocolEvent(protocol, 100);

      expect(mockDomService.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          recordId: 100,
          type: "entireDom",
        }),
      );
    });

    it("should persist Runtime events", async () => {
      const protocol = {
        method: "Runtime.consoleAPICalled",
        params: { type: "log" },
      };

      await service.persistProtocolEvent(protocol, 100);

      expect(mockRuntimeService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          recordId: 100,
          protocol,
        }),
      );
    });

    it("should persist ScreenPreview events", async () => {
      const protocol = {
        method: "ScreenPreview.captured",
        params: { isFirstSnapshot: true },
      };

      await service.persistProtocolEvent(protocol, 100);

      expect(mockScreenService.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          recordId: 100,
          type: "screenPreview",
          eventType: "full_snapshot",
        }),
      );
    });

    it("should persist user.interaction events", async () => {
      const protocol = {
        method: "user.interaction",
        params: { type: "click" },
      };

      await service.persistProtocolEvent(protocol, 100);

      expect(mockScreenService.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          recordId: 100,
          eventType: "user_interaction",
        }),
      );
    });

    it("should persist user.scroll events", async () => {
      const protocol = {
        method: "user.scroll",
        params: { scrollTop: 100 },
      };

      await service.persistProtocolEvent(protocol, 100);

      expect(mockScreenService.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          recordId: 100,
          eventType: "viewport_change",
        }),
      );
    });
  });

  describe("persistBufferedEvent", () => {
    it("should route Network events correctly", async () => {
      await service.persistBufferedEvent(100, {
        method: "Network.requestWillBeSent",
        params: { requestId: "1" },
        timestamp: 1000,
      });

      expect(mockNetworkService.create).toHaveBeenCalled();
    });

    it("should route updateResponseBody events correctly", async () => {
      await service.persistBufferedEvent(100, {
        method: "updateResponseBody",
        params: { requestId: "1", body: "test", base64Encoded: false },
        timestamp: 1000,
      });

      expect(mockNetworkService.updateResponseBody).toHaveBeenCalledWith(
        expect.objectContaining({
          recordId: 100,
          requestId: "1",
          body: "test",
          base64Encoded: false,
        }),
      );
    });

    it("should route DOM events correctly", async () => {
      await service.persistBufferedEvent(100, {
        method: "DOM.updated",
        params: { nodeId: 1 },
        timestamp: 1000,
      });

      expect(mockDomService.upsert).toHaveBeenCalled();
    });

    it("should route Runtime events correctly", async () => {
      await service.persistBufferedEvent(100, {
        method: "Runtime.consoleAPICalled",
        params: { type: "log" },
        timestamp: 1000,
      });

      expect(mockRuntimeService.create).toHaveBeenCalled();
    });
  });
});
