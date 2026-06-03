import { Controller, Get } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';

import { AppService } from './app.service';

@ApiTags('App')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * Lightweight root liveness ping (no DB dependency). Kept for the container
   * HEALTHCHECK and load-balancer probes. The full Terminus health/readiness
   * checks with a DB ping live at `GET /api/health` and `GET /api/health/ready`.
   */
  @Get('/')
  @ApiResponse({ status: 200, description: 'Service is up' })
  public getRoot(): string {
    return this.appService.getHealthCheck();
  }
}
