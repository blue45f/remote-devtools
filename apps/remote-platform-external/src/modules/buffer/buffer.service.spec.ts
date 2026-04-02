import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import type { BufferEvent } from "./buffer.service";
import { BufferService } from "./buffer.service";

describe("BufferService", () => {
  let service: BufferService;

  beforeEach(async () => {
    vi.useFakeTimers();

    const module: TestingModule = await Test.createTestingModule({
      providers: [BufferService],
    }).compile();

    service = module.get<BufferService>(BufferService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const makeEvent = (
    method: string,
    timestamp: number,
    params: unknown = {},
  ): BufferEvent => ({
    method,
    params,
    timestamp,
  });

  describe("addEvent", () => {
    it("should skip Record- prefixed rooms", () => {
      const event = makeEvent("DOM.childNodeInserted", 1000);

      const result = service.addEvent(
        "Record-abc",
        1,
        "device-1",
        "https://example.com",
        "Mozilla/5.0",
        "Test",
        1000,
        event,
      );

      expect(result).toEqual({ shouldFlush: false, eventCount: 0 });
    });

    it("should skip Live- prefixed rooms", () => {
      const event = makeEvent("DOM.childNodeInserted", 1000);

      const result = service.addEvent(
        "Live-xyz",
        1,
        "device-1",
        "https://example.com",
        "Mozilla/5.0",
        "Test",
        1000,
        event,
      );

      expect(result).toEqual({ shouldFlush: false, eventCount: 0 });
    });

    it("should create a new buffer when none exists", () => {
      const event = makeEvent("DOM.childNodeInserted", 1000);

      const result = service.addEvent(
        "Session-room1",
        1,
        "device-1",
        "https://example.com",
        "Mozilla/5.0",
        "Test Page",
        1000,
        event,
      );

      expect(result.shouldFlush).toBe(false);
      expect(result.eventCount).toBe(1);

      const buffers = service.getSessionBuffers("Session-room1", 1);
      expect(buffers).toHaveLength(1);
      expect(buffers[0].room).toBe("Session-room1");
      expect(buffers[0].recordId).toBe(1);
      expect(buffers[0].deviceId).toBe("device-1");
      expect(buffers[0].url).toBe("https://example.com");
      expect(buffers[0].userAgent).toBe("Mozilla/5.0");
      expect(buffers[0].title).toBe("Test Page");
      expect(buffers[0].events).toHaveLength(1);
      expect(buffers[0].events[0]).toEqual(event);
    });

    it("should add event to an existing buffer", () => {
      const event1 = makeEvent("DOM.childNodeInserted", 1000);
      const event2 = makeEvent("DOM.childNodeRemoved", 2000);

      service.addEvent(
        "Session-room1",
        1,
        "device-1",
        "https://example.com",
        "Mozilla/5.0",
        "Test",
        1000,
        event1,
      );

      const result = service.addEvent(
        "Session-room1",
        1,
        "device-1",
        "https://example.com",
        "Mozilla/5.0",
        "Test",
        1000,
        event2,
      );

      expect(result.eventCount).toBe(2);

      const buffers = service.getSessionBuffers("Session-room1", 1);
      expect(buffers[0].events).toHaveLength(2);
      expect(buffers[0].events[0]).toEqual(event1);
      expect(buffers[0].events[1]).toEqual(event2);
    });

    it("should replace existing ScreenPreview event with same method", () => {
      const regularEvent = makeEvent("DOM.childNodeInserted", 1000);
      const screenPreview1 = makeEvent("ScreenPreview.capture", 2000, {
        data: "old-screenshot",
      });
      const screenPreview2 = makeEvent("ScreenPreview.capture", 3000, {
        data: "new-screenshot",
      });

      service.addEvent(
        "Session-room1",
        1,
        "device-1",
        "https://example.com",
        "Mozilla/5.0",
        "Test",
        1000,
        regularEvent,
      );

      service.addEvent(
        "Session-room1",
        1,
        "device-1",
        "https://example.com",
        "Mozilla/5.0",
        "Test",
        1000,
        screenPreview1,
      );

      service.addEvent(
        "Session-room1",
        1,
        "device-1",
        "https://example.com",
        "Mozilla/5.0",
        "Test",
        1000,
        screenPreview2,
      );

      const buffers = service.getSessionBuffers("Session-room1", 1);
      // Should have 2 events: the regular event and the replaced ScreenPreview
      expect(buffers[0].events).toHaveLength(2);
      expect(buffers[0].events[0]).toEqual(regularEvent);
      expect(buffers[0].events[1]).toEqual(screenPreview2);
    });

    it("should handle null recordId by defaulting to 0", () => {
      const event = makeEvent("DOM.childNodeInserted", 1000);

      service.addEvent(
        "Session-room1",
        null,
        "device-1",
        "https://example.com",
        "Mozilla/5.0",
        "Test",
        1000,
        event,
      );

      const buffers = service.getSessionBuffers("Session-room1", null);
      expect(buffers).toHaveLength(1);
      expect(buffers[0].recordId).toBe(0);
    });

    it("should update deviceId when it changes", () => {
      const event1 = makeEvent("DOM.childNodeInserted", 1000);
      const event2 = makeEvent("DOM.childNodeRemoved", 2000);

      service.addEvent(
        "Session-room1",
        1,
        "device-1",
        "https://example.com",
        "Mozilla/5.0",
        "Test",
        1000,
        event1,
      );

      service.addEvent(
        "Session-room1",
        1,
        "device-2",
        "https://example.com",
        "Mozilla/5.0",
        "Test",
        1000,
        event2,
      );

      const buffers = service.getSessionBuffers("Session-room1", 1);
      expect(buffers[0].deviceId).toBe("device-2");
    });

    it("should evict oldest event when MAX_BUFFER_SIZE_PER_SESSION is exceeded", () => {
      // We cannot easily change the constant, but we can add 50_001 events
      // and verify the buffer stays at 50_000. For test performance, we
      // access the internal buffer directly to pre-fill it.
      const room = "Session-room-ring";
      const recordId = 1;

      // Add the first event to create the buffer
      service.addEvent(
        room,
        recordId,
        "device-1",
        "https://example.com",
        "Mozilla/5.0",
        "Test",
        1000,
        makeEvent("init", 0),
      );

      // Access internal buffers to pre-fill to near capacity
      const buffersMap = (service as any).buffers as Map<string, any>;
      const key = `${room}_${recordId}`;
      const buffer = buffersMap.get(key);

      // Fill the buffer to exactly MAX size (50_000)
      const events: BufferEvent[] = [];
      for (let i = 0; i < 50_000; i++) {
        events.push(makeEvent(`Event.${i}`, i));
      }
      buffer.events = events;

      // Now add one more event which should trigger ring buffer eviction
      const overflowEvent = makeEvent("Event.overflow", 99999);
      const result = service.addEvent(
        room,
        recordId,
        "device-1",
        "https://example.com",
        "Mozilla/5.0",
        "Test",
        1000,
        overflowEvent,
      );

      expect(result.eventCount).toBe(50_000);

      const sessionBuffers = service.getSessionBuffers(room, recordId);
      // The first event (Event.0) should have been evicted
      expect(sessionBuffers[0].events[0].method).toBe("Event.1");
      // The last event should be the overflow event
      expect(
        sessionBuffers[0].events[sessionBuffers[0].events.length - 1],
      ).toEqual(overflowEvent);
    });
  });

  describe("flushBuffer", () => {
    it("should return null for a non-existent buffer", () => {
      const result = service.flushBuffer("nonexistent", 1, "device-1");
      expect(result).toBeNull();
    });

    it("should return null for an empty buffer", () => {
      // Create a buffer then clear its events directly
      service.addEvent(
        "Session-room1",
        1,
        "device-1",
        "https://example.com",
        "Mozilla/5.0",
        "Test",
        1000,
        makeEvent("DOM.childNodeInserted", 1000),
      );

      // Flush once to empty it
      service.flushBuffer("Session-room1", 1, "device-1");

      // Second flush should return null
      const result = service.flushBuffer("Session-room1", 1, "device-1");
      expect(result).toBeNull();
    });

    it("should return flushed buffer with events and remove from active buffers", () => {
      const event1 = makeEvent("DOM.childNodeInserted", 1000);
      const event2 = makeEvent("DOM.childNodeRemoved", 2000);

      service.addEvent(
        "Session-room1",
        1,
        "device-1",
        "https://example.com",
        "Mozilla/5.0",
        "Test",
        1000,
        event1,
      );
      service.addEvent(
        "Session-room1",
        1,
        "device-1",
        "https://example.com",
        "Mozilla/5.0",
        "Test",
        1000,
        event2,
      );

      const flushed = service.flushBuffer("Session-room1", 1, "device-1");

      expect(flushed).not.toBeNull();
      expect(flushed!.room).toBe("Session-room1");
      expect(flushed!.recordId).toBe(1);
      expect(flushed!.events).toHaveLength(2);
      expect(flushed!.events[0]).toEqual(event1);
      expect(flushed!.events[1]).toEqual(event2);

      // Buffer should be removed from active buffers
      const buffers = service.getSessionBuffers("Session-room1", 1);
      expect(buffers).toHaveLength(0);
    });

    it("should update deviceId during flush", () => {
      service.addEvent(
        "Session-room1",
        1,
        "device-1",
        "https://example.com",
        "Mozilla/5.0",
        "Test",
        1000,
        makeEvent("DOM.childNodeInserted", 1000),
      );

      const flushed = service.flushBuffer("Session-room1", 1, "device-2");

      expect(flushed).not.toBeNull();
      expect(flushed!.deviceId).toBe("device-2");
    });
  });

  describe("flushBufferForce", () => {
    it("should return null for a non-existent buffer", () => {
      const result = service.flushBufferForce("nonexistent", 1, "device-1");
      expect(result).toBeNull();
    });

    it("should return null for an empty buffer", () => {
      service.addEvent(
        "Session-room1",
        1,
        "device-1",
        "https://example.com",
        "Mozilla/5.0",
        "Test",
        1000,
        makeEvent("DOM.childNodeInserted", 1000),
      );

      service.flushBufferForce("Session-room1", 1, "device-1");

      const result = service.flushBufferForce("Session-room1", 1, "device-1");
      expect(result).toBeNull();
    });

    it("should return flushed buffer with events and remove from active buffers", () => {
      const event = makeEvent("DOM.childNodeInserted", 1000);

      service.addEvent(
        "Session-room1",
        1,
        "device-1",
        "https://example.com",
        "Mozilla/5.0",
        "Test",
        1000,
        event,
      );

      const flushed = service.flushBufferForce("Session-room1", 1, "device-1");

      expect(flushed).not.toBeNull();
      expect(flushed!.events).toHaveLength(1);
      expect(flushed!.events[0]).toEqual(event);

      const buffers = service.getSessionBuffers("Session-room1", 1);
      expect(buffers).toHaveLength(0);
    });

    it("should update deviceId during force flush", () => {
      service.addEvent(
        "Session-room1",
        1,
        "device-1",
        "https://example.com",
        "Mozilla/5.0",
        "Test",
        1000,
        makeEvent("DOM.childNodeInserted", 1000),
      );

      const flushed = service.flushBufferForce("Session-room1", 1, "device-2");

      expect(flushed).not.toBeNull();
      expect(flushed!.deviceId).toBe("device-2");
    });
  });

  describe("getSessionBuffers", () => {
    it("should return an empty array when no buffers exist", () => {
      const result = service.getSessionBuffers("Session-room1", 1);
      expect(result).toEqual([]);
    });

    it("should return matching buffers sorted by createdAt", () => {
      // Create buffers in different rooms to ensure filtering works
      service.addEvent(
        "Session-room1",
        1,
        "device-1",
        "https://example.com",
        "Mozilla/5.0",
        "Test 1",
        1000,
        makeEvent("DOM.childNodeInserted", 1000),
      );

      service.addEvent(
        "Session-room2",
        1,
        "device-2",
        "https://other.com",
        "Mozilla/5.0",
        "Test 2",
        2000,
        makeEvent("DOM.childNodeRemoved", 2000),
      );

      const result = service.getSessionBuffers("Session-room1", 1);
      expect(result).toHaveLength(1);
      expect(result[0].room).toBe("Session-room1");
    });

    it("should not return buffers with different recordId", () => {
      service.addEvent(
        "Session-room1",
        1,
        "device-1",
        "https://example.com",
        "Mozilla/5.0",
        "Test",
        1000,
        makeEvent("DOM.childNodeInserted", 1000),
      );

      service.addEvent(
        "Session-room1",
        2,
        "device-2",
        "https://example.com",
        "Mozilla/5.0",
        "Test",
        1000,
        makeEvent("DOM.childNodeInserted", 2000),
      );

      const result = service.getSessionBuffers("Session-room1", 1);
      expect(result).toHaveLength(1);
      expect(result[0].recordId).toBe(1);
    });

    it("should return copies of buffers (not references)", () => {
      service.addEvent(
        "Session-room1",
        1,
        "device-1",
        "https://example.com",
        "Mozilla/5.0",
        "Test",
        1000,
        makeEvent("DOM.childNodeInserted", 1000),
      );

      const result1 = service.getSessionBuffers("Session-room1", 1);
      const result2 = service.getSessionBuffers("Session-room1", 1);

      // Modifying one should not affect the other
      result1[0].events.push(makeEvent("Fake.event", 9999));
      expect(result2[0].events).toHaveLength(1);
    });
  });

  describe("clearSessionBuffers", () => {
    it("should remove all matching buffers", () => {
      service.addEvent(
        "Session-room1",
        1,
        "device-1",
        "https://example.com",
        "Mozilla/5.0",
        "Test",
        1000,
        makeEvent("DOM.childNodeInserted", 1000),
      );

      service.addEvent(
        "Session-room2",
        1,
        "device-2",
        "https://other.com",
        "Mozilla/5.0",
        "Other",
        2000,
        makeEvent("DOM.childNodeRemoved", 2000),
      );

      service.clearSessionBuffers("Session-room1", 1);

      const cleared = service.getSessionBuffers("Session-room1", 1);
      expect(cleared).toHaveLength(0);

      // Other room should remain
      const remaining = service.getSessionBuffers("Session-room2", 1);
      expect(remaining).toHaveLength(1);
    });

    it("should be a no-op when no matching buffers exist", () => {
      service.clearSessionBuffers("nonexistent", 999);

      const stats = service.getBufferStats();
      expect(stats.totalBuffers).toBe(0);
    });
  });

  describe("getBufferStats", () => {
    it("should return zeros when no buffers exist", () => {
      const stats = service.getBufferStats();

      expect(stats.totalBuffers).toBe(0);
      expect(stats.totalEvents).toBe(0);
      expect(stats.buffersByRoom.size).toBe(0);
    });

    it("should return correct totals and room breakdown", () => {
      service.addEvent(
        "Session-room1",
        1,
        "device-1",
        "https://example.com",
        "Mozilla/5.0",
        "Test",
        1000,
        makeEvent("DOM.childNodeInserted", 1000),
      );
      service.addEvent(
        "Session-room1",
        1,
        "device-1",
        "https://example.com",
        "Mozilla/5.0",
        "Test",
        1000,
        makeEvent("DOM.childNodeRemoved", 2000),
      );
      service.addEvent(
        "Session-room2",
        2,
        "device-2",
        "https://other.com",
        "Mozilla/5.0",
        "Other",
        3000,
        makeEvent("Network.requestWillBeSent", 3000),
      );

      const stats = service.getBufferStats();

      expect(stats.totalBuffers).toBe(2);
      expect(stats.totalEvents).toBe(3);
      expect(stats.buffersByRoom.get("Session-room1")).toBe(1);
      expect(stats.buffersByRoom.get("Session-room2")).toBe(1);
    });
  });

  describe("loadPreviousSessionData", () => {
    it("should return empty array when no previous data exists", () => {
      const result = service.loadPreviousSessionData(
        "device-1",
        "Session-room1",
        1,
      );

      expect(result).toEqual([]);
    });

    it("should return copied events when data exists", () => {
      const event1 = makeEvent("DOM.childNodeInserted", 1000);
      const event2 = makeEvent("DOM.childNodeRemoved", 2000);

      service.addEvent(
        "Session-room1",
        1,
        "device-1",
        "https://example.com",
        "Mozilla/5.0",
        "Test",
        1000,
        event1,
      );
      service.addEvent(
        "Session-room1",
        1,
        "device-1",
        "https://example.com",
        "Mozilla/5.0",
        "Test",
        1000,
        event2,
      );

      const result = service.loadPreviousSessionData(
        "device-1",
        "Session-room1",
        1,
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(event1);
      expect(result[1]).toEqual(event2);

      // Verify it is a copy
      result.push(makeEvent("Fake.event", 9999));
      const result2 = service.loadPreviousSessionData(
        "device-1",
        "Session-room1",
        1,
      );
      expect(result2).toHaveLength(2);
    });
  });

  describe("isSessionContinuation", () => {
    it("should return false when no device buffers exist", () => {
      const result = service.isSessionContinuation(
        "device-1",
        "https://example.com",
        "Session-room1",
      );

      expect(result).toBe(false);
    });

    it("should return true when same domain", () => {
      service.addEvent(
        "Session-room1",
        1,
        "device-1",
        "https://example.com/page1",
        "Mozilla/5.0",
        "Page 1",
        1000,
        makeEvent("DOM.childNodeInserted", 1000),
      );

      const result = service.isSessionContinuation(
        "device-1",
        "https://example.com/page2",
        "Session-room2",
      );

      expect(result).toBe(true);
    });

    it("should return false when different domain", () => {
      service.addEvent(
        "Session-room1",
        1,
        "device-1",
        "https://example.com",
        "Mozilla/5.0",
        "Example",
        1000,
        makeEvent("DOM.childNodeInserted", 1000),
      );

      const result = service.isSessionContinuation(
        "device-1",
        "https://other-domain.com",
        "Session-room2",
      );

      expect(result).toBe(false);
    });
  });

  describe("mergeSessionData", () => {
    it("should be a no-op for empty previousEvents", () => {
      service.mergeSessionData("Session-room1", 1, "device-1", []);

      const buffers = service.getSessionBuffers("Session-room1", 1);
      expect(buffers).toHaveLength(0);
    });

    it("should merge and sort events by timestamp", () => {
      const currentEvent = makeEvent("DOM.childNodeInserted", 3000);
      service.addEvent(
        "Session-room1",
        1,
        "device-1",
        "https://example.com",
        "Mozilla/5.0",
        "Test",
        1000,
        currentEvent,
      );

      const previousEvents: BufferEvent[] = [
        makeEvent("DOM.documentUpdated", 1000),
        makeEvent("DOM.childNodeRemoved", 2000),
      ];

      service.mergeSessionData("Session-room1", 1, "device-1", previousEvents);

      const buffers = service.getSessionBuffers("Session-room1", 1);
      expect(buffers).toHaveLength(1);
      expect(buffers[0].events).toHaveLength(3);
      // Should be sorted by timestamp
      expect(buffers[0].events[0].timestamp).toBe(1000);
      expect(buffers[0].events[1].timestamp).toBe(2000);
      expect(buffers[0].events[2].timestamp).toBe(3000);
    });

    it("should create a new buffer if none exists and merge previous events", () => {
      const previousEvents: BufferEvent[] = [
        makeEvent("DOM.documentUpdated", 1000),
        makeEvent("DOM.childNodeRemoved", 2000),
      ];

      service.mergeSessionData(
        "Session-new-room",
        5,
        "device-1",
        previousEvents,
      );

      const buffers = service.getSessionBuffers("Session-new-room", 5);
      expect(buffers).toHaveLength(1);
      expect(buffers[0].events).toHaveLength(2);
      expect(buffers[0].deviceId).toBe("device-1");
    });

    it("should rebuild screen preview indexes after merge", () => {
      const currentEvent = makeEvent("DOM.childNodeInserted", 3000);
      service.addEvent(
        "Session-room1",
        1,
        "device-1",
        "https://example.com",
        "Mozilla/5.0",
        "Test",
        1000,
        currentEvent,
      );

      const previousEvents: BufferEvent[] = [
        makeEvent("ScreenPreview.capture", 1000, { data: "old" }),
        makeEvent("DOM.documentUpdated", 2000),
      ];

      service.mergeSessionData("Session-room1", 1, "device-1", previousEvents);

      const buffers = service.getSessionBuffers("Session-room1", 1);
      expect(buffers[0].events).toHaveLength(3);

      // Verify the ScreenPreview index was rebuilt correctly
      // After sort: ScreenPreview.capture (1000), DOM.documentUpdated (2000), DOM.childNodeInserted (3000)
      expect(buffers[0].screenPreviewIndexes["ScreenPreview.capture"]).toBe(0);
    });
  });
});
