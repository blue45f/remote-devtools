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

  /**
   * Liveness probe. Mirrors the internal app's Terminus check so both
   * backends expose the same `/api/health` route shape (DB ping included).
   */
  @Get()
  @HealthCheck()
  @ApiResponse({ status: 200, description: 'All health checks passed.' })
  @ApiResponse({ status: 503, description: 'One or more health checks failed.' })
  public check() {
    return this.health.check([() => this.db.pingCheck('database')]);
  }

  /**
   * Readiness probe. The external app cannot serve SDK beacons or persist CDP
   * data without the database, so readiness is gated on a `SELECT 1` ping.
   * Returns 503 when the DB connection is down.
   */
  @Get('ready')
  @HealthCheck()
  @ApiResponse({ status: 200, description: 'Service is ready to receive traffic.' })
  @ApiResponse({ status: 503, description: 'Service is not ready (database unavailable).' })
  public ready() {
    return this.health.check([() => this.db.pingCheck('database')]);
  }
}
