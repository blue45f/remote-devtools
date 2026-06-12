import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';

import { LoginAccountDto, RegisterAccountDto } from './accounts.dto';
import { AccountsService } from './accounts.service';

@ApiTags('Auth')
@Controller('api/auth')
export class AuthAccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @Post('register')
  @ApiResponse({ status: 201, description: 'Creates an account, organization, and owner member.' })
  @ApiResponse({ status: 409, description: 'Email is already registered.' })
  public register(@Body() body: RegisterAccountDto) {
    return this.accounts.register(body);
  }

  @Post('login')
  @HttpCode(200)
  @ApiResponse({ status: 200, description: 'Returns a signed Bearer JWT for an account.' })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  public login(@Body() body: LoginAccountDto) {
    return this.accounts.login(body);
  }

  @Post('logout')
  @HttpCode(200)
  @ApiResponse({ status: 200, description: 'Stateless logout acknowledgement.' })
  public logout() {
    return { ok: true };
  }
}
