import { Controller, Get } from "@nestjs/common";

import { AppService } from "./app.service";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get("/")
  public getRoot(): string {
    return this.appService.getHealthCheck();
  }

  @Get("/health")
  public getHealth(): string {
    return this.appService.getHealthCheck();
  }
}
