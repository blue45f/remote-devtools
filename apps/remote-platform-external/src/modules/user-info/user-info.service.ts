import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { DeviceInfoEntity } from "@remote-platform/entity";

// 기존 UserInfo 인터페이스와 호환 유지
interface UserInfo {
  deviceId: string; // 디바이스 ID
  username: string;
  userDisplayName: string;
  email?: string;
  slackUserId?: string;
  jiraProjectKey?: string;
  TCspreadSheetURL?: string;
  TCspreadSheetID?: string;
  jobType?: string; // 직군 정보 추가 (QA, PM, DEVELOPER 등)
}

@Injectable()
export class UserInfoService {
  private readonly logger = new Logger(UserInfoService.name);

  constructor(
    @InjectRepository(DeviceInfoEntity)
    private readonly deviceRepository: Repository<DeviceInfoEntity>,
  ) {}

  /**
   * 디바이스 ID로 사용자 정보 조회 (어드민 DB에서)
   * JIRA 티켓 생성 시 사용
   */
  public async getUserInfoByDeviceId(
    deviceId: string,
  ): Promise<UserInfo | null> {
    const timeStart = Date.now();
    this.logger.log(
      `🔍 [UserInfo] getUserInfoByDeviceId 호출됨: "${deviceId}"`,
    );

    try {
      // 1. 디바이스 ID로 사용자 조회
      const device = await this.deviceRepository.findOne({
        where: { deviceId },
        relations: ["user", "user.ticketTemplateList"],
      });

      if (!device || !device.user) {
        this.logger.warn(
          `❌ [UserInfo] 사용자 정보를 찾을 수 없음: ${deviceId}`,
        );
        return null;
      }

      const user = device.user;
      const template = user.ticketTemplateList?.[0]; // 첫 번째 템플릿 사용

      // 2. 기존 UserInfo 형식으로 변환
      const userInfo: UserInfo = {
        deviceId: deviceId,
        username: user.username,
        userDisplayName: user.name,
        email: undefined, // 어드민 DB에는 이메일 없음
        slackUserId: user.slackId,
        jiraProjectKey: template?.jiraProjectKey || undefined,
        TCspreadSheetURL: undefined, // 더 이상 사용하지 않음
        TCspreadSheetID: undefined, // 더 이상 사용하지 않음
        jobType: user.jobType, // 직군 정보 추가
      };

      const timeEnd = Date.now();
      this.logger.log(
        `✅ [UserInfo] 사용자 정보 조회 성공 (${timeEnd - timeStart}ms): ${JSON.stringify(
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
      this.logger.error(`❌ [UserInfo] getUserInfoByDeviceId 실패:`, error);
      return null;
    }
  }
}
