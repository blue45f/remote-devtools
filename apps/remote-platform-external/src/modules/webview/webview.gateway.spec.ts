import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { describe, it, expect, beforeEach, vi } from "vitest";

import {
  DomService,
  NetworkService,
  RecordService,
  ScreenService,
} from "@remote-platform/core";
import {
  TicketComponentEntity,
  TicketLabelEntity,
  TicketLogEntity,
} from "@remote-platform/entity";

import { BufferService } from "../buffer/buffer.service";
import { JiraService } from "../jira/jira.service";
import { SlackService } from "../slack/slack.service";
import { UserInfoService } from "../user-info/user-info.service";
import { BufferFlushService } from "./buffer-flush.service";
import { CdpEventPersistenceService } from "./cdp-event-persistence.service";
import { WebviewGateway } from "./webview.gateway";

describe("WebviewGateway (External)", () => {
  let gateway: WebviewGateway;

  const mockRecordService = {
    create: vi.fn(),
    findAll: vi.fn(),
    updateDuration: vi.fn(),
  };
  const mockNetworkService = { create: vi.fn() };
  const mockDomService = { upsert: vi.fn() };
  const mockScreenService = { upsert: vi.fn(), findScreens: vi.fn() };
  const mockBufferService = { addEvent: vi.fn(), flush: vi.fn() };
  const mockJiraService = { createTicket: vi.fn() };
  const mockSlackService = {
    sendCreateTicketDM: vi.fn(),
    sendCreateRoomDM: vi.fn(),
  };
  const mockUserInfoService = { getUserInfoByDeviceId: vi.fn() };
  const mockCdpPersistence = {
    persistProtocolEvent: vi.fn(),
    persistSingleRrwebEvent: vi.fn(),
  };
  const mockBufferFlush = {
    flushBufferToFile: vi.fn(),
    flushBufferToFileForce: vi.fn(),
  };
  const mockRepo = { save: vi.fn(), find: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebviewGateway,
        { provide: RecordService, useValue: mockRecordService },
        { provide: NetworkService, useValue: mockNetworkService },
        { provide: DomService, useValue: mockDomService },
        { provide: ScreenService, useValue: mockScreenService },
        { provide: BufferService, useValue: mockBufferService },
        { provide: JiraService, useValue: mockJiraService },
        { provide: SlackService, useValue: mockSlackService },
        { provide: UserInfoService, useValue: mockUserInfoService },
        { provide: CdpEventPersistenceService, useValue: mockCdpPersistence },
        { provide: BufferFlushService, useValue: mockBufferFlush },
        { provide: getRepositoryToken(TicketLogEntity), useValue: mockRepo },
        {
          provide: getRepositoryToken(TicketComponentEntity),
          useValue: mockRepo,
        },
        { provide: getRepositoryToken(TicketLabelEntity), useValue: mockRepo },
      ],
    }).compile();
    gateway = module.get<WebviewGateway>(WebviewGateway);
  });

  describe("initialization", () => {
    it("should be defined", () => {
      expect(gateway).toBeDefined();
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
  });

  describe("triggerBufferSave", () => {
    it("should be defined", () => {
      expect(gateway.triggerBufferSave).toBeDefined();
    });
  });
});
