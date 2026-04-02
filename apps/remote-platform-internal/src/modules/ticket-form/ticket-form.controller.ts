import { Body, Controller, Get, Logger, Put, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { DeviceInfoEntity, UserEntity } from "@remote-platform/entity";

import { BusinessException } from "@remote-platform/common";
import { UserInfoService } from "../user-info/user-info.service";

/** Standard API response wrapper */
interface ApiResponse<T = unknown> {
  readonly success: boolean;
  readonly data?: T;
  readonly time?: number;
  readonly error?: string;
  readonly message?: string;
  readonly errorCode?: string;
}

interface TicketTemplate {
  readonly id: number;
  readonly name: string;
  readonly tcSheetLink?: string;
  readonly jiraProjectKey?: string;
  readonly epicTicket?: string;
  readonly titlePrefix?: string;
  readonly componentList?: string[];
  readonly labelList?: string[];
}

interface UserTemplatesResponse {
  readonly ticketTemplateList: TicketTemplate[];
  readonly lastSelectedTemplate?: TicketTemplate;
}

@ApiTags("Ticket Form")
@Controller("api")
export class TicketFormController {
  private readonly logger = new Logger(TicketFormController.name);

  constructor(
    private readonly userInfoService: UserInfoService,
    @InjectRepository(DeviceInfoEntity)
    private readonly deviceRepository: Repository<DeviceInfoEntity>,
  ) {}

  /**
   * Resolve the actual device ID, falling back to LOCAL_DEVICE_ID in local dev environments.
   */
  private getActualDeviceId(deviceId: string): string {
    if (!deviceId || deviceId === "test") {
      this.logger.log(`Using LOCAL_DEVICE_ID: ${process.env.LOCAL_DEVICE_ID}`);
      return (
        process.env.LOCAL_DEVICE_ID ||
        "OPUD85CE1A76-1EE7-49DB-BE5C-81C3C72C3EF1"
      );
    }

    return deviceId;
  }

  /**
   * Retrieve ticket form data based on the last selected template.
   */
  @Get("ticket-form-data")
  public async getTicketFormData(
    @Query("deviceId") deviceId: string,
  ): Promise<ApiResponse> {
    const actualDeviceId = this.getActualDeviceId(deviceId);

    this.logger.log(`Retrieving ticket form data: ${actualDeviceId}`);
    const timeStart = Date.now();

    try {
      const data = await this.userInfoService.getTicketFormData(actualDeviceId);
      const time = Date.now() - timeStart;
      this.logger.log(`Admin DB query complete: ${time}ms`);

      return {
        success: true,
        data,
        time,
      };
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }

      this.logger.error("Failed to retrieve ticket form data:", error);
      throw BusinessException.internalError(
        "An error occurred while retrieving ticket form data.",
        {
          originalError: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  /**
   * Retrieve all ticket templates for a user.
   */
  @Get("user-templates")
  public async getUserTemplates(
    @Query("deviceId") deviceId: string,
  ): Promise<ApiResponse<UserTemplatesResponse>> {
    const actualDeviceId = this.getActualDeviceId(deviceId);

    this.logger.log(`Retrieving user templates: ${actualDeviceId}`);
    const timeStart = Date.now();

    try {
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

      const lastSelectedTemplate = user.lastSelectedTemplateName
        ? ticketTemplateList.find(
            (t) => t.name === user.lastSelectedTemplateName,
          )
        : undefined;

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
        `User templates retrieved: ${time}ms, template count: ${ticketTemplateList.length}`,
      );

      return {
        success: true,
        data: response,
        time,
      };
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }

      this.logger.error("Failed to retrieve user templates:", error);
      throw BusinessException.internalError(
        "An error occurred while retrieving user templates.",
        {
          originalError: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  /**
   * Retrieve ticket form data for a specific template and update the last selected template.
   */
  @Get("ticket-form-data-by-template")
  public async getTicketFormDataByTemplate(
    @Query("deviceId") deviceId: string,
    @Query("templateName") templateName: string,
  ): Promise<ApiResponse> {
    const actualDeviceId = this.getActualDeviceId(deviceId);

    this.logger.log(
      `Retrieving ticket form data by template: ${actualDeviceId}, template: ${templateName}`,
    );
    const timeStart = Date.now();

    try {
      const data = await this.userInfoService.getTicketFormDataByTemplate(
        actualDeviceId,
        templateName,
      );

      // Simultaneously update the last selected template name
      const device = await this.deviceRepository.findOne({
        where: { deviceId: actualDeviceId },
        relations: ["user"],
      });

      if (device && device.user) {
        await this.deviceRepository.manager.update(UserEntity, device.user.id, {
          lastSelectedTemplateName: templateName,
        });
        this.logger.log(`Updated lastSelectedTemplateName: ${templateName}`);
      }

      const time = Date.now() - timeStart;
      this.logger.log(
        `Template-specific form data retrieved and selection updated: ${time}ms`,
      );

      return {
        success: true,
        data,
        time,
      };
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }

      this.logger.error(
        "Failed to retrieve template-specific ticket form data:",
        error,
      );
      throw BusinessException.internalError(
        "An error occurred while retrieving ticket form data.",
        {
          originalError: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  /**
   * Update the last selected template for a user (called when the SDK changes templates).
   */
  @Put("select-template")
  public async selectTemplate(
    @Body() body: { deviceId: string; templateName: string },
  ): Promise<ApiResponse<{ message: string }>> {
    const { deviceId, templateName } = body;
    const actualDeviceId = this.getActualDeviceId(deviceId);

    this.logger.log(
      `Template selection update: ${actualDeviceId}, template: ${templateName}`,
    );

    try {
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

      const template = user.ticketTemplateList?.find(
        (t) => t.name === templateName,
      );
      if (!template) {
        throw BusinessException.templateNotFound(templateName, {
          userId: user.id,
          deviceId: actualDeviceId,
        });
      }

      await this.deviceRepository.manager.update(UserEntity, user.id, {
        lastSelectedTemplateName: templateName,
      });

      this.logger.log(`Template selection updated: ${templateName}`);

      return {
        success: true,
        data: {
          message: `Template '${templateName}' has been selected.`,
        },
      };
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }

      this.logger.error("Failed to update template selection:", error);
      throw BusinessException.internalError(
        "An error occurred while updating the template selection.",
        {
          originalError: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }
}
