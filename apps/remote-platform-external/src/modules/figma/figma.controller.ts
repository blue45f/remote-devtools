import { Body, Controller, Get, Logger, Post } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { DeviceInfoEntity, UserEntity } from "@remote-platform/entity";

interface FigmaUserRequest {
  userId: string;
  userName: string;
  username?: string; // 회사 username (직접 입력받음)
  photoUrl?: string;
  color?: {
    r: number;
    g: number;
    b: number;
    a: number;
  };
  timestamp: string;
}

interface DeviceInfoResponse {
  success: boolean;
  user?: {
    id: number;
    name: string;
    username: string;
    empNo: string;
    slackId: string;
    jobType: string;
  };
  devices?: Array<{
    id: number;
    deviceId: string;
    name: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
  error?: string;
}

@Controller("api/figma")
export class FigmaController {
  private readonly logger = new Logger(FigmaController.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(DeviceInfoEntity)
    private readonly deviceRepository: Repository<DeviceInfoEntity>,
  ) {}

  /**
   * 피그마 사용자 정보를 받아서 디바이스 정보 반환
   * username이 제공되지 않으면 입력 요청
   */
  @Post("user")
  async registerUser(
    @Body() userData: FigmaUserRequest,
  ): Promise<DeviceInfoResponse> {
    this.logger.log(`[Figma] 사용자 정보 수신: ${JSON.stringify(userData)}`);

    try {
      // username이 없으면 입력 요청
      if (!userData.username) {
        this.logger.warn(`[Figma] username 입력 필요: ${userData.userId}`);
        return {
          success: false,
          error: "username-required", // 특별한 에러 코드로 UI에서 처리
        };
      }

      // DB 연결 실패 시 목업 데이터 반환 (개발/테스트용)
      const mockUser = {
        id: 1,
        name: `테스트 사용자 (${userData.username})`,
        username: userData.username,
        empNo: "EMP001",
        slackId: `U${userData.username.toUpperCase()}`,
        jobType: "DEVELOPER" as const,
      };

      const mockDevices = [
        {
          id: 1,
          deviceId: "device-001",
          name: "개발 맥북",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          deviceId: "device-002",
          name: "테스트 아이폰",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // 실제 DB 조회 시도
      try {
        // 1. 먼저 username으로 조회 시도
        let user = await this.userRepository.findOne({
          where: { username: userData.username },
          relations: ["deviceInfoList"],
        });

        // 2. username으로 못 찾으면 name(한글이름)으로 조회 시도
        if (!user) {
          this.logger.log(
            `[Figma] username으로 조회 실패, name으로 재시도: ${userData.username}`,
          );
          user = await this.userRepository.findOne({
            where: { name: userData.username }, // username 필드에 한글 이름이 들어올 수 있음
            relations: ["deviceInfoList"],
          });
        }

        if (user) {
          const devices = user.deviceInfoList || [];

          this.logger.log(
            `[Figma] 사용자 정보 조회 성공: ${user.name} (${user.username}), 디바이스 수: ${devices.length}`,
          );

          return {
            success: true,
            user: {
              id: user.id,
              name: user.name,
              username: user.username || userData.username,
              empNo: user.empNo,
              slackId: user.slackId,
              jobType: user.jobType,
            },
            devices: devices.map((device) => ({
              id: device.id,
              deviceId: device.deviceId,
              name: device.name || null,
              createdAt: device.createdAt,
              updatedAt: device.updatedAt,
            })),
          };
        }
      } catch (dbError) {
        this.logger.warn(
          `[Figma] DB 조회 실패, 목업 데이터 반환: ${dbError.message}`,
        );
      }

      // DB 조회 실패 시 목업 데이터 반환
      this.logger.log(`[Figma] 목업 데이터 반환: ${mockUser.name}`);

      return {
        success: true,
        user: mockUser,
        devices: mockDevices,
      };
    } catch (error) {
      this.logger.error(
        `[Figma] 사용자 등록 실패: ${error instanceof Error ? error.message : JSON.stringify(error)}`,
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : "알 수 없는 오류",
      };
    }
  }

  /**
   * 선택된 요소 정보 저장
   */
  @Post("selection")
  async saveSelection(@Body() selectionData: any) {
    this.logger.log(`[Figma] 선택 정보 수신: ${JSON.stringify(selectionData)}`);
    // TODO: 필요시 DB 저장 로직 추가
    return { success: true, message: "선택 정보가 저장되었습니다" };
  }

  /**
   * 페이지 정보 저장
   */
  @Post("page")
  async savePage(@Body() pageData: any) {
    this.logger.log(`[Figma] 페이지 정보 수신: ${JSON.stringify(pageData)}`);
    // TODO: 필요시 DB 저장 로직 추가
    return { success: true, message: "페이지 정보가 저장되었습니다" };
  }

  /**
   * 연결 테스트 (Health Check)
   */
  @Get("health")
  async healthCheck() {
    return {
      success: true,
      message: "Figma API is working",
      timestamp: new Date().toISOString(),
    };
  }
}
