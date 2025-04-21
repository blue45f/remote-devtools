import { Body, Controller, Get, Logger, Put, Query } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { DeviceInfoEntity, UserEntity } from "@remote-platform/entity";

import { BusinessException } from "../../common/exceptions/business.exception";
import { UserInfoService } from "../user-info/user-info.service";

// 기본 응답 타입
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  time?: number;
  error?: string;
  message?: string;
  errorCode?: string;
}

interface TicketTemplate {
  id: number;
  name: string;
  tcSheetLink?: string;
  jiraProjectKey?: string;
  epicTicket?: string;
  titlePrefix?: string;
  componentList?: string[];
  labelList?: string[];
}

interface UserTemplatesResponse {
  ticketTemplateList: TicketTemplate[];
  lastSelectedTemplate?: TicketTemplate;
}

@Controller("api")
export class TicketFormController {
  private readonly logger = new Logger(TicketFormController.name);

  constructor(
    private readonly userInfoService: UserInfoService,
    @InjectRepository(DeviceInfoEntity)
    private readonly deviceRepository: Repository<DeviceInfoEntity>,
  ) {}

  /**
   * 로컬 개발 환경에서 LOCAL_DEVICE_ID 사용 처리
   */
  private getActualDeviceId(deviceId: string): string {
    if (!deviceId || deviceId === "test") {
      this.logger.log(
        `🔧 LOCAL_DEVICE_ID 사용: ${process.env.LOCAL_DEVICE_ID}`,
      );
      return (
        process.env.LOCAL_DEVICE_ID ||
        "OPUD85CE1A76-1EE7-49DB-BE5C-81C3C72C3EF1"
      );
    }

    return deviceId;
  }

  /**
   * 티켓 폼 데이터 조회 (마지막 선택 템플릿 기준)
   */
  @Get("ticket-form-data")
  public async getTicketFormData(
    @Query("deviceId") deviceId: string,
  ): Promise<ApiResponse> {
    const actualDeviceId = this.getActualDeviceId(deviceId);

    this.logger.log(`🎫 티켓 폼 데이터 조회: ${actualDeviceId}`);
    const timeStart = Date.now();

    try {
      const data = await this.userInfoService.getTicketFormData(actualDeviceId);
      const time = Date.now() - timeStart;
      this.logger.log(`⚡ 어드민 DB 조회 완료: ${time}ms`);

      return {
        success: true,
        data,
        time,
      };
    } catch (error) {
      // BusinessException은 글로벌 필터로 처리하도록 다시 throw
      if (error instanceof BusinessException) {
        throw error;
      }

      this.logger.error("티켓 폼 데이터 조회 실패:", error);
      // 예상치 못한 에러는 내부 서버 에러로 변환
      throw BusinessException.internalError(
        "티켓 폼 데이터 조회 중 오류가 발생했습니다.",
        {
          originalError: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  /**
   * 사용자의 모든 템플릿 목록 조회
   */
  @Get("user-templates")
  public async getUserTemplates(
    @Query("deviceId") deviceId: string,
  ): Promise<ApiResponse<UserTemplatesResponse>> {
    const actualDeviceId = this.getActualDeviceId(deviceId);

    this.logger.log(`📋 사용자 템플릿 목록 조회: ${actualDeviceId}`);
    const timeStart = Date.now();

    try {
      // 1. 디바이스 ID로 사용자와 템플릿들 조회
      const device = await this.deviceRepository.findOne({
        where: { deviceId: actualDeviceId },
        relations: ["user", "user.ticketTemplateList"],
      });

      if (!device) {
        throw BusinessException.deviceNotFound({ deviceId: actualDeviceId });
      }

      if (!device.user) {
        throw BusinessException.deviceUserNotFound({
          deviceId: actualDeviceId,
        });
      }

      const user = device.user;
      const ticketTemplateList = user.ticketTemplateList || [];

      // 2. 마지막 선택 템플릿 찾기
      const lastSelectedTemplate = user.lastSelectedTemplateName
        ? ticketTemplateList.find(
            (t) => t.name === user.lastSelectedTemplateName,
          )
        : undefined;

      // 3. 응답 형식으로 변환
      const response: UserTemplatesResponse = {
        ticketTemplateList: ticketTemplateList.map((template) => ({
          id: template.id,
          name: template.name,
          tcSheetLink: template.tcSheetLink,
          jiraProjectKey: template.jiraProjectKey,
          epicTicket: template.epicTicket,
          titlePrefix: template.titlePrefix,
          componentList: template.componentList,
          labelList: template.labelList,
        })),
        lastSelectedTemplate: lastSelectedTemplate
          ? {
              id: lastSelectedTemplate.id,
              name: lastSelectedTemplate.name,
              tcSheetLink: lastSelectedTemplate.tcSheetLink,
              jiraProjectKey: lastSelectedTemplate.jiraProjectKey,
              epicTicket: lastSelectedTemplate.epicTicket,
              titlePrefix: lastSelectedTemplate.titlePrefix,
              componentList: lastSelectedTemplate.componentList,
              labelList: lastSelectedTemplate.labelList,
            }
          : undefined,
      };

      const time = Date.now() - timeStart;
      this.logger.log(
        `⚡ 사용자 템플릿 조회 완료: ${time}ms, 템플릿 수: ${ticketTemplateList.length}`,
      );

      return {
        success: true,
        data: response,
        time,
      };
    } catch (error) {
      // BusinessException은 글로벌 필터로 처리하도록 다시 throw
      if (error instanceof BusinessException) {
        throw error;
      }

      this.logger.error("사용자 템플릿 조회 실패:", error);
      // 예상치 못한 에러는 내부 서버 에러로 변환
      throw BusinessException.internalError(
        "사용자 템플릿 조회 중 오류가 발생했습니다.",
        {
          originalError: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  /**
   * 특정 템플릿 기준으로 티켓 폼 데이터 조회 (+ lastSelectedTemplateName 업데이트)
   */
  @Get("ticket-form-data-by-template")
  public async getTicketFormDataByTemplate(
    @Query("deviceId") deviceId: string,
    @Query("templateName") templateName: string,
  ): Promise<ApiResponse> {
    const actualDeviceId = this.getActualDeviceId(deviceId);

    this.logger.log(
      `🎯 특정 템플릿 티켓 폼 데이터 조회: ${actualDeviceId}, 템플릿: ${templateName}`,
    );
    const timeStart = Date.now();

    try {
      // 1. 사용자의 특정 템플릿 기준으로 폼 데이터 생성
      const data = await this.userInfoService.getTicketFormDataByTemplate(
        actualDeviceId,
        templateName,
      );

      // 2. 동시에 lastSelectedTemplateName 업데이트
      const device = await this.deviceRepository.findOne({
        where: { deviceId: actualDeviceId },
        relations: ["user"],
      });

      if (device && device.user) {
        await this.deviceRepository.manager.update(UserEntity, device.user.id, {
          lastSelectedTemplateName: templateName,
        });
        this.logger.log(
          `🔄 lastSelectedTemplateName 업데이트: ${templateName}`,
        );
      }

      const time = Date.now() - timeStart;
      this.logger.log(`⚡ 특정 템플릿 조회 + 선택 업데이트 완료: ${time}ms`);

      return {
        success: true,
        data,
        time,
      };
    } catch (error) {
      // BusinessException은 글로벌 필터로 처리하도록 다시 throw
      if (error instanceof BusinessException) {
        throw error;
      }

      this.logger.error("특정 템플릿 티켓 폼 데이터 조회 실패:", error);
      // 예상치 못한 에러는 내부 서버 에러로 변환
      throw BusinessException.internalError(
        "티켓 폼 데이터 조회 중 오류가 발생했습니다.",
        {
          originalError: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  /**
   * 마지막 선택 템플릿 업데이트 (SDK에서 템플릿 변경 시 사용)
   */
  @Put("select-template")
  public async selectTemplate(
    @Body() body: { deviceId: string; templateName: string },
  ): Promise<ApiResponse<{ message: string }>> {
    const { deviceId, templateName } = body;
    const actualDeviceId = this.getActualDeviceId(deviceId);

    this.logger.log(
      `🎯 템플릿 선택 업데이트: ${actualDeviceId}, 템플릿: ${templateName}`,
    );

    try {
      // 1. 디바이스 ID로 사용자 조회
      const device = await this.deviceRepository.findOne({
        where: { deviceId: actualDeviceId },
        relations: ["user", "user.ticketTemplateList"],
      });

      if (!device) {
        throw BusinessException.deviceNotFound({ deviceId: actualDeviceId });
      }

      if (!device.user) {
        throw BusinessException.deviceUserNotFound({
          deviceId: actualDeviceId,
        });
      }

      const user = device.user;

      // 2. 해당 템플릿이 존재하는지 확인
      const template = user.ticketTemplateList?.find(
        (t) => t.name === templateName,
      );
      if (!template) {
        throw BusinessException.templateNotFound(templateName, {
          userId: user.id,
          deviceId: actualDeviceId,
        });
      }

      // 3. 마지막 선택 템플릿 업데이트
      await this.deviceRepository.manager.update(UserEntity, user.id, {
        lastSelectedTemplateName: templateName,
      });

      this.logger.log(`✅ 템플릿 선택 업데이트 완료: ${templateName}`);

      return {
        success: true,
        data: {
          message: `템플릿 '${templateName}'이 선택되었습니다.`,
        },
      };
    } catch (error) {
      // BusinessException은 글로벌 필터로 처리하도록 다시 throw
      if (error instanceof BusinessException) {
        throw error;
      }

      this.logger.error("템플릿 선택 업데이트 실패:", error);
      // 예상치 못한 에러는 내부 서버 에러로 변환
      throw BusinessException.internalError(
        "템플릿 선택 업데이트 중 오류가 발생했습니다.",
        {
          originalError: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }
}
