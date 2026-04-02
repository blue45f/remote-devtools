import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Put,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

import {
  UpdateUserProfileDto,
  UserProfileResponseDto,
} from "./user-profile.dto";
import { UserProfileService } from "./user-profile.service";

@ApiTags("User Profile")
@Controller("api/user-profile")
export class UserProfileController {
  private readonly logger = new Logger(UserProfileController.name);

  constructor(private readonly userProfileService: UserProfileService) {}

  /**
   * Retrieve a user profile by employee number.
   */
  @Get(":empNo")
  public async findOne(@Param("empNo") empNo: string): Promise<{
    success: boolean;
    data: UserProfileResponseDto;
  }> {
    const data = await this.userProfileService.findOneByEmpNo(empNo);
    return {
      success: true,
      data,
    };
  }

  /**
   * Create or update a user profile by employee number.
   */
  @Put(":empNo/upsert")
  public async upsert(
    @Param("empNo") empNo: string,
    @Body() updateUserProfileDto: UpdateUserProfileDto,
  ): Promise<{
    success: boolean;
    data: UserProfileResponseDto;
    created?: boolean;
  }> {
    this.logger.log(`Upsert request - empNo: ${empNo}`);
    this.logger.debug(
      `Upsert payload: ${JSON.stringify(updateUserProfileDto, null, 2)}`,
    );

    const result = await this.userProfileService.upsertByEmpNo(
      empNo,
      updateUserProfileDto,
    );
    return {
      success: true,
      data: result.user,
      created: result.created,
    };
  }

  /**
   * Delete a user profile by employee number.
   */
  @Delete(":empNo")
  @HttpCode(HttpStatus.NO_CONTENT)
  public async remove(@Param("empNo") empNo: string): Promise<void> {
    await this.userProfileService.removeByEmpNo(empNo);
  }
}
