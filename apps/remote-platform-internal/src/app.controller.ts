import { Controller, Get } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';

import { AppService } from './app.service';

@ApiTags('App')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('/')
  @ApiResponse({ status: 200, description: 'Service is up' })
  public getRoot(): string {
    return this.appService.getHealthCheck();
  }

  @Get('/health')
  @ApiResponse({ status: 200, description: 'Service is up' })
  public getHealth(): string {
    return this.appService.getHealthCheck();
  }
}
