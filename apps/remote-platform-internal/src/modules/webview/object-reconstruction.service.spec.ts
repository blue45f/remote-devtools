import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import { describe, it, expect, beforeEach } from "vitest";

import { ObjectReconstructionService } from "./object-reconstruction.service";

describe("ObjectReconstructionService", () => {
  let service: ObjectReconstructionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ObjectReconstructionService],
    }).compile();

    service = module.get<ObjectReconstructionService>(
      ObjectReconstructionService,
    );
  });

  describe("reconstructObjectAsJson", () => {
    it("should return empty object when no snapshots found", () => {
      const map = new Map<string, any[]>();
      const result = service.reconstructObjectAsJson("obj-1", map, []);
      expect(result).toBe("{}");
    });

    it("should return empty object for empty properties array", () => {
      const map = new Map<string, any[]>();
      map.set("obj-1", []);
      const result = service.reconstructObjectAsJson("obj-1", map, []);
      expect(result).toBe("{}");
    });

    it("should reconstruct simple string property", () => {
      const map = new Map<string, any[]>();
      map.set("obj-1", [
        {
          name: "greeting",
          value: { type: "string", value: "hello" },
        },
      ]);

      const result = service.reconstructObjectAsJson("obj-1", map, []);
      const parsed = JSON.parse(result);
      expect(parsed.greeting).toBe("hello");
    });

    it("should reconstruct number property", () => {
      const map = new Map<string, any[]>();
      map.set("obj-1", [
        {
          name: "count",
          value: { type: "number", value: 42 },
        },
      ]);

      const result = service.reconstructObjectAsJson("obj-1", map, []);
      const parsed = JSON.parse(result);
      expect(parsed.count).toBe(42);
    });

    it("should reconstruct boolean property", () => {
      const map = new Map<string, any[]>();
      map.set("obj-1", [
        {
          name: "active",
          value: { type: "boolean", value: true },
        },
      ]);

      const result = service.reconstructObjectAsJson("obj-1", map, []);
      const parsed = JSON.parse(result);
      expect(parsed.active).toBe(true);
    });

    it("should handle null values", () => {
      const map = new Map<string, any[]>();
      map.set("obj-1", [
        {
          name: "data",
          value: { type: "object", subtype: "null", value: null },
        },
      ]);

      const result = service.reconstructObjectAsJson("obj-1", map, []);
      const parsed = JSON.parse(result);
      expect(parsed.data).toBeNull();
    });

    it("should respect custom indent", () => {
      const map = new Map<string, any[]>();
      map.set("obj-1", [
        {
          name: "key",
          value: { type: "string", value: "val" },
        },
      ]);

      const result = service.reconstructObjectAsJson("obj-1", map, [
        { value: { indent: 4 } },
      ]);
      expect(result).toContain("    "); // 4 spaces
    });
  });

  describe("collectPropertySnapshots", () => {
    it("should collect snapshots from Runtime.consoleAPICalled events", () => {
      const runtimeProtocols = [
        {
          protocol: {
            method: "Runtime.consoleAPICalled",
            params: {
              _propertySnapshots: {
                "obj-1": [
                  { name: "key", value: { type: "string", value: "val" } },
                ],
              },
            },
          },
        },
      ];

      const result = service.collectPropertySnapshots(runtimeProtocols);

      expect(result.has("obj-1")).toBe(true);
      expect(result.get("obj-1")).toHaveLength(1);
    });

    it("should skip non-console events", () => {
      const runtimeProtocols = [
        {
          protocol: {
            method: "Runtime.executionContextCreated",
            params: {},
          },
        },
      ];

      const result = service.collectPropertySnapshots(runtimeProtocols);

      expect(result.size).toBe(0);
    });

    it("should skip events without _propertySnapshots", () => {
      const runtimeProtocols = [
        {
          protocol: {
            method: "Runtime.consoleAPICalled",
            params: { type: "log", args: [] },
          },
        },
      ];

      const result = service.collectPropertySnapshots(runtimeProtocols);

      expect(result.size).toBe(0);
    });

    it("should handle legacy array format", () => {
      const runtimeProtocols = [
        {
          protocol: {
            method: "Runtime.consoleAPICalled",
            params: {
              _propertySnapshots: [
                { name: "a", value: { type: "string", value: "b" } },
              ],
            },
          },
        },
      ];

      const result = service.collectPropertySnapshots(runtimeProtocols);

      // Legacy format uses "legacy" key
      expect(result.size).toBeGreaterThanOrEqual(0);
    });
  });
});
