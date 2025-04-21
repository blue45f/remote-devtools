import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { AssigneeInfo, DeviceInfoEntity } from "@remote-platform/entity";

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

// 기존 SimpleStructuredSheetData 인터페이스와 호환 유지
interface SimpleCellValue {
  text: string;
  userData?: {
    username: string;
    userDisplayName: string;
    email: string;
  };
}

interface SimpleColumnData {
  header: string;
  values: SimpleCellValue[];
}

interface SimpleStructuredSheetData {
  columns: SimpleColumnData[];
  totalRows: number;
  totalColumns: number;
  spreadsheetTitle?: string; // 스프레드시트 제목 추가
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
   * 기존 SheetDataService.getUserInfoByDeviceId와 호환
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

  /**
   * 티켓 폼 데이터 조회 (어드민 DB 기반)
   * 기존 SheetDataService.getTicketFormData와 호환
   */
  public async getTicketFormData(
    deviceId: string,
  ): Promise<SimpleStructuredSheetData> {
    const timeStart = Date.now();
    this.logger.log(`🎫 [UserInfo] getTicketFormData 호출됨: "${deviceId}"`);

    try {
      // 1. 디바이스 ID로 사용자와 템플릿 조회
      const device = await this.deviceRepository.findOne({
        where: { deviceId },
        relations: ["user", "user.ticketTemplateList"],
      });

      if (!device || !device.user) {
        this.logger.warn(`❌ [UserInfo] 사용자를 찾을 수 없음: ${deviceId}`);
        throw new Error("사용자 정보를 찾을 수 없습니다.");
      }

      const user = device.user;
      const ticketTemplateList = user.ticketTemplateList || [];

      // 마지막 선택 템플릿 찾기 (없으면 첫 번째 템플릿 사용)
      let template = ticketTemplateList[0]; // 기본값: 첫 번째 템플릿

      if (user.lastSelectedTemplateName) {
        const lastSelectedTemplate = ticketTemplateList.find(
          (t) => t.name === user.lastSelectedTemplateName,
        );
        if (lastSelectedTemplate) {
          template = lastSelectedTemplate;
          this.logger.log(
            `🎯 [UserInfo] 마지막 선택 템플릿 사용: "${user.lastSelectedTemplateName}"`,
          );
        } else {
          this.logger.warn(
            `⚠️ [UserInfo] 마지막 선택 템플릿을 찾을 수 없음: "${user.lastSelectedTemplateName}", 첫 번째 템플릿 사용`,
          );
        }
      } else {
        this.logger.log(
          `📋 [UserInfo] 마지막 선택 템플릿이 없어서 첫 번째 템플릿 사용`,
        );
      }

      if (!template) {
        this.logger.warn(
          `❌ [UserInfo] 티켓 템플릿을 찾을 수 없음: ${deviceId}`,
        );
        throw new Error("티켓 템플릿 정보를 찾을 수 없습니다.");
      }

      // 2. 어드민 DB 템플릿 데이터를 SimpleStructuredSheetData 형식으로 변환
      const columns: SimpleColumnData[] = [];

      // title (제목) 컬럼 - titlePrefix 활용
      columns.push({
        header: "제목",
        values: [{ text: template?.titlePrefix }],
      });

      // Epic 컬럼 - epicTicket 활용
      if (template.epicTicket) {
        columns.push({
          header: "상위 Epic 티켓",
          values: [{ text: template.epicTicket }],
        });
      }

      // 담당자 컬럼
      const assigneeData: AssigneeInfo[] =
        template.assigneeInfoList && template.assigneeInfoList.length > 0
          ? template.assigneeInfoList
          : [];

      if (assigneeData.length > 0) {
        columns.push({
          header: "담당자",
          values: assigneeData.map((assignee) => ({
            text: assignee.displayName, // displayName을 text로 사용
            userData: {
              username: assignee.username || "", // 새로운 방식에서는 username 사용 가능
              userDisplayName: assignee.displayName,
              email: assignee.email || "", // 이메일도 포함 가능
            },
          })),
        });
      }

      // 컴포넌트 컬럼
      if (template.componentList && template.componentList.length > 0) {
        columns.push({
          header: "컴포넌트",
          values: template.componentList.map((component) => ({
            text: component,
          })),
        });
      }

      // 레이블 컬럼
      if (template.labelList && template.labelList.length > 0) {
        columns.push({
          header: "레이블",
          values: template.labelList.map((label) => ({
            text: label,
          })),
        });
      }

      const result: SimpleStructuredSheetData = {
        columns,
        totalRows: Math.max(...columns.map((col) => col.values.length), 0),
        totalColumns: columns.length,
      };

      const timeEnd = Date.now();
      this.logger.log(
        `✅ [UserInfo] 티켓 폼 데이터 조회 성공 (${timeEnd - timeStart}ms): ${JSON.stringify(
          {
            deviceId,
            username: user.name,
            empNo: user.empNo,
            templateName: template.name,
            columnsCount: columns.length,
            totalRows: result.totalRows,
          },
        )}`,
      );

      return result;
    } catch (error) {
      this.logger.error(`❌ [UserInfo] getTicketFormData 실패:`, error);
      throw error;
    }
  }

  /**
   * 특정 템플릿 기준으로 티켓 폼 데이터 조회 (SDK 모달용)
   */
  public async getTicketFormDataByTemplate(
    deviceId: string,
    templateName: string,
  ): Promise<SimpleStructuredSheetData> {
    const timeStart = Date.now();
    this.logger.log(
      `🎯 [UserInfo] getTicketFormDataByTemplate 호출됨: "${deviceId}", 템플릿: "${templateName}"`,
    );

    try {
      // 1. 디바이스 ID로 사용자와 템플릿들 조회
      const device = await this.deviceRepository.findOne({
        where: { deviceId },
        relations: ["user", "user.ticketTemplateList"],
      });

      if (!device || !device.user) {
        this.logger.warn(`❌ [UserInfo] 사용자를 찾을 수 없음: ${deviceId}`);
        throw new Error("사용자 정보를 찾을 수 없습니다.");
      }

      const user = device.user;

      // 2. 특정 템플릿 찾기
      const template = user.ticketTemplateList?.find(
        (t) => t.name === templateName,
      );

      if (!template) {
        this.logger.warn(
          `❌ [UserInfo] 템플릿을 찾을 수 없음: ${templateName}`,
        );
        throw new Error(`템플릿 '${templateName}'을 찾을 수 없습니다.`);
      }

      // 3. 해당 템플릿 데이터를 SimpleStructuredSheetData 형식으로 변환
      const columns: SimpleColumnData[] = [];

      // title (제목) 컬럼 - titlePrefix 활용
      columns.push({
        header: "제목",
        values: [{ text: template?.titlePrefix }],
      });

      // Epic 컬럼 - epicTicket 활용
      if (template.epicTicket) {
        columns.push({
          header: "상위 Epic 티켓",
          values: [{ text: template.epicTicket }],
        });
      }

      // 담당자 컬럼
      const assigneeData: AssigneeInfo[] =
        template.assigneeInfoList && template.assigneeInfoList.length > 0
          ? template.assigneeInfoList
          : [];

      if (assigneeData.length > 0) {
        columns.push({
          header: "담당자",
          values: assigneeData.map((assignee) => ({
            text: assignee.displayName, // displayName을 text로 사용
            userData: {
              username: assignee.username || "", // 새로운 방식에서는 username 사용 가능
              userDisplayName: assignee.displayName,
              email: assignee.email || "", // 이메일도 포함 가능
            },
          })),
        });
      }

      // 컴포넌트 컬럼
      if (template.componentList && template.componentList.length > 0) {
        columns.push({
          header: "컴포넌트",
          values: template.componentList.map((component) => ({
            text: component,
          })),
        });
      }

      // 레이블 컬럼
      if (template.labelList && template.labelList.length > 0) {
        columns.push({
          header: "레이블",
          values: template.labelList.map((label) => ({
            text: label,
          })),
        });
      }

      const result: SimpleStructuredSheetData = {
        columns,
        totalRows: Math.max(...columns.map((col) => col.values.length), 0),
        totalColumns: columns.length,
      };

      const timeEnd = Date.now();
      this.logger.log(
        `✅ [UserInfo] 특정 템플릿 폼 데이터 조회 성공 (${timeEnd - timeStart}ms): ${JSON.stringify(
          {
            deviceId,
            username: user.name,
            empNo: user.empNo,
            templateName: template.name,
            columnsCount: columns.length,
            totalRows: result.totalRows,
          },
        )}`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `❌ [UserInfo] getTicketFormDataByTemplate 실패:`,
        error,
      );
      throw error;
    }
  }
}
