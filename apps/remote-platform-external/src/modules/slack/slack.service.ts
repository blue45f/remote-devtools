import { Injectable, Logger } from "@nestjs/common";

import { convertRecordLink, createUserDataText } from "../../utils/utils";
import { CreateTicketRequestBody } from "../jira/jira.service";
import { UserData } from "../webview/webview.gateway";

interface SlackMessage {
  readonly text?: string;
  readonly blocks: ReadonlyArray<Record<string, unknown>>;
}

interface SlackApiResponse {
  readonly ok: boolean;
  readonly error?: string;
  readonly ts?: string;
  readonly channel?: string;
}

@Injectable()
export class SlackService {
  private readonly logger = new Logger(SlackService.name);

  /**
   * Sends a Slack DM notifying the user that a Jira ticket was created.
   */
  public async sendCreateTicketDM({
    slackUserId,
    ticketUrl,
    requestBody,
    ticketKey,
  }: {
    slackUserId: string;
    ticketUrl: string;
    requestBody: CreateTicketRequestBody;
    ticketKey: string;
  }): Promise<void> {
    try {
      const message = this.buildTicketMessage({
        ticketUrl,
        requestBody,
        ticketKey,
      });

      this.logger.log(
        `[SLACK_TICKET_DM_START] ${JSON.stringify({
          slackUserId,
          ticketUrl,
          messageType: "ticket_notification",
        })}`,
      );

      await this.sendDirectMessage(slackUserId, message);

      this.logger.log(
        `[SLACK_TICKET_DM_SUCCESS] ${JSON.stringify({ slackUserId, ticketUrl })}`,
      );
    } catch (error) {
      this.logger.error(
        `[SLACK_TICKET_DM_ERROR] ${JSON.stringify({
          slackUserId,
          ticketUrl,
          error:
            error instanceof Error
              ? { message: error.message, stack: error.stack, name: error.name }
              : String(error),
        })}`,
      );
      throw error;
    }
  }

  /**
   * Sends a Slack DM with the recording session link and user data.
   */
  public async sendCreateRoomDM({
    slackUserId,
    userData,
    recordId,
    roomName,
  }: {
    slackUserId: string;
    userData: UserData;
    recordId: number;
    roomName: string;
  }): Promise<void> {
    try {
      this.logger.log(
        `[SLACK_ROOM_DM_START] ${JSON.stringify({
          slackUserId,
          recordId,
          roomName,
          deviceId: userData.commonInfo.device.deviceId,
          memberId: userData.commonInfo.user.memberId,
        })}`,
      );

      const message = this.buildCreateRoomMessage(userData, recordId, roomName);
      await this.sendDirectMessage(slackUserId, message);

      this.logger.log(
        `[SLACK_ROOM_DM_SUCCESS] ${JSON.stringify({
          slackUserId,
          recordId,
          roomName,
        })}`,
      );
    } catch (error) {
      this.logger.error(
        `[SLACK_ROOM_DM_ERROR] ${JSON.stringify({
          slackUserId,
          recordId,
          roomName,
          error:
            error instanceof Error
              ? { message: error.message, stack: error.stack, name: error.name }
              : String(error),
        })}`,
      );
      throw error;
    }
  }

  /**
   * Builds a Slack message containing a recording session link and user info.
   */
  private buildCreateRoomMessage(
    userData: UserData,
    recordId: number,
    roomName: string,
  ): SlackMessage {
    const userDataText = createUserDataText(userData);
    const recordLink = convertRecordLink(roomName, recordId);

    return {
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "Recording Session & User Info",
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `\`\`\`Recording Session Link: ${recordLink}\n\n${userDataText}\`\`\``,
          },
        },
      ],
    };
  }

  /**
   * Builds a Slack message notifying about a newly created Jira ticket.
   */
  private buildTicketMessage({
    ticketUrl,
    requestBody,
    ticketKey,
  }: {
    ticketUrl: string;
    requestBody: CreateTicketRequestBody;
    ticketKey: string;
  }): SlackMessage {
    return {
      text: "A remote support ticket has been created",
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "Ticket Created",
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `\`\`\`[${ticketKey}] ${requestBody.title}\`\`\``,
          },
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Go to Ticket",
              },
              style: "primary",
              url: ticketUrl,
            },
          ],
        },
      ],
    };
  }

  /**
   * Sends a direct message to a Slack user via the Slack API.
   */
  public async sendDirectMessage(
    slackUserId: string,
    message: SlackMessage,
  ): Promise<void> {
    const authToken = process.env.SLACK_BOT_TOKEN;

    if (!authToken) {
      this.logger.error(
        `[SLACK_TOKEN_MISSING] ${JSON.stringify({
          slackUserId,
          timestamp: new Date().toISOString(),
        })}`,
      );
      throw new Error("SLACK_BOT_TOKEN environment variable is not set");
    }

    try {
      const requestBody = { channel: slackUserId, ...message };

      this.logger.log(
        `[SLACK_API_REQUEST] ${JSON.stringify({
          url: "https://slack.com/api/chat.postMessage",
          method: "POST",
          slackUserId,
          messageBlocks: message.blocks?.length || 0,
          hasText: !!message.text,
        })}`,
      );

      const response = await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const result = (await response.json()) as SlackApiResponse;

      if (!result.ok) {
        this.logger.error(
          `[SLACK_API_ERROR] ${JSON.stringify({
            slackUserId,
            error: result.error,
            errorDetails: result,
            httpStatus: response.status,
            httpStatusText: response.statusText,
          })}`,
        );
        throw new Error(`Slack API error: ${result.error}`);
      }

      this.logger.log(
        `[SLACK_API_SUCCESS] ${JSON.stringify({
          slackUserId,
          messageTimestamp: result.ts,
          channel: result.channel,
          httpStatus: response.status,
        })}`,
      );
    } catch (error) {
      this.logger.error(
        `[SLACK_API_EXCEPTION] ${JSON.stringify({
          slackUserId,
          error:
            error instanceof Error
              ? { message: error.message, stack: error.stack, name: error.name }
              : String(error),
        })}`,
      );
      throw error;
    }
  }
}
