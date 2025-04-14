import { Injectable, Logger } from "@nestjs/common";

import { convertRecordLink, createUserDataText } from "../../utils/utils";
import { CreateTicketRequestBody } from "../jira/jira.service";
import { UserData } from "../webview/webview.gateway";

@Injectable()
export class SlackService {
  private readonly logger = new Logger(SlackService.name);

  /**
   * 슬랙 사용자에게 티켓 생성 알림 DM 전송
   * @param slackUserId 슬랙 사용자 ID (예: U1234567890)
   * @param ticketData 티켓 정보
   */
  public async sendCreateTicketDM({
    slackUserId,
    ticketURL,
    requestBody,
    ticketKey,
  }: {
    slackUserId: string;
    ticketURL: string;
    requestBody: CreateTicketRequestBody;
    ticketKey: string;
  }): Promise<void> {
    try {
      const message = this.buildTicketMessage({
        ticketURL,
        requestBody,
        ticketKey,
      });

      this.logger.log(
        `[SLACK_TICKET_DM_START] ${JSON.stringify({
          slackUserId,
          ticketURL,
          messageType: "ticket_notification",
        })}`,
      );

      await this.sendDirectMessage(slackUserId, message);

      this.logger.log(
        `[SLACK_TICKET_DM_SUCCESS] ${JSON.stringify({
          slackUserId,
          ticketURL,
        })}`,
      );
    } catch (error) {
      this.logger.error(
        `[SLACK_TICKET_DM_ERROR] ${JSON.stringify({
          slackUserId,
          ticketURL,
          error:
            error instanceof Error
              ? {
                  message: error.message,
                  stack: error.stack,
                  name: error.name,
                }
              : JSON.stringify(error),
        })}`,
      );
      throw error;
    }
  }

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
              ? {
                  message: error.message,
                  stack: error.stack,
                  name: error.name,
                }
              : JSON.stringify(error),
        })}`,
      );
      throw error;
    }
  }

  private buildCreateRoomMessage(
    userData: UserData,
    recordId: number,
    roomName: string,
  ) {
    const userDataText = createUserDataText(userData);

    const recoreLink = convertRecordLink(roomName, recordId);

    return {
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "녹화 세션 & 유저 정보",
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `\`\`\`녹화 세션 링크: ${recoreLink}\n\n${userDataText}\`\`\``,
          },
        },
      ],
    };
  }

  /**
   * 티켓 생성 알림 메시지 구성
   */
  private buildTicketMessage({
    ticketURL,
    requestBody,
    ticketKey,
  }: {
    ticketURL: string;
    requestBody: CreateTicketRequestBody;
    ticketKey: string;
  }) {
    return {
      text: `🎫 원격 지원 티켓이 생성되었습니다`,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `🎫 티켓이 생성되었어요!`,
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
                text: "생성된 티켓 바로가기",
              },
              style: "primary",
              url: ticketURL,
            },
          ],
        },
      ],
    };
  }

  /**
   * 슬랙 DM 전송
   */
  public async sendDirectMessage(
    slackUserId: string,
    message: any,
  ): Promise<void> {
    // 환경변수에서 토큰 가져오기 (fallback: 하드코딩된 토큰)
    const authToken = process.env.SLACK_BOT_TOKEN;

    if (!authToken) {
      this.logger.error(
        `[SLACK_TOKEN_MISSING] ${JSON.stringify({
          slackUserId,
          timestamp: new Date().toISOString(),
        })}`,
      );
      throw new Error("SLACK_BOT_TOKEN 환경변수가 설정되지 않음");
    }

    try {
      const requestBody = {
        channel: slackUserId,
        ...message,
      };

      this.logger.log(
        `[SLACK_API_REQUEST] ${JSON.stringify({
          url: "https://slack.com/api/chat.postMessage",
          method: "POST",
          slackUserId,
          messageBlocks: message.blocks?.length || 0,
          hasText: !!message.text,
        })}`,
      );

      // 실제 슬랙 API 호출 로직
      const response = await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

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
        throw new Error(`슬랙 API 오류: ${result.error}`);
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
              ? {
                  message: error.message,
                  stack: error.stack,
                  name: error.name,
                }
              : JSON.stringify(error),
        })}`,
      );
      throw error;
    }
  }
}
