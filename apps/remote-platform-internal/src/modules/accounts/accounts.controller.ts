import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';

import { Auth } from '../auth/auth.decorator';
import { AuthGuard } from '../auth/auth.guard';

import {
  AdminUpdateAccountDto,
  InviteOrganizationMemberDto,
  UpdateMeDto,
  UpdateOrganizationMemberDto,
} from './accounts.dto';
import { AccountsService } from './accounts.service';

import type { AuthClaims } from '../auth/auth.service';

@ApiTags('Accounts')
@Controller('api/accounts')
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiResponse({ status: 200, description: 'Returns the authenticated account context.' })
  public me(@Auth() auth: AuthClaims | null) {
    return this.accounts.getMe(auth);
  }

  @Patch('me')
  @UseGuards(AuthGuard)
  @ApiResponse({ status: 200, description: 'Updates the authenticated account profile.' })
  public updateMe(@Auth() auth: AuthClaims | null, @Body() body: UpdateMeDto) {
    return this.accounts.updateMe(auth, body);
  }

  @Delete('me')
  @UseGuards(AuthGuard)
  @HttpCode(200)
  @ApiResponse({ status: 200, description: 'Withdraws the authenticated account.' })
  public withdrawMe(@Auth() auth: AuthClaims | null) {
    return this.accounts.withdrawMe(auth);
  }

  @Get('organization/members')
  @UseGuards(AuthGuard)
  @ApiResponse({ status: 200, description: 'Lists organization members for owner/admin users.' })
  public listMembers(@Auth() auth: AuthClaims | null) {
    return this.accounts.listMembers(auth);
  }

  @Post('organization/members')
  @UseGuards(AuthGuard)
  @ApiResponse({ status: 201, description: 'Creates or reactivates an organization member.' })
  public inviteMember(@Auth() auth: AuthClaims | null, @Body() body: InviteOrganizationMemberDto) {
    return this.accounts.inviteMember(auth, body);
  }

  @Patch('organization/members/:memberId')
  @UseGuards(AuthGuard)
  @ApiResponse({ status: 200, description: 'Updates an organization member role or status.' })
  public updateMember(
    @Auth() auth: AuthClaims | null,
    @Param('memberId') memberId: string,
    @Body() body: UpdateOrganizationMemberDto,
  ) {
    return this.accounts.updateMember(auth, memberId, body);
  }

  @Delete('organization/members/:memberId')
  @UseGuards(AuthGuard)
  @HttpCode(200)
  @ApiResponse({ status: 200, description: 'Soft-removes an organization member.' })
  public removeMember(@Auth() auth: AuthClaims | null, @Param('memberId') memberId: string) {
    return this.accounts.removeMember(auth, memberId);
  }

  @Patch('organization/members/:memberId/account')
  @UseGuards(AuthGuard)
  @ApiResponse({ status: 200, description: 'Updates account status for an organization member.' })
  public updateMemberAccount(
    @Auth() auth: AuthClaims | null,
    @Param('memberId') memberId: string,
    @Body() body: AdminUpdateAccountDto,
  ) {
    return this.accounts.updateAccountForAdmin(auth, memberId, body);
  }
}
