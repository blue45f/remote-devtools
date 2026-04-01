import { Test, TestingModule } from "@nestjs/testing";
import {
  HealthCheckService,
  TypeOrmHealthIndicator,
  HealthCheckResult,
} from "@nestjs/terminus";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { HealthController } from "./health.controller";

describe("HealthController", () => {
  let controller: HealthController;
  const mockHealthCheck = { check: vi.fn() };
  const mockDbIndicator = { pingCheck: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: mockHealthCheck },
        { provide: TypeOrmHealthIndicator, useValue: mockDbIndicator },
      ],
    }).compile();
    controller = module.get<HealthController>(HealthController);
  });

  it("should return healthy status when DB is up", async () => {
    const healthy: HealthCheckResult = {
      status: "ok",
      info: { database: { status: "up" } },
      error: {},
      details: { database: { status: "up" } },
    };
    mockHealthCheck.check.mockResolvedValue(healthy);

    const result = await controller.check();

    expect(result.status).toBe("ok");
    expect(mockHealthCheck.check).toHaveBeenCalled();
  });

  it("should return error status when DB is down", async () => {
    const unhealthy: HealthCheckResult = {
      status: "error",
      info: {},
      error: { database: { status: "down", message: "Connection refused" } },
      details: { database: { status: "down" } },
    };
    mockHealthCheck.check.mockResolvedValue(unhealthy);

    const result = await controller.check();

    expect(result.status).toBe("error");
  });
});
