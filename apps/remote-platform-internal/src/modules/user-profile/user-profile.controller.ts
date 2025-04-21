import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
} from "@nestjs/common";

import {
  UpdateUserProfileDto,
  UserProfileResponseDto,
} from "./user-profile.dto";
import { UserProfileService } from "./user-profile.service";

@Controller("api/user-profile")
export class UserProfileController {
  constructor(private readonly userProfileService: UserProfileService) {}

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

  @Put(":empNo/upsert")
  public async upsert(
    @Param("empNo") empNo: string,
    @Body() updateUserProfileDto: UpdateUserProfileDto,
  ): Promise<{
    success: boolean;
    data: UserProfileResponseDto;
    created?: boolean;
  }> {
    console.log(`[CONTROLLER DEBUG] upsert 요청 - empNo: ${empNo}`);
    console.log(
      `[CONTROLLER DEBUG] payload:`,
      JSON.stringify(updateUserProfileDto, null, 2),
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

  @Delete(":empNo")
  @HttpCode(HttpStatus.NO_CONTENT)
  public async remove(@Param("empNo") empNo: string): Promise<void> {
    await this.userProfileService.removeByEmpNo(empNo);
  }
}
