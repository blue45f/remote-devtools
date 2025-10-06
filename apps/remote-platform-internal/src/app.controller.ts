import { Controller, Get } from "@nestjs/common";

import { AppService } from "./app.service";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * Root endpoint - returns health check status.
   */
  @Get("/")
  public getRoot(): string {
    return this.appService.getHealthCheck();
  }

  /**
   * Health check endpoint.
   */
  @Get("/health")
  public getHealth(): string {
    return this.appService.getHealthCheck();
  }
}
