import {
  BadRequestException,
  Controller,
  Get,
  Logger,
  NotFoundException,
  Query,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Like, Repository } from "typeorm";

import {
  DomEntity,
  RecordEntity,
  ScreenEntity,
  TicketComponentEntity,
  TicketLabelEntity,
  TicketLogEntity,
} from "@remote-platform/entity";

// HTML을 실제 브라우저로 렌더링
import { renderHTMLToImage } from "../../utils/html-to-image";
import { RecordService } from "@remote-platform/core";
import { ApiTags } from "@nestjs/swagger";
import { S3Service } from "../s3/s3.service";

@ApiTags("Sessions")
@Controller("sessions")
export class WebviewController {
  private readonly logger = new Logger(WebviewController.name);

  constructor(
    private readonly recordService: RecordService,
    private readonly s3Service: S3Service,
    @InjectRepository(TicketLogEntity)
    private readonly ticketLogRepository: Repository<TicketLogEntity>,
    @InjectRepository(TicketComponentEntity)
    private readonly ticketComponentRepository: Repository<TicketComponentEntity>,
    @InjectRepository(TicketLabelEntity)
    private readonly ticketLabelRepository: Repository<TicketLabelEntity>,
    @InjectRepository(RecordEntity)
    private readonly recordRepository: Repository<RecordEntity>,
    @InjectRepository(ScreenEntity)
    private readonly screenRepository: Repository<ScreenEntity>,
    @InjectRepository(DomEntity)
    private readonly domRepository: Repository<DomEntity>,
  ) {}

  /**
   * 티켓 생성 통계 조회
   */
  @Get("ticket-stats")
  public async getTicketStats() {
    // 총 티켓 생성 수
    const totalTickets = await this.ticketLogRepository.count();

    // 오늘 생성된 티켓 수
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTickets = await this.ticketLogRepository
      .createQueryBuilder("ticket")
      .where("ticket.created_at >= :today", { today })
      .getCount();

    // 사용자별 티켓 생성 수 (상위 10명)
    const userStats = await this.ticketLogRepository
      .createQueryBuilder("ticket")
      .select("ticket.username", "username")
      .addSelect("ticket.userDisplayName", "userDisplayName")
      .addSelect("COUNT(*)", "count")
      .groupBy("ticket.username")
      .addGroupBy("ticket.userDisplayName")
      .orderBy("COUNT(*)", "DESC")
      .limit(10)
      .getRawMany();

    // 프로젝트별 티켓 생성 수
    const projectStats = await this.ticketLogRepository
      .createQueryBuilder("ticket")
      .select("ticket.jiraProjectKey", "project")
      .addSelect("COUNT(*)", "count")
      .groupBy("ticket.jiraProjectKey")
      .orderBy("COUNT(*)", "DESC")
      .getRawMany();

    // 담당자별 티켓 생성 수 (상위 10명)
    const assigneeStats = await this.ticketLogRepository
      .createQueryBuilder("ticket")
      .select("ticket.assignee", "assignee")
      .addSelect("COUNT(*)", "count")
      .groupBy("ticket.assignee")
      .orderBy("COUNT(*)", "DESC")
      .limit(10)
      .getRawMany();

    // Epic별 티켓 생성 수 (상위 10개)
    const epicStats = await this.ticketLogRepository
      .createQueryBuilder("ticket")
      .select("ticket.parentEpic", "epic")
      .addSelect("COUNT(*)", "count")
      .where("ticket.parentEpic IS NOT NULL")
      .groupBy("ticket.parentEpic")
      .orderBy("COUNT(*)", "DESC")
      .limit(10)
      .getRawMany();

    return {
      totalTickets,
      todayTickets,
      userStats,
      projectStats,
      assigneeStats,
      epicStats,
    };
  }

  /**
   * 녹화 세션 상세 정보 조회 (screenPreview 포함)
   */
  @Get("session-detail")
  public async getSessionDetail(@Query("sessionName") sessionName: string) {
    if (!sessionName) {
      throw new NotFoundException("sessionName is required");
    }

    // 녹화 세션 정보 조회
    const record = await this.recordRepository.findOne({
      where: { name: sessionName },
      order: { timestamp: "DESC" }, // 같은 이름이 여러 개일 경우 최신 것 선택
    });

    if (!record) {
      throw new NotFoundException("녹화 세션을 찾을 수 없습니다");
    }

    // DOM 데이터가 있는지 확인 (화면 렌더링용)
    const domData = await this.domRepository.findOne({
      where: {
        record: { id: record.id },
        type: "entireDom",
      },
      order: { timestamp: "DESC" },
    });

    // 임시 스크린샷 URL 생성
    // 실제로는 DOM 데이터를 렌더링해서 이미지를 생성해야 하지만,
    // 현재는 플레이스홀더 이미지를 반환
    let screenPreviewUrl = null;

    if (domData && domData.protocol) {
      // DOM 데이터가 있으면 스크린샷 생성 API 엔드포인트 제공
      const baseUrl =
        process.env.NODE_ENV === "production"
          ? process.env.EXTERNAL_HOST || "http://localhost:3001"
          : "http://localhost:3001";

      // 스크린샷 생성 엔드포인트 URL 반환
      screenPreviewUrl = `${baseUrl}/sessions/generate-screenshot?recordId=${record.id}`;
    }

    return {
      id: record.id,
      sessionName: record.name,
      recordId: record.id,
      deviceId: record.deviceId,
      username: null,
      createdAt: record.timestamp,
      screenPreviewUrl,
    };
  }

  /**
   * 녹화 세션 스크린샷 생성 API
   *
   * ScreenPreview 데이터를 기반으로 실제 화면과 유사한 이미지 생성
   */
  @Get("generate-screenshot")
  public async generateScreenshot(
    @Query("recordId") recordId: string,
    @Query("fullPage") fullPage?: string, // 전체 페이지 캡처 옵션
  ) {
    if (!recordId) {
      throw new NotFoundException("recordId is required");
    }

    this.logger.log(
      `[Screenshot] Starting screenshot generation for recordId: ${recordId}`,
    );

    // Record 정보 가져오기
    const parsedRecordId = parseInt(recordId);
    if (isNaN(parsedRecordId)) {
      throw new BadRequestException("recordId must be a valid number");
    }

    const record = await this.recordRepository.findOne({
      where: { id: parsedRecordId },
    });

    if (!record) {
      throw new NotFoundException(`녹화 세션 #${recordId}를 찾을 수 없습니다`);
    }

    // ScreenPreview 데이터 가져오기 (실제 HTML)
    const screenData = await this.screenRepository.findOne({
      where: {
        record: { id: parsedRecordId },
        type: "screenPreview",
      },
      order: { timestamp: "DESC" },
    });

    let dataURL: string;

    try {
      if (screenData && screenData.protocol) {
        this.logger.debug("[Screenshot] Found ScreenPreview data");

        // ScreenPreview protocol의 구조 확인
        const protocol = screenData.protocol as any;
        this.logger.debug(
          `[Screenshot] Protocol keys: ${Object.keys(protocol).join(", ")}`,
        );

        // protocol이 ScreenPreview.captured 형식인지 확인
        if (protocol.method === "ScreenPreview.captured" && protocol.params) {
          const params = protocol.params;
          this.logger.debug(
            "[Screenshot] Found ScreenPreview.captured data, rendering HTML",
          );

          if (params.body) {
            // head는 배열 형태로 저장되어 있으므로 join
            const headHtml = Array.isArray(params.head)
              ? params.head.join("\n")
              : params.head || "";
            const baseHref =
              typeof params.baseHref === "string" ? params.baseHref : undefined;
            const bodyHtml = params.body;
            const width = params.width || 800;
            const height = params.height || 600;
            const bodyClass = params.bodyClass || "";

            this.logger.debug(
              `[Screenshot] Rendering ${width}x${height}, fullPage: ${fullPage === "true"}`,
            );

            // 실제 HTML을 브라우저로 렌더링
            dataURL = await renderHTMLToImage(
              headHtml,
              bodyHtml,
              width,
              height,
              bodyClass,
              baseHref,
              fullPage === "true", // Query 파라미터가 'true'이면 전체 페이지 캡처
            );

            this.logger.debug(
              "[Screenshot] Successfully rendered HTML to image",
            );
          } else {
            throw new Error("ScreenPreview에 body 데이터가 없습니다");
          }
        } else {
          this.logger.warn(
            "[Screenshot] Protocol is not ScreenPreview.captured format",
          );
          throw new Error("ScreenPreview.captured 형식이 아닙니다");
        }
      } else {
        this.logger.warn("[Screenshot] No ScreenPreview data found");
        throw new NotFoundException(
          `녹화 세션 ${record.name}에 ScreenPreview 데이터가 없습니다`,
        );
      }
    } catch (error) {
      this.logger.error(`[Screenshot] Image generation failed: ${error}`);

      // 에러가 NotFoundException이면 그대로 throw
      if (error instanceof NotFoundException) {
        throw error;
      }

      // 다른 에러는 500 에러로 처리
      throw new Error(`스크린샷 생성 실패: ${error.message}`);
    }

    this.logger.log(
      `[Screenshot] Successfully generated image for record: ${record.name}`,
    );

    return {
      dataURL,
      message: `녹화 세션 #${recordId} - DOM 기반 미리보기`,
    };
  }

  /**
   * 특정 사용자의 티켓 생성 이력 조회
   */
  @Get("user-tickets")
  public async getUserTickets(@Query("deviceId") deviceId: string) {
    if (!deviceId) {
      throw new BadRequestException("deviceId is required");
    }

    const tickets = await this.ticketLogRepository.find({
      where: { deviceId },
      order: { createdAt: "DESC" },
      take: 50, // 최근 50개만
      relations: ["components", "labels"], // 컴포넌트 및 라벨 정보 포함
    });

    return {
      deviceId,
      totalCount: tickets.length,
      tickets: tickets.map((ticket) => ({
        id: ticket.id,
        sessionName: ticket.sessionName,
        ticketUrl: ticket.ticketUrl,
        jiraProjectKey: ticket.jiraProjectKey,
        title: ticket.title || "제목 없음",
        assignee: ticket.assignee,
        parentEpic: ticket.parentEpic,
        components: ticket.components.map((comp) => comp.componentName),
        labels: ticket.labels.map((label) => label.labelName),
        createdAt: ticket.createdAt,
      })),
    };
  }

  /**
   * 일별 티켓 생성 통계 (최근 30일)
   */
  @Get("daily-stats")
  public async getDailyStats() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyStats = await this.ticketLogRepository
      .createQueryBuilder("ticket")
      .select("DATE(ticket.created_at)", "date")
      .addSelect("COUNT(*)", "count")
      .where("ticket.created_at >= :thirtyDaysAgo", { thirtyDaysAgo })
      .groupBy("DATE(ticket.created_at)")
      .orderBy("DATE(ticket.created_at)", "DESC")
      .getRawMany();

    return {
      period: "최근 30일",
      dailyStats,
    };
  }

  /**
   * 컴포넌트별 티켓 생성 통계
   */
  @Get("component-stats")
  public async getComponentStats() {
    const componentStats = await this.ticketComponentRepository
      .createQueryBuilder("component")
      .select("component.componentName", "component")
      .addSelect("COUNT(*)", "count")
      .groupBy("component.componentName")
      .orderBy("COUNT(*)", "DESC")
      .limit(20)
      .getRawMany();

    const totalUniqueComponents = await this.ticketComponentRepository
      .createQueryBuilder("component")
      .select("COUNT(DISTINCT component.componentName)", "count")
      .getRawOne();

    return {
      componentStats: componentStats.map((stat) => ({
        component: stat.component,
        count: parseInt(stat.count),
      })),
      totalUniqueComponents: parseInt(totalUniqueComponents.count),
    };
  }

  /**
   * 라벨별 티켓 생성 통계
   */
  @Get("label-stats")
  public async getLabelStats() {
    const labelStats = await this.ticketLabelRepository
      .createQueryBuilder("label")
      .select("label.labelName", "label")
      .addSelect("COUNT(*)", "count")
      .groupBy("label.labelName")
      .orderBy("COUNT(*)", "DESC")
      .limit(20)
      .getRawMany();

    const totalUniqueLabels = await this.ticketLabelRepository
      .createQueryBuilder("label")
      .select("COUNT(DISTINCT label.labelName)", "count")
      .getRawOne();

    return {
      labelStats: labelStats.map((stat) => ({
        label: stat.label,
        count: parseInt(stat.count),
      })),
      totalUniqueLabels: parseInt(totalUniqueLabels.count),
    };
  }

  /**
   * 특정 Epic으로 생성된 티켓 조회
   */
  @Get("tickets-by-epic")
  public async getTicketsByEpic(@Query("parentEpic") parentEpic: string) {
    if (!parentEpic) {
      throw new BadRequestException("parentEpic is required");
    }

    const tickets = await this.ticketLogRepository.find({
      where: { parentEpic },
      order: { createdAt: "DESC" },
      relations: ["components", "labels"], // 컴포넌트 및 라벨 정보 포함
    });

    return {
      parentEpic,
      totalCount: tickets.length,
      tickets: tickets.map((ticket) => ({
        id: ticket.id,
        deviceId: ticket.deviceId,
        username: ticket.username,
        userDisplayName: ticket.userDisplayName,
        sessionName: ticket.sessionName,
        ticketUrl: ticket.ticketUrl,
        jiraProjectKey: ticket.jiraProjectKey,
        assignee: ticket.assignee,
        components: ticket.components.map((comp) => comp.componentName),
        labels: ticket.labels.map((label) => label.labelName),
        createdAt: ticket.createdAt,
      })),
    };
  }

  /**
   * 특정 URL에서 생성된 티켓 조회 (부분 일치)
   */
  @Get("tickets-by-url")
  public async getTicketsByUrl(@Query("url") url: string) {
    if (!url) {
      throw new BadRequestException("url is required");
    }

    const escapedUrl = url.replace(/%/g, "\\%").replace(/_/g, "\\_");
    const tickets = await this.ticketLogRepository.find({
      where: { url: Like(`%${escapedUrl}%`) },
      order: { createdAt: "DESC" },
      relations: ["components", "labels"], // 컴포넌트 및 라벨 정보 포함
    });

    return {
      url,
      totalCount: tickets.length,
      tickets: tickets.map((ticket) => ({
        id: ticket.id,
        deviceId: ticket.deviceId,
        username: ticket.username,
        userDisplayName: ticket.userDisplayName,
        sessionName: ticket.sessionName,
        ticketUrl: ticket.ticketUrl,
        jiraProjectKey: ticket.jiraProjectKey,
        assignee: ticket.assignee,
        parentEpic: ticket.parentEpic,
        components: ticket.components.map((comp) => comp.componentName),
        labels: ticket.labels.map((label) => label.labelName),
        createdAt: ticket.createdAt,
        url: ticket.url,
      })),
    };
  }

  /**
   * 녹화 세션 생성 통계 조회
   */
  @Get("session-stats")
  public async getSessionStats() {
    // 총 녹화 세션 생성 수
    const totalSessions = await this.recordRepository.count();

    // 녹화 모드별 통계
    const recordModeStats = await this.recordRepository
      .createQueryBuilder("record")
      .select("record.recordMode", "recordMode")
      .addSelect("COUNT(*)", "count")
      .groupBy("record.recordMode")
      .getRawMany();

    // 오늘 생성된 녹화 세션 수
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaySessions = await this.recordRepository
      .createQueryBuilder("record")
      .where("record.timestamp >= :today", { today })
      .getCount();

    // deviceId별 녹화 세션 생성 수 (상위 10개)
    const deviceStats = await this.recordRepository
      .createQueryBuilder("record")
      .select("record.deviceId", "deviceId")
      .addSelect("COUNT(*)", "count")
      .where("record.deviceId IS NOT NULL")
      .groupBy("record.deviceId")
      .orderBy("COUNT(*)", "DESC")
      .limit(10)
      .getRawMany();

    // referrer별 통계
    const referrerStats = await this.recordRepository
      .createQueryBuilder("record")
      .select("record.referrer", "referrer")
      .addSelect("COUNT(*)", "count")
      .where("record.referrer IS NOT NULL")
      .groupBy("record.referrer")
      .orderBy("COUNT(*)", "DESC")
      .limit(10)
      .getRawMany();

    return {
      totalSessions,
      todaySessions,
      recordModeStats: recordModeStats.map((stat) => ({
        recordMode: stat.recordMode,
        count: parseInt(stat.count),
      })),
      deviceStats: deviceStats.map((stat) => ({
        deviceId: stat.deviceId,
        count: parseInt(stat.count),
      })),
      referrerStats: referrerStats.map((stat) => ({
        referrer: stat.referrer,
        count: parseInt(stat.count),
      })),
    };
  }

  /**
   * 특정 디바이스의 녹화 세션 생성 이력 조회
   */
  @Get("user-sessions")
  public async getUserSessions(@Query("deviceId") deviceId: string) {
    if (!deviceId) {
      throw new BadRequestException("deviceId is required");
    }

    const records = await this.recordRepository.find({
      where: { deviceId },
      order: { timestamp: "DESC" },
      take: 50, // 최근 50개만
    });

    return {
      deviceId,
      totalCount: records.length,
      sessions: records.map((record) => ({
        id: record.id,
        sessionName: record.name,
        recordMode: record.recordMode,
        recordId: record.id,
        referrer: record.referrer,
        duration: record.duration,
        createdAt: record.timestamp,
      })),
    };
  }

  /**
   * 일별 녹화 세션 생성 통계 (최근 30일)
   */
  @Get("session-daily-stats")
  public async getSessionDailyStats() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyStats = await this.recordRepository
      .createQueryBuilder("record")
      .select("DATE(record.timestamp)", "date")
      .addSelect("COUNT(*)", "totalCount")
      .addSelect(
        "SUM(CASE WHEN record.recordMode = true THEN 1 ELSE 0 END)",
        "recordModeCount",
      )
      .addSelect(
        "SUM(CASE WHEN record.recordMode = false THEN 1 ELSE 0 END)",
        "liveModeCount",
      )
      .where("record.timestamp >= :thirtyDaysAgo", { thirtyDaysAgo })
      .groupBy("DATE(record.timestamp)")
      .orderBy("DATE(record.timestamp)", "DESC")
      .getRawMany();

    return {
      period: "최근 30일",
      dailyStats: dailyStats.map((stat) => ({
        date: stat.date,
        totalCount: parseInt(stat.totalCount),
        recordModeCount: parseInt(stat.recordModeCount),
        liveModeCount: parseInt(stat.liveModeCount),
      })),
    };
  }
}
