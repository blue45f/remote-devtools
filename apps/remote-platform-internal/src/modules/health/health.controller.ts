import { Controller, Get } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';

@ApiTags('Health')
@Controller('api/health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiResponse({ status: 200, description: 'All health checks passed.' })
  @ApiResponse({ status: 503, description: 'One or more health checks failed.' })
  public check() {
    return this.health.check([() => this.db.pingCheck('database')]);
  }
}
