import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { AssigneeInfo, DeviceInfoEntity } from "@remote-platform/entity";

/** User information compatible with the legacy UserInfo interface */
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

interface SimpleCellValue {
  readonly text: string;
  readonly userData?: {
    readonly username: string;
    readonly userDisplayName: string;
    readonly email: string;
  };
}

interface SimpleColumnData {
  readonly header: string;
  readonly values: SimpleCellValue[];
}

/** Structured sheet data format compatible with the legacy interface */
interface SimpleStructuredSheetData {
  readonly columns: SimpleColumnData[];
  readonly totalRows: number;
  readonly totalColumns: number;
  readonly spreadsheetTitle?: string;
}

@Injectable()
export class UserInfoService {
  private readonly logger = new Logger(UserInfoService.name);

  constructor(
    @InjectRepository(DeviceInfoEntity)
    private readonly deviceRepository: Repository<DeviceInfoEntity>,
  ) {}

  /**
   * Retrieve user information by device ID from the admin database.
   */
  public async getUserInfoByDeviceId(
    deviceId: string,
  ): Promise<UserInfo | null> {
    const timeStart = Date.now();
    this.logger.log(`[UserInfo] getUserInfoByDeviceId called: "${deviceId}"`);

    try {
      const device = await this.deviceRepository.findOne({
        where: { deviceId },
        relations: ["user", "user.ticketTemplateList"],
      });

      if (!device || !device.user) {
        this.logger.warn(`[UserInfo] User not found for device: ${deviceId}`);
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

      const duration = Date.now() - timeStart;
      this.logger.log(
        `[UserInfo] User info retrieved (${duration}ms): ${JSON.stringify({
          deviceId,
          username: userInfo.username,
          slackUserId: userInfo.slackUserId,
          jiraProjectKey: userInfo.jiraProjectKey,
          empNo: user.empNo,
        })}`,
      );

      return userInfo;
    } catch (error) {
      this.logger.error(`[UserInfo] getUserInfoByDeviceId failed:`, error);
      return null;
    }
  }

  /**
   * Retrieve ticket form data for a device, using the last selected template or falling back to the first.
   */
  public async getTicketFormData(
    deviceId: string,
  ): Promise<SimpleStructuredSheetData> {
    const timeStart = Date.now();
    this.logger.log(`[UserInfo] getTicketFormData called: "${deviceId}"`);

    try {
      const device = await this.deviceRepository.findOne({
        where: { deviceId },
        relations: ["user", "user.ticketTemplateList"],
      });

      if (!device || !device.user) {
        this.logger.warn(`[UserInfo] User not found for device: ${deviceId}`);
        throw new Error("User information not found.");
      }

      const user = device.user;
      const ticketTemplateList = user.ticketTemplateList || [];

      // Use the last selected template, falling back to the first available template
      let template = ticketTemplateList[0];

      if (user.lastSelectedTemplateName) {
        const lastSelectedTemplate = ticketTemplateList.find(
          (t) => t.name === user.lastSelectedTemplateName,
        );
        if (lastSelectedTemplate) {
          template = lastSelectedTemplate;
          this.logger.log(
            `[UserInfo] Using last selected template: "${user.lastSelectedTemplateName}"`,
          );
        } else {
          this.logger.warn(
            `[UserInfo] Last selected template not found: "${user.lastSelectedTemplateName}", using first template`,
          );
        }
      } else {
        this.logger.log(
          `[UserInfo] No last selected template; using first template`,
        );
      }

      if (!template) {
        this.logger.warn(
          `[UserInfo] No ticket template found for device: ${deviceId}`,
        );
        throw new Error("No ticket template found.");
      }

      const result = this.buildStructuredSheetData(template);

      const duration = Date.now() - timeStart;
      this.logger.log(
        `[UserInfo] Ticket form data retrieved (${duration}ms): ${JSON.stringify(
          {
            deviceId,
            username: user.name,
            empNo: user.empNo,
            templateName: template.name,
            columnsCount: result.columns.length,
            totalRows: result.totalRows,
          },
        )}`,
      );

      return result;
    } catch (error) {
      this.logger.error(`[UserInfo] getTicketFormData failed:`, error);
      throw error;
    }
  }

  /**
   * Retrieve ticket form data for a specific template (used by the SDK modal).
   */
  public async getTicketFormDataByTemplate(
    deviceId: string,
    templateName: string,
  ): Promise<SimpleStructuredSheetData> {
    const timeStart = Date.now();
    this.logger.log(
      `[UserInfo] getTicketFormDataByTemplate called: "${deviceId}", template: "${templateName}"`,
    );

    try {
      const device = await this.deviceRepository.findOne({
        where: { deviceId },
        relations: ["user", "user.ticketTemplateList"],
      });

      if (!device || !device.user) {
        this.logger.warn(`[UserInfo] User not found for device: ${deviceId}`);
        throw new Error("User information not found.");
      }

      const user = device.user;

      const template = user.ticketTemplateList?.find(
        (t) => t.name === templateName,
      );

      if (!template) {
        this.logger.warn(`[UserInfo] Template not found: ${templateName}`);
        throw new Error(`Template '${templateName}' not found.`);
      }

      const result = this.buildStructuredSheetData(template);

      const duration = Date.now() - timeStart;
      this.logger.log(
        `[UserInfo] Template-specific form data retrieved (${duration}ms): ${JSON.stringify(
          {
            deviceId,
            username: user.name,
            empNo: user.empNo,
            templateName: template.name,
            columnsCount: result.columns.length,
            totalRows: result.totalRows,
          },
        )}`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `[UserInfo] getTicketFormDataByTemplate failed:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Build a SimpleStructuredSheetData from a ticket template entity.
   */
  private buildStructuredSheetData(template: {
    titlePrefix?: string;
    epicTicket?: string;
    assigneeInfoList?: AssigneeInfo[];
    componentList?: string[];
    labelList?: string[];
  }): SimpleStructuredSheetData {
    const columns: SimpleColumnData[] = [];

    // Title column using titlePrefix
    columns.push({
      header: "Title",
      values: [{ text: template?.titlePrefix }],
    });

    // Epic ticket column
    if (template.epicTicket) {
      columns.push({
        header: "Parent Epic Ticket",
        values: [{ text: template.epicTicket }],
      });
    }

    // Assignee column
    const assigneeData: AssigneeInfo[] =
      template.assigneeInfoList && template.assigneeInfoList.length > 0
        ? template.assigneeInfoList
        : [];

    if (assigneeData.length > 0) {
      columns.push({
        header: "Assignee",
        values: assigneeData.map((assignee) => ({
          text: assignee.displayName,
          userData: {
            username: assignee.username || "",
            userDisplayName: assignee.displayName,
            email: assignee.email || "",
          },
        })),
      });
    }

    // Component column
    if (template.componentList && template.componentList.length > 0) {
      columns.push({
        header: "Component",
        values: template.componentList.map((component) => ({
          text: component,
        })),
      });
    }

    // Label column
    if (template.labelList && template.labelList.length > 0) {
      columns.push({
        header: "Label",
        values: template.labelList.map((label) => ({
          text: label,
        })),
      });
    }

    return {
      columns,
      totalRows: Math.max(...columns.map((col) => col.values.length), 0),
      totalColumns: columns.length,
    };
  }
}
