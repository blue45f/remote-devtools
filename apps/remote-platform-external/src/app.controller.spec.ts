import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import { describe, it, expect, beforeEach } from "vitest";

import { AppController } from "./app.controller";
import { AppService } from "./app.service";

describe("AppController (External)", () => {
  let controller: AppController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();
    controller = module.get<AppController>(AppController);
  });

  it("should return health check on /", () => {
    expect(controller.getRoot()).toBe("ok");
  });

  it("should return health check on /health", () => {
    expect(controller.getHealth()).toBe("ok");
  });
});
