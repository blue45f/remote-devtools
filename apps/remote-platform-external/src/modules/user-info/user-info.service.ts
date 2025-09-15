import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { DeviceInfoEntity } from "@remote-platform/entity";

/** User information compatible with the legacy UserInfo interface. */
interface UserInfo {
  readonly deviceId: string;
  readonly username: string;
  readonly userDisplayName: string;
  readonly email?: string;
  readonly slackUserId?: string;
  readonly jiraProjectKey?: string;
  readonly tcSheetUrl?: string;
  readonly tcSheetId?: string;
  readonly jobType?: string;
}

@Injectable()
export class UserInfoService {
  private readonly logger = new Logger(UserInfoService.name);

  constructor(
    @InjectRepository(DeviceInfoEntity)
    private readonly deviceRepository: Repository<DeviceInfoEntity>,
  ) {}

  /**
   * Looks up user information by device ID from the admin database.
   * Used primarily when creating Jira tickets.
   */
  public async getUserInfoByDeviceId(
    deviceId: string,
  ): Promise<UserInfo | null> {
    const startTime = Date.now();
    this.logger.log(
      `[USER_INFO_LOOKUP] Looking up user info for deviceId="${deviceId}"`,
    );

    try {
      const device = await this.deviceRepository.findOne({
        where: { deviceId },
        relations: ["user", "user.ticketTemplateList"],
      });

      if (!device || !device.user) {
        this.logger.warn(
          `[USER_INFO_LOOKUP] No user found for deviceId=${deviceId}`,
        );
        return null;
      }

      const user = device.user;
      const template = user.ticketTemplateList?.[0];

      const userInfo: UserInfo = {
        deviceId,
        username: user.username,
        userDisplayName: user.name,
        email: undefined,
        slackUserId: user.slackId,
        jiraProjectKey: template?.jiraProjectKey || undefined,
        tcSheetUrl: undefined,
        tcSheetId: undefined,
        jobType: user.jobType,
      };

      const elapsed = Date.now() - startTime;
      this.logger.log(
        `[USER_INFO_LOOKUP] User info retrieved in ${elapsed}ms: ${JSON.stringify(
          {
            deviceId,
            username: userInfo.username,
            slackUserId: userInfo.slackUserId,
            jiraProjectKey: userInfo.jiraProjectKey,
            empNo: user.empNo,
          },
        )}`,
      );

      return userInfo;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `[USER_INFO_LOOKUP] Failed to look up user info for deviceId=${deviceId}: ${message}`,
      );
      return null;
    }
  }
}
