import { Injectable } from "@nestjs/common";

@Injectable()
export class AppService {
  public getHealthCheck(): string {
    return "ok";
  }
}
