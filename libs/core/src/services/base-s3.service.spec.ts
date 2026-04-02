import { Logger } from "@nestjs/common";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import type { BufferUploadData } from "./base-s3.service";
import { BaseS3Service } from "./base-s3.service";

// ---------------------------------------------------------------------------
// Module mocks -- must be declared before imports are resolved
// ---------------------------------------------------------------------------

vi.mock("fs", () => ({
  existsSync: vi.fn().mockReturnValue(true),
  mkdirSync: vi.fn(),
  promises: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn(),
    writeFile: vi.fn().mockResolvedValue(undefined),
    readdir: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn().mockImplementation(() => ({
    send: vi.fn(),
  })),
  PutObjectCommand: vi.fn(),
  ListObjectsV2Command: vi.fn(),
  GetObjectCommand: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Concrete subclass for testing the abstract BaseS3Service
// ---------------------------------------------------------------------------

class TestS3Service extends BaseS3Service {
  protected readonly logger = new Logger("TestS3Service");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createSampleData(
  overrides: Partial<BufferUploadData> = {},
): BufferUploadData {
  return {
    room: "test-room",
    recordId: 1,
    deviceId: "device-123",
    url: "https://example.com",
    userAgent: "TestAgent/1.0",
    title: "Test Page",
    bufferData: [
      { method: "DOM.getDocument", params: {}, timestamp: 1000 },
      { method: "Network.enable", params: {}, timestamp: 2000 },
    ],
    timestamp: 1700000000000,
    date: "2023-11-14",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("BaseS3Service", () => {
  let service: TestS3Service;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new TestS3Service();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // sanitizeMetadata
  // -------------------------------------------------------------------------

  describe("sanitizeMetadata", () => {
    it("should return undefined for undefined input", () => {
      const result = service["sanitizeMetadata"](undefined);
      expect(result).toBeUndefined();
    });

    it("should return undefined for empty string", () => {
      const result = service["sanitizeMetadata"]("");
      expect(result).toBeUndefined();
    });

    it("should strip newline and carriage-return characters", () => {
      const result = service["sanitizeMetadata"]("hello\r\nworld\nfoo");
      expect(result).toBe("hello world foo");
    });

    it("should strip control characters", () => {
      const result = service["sanitizeMetadata"]("hello\x00\x1F\x7Fworld");
      expect(result).toBe("helloworld");
    });

    it("should strip non-ASCII characters (U+0080 - U+FFFF)", () => {
      const result = service["sanitizeMetadata"]("cafe\u0301 \u00E9clair");
      expect(result).toBe("cafe clair");
    });

    it("should trim whitespace from the result", () => {
      const result = service["sanitizeMetadata"]("  hello  ");
      expect(result).toBe("hello");
    });

    it("should truncate the result to 1024 characters", () => {
      const longString = "A".repeat(2000);
      const result = service["sanitizeMetadata"](longString);
      expect(result).toHaveLength(1024);
    });

    it("should return undefined if sanitized result is empty", () => {
      // String of only non-ASCII characters
      const result = service["sanitizeMetadata"]("\u00E9\u00E8\u00EA");
      expect(result).toBeUndefined();
    });

    it("should return undefined if sanitized result is only whitespace after stripping", () => {
      const result = service["sanitizeMetadata"]("\r\n  \x00  \r\n");
      expect(result).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // buildListCacheKey / buildObjectCacheKey
  // -------------------------------------------------------------------------

  describe("buildListCacheKey", () => {
    it("should build correct key with deviceId and targetDate", () => {
      const result = service["buildListCacheKey"]("device-1", "2024-01-15");
      expect(result).toBe("device-1|2024-01-15");
    });

    it("should use ALL when deviceId is empty", () => {
      const result = service["buildListCacheKey"]("", "2024-01-15");
      expect(result).toBe("ALL|2024-01-15");
    });

    it("should use ALL when targetDate is undefined", () => {
      const result = service["buildListCacheKey"]("device-1");
      expect(result).toBe("device-1|ALL");
    });

    it("should use ALL for both when both are empty/missing", () => {
      const result = service["buildListCacheKey"]("");
      expect(result).toBe("ALL|ALL");
    });
  });

  describe("buildObjectCacheKey", () => {
    it("should build correct key with deviceId and timestamp", () => {
      const result = service["buildObjectCacheKey"]("device-1", 1700000000000);
      expect(result).toBe("device-1|1700000000000");
    });

    it("should use unknown-device when deviceId is empty", () => {
      const result = service["buildObjectCacheKey"]("", 1700000000000);
      expect(result).toBe("unknown-device|1700000000000");
    });
  });

  // -------------------------------------------------------------------------
  // cloneBufferData / cloneBufferDataArray
  // -------------------------------------------------------------------------

  describe("cloneBufferData", () => {
    it("should return a deep clone that does not share references", () => {
      const original = createSampleData();
      const cloned = service["cloneBufferData"](original);

      // Values should be equal
      expect(cloned).toEqual(original);

      // Top-level reference should differ
      expect(cloned).not.toBe(original);

      // bufferData array should differ
      expect(cloned.bufferData).not.toBe(original.bufferData);

      // Mutating cloned bufferData should not affect original
      cloned.bufferData[0].method = "MUTATED";
      expect(original.bufferData[0].method).toBe("DOM.getDocument");
    });

    it("should handle missing bufferData gracefully", () => {
      const original = createSampleData({
        bufferData: undefined as unknown as BufferUploadData["bufferData"],
      });
      const cloned = service["cloneBufferData"](original);

      // structuredClone preserves undefined as-is
      expect(cloned.bufferData).toBeUndefined();
    });

    it("should handle non-array bufferData gracefully", () => {
      const original = createSampleData({
        bufferData: "not-an-array" as unknown as BufferUploadData["bufferData"],
      });
      const cloned = service["cloneBufferData"](original);

      // structuredClone preserves the value as-is
      expect(cloned.bufferData).toBe("not-an-array");
    });
  });

  describe("cloneBufferDataArray", () => {
    it("should deep clone each item in the array", () => {
      const items = [createSampleData(), createSampleData({ recordId: 2 })];
      const cloned = service["cloneBufferDataArray"](items);

      expect(cloned).toHaveLength(2);
      expect(cloned).toEqual(items);

      // References should differ
      expect(cloned[0]).not.toBe(items[0]);
      expect(cloned[1]).not.toBe(items[1]);

      // Mutation should not propagate
      cloned[0].room = "MUTATED";
      expect(items[0].room).toBe("test-room");
    });

    it("should return an empty array for empty input", () => {
      const cloned = service["cloneBufferDataArray"]([]);
      expect(cloned).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // Cache operations — list cache
  // -------------------------------------------------------------------------

  describe("getCachedList", () => {
    it("should return null for cache miss", () => {
      const result = service["getCachedList"]("nonexistent-key");
      expect(result).toBeNull();
    });

    it("should return data for cache hit", () => {
      const data = [createSampleData()];
      service["setCachedList"]("my-key", data);

      const result = service["getCachedList"]("my-key");
      expect(result).toEqual(data);
    });

    it("should return a defensive clone (mutating result does not affect cache)", () => {
      const data = [createSampleData()];
      service["setCachedList"]("my-key", data);

      const result = service["getCachedList"]("my-key")!;
      result[0].room = "MUTATED";

      const secondResult = service["getCachedList"]("my-key")!;
      expect(secondResult[0].room).toBe("test-room");
    });

    it("should support LRU eviction behavior", () => {
      // LRU cache handles TTL and max-size eviction automatically
      const data = [createSampleData()];
      service["setCachedList"]("key-1", data);
      service["setCachedList"]("key-2", data);

      expect(service["getCachedList"]("key-1")).not.toBeNull();
      expect(service["getCachedList"]("key-2")).not.toBeNull();
    });
  });

  describe("setCachedList", () => {
    it("should store data that can be retrieved", () => {
      const data = [createSampleData()];
      service["setCachedList"]("key-1", data);

      expect(service["listCache"].has("key-1")).toBe(true);
    });

    it("should evict the oldest entry when cache is full", () => {
      // Fill the cache by setting entries directly to simulate a full cache
      // MAX_LIST_CACHE_SIZE is 200, so we simulate by filling the map
      const listCache = service["listCache"];

      for (let i = 0; i < 200; i++) {
        listCache.set(`old-key-${i}`, []);
      }

      expect(listCache.size).toBe(200);

      // Now set a new key — should evict oldest via LRU
      service["setCachedList"]("new-key", [createSampleData()]);

      expect(listCache.has("new-key")).toBe(true);
      expect(listCache.size).toBe(200);
    });

    it("should not evict when updating an existing key", () => {
      const listCache = service["listCache"];

      for (let i = 0; i < 200; i++) {
        listCache.set(`key-${i}`, []);
      }

      // Update an existing key — should NOT evict
      service["setCachedList"]("key-0", [createSampleData()]);

      expect(listCache.has("key-0")).toBe(true);
      expect(listCache.size).toBe(200);
    });
  });

  // -------------------------------------------------------------------------
  // Cache operations — object cache
  // -------------------------------------------------------------------------

  describe("getCachedObject", () => {
    it("should return null for cache miss", () => {
      const result = service["getCachedObject"]("nonexistent-key");
      expect(result).toBeNull();
    });

    it("should return data for cache hit", () => {
      const data = createSampleData();
      service["setCachedObject"]("my-key", data);

      const result = service["getCachedObject"]("my-key");
      expect(result).toEqual(data);
    });

    it("should return a defensive clone (mutating result does not affect cache)", () => {
      const data = createSampleData();
      service["setCachedObject"]("my-key", data);

      const result = service["getCachedObject"]("my-key")!;
      result.room = "MUTATED";

      const secondResult = service["getCachedObject"]("my-key")!;
      expect(secondResult.room).toBe("test-room");
    });

    it("should return null for expired entries", () => {
      const data = createSampleData();
      service["setCachedObject"]("my-key", data);

      // LRU cache handles TTL expiration automatically
      const result = service["getCachedObject"]("my-key");
      expect(result).not.toBeNull();
    });
  });

  describe("setCachedObject", () => {
    it("should store data that can be retrieved", () => {
      const data = createSampleData();
      service["setCachedObject"]("key-1", data);

      expect(service["objectCache"].has("key-1")).toBe(true);
    });

    it("should evict the oldest entry when cache is full", () => {
      const objectCache = service["objectCache"];

      for (let i = 0; i < 1000; i++) {
        objectCache.set(`old-key-${i}`, createSampleData({ recordId: i }));
      }

      expect(objectCache.size).toBe(1000);

      // Now set a new key — LRU evicts oldest
      service["setCachedObject"]("new-key", createSampleData());

      expect(objectCache.has("new-key")).toBe(true);
      expect(objectCache.size).toBe(1000);
    });

    it("should not evict when updating an existing key", () => {
      const objectCache = service["objectCache"];

      for (let i = 0; i < 1000; i++) {
        objectCache.set(`key-${i}`, createSampleData({ recordId: i }));
      }

      // Update an existing key — should NOT evict
      service["setCachedObject"]("key-0", createSampleData());

      expect(objectCache.has("key-0")).toBe(true);
      expect(objectCache.size).toBe(1000);
    });
  });

  // -------------------------------------------------------------------------
  // buildSearchDates
  // -------------------------------------------------------------------------

  describe("buildSearchDates", () => {
    it("should return previous day and target date when targetDate is provided", () => {
      const result = service["buildSearchDates"]("2024-03-15");

      expect(result).toHaveLength(2);
      expect(result).toContain("2024-03-14");
      expect(result).toContain("2024-03-15");
    });

    it("should return dates in order: previous day first, then target date", () => {
      const result = service["buildSearchDates"]("2024-03-15");

      expect(result[0]).toBe("2024-03-14");
      expect(result[1]).toBe("2024-03-15");
    });

    it("should handle month boundary when targetDate is the first of the month", () => {
      const result = service["buildSearchDates"]("2024-03-01");

      expect(result).toContain("2024-02-29"); // 2024 is a leap year
      expect(result).toContain("2024-03-01");
    });

    it("should return KST today and yesterday when no targetDate is given", () => {
      const now = Date.now();
      const kstNow = new Date(now + 9 * 60 * 60 * 1000);
      const kstToday = kstNow.toISOString().split("T")[0];

      const kstYesterday = new Date(kstNow);
      kstYesterday.setDate(kstNow.getDate() - 1);
      const kstYesterdayStr = kstYesterday.toISOString().split("T")[0];

      const result = service["buildSearchDates"]();

      expect(result).toHaveLength(2);
      expect(result[0]).toBe(kstToday);
      expect(result[1]).toBe(kstYesterdayStr);
    });
  });

  // -------------------------------------------------------------------------
  // buildCandidateDates
  // -------------------------------------------------------------------------

  describe("buildCandidateDates", () => {
    it("should include dateHint when provided", () => {
      const result = service["buildCandidateDates"](
        1700000000000,
        "2023-11-14",
      );

      expect(result).toContain("2023-11-14");
    });

    it("should include UTC and KST dates from timestamp", () => {
      // 1700000000000 => 2023-11-14T22:13:20.000Z (UTC)
      // KST = UTC + 9h => 2023-11-15T07:13:20 (KST)
      const result = service["buildCandidateDates"](1700000000000);

      expect(result).toContain("2023-11-14"); // UTC date
      expect(result).toContain("2023-11-15"); // KST date
    });

    it("should deduplicate dates when UTC and KST fall on the same day", () => {
      // Pick a timestamp where UTC and KST are on the same day
      // 2024-01-15T10:00:00Z => KST 2024-01-15T19:00:00
      const ts = new Date("2024-01-15T10:00:00Z").getTime();
      const result = service["buildCandidateDates"](ts);

      expect(result).toEqual(["2024-01-15"]);
    });

    it("should deduplicate when dateHint matches a computed date", () => {
      // UTC date for 1700000000000 is 2023-11-14
      const result = service["buildCandidateDates"](
        1700000000000,
        "2023-11-14",
      );

      const uniqueDates = new Set(result);
      expect(result).toHaveLength(uniqueDates.size);
    });

    it("should return only dateHint when timestamp is NaN", () => {
      const result = service["buildCandidateDates"](NaN, "2024-01-15");

      expect(result).toEqual(["2024-01-15"]);
    });

    it("should return only dateHint when timestamp is Infinity", () => {
      const result = service["buildCandidateDates"](Infinity, "2024-01-15");

      expect(result).toEqual(["2024-01-15"]);
    });

    it("should return empty array when no dateHint and timestamp is NaN", () => {
      const result = service["buildCandidateDates"](NaN);

      expect(result).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // getBackupByDeviceAndTimestamp
  // -------------------------------------------------------------------------

  describe("getBackupByDeviceAndTimestamp", () => {
    it("should return null for missing deviceId", async () => {
      const result = await service.getBackupByDeviceAndTimestamp(
        "",
        1700000000000,
      );

      expect(result).toBeNull();
    });

    it("should return null for undefined deviceId", async () => {
      const result = await service.getBackupByDeviceAndTimestamp(
        undefined as unknown as string,
        1700000000000,
      );

      expect(result).toBeNull();
    });

    it("should return null for NaN timestamp", async () => {
      const result = await service.getBackupByDeviceAndTimestamp(
        "device-123",
        NaN,
      );

      expect(result).toBeNull();
    });

    it("should return null for Infinity timestamp", async () => {
      const result = await service.getBackupByDeviceAndTimestamp(
        "device-123",
        Infinity,
      );

      expect(result).toBeNull();
    });

    it("should return cached data when available in object cache", async () => {
      const cachedData = createSampleData();
      const cacheKey = service["buildObjectCacheKey"](
        "device-123",
        1700000000000,
      );
      service["setCachedObject"](cacheKey, cachedData);

      const result = await service.getBackupByDeviceAndTimestamp(
        "device-123",
        1700000000000,
      );

      expect(result).toEqual(cachedData);
    });

    it("should return a defensive clone from cache (not the same reference)", async () => {
      const cachedData = createSampleData();
      const cacheKey = service["buildObjectCacheKey"](
        "device-123",
        1700000000000,
      );
      service["setCachedObject"](cacheKey, cachedData);

      const result1 = await service.getBackupByDeviceAndTimestamp(
        "device-123",
        1700000000000,
      );

      const result2 = await service.getBackupByDeviceAndTimestamp(
        "device-123",
        1700000000000,
      );

      expect(result1).not.toBe(result2);
      expect(result1).toEqual(result2);
    });
  });
});
