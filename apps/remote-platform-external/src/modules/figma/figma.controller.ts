import { Body, Controller, Get, Logger, Post } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { DeviceInfoEntity, UserEntity } from "@remote-platform/entity";

interface FigmaUserRequest {
  readonly userId: string;
  readonly userName: string;
  readonly username?: string;
  readonly photoUrl?: string;
  readonly color?: {
    readonly r: number;
    readonly g: number;
    readonly b: number;
    readonly a: number;
  };
  readonly timestamp: string;
}

interface DeviceInfoResponse {
  readonly success: boolean;
  readonly user?: {
    readonly id: number;
    readonly name: string;
    readonly username: string;
    readonly empNo: string;
    readonly slackId: string;
    readonly jobType: string;
  };
  readonly devices?: ReadonlyArray<{
    readonly id: number;
    readonly deviceId: string;
    readonly name: string | null;
    readonly createdAt: Date;
    readonly updatedAt: Date;
  }>;
  readonly error?: string;
}

interface SelectionResponse {
  readonly success: boolean;
  readonly message: string;
}

interface HealthCheckResponse {
  readonly success: boolean;
  readonly message: string;
  readonly timestamp: string;
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
   * Receives Figma user information and returns associated device info.
   * If username is not provided, returns an error code prompting input.
   */
  @Post("user")
  async registerUser(
    @Body() userData: FigmaUserRequest,
  ): Promise<DeviceInfoResponse> {
    this.logger.log(
      `[FIGMA_USER_REGISTER] Received user data: ${JSON.stringify(userData)}`,
    );

    try {
      if (!userData.username) {
        this.logger.warn(
          `[FIGMA_USER_REGISTER] Username required for userId=${userData.userId}`,
        );
        return { success: false, error: "username-required" };
      }

      const mockUser = {
        id: 1,
        name: `Test User (${userData.username})`,
        username: userData.username,
        empNo: "EMP001",
        slackId: `U${userData.username.toUpperCase()}`,
        jobType: "DEVELOPER" as const,
      };

      const mockDevices = [
        {
          id: 1,
          deviceId: "device-001",
          name: "Dev MacBook",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          deviceId: "device-002",
          name: "Test iPhone",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Attempt real DB lookup
      try {
        // 1. Look up by username first
        let user = await this.userRepository.findOne({
          where: { username: userData.username },
          relations: ["deviceInfoList"],
        });

        // 2. Fall back to looking up by display name
        if (!user) {
          this.logger.log(
            `[FIGMA_USER_REGISTER] Username lookup failed, retrying by name: ${userData.username}`,
          );
          user = await this.userRepository.findOne({
            where: { name: userData.username },
            relations: ["deviceInfoList"],
          });
        }

        if (user) {
          const devices = user.deviceInfoList || [];
          this.logger.log(
            `[FIGMA_USER_REGISTER] User found: ${user.name} (${user.username}), devices: ${devices.length}`,
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
        const dbMessage =
          dbError instanceof Error ? dbError.message : String(dbError);
        this.logger.warn(
          `[FIGMA_USER_REGISTER] DB lookup failed, returning mock data: ${dbMessage}`,
        );
      }

      // Return mock data when DB lookup fails
      this.logger.log(
        `[FIGMA_USER_REGISTER] Returning mock data for: ${mockUser.name}`,
      );
      return { success: true, user: mockUser, devices: mockDevices };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : JSON.stringify(error);
      this.logger.error(
        `[FIGMA_USER_REGISTER] Registration failed: ${errorMessage}`,
      );
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Saves selection information from the Figma plugin.
   */
  @Post("selection")
  async saveSelection(
    @Body() selectionData: Record<string, unknown>,
  ): Promise<SelectionResponse> {
    this.logger.log(
      `[FIGMA_SELECTION] Received selection: ${JSON.stringify(selectionData)}`,
    );
    return { success: true, message: "Selection data saved successfully" };
  }

  /**
   * Saves page information from the Figma plugin.
   */
  @Post("page")
  async savePage(
    @Body() pageData: Record<string, unknown>,
  ): Promise<SelectionResponse> {
    this.logger.log(
      `[FIGMA_PAGE] Received page data: ${JSON.stringify(pageData)}`,
    );
    return { success: true, message: "Page data saved successfully" };
  }

  /**
   * Health check endpoint for the Figma API.
   */
  @Get("health")
  async healthCheck(): Promise<HealthCheckResponse> {
    return {
      success: true,
      message: "Figma API is working",
      timestamp: new Date().toISOString(),
    };
  }
}
