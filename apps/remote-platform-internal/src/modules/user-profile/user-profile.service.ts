import {
  BadRequestException,
  ConflictException,
  Injectable,
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
  code: string;
  message: string;
  status: string;
  statusMessage: string;
  data: {
    name: string;
    email: string;
    slackId: string;
  };
}

@Injectable()
export class UserProfileService {
  private readonly proxyServerUrl =
    process.env.WORKFLOW_API_URL || "http://localhost:3001";

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(DeviceInfoEntity)
    private readonly deviceRepository: Repository<DeviceInfoEntity>,
  ) {}

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

    console.log(
      `[CREATE DEBUG] 사용자 생성 시도 - empNo: ${empNo}, slackId: ${slackId}`,
    );

    // 사번 중복 검사
    const existingEmpNo = await this.userRepository.findOne({
      where: { empNo },
    });
    if (existingEmpNo) {
      console.error(`[CREATE DEBUG] 사번 중복: ${empNo}`);
      throw new ConflictException(`User with empNo '${empNo}' already exists`);
    }

    // 슬랙 ID 중복 검사
    const existingSlackId = await this.userRepository.findOne({
      where: { slackId },
    });
    if (existingSlackId) {
      console.error(
        `[CREATE DEBUG] 슬랙 ID 중복: ${slackId}, 기존 사용자: ${existingSlackId.empNo}`,
      );
      throw new ConflictException(
        `슬랙 ID '${slackId}'는 이미 사번 '${existingSlackId.empNo}'에서 사용 중입니다`,
      );
    }

    // 디바이스 ID 중복 검사
    for (const device of deviceInfoList) {
      // deviceId가 없거나 빈 문자열인 경우 오류
      if (!device.deviceId || device.deviceId.trim() === "") {
        throw new ConflictException(
          `Device ID is required but got: '${device.deviceId}'`,
        );
      }

      const existingDevice = await this.deviceRepository.findOne({
        where: { deviceId: device.deviceId },
      });
      if (existingDevice) {
        console.error(`[CREATE DEBUG] 디바이스 ID 중복: ${device.deviceId}`);
        throw new ConflictException(
          `Device ID '${device.deviceId}' already exists`,
        );
      }
    }

    // 트랜잭션으로 모든 데이터 생성
    return this.userRepository.manager.transaction(async (manager) => {
      console.log(`[CREATE DEBUG] 트랜잭션 시작`);

      // 1. 사용자 생성
      const user = manager.create(UserEntity, {
        name,
        username: createUserProfileDto.username,
        jobType,
        slackId,
        empNo,
      });
      console.log(`[CREATE DEBUG] UserEntity 생성 준비 완료`);

      let savedUser;
      try {
        savedUser = await manager.save(user);
        console.log(
          `[CREATE DEBUG] UserEntity 저장 성공 - id: ${savedUser.id}`,
        );
      } catch (error) {
        console.error(`[CREATE DEBUG] UserEntity 저장 실패:`, error);
        throw error;
      }

      // 2. 디바이스들 생성 (name + deviceId)
      const deviceEntities = deviceInfoList.map((device) =>
        manager.create(DeviceInfoEntity, {
          userId: savedUser.id,
          deviceId: device.deviceId,
          name: device.name,
        }),
      );
      console.log(
        `[CREATE DEBUG] DeviceInfoEntity 생성 준비 - ${deviceEntities.length}개`,
      );

      let savedDevices;
      try {
        savedDevices = await manager.save(deviceEntities);
        console.log(
          `[CREATE DEBUG] DeviceInfoEntity 저장 성공 - ${savedDevices.length}개`,
        );
      } catch (error) {
        console.error(`[CREATE DEBUG] DeviceInfoEntity 저장 실패:`, error);
        throw error;
      }

      // 3. 티켓 템플릿 생성
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
      console.log(
        `[CREATE DEBUG] UserTicketTemplateEntity 생성 준비 - ${templateEntities.length}개`,
      );

      let savedTemplates = [];
      if (templateEntities.length > 0) {
        try {
          savedTemplates = await manager.save(templateEntities);
          console.log(
            `[CREATE DEBUG] UserTicketTemplateEntity 저장 성공 - ${savedTemplates.length}개`,
          );
        } catch (error) {
          console.error(
            `[CREATE DEBUG] UserTicketTemplateEntity 저장 실패:`,
            error,
          );
          throw error;
        }
      }

      return this.formatResponse(savedUser, savedDevices, savedTemplates);
    });
  }

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

  public async findAll(): Promise<UserProfileResponseDto[]> {
    const users = await this.userRepository.find({
      relations: ["deviceInfoList", "ticketTemplateList"],
      order: { createdAt: "DESC" },
    });

    return users.map((user) =>
      this.formatResponse(user, user.deviceInfoList, user.ticketTemplateList),
    );
  }

  public async remove(id: number): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // CASCADE로 인해 관련 데이터들이 자동 삭제됨
    await this.userRepository.remove(user);
  }

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

    // 사번 중복 검사 (다른 사용자와 중복 안되게)
    if (empNo) {
      const existingEmpNo = await this.userRepository.findOne({
        where: { empNo: empNo },
      });
      if (existingEmpNo && existingEmpNo.id !== user.id) {
        throw new ConflictException(
          `User with empNo '${empNo}' already exists`,
        );
      }
    }

    // 영어 ID 중복 검사 (다른 사용자와 중복 안되게)
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
      // 1. 사용자 정보 업데이트
      await manager.update(UserEntity, user.id, {
        name: updateData.name,
        username: updateData.username,
        jobType: updateData.jobType,
        empNo,
        lastSelectedTemplateName: lastSelectedTemplateName,
      });

      // 2. 디바이스 ID 업데이트 (전체 교체)
      if (deviceInfoList) {
        // 현재 사용자의 기존 디바이스 ID들 조회
        const currentDevices = await manager.find(DeviceInfoEntity, {
          where: { userId: user.id },
        });
        const currentDeviceIds = currentDevices.map((d) => d.deviceId);

        // 새로 추가될 디바이스 ID들 중 다른 사용자가 사용 중인 것 확인
        for (const deviceInfo of deviceInfoList) {
          // 현재 사용자의 기존 디바이스가 아니고, 다른 사용자가 사용 중인 경우
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

        // 기존 디바이스 삭제
        await manager.delete(DeviceInfoEntity, { userId: user.id });

        // 새 디바이스 생성
        const deviceEntities = deviceInfoList.map((device) =>
          manager.create(DeviceInfoEntity, {
            userId: user.id,
            deviceId: device.deviceId,
            name: device.name,
          }),
        );
        await manager.save(deviceEntities);
      }

      // 3. 템플릿 정보 업데이트 (전체 교체)
      if (ticketTemplateList) {
        // 기존 템플릿 모두 삭제
        await manager.delete(UserTicketTemplateEntity, { userId: user.id });

        // 새 템플릿들 생성
        const newTemplates = ticketTemplateList.map((templateData) =>
          manager.create(UserTicketTemplateEntity, {
            userId: user.id,
            name: templateData.name || "기본 템플릿",
            tcSheetLink: templateData.tcSheetLink,
            jiraProjectKey: templateData.jiraProjectKey,
            epicTicket: templateData.epicTicket,
            titlePrefix: templateData.titlePrefix,
            assigneeInfoList: templateData.assigneeInfoList, // 새로운 방식
            componentList: templateData.componentList,
            labelList: templateData.labelList,
          }),
        );
        await manager.save(newTemplates);
      }

      // 업데이트된 데이터 조회
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

  public async removeByEmpNo(empNo: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { empNo } });
    if (!user) {
      throw new NotFoundException(`User with empNo '${empNo}' not found`);
    }

    // CASCADE로 인해 관련 데이터들이 자동 삭제됨
    await this.userRepository.remove(user);
  }

  public async upsertByEmpNo(
    empNo: string,
    updateUserProfileDto: UpdateUserProfileDto,
  ): Promise<{
    user: UserProfileResponseDto;
    created: boolean;
  }> {
    // 0. 필수 필드 유효성 검사
    this.validateRequiredFields(updateUserProfileDto);

    // 1. 사용자 존재 여부 확인
    const existingUser = await this.userRepository.findOne({
      where: { empNo },
      relations: ["deviceInfoList", "ticketTemplateList"],
    });

    if (existingUser) {
      // 기존 사용자가 있으면 업데이트
      const updatedUser = await this.updateByEmpNo(empNo, updateUserProfileDto);
      return {
        user: updatedUser,
        created: false,
      };
    } else {
      // 사용자가 없으면 새로 생성
      // UpdateUserProfileDto를 CreateUserProfileDto로 변환
      console.log(
        `[UPSERT DEBUG] 새 사용자 생성 시도 - empNo: ${empNo}, email: ${updateUserProfileDto.email}`,
      );

      let slackUserData;
      try {
        slackUserData = await this.getSlackUser(updateUserProfileDto.email);
        console.log(
          `[UPSERT DEBUG] 슬랙 사용자 조회 성공 - slackId: ${slackUserData.slackId}`,
        );
      } catch (error) {
        console.error(`[UPSERT DEBUG] 슬랙 사용자 조회 실패:`, error.message);
        throw new BadRequestException(
          `슬랙 사용자 조회 실패: ${updateUserProfileDto.email} - ${error.message}`,
        );
      }

      const user = slackUserData;

      const createDto: CreateUserProfileDto = {
        name: updateUserProfileDto.name || `사용자_${empNo}`,
        username: updateUserProfileDto.username || empNo, // 영어 ID - 기본값은 empNo
        jobType: updateUserProfileDto.jobType || JobType.OTHER,
        slackId: user.slackId,
        empNo: empNo, // URL 파라미터에서 가져옴
        deviceInfoList: updateUserProfileDto.deviceInfoList || [],
        ticketTemplateList: updateUserProfileDto.ticketTemplateList.map(
          (template) => ({
            name: template.name || "기본 템플릿",
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

      console.log(
        `[UPSERT DEBUG] CreateDTO 생성 완료:`,
        JSON.stringify(createDto, null, 2),
      );

      let newUser;
      try {
        newUser = await this.create(createDto);
        console.log(`[UPSERT DEBUG] 사용자 생성 성공`);
      } catch (error) {
        console.error(`[UPSERT DEBUG] create 메서드 실패:`, error);
        throw error;
      }

      // 여러 템플릿이 있으면 나머지도 추가
      if (
        updateUserProfileDto.ticketTemplateList &&
        updateUserProfileDto.ticketTemplateList.length > 1
      ) {
        await this.updateByEmpNo(empNo, {
          ...updateUserProfileDto, // 전체 DTO 사용
          ticketTemplateList: [...updateUserProfileDto.ticketTemplateList], // 모든 템플릿 덮어쓰기
        });

        // 업데이트된 사용자 정보 다시 조회
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
  }

  /**
   * UpdateUserProfileDto 필수 필드 유효성 검사
   */
  private validateRequiredFields(dto: UpdateUserProfileDto): void {
    const errors: string[] = [];

    // 1. 기본 필수 필드들
    if (!dto.name || dto.name.trim() === "") {
      errors.push("name은 필수입니다.");
    }

    if (!dto.username || dto.username.trim() === "") {
      errors.push("username은 필수입니다.");
    }

    if (!dto.jobType) {
      errors.push("jobType은 필수입니다.");
    }

    // empNo는 URL 파라미터로 전달되므로 검증하지 않음

    // 2. deviceInfoList 배열 검증
    if (!dto.deviceInfoList || dto.deviceInfoList.length === 0) {
      errors.push("최소 1개의 디바이스가 필요합니다.");
    } else {
      dto.deviceInfoList.forEach((device, index) => {
        if (!device.deviceId || device.deviceId.trim() === "") {
          errors.push(`deviceInfoList[${index}].deviceId는 필수입니다.`);
        }
      });
    }

    // 3. ticketTemplateList 배열 검증 (빈 배열 허용, 있으면 내부 필드 필수)
    if (dto.ticketTemplateList && dto.ticketTemplateList.length > 0) {
      dto.ticketTemplateList.forEach((template, index) => {
        if (!template.name || template.name.trim() === "") {
          errors.push(
            `ticketTemplateList[${index}].templateName은 필수입니다.`,
          );
        }
        if (!template.jiraProjectKey || template.jiraProjectKey.trim() === "") {
          errors.push(`ticketTemplateList[${index}].jiraProject는 필수입니다.`);
        }
      });
    }

    // 4. 오류가 있으면 예외 발생
    if (errors.length > 0) {
      throw new ConflictException(`유효성 검사 실패: ${errors.join(", ")}`);
    }
  }

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
  private formatResponse(
    user: UserEntity,
    deviceInfoList: DeviceInfoEntity[],
    ticketTemplateList: UserTicketTemplateEntity[],
  ): UserProfileResponseDto {
    // 마지막으로 선택된 템플릿 찾기 (templateName 기준)
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
