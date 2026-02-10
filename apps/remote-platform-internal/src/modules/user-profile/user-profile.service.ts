import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import axios from "axios";
import { Repository } from "typeorm";

import {
  DeviceInfoEntity,
  JobType,
  UserEntity,
  UserTicketTemplateEntity,
} from "@remote-platform/entity";

import {
  CreateUserProfileDto,
  UpdateUserProfileDto,
  UserProfileResponseDto,
} from "./user-profile.dto";

interface SlackUserWithExternalResponse {
  readonly code: string;
  readonly message: string;
  readonly status: string;
  readonly statusMessage: string;
  readonly data: {
    readonly name: string;
    readonly email: string;
    readonly slackId: string;
  };
}

@Injectable()
export class UserProfileService {
  private readonly logger = new Logger(UserProfileService.name);
  private readonly proxyServerUrl =
    process.env.WORKFLOW_API_URL || "http://localhost:3001";

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(DeviceInfoEntity)
    private readonly deviceRepository: Repository<DeviceInfoEntity>,
  ) {}

  /**
   * Create a new user profile with devices and ticket templates.
   */
  public async create(
    createUserProfileDto: CreateUserProfileDto,
  ): Promise<UserProfileResponseDto> {
    const {
      name,
      jobType,
      slackId,
      empNo,
      deviceInfoList,
      ticketTemplateList,
    } = createUserProfileDto;

    this.logger.log(`Creating user - empNo: ${empNo}, slackId: ${slackId}`);

    // Check for duplicate employee number
    const existingEmpNo = await this.userRepository.findOne({
      where: { empNo },
    });
    if (existingEmpNo) {
      this.logger.error(`Duplicate employee number: ${empNo}`);
      throw new ConflictException(`User with empNo '${empNo}' already exists`);
    }

    // Check for duplicate Slack ID
    const existingSlackId = await this.userRepository.findOne({
      where: { slackId },
    });
    if (existingSlackId) {
      this.logger.error(
        `Duplicate Slack ID: ${slackId}, existing user empNo: ${existingSlackId.empNo}`,
      );
      throw new ConflictException(
        `Slack ID '${slackId}' is already in use by empNo '${existingSlackId.empNo}'`,
      );
    }

    // Validate device IDs
    for (const device of deviceInfoList) {
      if (!device.deviceId || device.deviceId.trim() === "") {
        throw new BadRequestException(
          `Device ID is required but got: '${device.deviceId}'`,
        );
      }

      const existingDevice = await this.deviceRepository.findOne({
        where: { deviceId: device.deviceId },
      });
      if (existingDevice) {
        this.logger.error(`Duplicate device ID: ${device.deviceId}`);
        throw new ConflictException(
          `Device ID '${device.deviceId}' already exists`,
        );
      }
    }

    return this.userRepository.manager.transaction(async (manager) => {
      this.logger.log(`Transaction started for user creation`);

      // 1. Create user
      const user = manager.create(UserEntity, {
        name,
        username: createUserProfileDto.username,
        jobType,
        slackId,
        empNo,
      });

      let savedUser: UserEntity;
      try {
        savedUser = await manager.save(user);
        this.logger.log(`User saved - id: ${savedUser.id}`);
      } catch (error) {
        this.logger.error(`Failed to save user:`, error);
        throw error;
      }

      // 2. Create device entries
      const deviceEntities = deviceInfoList.map((device) =>
        manager.create(DeviceInfoEntity, {
          userId: savedUser.id,
          deviceId: device.deviceId,
          name: device.name,
        }),
      );

      let savedDevices: DeviceInfoEntity[];
      try {
        savedDevices = await manager.save(deviceEntities);
        this.logger.log(`Devices saved: ${savedDevices.length}`);
      } catch (error) {
        this.logger.error(`Failed to save devices:`, error);
        throw error;
      }

      // 3. Create ticket templates
      const templateEntities = ticketTemplateList.map((template) =>
        manager.create(UserTicketTemplateEntity, {
          userId: savedUser.id,
          name: template.name,
          tcSheetLink: template.tcSheetLink,
          jiraProjectKey: template.jiraProjectKey,
          epicTicket: template.epicTicket,
          titlePrefix: template.titlePrefix,
          assigneeInfoList: template.assigneeInfoList,
          componentList: template.componentList,
          labelList: template.labelList,
        }),
      );

      let savedTemplates: UserTicketTemplateEntity[] = [];
      if (templateEntities.length > 0) {
        try {
          savedTemplates = await manager.save(templateEntities);
          this.logger.log(`Templates saved: ${savedTemplates.length}`);
        } catch (error) {
          this.logger.error(`Failed to save templates:`, error);
          throw error;
        }
      }

      return this.formatResponse(savedUser, savedDevices, savedTemplates);
    });
  }

  /**
   * Find a user profile by ID.
   */
  public async findOne(id: number): Promise<UserProfileResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ["deviceInfoList", "ticketTemplateList"],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return this.formatResponse(
      user,
      user.deviceInfoList,
      user.ticketTemplateList,
    );
  }

  /**
   * Find a user profile by employee number.
   */
  public async findOneByEmpNo(empNo: string): Promise<UserProfileResponseDto> {
    const user = await this.userRepository.findOne({
      where: { empNo },
      relations: ["deviceInfoList", "ticketTemplateList"],
    });

    if (!user) {
      throw new NotFoundException(`User with empNo '${empNo}' not found`);
    }

    return this.formatResponse(
      user,
      user.deviceInfoList,
      user.ticketTemplateList,
    );
  }

  /**
   * Find all user profiles.
   */
  public async findAll(): Promise<UserProfileResponseDto[]> {
    const users = await this.userRepository.find({
      relations: ["deviceInfoList", "ticketTemplateList"],
      order: { createdAt: "DESC" },
    });

    return users.map((user) =>
      this.formatResponse(user, user.deviceInfoList, user.ticketTemplateList),
    );
  }

  /**
   * Remove a user profile by ID. Related data is deleted via CASCADE.
   */
  public async remove(id: number): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    await this.userRepository.remove(user);
  }

  /**
   * Update a user profile by employee number.
   */
  public async updateByEmpNo(
    empNo: string,
    updateUserProfileDto: UpdateUserProfileDto,
  ): Promise<UserProfileResponseDto> {
    const {
      deviceInfoList,
      ticketTemplateList,
      lastSelectedTemplateName,
      ...updateData
    } = updateUserProfileDto;

    const user = await this.userRepository.findOne({
      where: { empNo },
      relations: ["deviceInfoList", "ticketTemplateList"],
    });

    if (!user) {
      throw new NotFoundException(`User with empNo '${empNo}' not found`);
    }

    // Check for duplicate employee number with other users
    if (empNo) {
      const existingEmpNo = await this.userRepository.findOne({
        where: { empNo },
      });
      if (existingEmpNo && existingEmpNo.id !== user.id) {
        throw new ConflictException(
          `User with empNo '${empNo}' already exists`,
        );
      }
    }

    // Check for duplicate username with other users
    if (updateData.username) {
      const existingUsername = await this.userRepository.findOne({
        where: { username: updateData.username },
      });
      if (existingUsername && existingUsername.id !== user.id) {
        throw new ConflictException(
          `User with username '${updateData.username}' already exists`,
        );
      }
    }

    return this.userRepository.manager.transaction(async (manager) => {
      // 1. Update user info
      await manager.update(UserEntity, user.id, {
        name: updateData.name,
        username: updateData.username,
        jobType: updateData.jobType,
        empNo,
        lastSelectedTemplateName,
      });

      // 2. Replace device entries
      if (deviceInfoList) {
        const currentDevices = await manager.find(DeviceInfoEntity, {
          where: { userId: user.id },
        });
        const currentDeviceIds = currentDevices.map((d) => d.deviceId);

        // Verify no new device IDs conflict with other users
        for (const deviceInfo of deviceInfoList) {
          if (!currentDeviceIds.includes(deviceInfo.deviceId)) {
            const existingDevice = await manager.findOne(DeviceInfoEntity, {
              where: { deviceId: deviceInfo.deviceId },
            });
            if (existingDevice) {
              throw new ConflictException(
                `Device ID '${deviceInfo.deviceId}' already exists`,
              );
            }
          }
        }

        await manager.delete(DeviceInfoEntity, { userId: user.id });

        const deviceEntities = deviceInfoList.map((device) =>
          manager.create(DeviceInfoEntity, {
            userId: user.id,
            deviceId: device.deviceId,
            name: device.name,
          }),
        );
        await manager.save(deviceEntities);
      }

      // 3. Replace ticket templates
      if (ticketTemplateList) {
        await manager.delete(UserTicketTemplateEntity, { userId: user.id });

        const newTemplates = ticketTemplateList.map((templateData) =>
          manager.create(UserTicketTemplateEntity, {
            userId: user.id,
            name: templateData.name || "Default Template",
            tcSheetLink: templateData.tcSheetLink,
            jiraProjectKey: templateData.jiraProjectKey,
            epicTicket: templateData.epicTicket,
            titlePrefix: templateData.titlePrefix,
            assigneeInfoList: templateData.assigneeInfoList,
            componentList: templateData.componentList,
            labelList: templateData.labelList,
          }),
        );
        await manager.save(newTemplates);
      }

      const updatedUser = await manager.findOne(UserEntity, {
        where: { id: user.id },
        relations: ["deviceInfoList", "ticketTemplateList"],
      });

      return this.formatResponse(
        updatedUser,
        updatedUser.deviceInfoList,
        updatedUser.ticketTemplateList,
      );
    });
  }

  /**
   * Remove a user profile by employee number. Related data is deleted via CASCADE.
   */
  public async removeByEmpNo(empNo: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { empNo } });
    if (!user) {
      throw new NotFoundException(`User with empNo '${empNo}' not found`);
    }

    await this.userRepository.remove(user);
  }

  /**
   * Create or update a user profile by employee number.
   * If the user exists, updates the profile. If not, creates a new one (fetching Slack ID).
   */
  public async upsertByEmpNo(
    empNo: string,
    updateUserProfileDto: UpdateUserProfileDto,
  ): Promise<{
    user: UserProfileResponseDto;
    created: boolean;
  }> {
    this.validateRequiredFields(updateUserProfileDto);

    const existingUser = await this.userRepository.findOne({
      where: { empNo },
      relations: ["deviceInfoList", "ticketTemplateList"],
    });

    if (existingUser) {
      const updatedUser = await this.updateByEmpNo(empNo, updateUserProfileDto);
      return {
        user: updatedUser,
        created: false,
      };
    }

    // Create a new user
    this.logger.log(
      `Creating new user - empNo: ${empNo}, email: ${updateUserProfileDto.email}`,
    );

    let slackUserData: SlackUserWithExternalResponse["data"];
    try {
      slackUserData = await this.getSlackUser(updateUserProfileDto.email);
      this.logger.log(
        `Slack user lookup succeeded - slackId: ${slackUserData.slackId}`,
      );
    } catch (error) {
      this.logger.error(`Slack user lookup failed:`, error.message);
      throw new BadRequestException(
        `Slack user lookup failed: ${updateUserProfileDto.email} - ${error.message}`,
      );
    }

    const createDto: CreateUserProfileDto = {
      name: updateUserProfileDto.name || `User_${empNo}`,
      username: updateUserProfileDto.username || empNo,
      jobType: updateUserProfileDto.jobType || JobType.OTHER,
      slackId: slackUserData.slackId,
      empNo,
      deviceInfoList: updateUserProfileDto.deviceInfoList || [],
      ticketTemplateList: updateUserProfileDto.ticketTemplateList.map(
        (template) => ({
          name: template.name || "Default Template",
          tcSheetLink: template.tcSheetLink,
          jiraProjectKey: template.jiraProjectKey,
          epicTicket: template.epicTicket,
          titlePrefix: template.titlePrefix,
          assigneeInfoList: template.assigneeInfoList,
          componentList: template.componentList,
          labelList: template.labelList,
        }),
      ),
    };

    this.logger.debug(
      `Create DTO prepared: ${JSON.stringify(createDto, null, 2)}`,
    );

    let newUser: UserProfileResponseDto;
    try {
      newUser = await this.create(createDto);
      this.logger.log(`User created successfully`);
    } catch (error) {
      this.logger.error(`User creation failed:`, error);
      throw error;
    }

    // If multiple templates exist, overwrite all templates
    if (
      updateUserProfileDto.ticketTemplateList &&
      updateUserProfileDto.ticketTemplateList.length > 1
    ) {
      await this.updateByEmpNo(empNo, {
        ...updateUserProfileDto,
        ticketTemplateList: [...updateUserProfileDto.ticketTemplateList],
      });

      const finalUser = await this.findOneByEmpNo(empNo);
      return {
        user: finalUser,
        created: true,
      };
    }

    return {
      user: newUser,
      created: true,
    };
  }

  /**
   * Validate required fields in the update DTO.
   */
  private validateRequiredFields(dto: UpdateUserProfileDto): void {
    const errors: string[] = [];

    if (!dto.name || dto.name.trim() === "") {
      errors.push("'name' is required.");
    }

    if (!dto.username || dto.username.trim() === "") {
      errors.push("'username' is required.");
    }

    if (!dto.jobType) {
      errors.push("'jobType' is required.");
    }

    if (!dto.deviceInfoList || dto.deviceInfoList.length === 0) {
      errors.push("At least one device is required.");
    } else {
      dto.deviceInfoList.forEach((device, index) => {
        if (!device.deviceId || device.deviceId.trim() === "") {
          errors.push(`deviceInfoList[${index}].deviceId is required.`);
        }
      });
    }

    if (dto.ticketTemplateList && dto.ticketTemplateList.length > 0) {
      dto.ticketTemplateList.forEach((template, index) => {
        if (!template.name || template.name.trim() === "") {
          errors.push(`ticketTemplateList[${index}].name is required.`);
        }
        if (!template.jiraProjectKey || template.jiraProjectKey.trim() === "") {
          errors.push(
            `ticketTemplateList[${index}].jiraProjectKey is required.`,
          );
        }
      });
    }

    if (errors.length > 0) {
      throw new BadRequestException(`Validation failed: ${errors.join(", ")}`);
    }
  }

  /**
   * Look up a Slack user by email via the Workflow API.
   */
  private async getSlackUser(
    email: string,
  ): Promise<SlackUserWithExternalResponse["data"]> {
    return (
      await axios.get<SlackUserWithExternalResponse>(
        `${process.env.WORKFLOW_API_URL}/slack/user-with-external`,
        {
          params: { email },
        },
      )
    ).data.data;
  }

  /**
   * Format a UserEntity and its relations into a UserProfileResponseDto.
   */
  private formatResponse(
    user: UserEntity,
    deviceInfoList: DeviceInfoEntity[],
    ticketTemplateList: UserTicketTemplateEntity[],
  ): UserProfileResponseDto {
    const lastSelectedTemplate = user.lastSelectedTemplateName
      ? ticketTemplateList.find((t) => t.name === user.lastSelectedTemplateName)
      : undefined;

    return {
      id: user.id,
      name: user.name,
      username: user.username,
      jobType: user.jobType,
      slackId: user.slackId,
      empNo: user.empNo,
      deviceInfoList: deviceInfoList.map((d) => ({
        name: d.name,
        deviceId: d.deviceId,
      })),
      ticketTemplateList: ticketTemplateList.map((template) => ({
        id: template.id,
        name: template.name,
        tcSheetLink: template.tcSheetLink,
        jiraProjectKey: template.jiraProjectKey,
        epicTicket: template.epicTicket,
        titlePrefix: template.titlePrefix,
        assigneeInfoList: template.assigneeInfoList,
        componentList: template.componentList,
        labelList: template.labelList,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
      })),
      lastSelectedTemplate: lastSelectedTemplate
        ? {
            id: lastSelectedTemplate.id,
            name: lastSelectedTemplate.name,
            tcSheetLink: lastSelectedTemplate.tcSheetLink,
            jiraProjectKey: lastSelectedTemplate.jiraProjectKey,
            epicTicket: lastSelectedTemplate.epicTicket,
            titlePrefix: lastSelectedTemplate.titlePrefix,
            assigneeInfoList: lastSelectedTemplate.assigneeInfoList,
            componentList: lastSelectedTemplate.componentList,
            labelList: lastSelectedTemplate.labelList,
            createdAt: lastSelectedTemplate.createdAt,
            updatedAt: lastSelectedTemplate.updatedAt,
          }
        : undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
