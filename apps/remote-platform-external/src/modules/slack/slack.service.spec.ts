import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

import { SlackService } from "./slack.service";

describe("SlackService", () => {
  let service: SlackService;
  const mockFetch = vi.fn();

  beforeEach(async () => {
    vi.stubGlobal("fetch", mockFetch);
    process.env.SLACK_BOT_TOKEN = "xoxb-test-token";

    const module: TestingModule = await Test.createTestingModule({
      providers: [SlackService],
    }).compile();

    service = module.get<SlackService>(SlackService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.SLACK_BOT_TOKEN;
  });

  describe("sendDirectMessage", () => {
    it("should send a message successfully", async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ ok: true, ts: "123", channel: "C01" }),
        status: 200,
        statusText: "OK",
      });

      await service.sendDirectMessage("U12345", {
        text: "Hello",
        blocks: [],
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://slack.com/api/chat.postMessage",
        expect.objectContaining({
          method: "POST",
          headers: {
            Authorization: "Bearer xoxb-test-token",
            "Content-Type": "application/json",
          },
        }),
      );
    });

    it("should throw when SLACK_BOT_TOKEN is not set", async () => {
      delete process.env.SLACK_BOT_TOKEN;

      await expect(
        service.sendDirectMessage("U12345", { blocks: [] }),
      ).rejects.toThrow("SLACK_BOT_TOKEN environment variable is not set");
    });

    it("should throw when Slack API returns error", async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ ok: false, error: "channel_not_found" }),
        status: 200,
        statusText: "OK",
      });

      await expect(
        service.sendDirectMessage("U12345", { blocks: [] }),
      ).rejects.toThrow("Slack API error: channel_not_found");
    });
  });

  describe("sendCreateTicketDM", () => {
    it("should build and send a ticket notification", async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ ok: true, ts: "123", channel: "C01" }),
        status: 200,
        statusText: "OK",
      });

      await service.sendCreateTicketDM({
        slackUserId: "U12345",
        ticketUrl: "https://jira.example.com/browse/TEST-1",
        requestBody: {
          username: "testuser",
          assignee: "assignee1",
          title: "Test Ticket",
          priority: "3",
          description: { type: "doc", version: 1, content: [] },
          project: "TEST",
          components: [],
          labels: [],
          parent: "TEST-0",
          issuetype: "Bug",
        },
        ticketKey: "TEST-1",
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });
});
