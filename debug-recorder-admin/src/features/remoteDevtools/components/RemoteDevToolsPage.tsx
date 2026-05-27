import { useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Collapse,
  Input,
  List,
  Row,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Timeline,
  Tabs,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  BulbOutlined,
  CaretRightOutlined,
  CheckCircleOutlined,
  CloudServerOutlined,
  ClearOutlined,
  DisconnectOutlined,
  FileSearchOutlined,
  HistoryOutlined,
  LinkOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  DownloadOutlined,
  PlusCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
  SyncOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import type { ReactNode } from "react";
import { useRemoteDevTools } from "../hooks";
import {
  getRemoteDevToolsCommandsForStatus,
  doesRemoteDevToolsCommandRequireValue,
  REMOTE_DEVTOOLS_COMMAND_LABELS,
} from "../utils";
import { PageContainer } from "@/shared/components";
import type {
  RemoteDevToolsEvent,
  RemoteDevToolsCommand,
  RemoteDevToolsEventLevel,
  RemoteDevToolsSession,
  RemoteDevToolsActivity,
} from "../types";

const { Text, Paragraph, Title } = Typography;

const LEVEL_OPTIONS: Array<{
  value: "all" | RemoteDevToolsEventLevel;
  label: string;
}> = [
  { value: "all", label: "전체" },
  { value: "info", label: "INFO" },
  { value: "warn", label: "WARN" },
  { value: "error", label: "ERROR" },
  { value: "debug", label: "DEBUG" },
];

const SESSION_STATUS_OPTIONS: Array<{
  value: "all" | RemoteDevToolsSession["status"];
  label: string;
}> = [
  { value: "all", label: "전체 상태" },
  { value: "running", label: "running" },
  { value: "connected", label: "connected" },
  { value: "waiting", label: "waiting" },
  { value: "idle", label: "idle" },
  { value: "stopped", label: "stopped" },
  { value: "error", label: "error" },
];

const COMMAND_ICON_MAP: Record<RemoteDevToolsCommand, ReactNode> = {
  start: <ThunderboltOutlined />,
  pause: <PauseCircleOutlined />,
  resume: <PlayCircleOutlined />,
  replay: <CaretRightOutlined />,
  disconnect: <DisconnectOutlined />,
  collect: <BulbOutlined />,
};

const COMMAND_TYPE_MAP: Record<
  RemoteDevToolsCommand,
  "primary" | "default" | "dashed" | "link" | "text"
> = {
  start: "primary",
  pause: "default",
  resume: "default",
  replay: "default",
  disconnect: "default",
  collect: "default",
};

const ACTIVITY_COLOR_MAP: Record<RemoteDevToolsActivity["level"], string> = {
  info: "blue",
  success: "green",
  warning: "gold",
  error: "red",
  debug: "purple",
};

const toDownloadable = (
  content: string,
  filename: string,
  type = "text/plain",
) => {
  const blob = new window.Blob([content], { type });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
};

const escapeCsvFieldValue = (value: string): string => {
  const normalized = String(value);

  return /^[\s]*[=+\-@]/.test(normalized) ? `'${normalized}` : normalized;
};

const safeJsonStringify = (value: unknown, spacing = 2): string => {
  const seen = new Set<object>();

  try {
    const serialized = JSON.stringify(
      value,
      (_key, nestedValue) => {
        if (typeof nestedValue === "bigint") {
          return `${nestedValue}n`;
        }

        if (typeof nestedValue === "function") {
          return `[Function: ${nestedValue.name || "anonymous"}]`;
        }

        if (typeof nestedValue === "symbol") {
          return nestedValue.toString();
        }

        if (typeof nestedValue === "object" && nestedValue !== null) {
          if (seen.has(nestedValue)) {
            return "[Circular]";
          }

          seen.add(nestedValue);
        }

        return nestedValue;
      },
      spacing,
    );

    return serialized === undefined ? String(value) : serialized;
  } catch {
    return String(value);
  }
};

const toCsvField = (value: unknown): string => {
  const text = typeof value === "string" ? value : safeJsonStringify(value, 0);
  const safeText = escapeCsvFieldValue(text);

  const escaped = String(safeText).replace(/"/g, '""');
  return `"${escaped}"`;
};

const buildEventsCsv = (events: RemoteDevToolsEvent[]) => {
  const header = [
    "timestamp",
    "sessionId",
    "level",
    "source",
    "type",
    "message",
    "payload",
  ];
  const rows = events.map((event) =>
    [
      event.timestamp,
      event.sessionId,
      event.level,
      event.source,
      event.type,
      event.message,
      event.payload,
    ]
      .map(toCsvField)
      .join(","),
  );

  return [header.join(","), ...rows].join("\n");
};

const safeExportTimestamp = () =>
  new Date().toISOString().replace(/[:.]/g, "-");

function buildCommandButton({
  command,
  key,
  loading,
  disabled,
  onClick,
  title,
}: {
  command: RemoteDevToolsCommand;
  key: string;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
  title?: string;
}) {
  return (
    <Button
      key={key}
      type={COMMAND_TYPE_MAP[command]}
      danger={command === "disconnect"}
      loading={loading}
      icon={COMMAND_ICON_MAP[command]}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {REMOTE_DEVTOOLS_COMMAND_LABELS[command]}
    </Button>
  );
}

function statusToColor(status: RemoteDevToolsSession["status"]) {
  switch (status) {
    case "running":
      return "green";
    case "connected":
      return "blue";
    case "waiting":
      return "gold";
    case "error":
      return "red";
    default:
      return "default";
  }
}

function toLocalTime(value?: string) {
  if (!value) {
    return "-";
  }

  try {
    return new Date(value).toLocaleString();
  } catch {
    return "-";
  }
}

function EventMessage({ event }: { event: RemoteDevToolsEvent }) {
  const color =
    event.level === "error"
      ? "red"
      : event.level === "warn"
        ? "gold"
        : event.level === "debug"
          ? "geekblue"
          : "green";

  return (
    <List.Item>
      <List.Item.Meta
        title={
          <Space size={8}>
            <Tag color={color}>{event.level.toUpperCase()}</Tag>
            <Tag>{event.type}</Tag>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {toLocalTime(event.timestamp)}
            </Text>
          </Space>
        }
        description={
          <Space direction="vertical" size={4} style={{ width: "100%" }}>
            <Text>{event.message}</Text>
            {typeof event.payload !== "undefined" ? (
              <Collapse
                size="small"
                items={[
                  {
                    key: "payload",
                    label: "Payload",
                    children: (
                      <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                        {safeJsonStringify(event.payload)}
                      </pre>
                    ),
                  },
                ]}
              />
            ) : null}
          </Space>
        }
      />
    </List.Item>
  );
}

function renderConnectionStatus(status: {
  connected: boolean;
  reconnecting: boolean;
  reconnectAttempts: number;
}) {
  if (status.connected) {
    return <Badge status="success" text="실시간 연결됨" />;
  }

  if (status.reconnecting) {
    return (
      <Badge
        status="processing"
        text={`재연결 중 (${status.reconnectAttempts}회)`}
      />
    );
  }

  return <Badge status="error" text="실시간 미연결" />;
}

const EVENT_COLUMNS: ColumnsType<RemoteDevToolsSession> = [
  {
    title: "세션",
    dataIndex: "name",
    key: "name",
    width: 220,
    render: (_: string, record: RemoteDevToolsSession) => (
      <Space direction="vertical" size={2}>
        <Text strong>{record.name}</Text>
        <Space size={8}>
          <Tag color={statusToColor(record.status)}>{record.status}</Tag>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.id}
          </Text>
        </Space>
      </Space>
    ),
  },
  {
    title: "환경",
    key: "environment",
    width: 140,
    render: (_: unknown, record: RemoteDevToolsSession) =>
      record.environment || "-",
  },
  {
    title: "디바이스",
    key: "device",
    width: 180,
    render: (_: unknown, record: RemoteDevToolsSession) =>
      record.device?.name || record.device?.platform || "-",
  },
  {
    title: "연결 시각",
    key: "connectedAt",
    width: 190,
    render: (_: unknown, record: RemoteDevToolsSession) =>
      toLocalTime(record.lastHeartbeatAt || record.startedAt),
  },
  {
    title: "참여자",
    key: "participants",
    width: 90,
    render: (_: unknown, record: RemoteDevToolsSession) =>
      String(record.participantCount || 0),
  },
];

export function RemoteDevToolsPage() {
  const {
    isFeatureEnabled,
    sessionsFiltered,
    filteredSessionCount,
    totalSessionCount,
    isSessionsLoading,
    isSessionsError,
    sessionsError,
    sessionListRefetch,
    activeSessionId,
    selectedSession,
    setSelectedSession,
    setSessionSearchQuery,
    setSessionStatusFilter,
    sessionStatusFilter,

    events,
    isEventsLoading,
    eventsRefetch,
    connectionInfo,
    isLiveMode,
    setLiveMode,
    clearEvents,
    clearActivityLog,
    reconnectNow,
    activityLog,

    setSearchQuery,
    setLevelFilter,
    createSession,
    isCreatingSession,
    sendCommand,
    isCommandRunning,
    connectionUrl,
    eventSearchQuery,
    eventLevelFilter,
    eventLevelSummary,
    latestEvent,
  } = useRemoteDevTools();

  const [commandValue, setCommandValue] = useState("");

  const eventItems = useMemo(() => events, [events]);
  const activityItems = useMemo(() => {
    if (!activeSessionId) {
      return activityLog;
    }

    return activityLog.filter(
      (activity) =>
        !activity.sessionId || activity.sessionId === activeSessionId,
    );
  }, [activityLog, activeSessionId]);

  const eventExportFileName = activeSessionId
    ? `remote-devtools-events-${activeSessionId}-${safeExportTimestamp()}`
    : `remote-devtools-events-${safeExportTimestamp()}`;

  const activityExportFileName = activeSessionId
    ? `remote-devtools-activity-${activeSessionId}-${safeExportTimestamp()}`
    : `remote-devtools-activity-${safeExportTimestamp()}`;

  const activityTimelineItems = useMemo(
    () =>
      activityItems.map((activity) => ({
        key: activity.id,
        color: ACTIVITY_COLOR_MAP[activity.level],
        label: toLocalTime(activity.timestamp),
        children: (
          <Space direction="vertical" size={4}>
            <Text strong>{activity.message}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {activity.sessionId
                ? `session=${activity.sessionId}`
                : "scope=system"}
            </Text>
            {activity.details ? <Text code>{activity.details}</Text> : null}
          </Space>
        ),
      })),
    [activityItems],
  );

  const actionButtons = useMemo(() => {
    const trimCommandValue = commandValue.trim();

    const list: ReactNode[] = [
      <Button
        key="refresh"
        icon={<ReloadOutlined />}
        onClick={() => {
          void sessionListRefetch();
          void eventsRefetch();
        }}
      >
        새로고침
      </Button>,
      <Button
        key="add"
        type="primary"
        icon={<PlusCircleOutlined />}
        loading={isCreatingSession}
        onClick={() => createSession()}
      >
        세션 생성
      </Button>,
      <Space key="live-switch" size={4} align="center">
        <Text type="secondary">실시간 연결</Text>
        <Switch
          checked={isLiveMode}
          checkedChildren={<CheckCircleOutlined />}
          unCheckedChildren={<CloudServerOutlined />}
          onChange={setLiveMode}
        />
      </Space>,
      <Button
        key="reconnect"
        loading={connectionInfo.reconnecting}
        icon={<SyncOutlined />}
        disabled={!activeSessionId || !isLiveMode}
        onClick={() => reconnectNow()}
      >
        재연결
      </Button>,
      <Button
        key="clear-events"
        icon={<ClearOutlined />}
        disabled={!activeSessionId || events.length === 0}
        onClick={clearEvents}
      >
        이벤트 초기화
      </Button>,
      <Button
        key="clear-activity"
        icon={<ClearOutlined />}
        disabled={activityItems.length === 0}
        onClick={clearActivityLog}
      >
        활동 로그 초기화
      </Button>,
      <Button
        key="export-events-json"
        icon={<DownloadOutlined />}
        disabled={events.length === 0}
        onClick={() =>
          toDownloadable(
            safeJsonStringify(eventItems),
            `${eventExportFileName}.json`,
            "application/json",
          )
        }
      >
        JSON 내보내기
      </Button>,
      <Button
        key="export-events-csv"
        icon={<DownloadOutlined />}
        disabled={events.length === 0}
        onClick={() =>
          toDownloadable(
            buildEventsCsv(eventItems),
            `${eventExportFileName}.csv`,
            "text/csv",
          )
        }
      >
        CSV 내보내기
      </Button>,
      <Button
        key="export-activity-json"
        icon={<DownloadOutlined />}
        disabled={activityItems.length === 0}
        onClick={() =>
          toDownloadable(
            safeJsonStringify(activityItems),
            `${activityExportFileName}.json`,
            "application/json",
          )
        }
      >
        활동 로그 저장
      </Button>,
    ];

    const commandEnabled = Boolean(activeSessionId);

    if (!selectedSession) {
      return list;
    }

    const commands = getRemoteDevToolsCommandsForStatus(selectedSession.status);
    for (const command of commands) {
      const requiresValue = doesRemoteDevToolsCommandRequireValue(command);
      const commandDisabled =
        !commandEnabled || (requiresValue && trimCommandValue.length === 0);

      list.push(
        buildCommandButton({
          command,
          key: command,
          loading: isCommandRunning,
          disabled: commandDisabled,
          title:
            commandDisabled && requiresValue ? "값을 입력하세요." : undefined,
          onClick: () =>
            sendCommand(
              command,
              requiresValue
                ? { value: trimCommandValue || undefined }
                : undefined,
            ),
        }),
      );
    }

    return list;
  }, [
    activeSessionId,
    connectionInfo.reconnecting,
    commandValue,
    createSession,
    isCommandRunning,
    isCreatingSession,
    isLiveMode,
    eventItems,
    selectedSession,
    clearEvents,
    clearActivityLog,
    eventExportFileName,
    activityItems,
    reconnectNow,
    activityExportFileName,
    sessionListRefetch,
    sendCommand,
    setLiveMode,
    eventsRefetch,
  ]);

  if (!isFeatureEnabled) {
    return (
      <PageContainer title="Remote DevTools">
        <Alert
          message="Remote DevTools 연동 비활성"
          description="현재 VITE_REMOTE_DEVTOOLS_ENABLED가 false이므로 비활성 상태입니다. `.env`에서 값을 활성화해 주세요."
          type="warning"
          showIcon
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Remote DevTools"
      extra={
        <Space size="small" wrap>
          {renderConnectionStatus(connectionInfo)} {actionButtons}
        </Space>
      }
    >
      {isSessionsError && (
        <Alert
          message="세션 목록 조회 실패"
          description={
            sessionsError instanceof Error
              ? sessionsError.message
              : "원격 DevTools 세션 API 응답을 불러올 수 없습니다."
          }
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={10}>
          <Card
            title="세션 목록"
            extra={
              <Text type="secondary">
                {filteredSessionCount}/{totalSessionCount}개
              </Text>
            }
          >
            <Space style={{ marginBottom: 12 }} size="middle" wrap>
              <Input
                allowClear
                size="small"
                prefix={<SearchOutlined />}
                placeholder="세션 검색"
                onChange={(event) => setSessionSearchQuery(event.target.value)}
              />
              <Select
                size="small"
                style={{ width: 140 }}
                value={sessionStatusFilter}
                onChange={(value) =>
                  setSessionStatusFilter(
                    value as RemoteDevToolsSession["status"] | "all",
                  )
                }
                options={SESSION_STATUS_OPTIONS}
              />
            </Space>

            {isSessionsLoading ? (
              <Spin />
            ) : (
              <Table
                rowKey="id"
                size="small"
                columns={EVENT_COLUMNS}
                dataSource={sessionsFiltered}
                pagination={{ pageSize: 8 }}
                onRow={(record) => ({
                  onClick: () => setSelectedSession(record.id),
                  style: {
                    cursor: "pointer",
                    backgroundColor:
                      activeSessionId === record.id
                        ? "rgba(24, 144, 255, 0.08)"
                        : "unset",
                  },
                })}
                locale={{ emptyText: "세션이 없습니다." }}
              />
            )}
          </Card>
        </Col>

        <Col xs={24} xl={14}>
          <Card
            title="실시간 이벤트"
            extra={
              <Space>
                <FileSearchOutlined />
                <Text type="secondary">총 {eventLevelSummary.total}개</Text>
              </Space>
            }
          >
            {connectionInfo.lastError ? (
              <Alert
                message="연결 경고"
                description={connectionInfo.lastError}
                type="warning"
                showIcon
                style={{ marginBottom: 12 }}
              />
            ) : null}

            <Space
              direction="vertical"
              size="middle"
              style={{ width: "100%", marginBottom: 12 }}
            >
              <Title level={5}>선택 세션</Title>
              <Paragraph>
                {selectedSession
                  ? `${selectedSession.name} (${selectedSession.id})`
                  : "세션을 선택하면 실시간 이벤트를 표시합니다."}
              </Paragraph>

              <Space size="small" wrap>
                <Input.Search
                  allowClear
                  value={eventSearchQuery}
                  placeholder="이벤트 메시지/타입/소스 검색"
                  onSearch={(value) => setSearchQuery(value)}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  style={{ width: 280 }}
                  prefix={<SearchOutlined />}
                />
                <Select
                  value={eventLevelFilter}
                  style={{ width: 140 }}
                  onChange={(value) =>
                    setLevelFilter(value as "all" | RemoteDevToolsEventLevel)
                  }
                  options={LEVEL_OPTIONS}
                />
                <Input
                  size="middle"
                  style={{ width: 180 }}
                  value={commandValue}
                  placeholder="명령 값(재생/수집)"
                  onChange={(event) => setCommandValue(event.target.value)}
                />
                <Space>
                  <Badge color="blue" text={`INFO ${eventLevelSummary.info}`} />
                  <Badge color="gold" text={`WARN ${eventLevelSummary.warn}`} />
                  <Badge
                    color="green"
                    text={`DEBUG ${eventLevelSummary.debug}`}
                  />
                  <Badge
                    color="red"
                    text={`ERROR ${eventLevelSummary.error}`}
                  />
                </Space>
              </Space>

              <Space>
                <Text type="secondary">
                  연결 주소: <Text code>{connectionUrl || "미설정"}</Text>
                </Text>
                {selectedSession?.roomUrl ? (
                  <a
                    href={selectedSession.roomUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <LinkOutlined /> 녹화방 링크
                  </a>
                ) : null}
              </Space>

              <Space size="small">
                {connectionInfo.lastConnectedAt ? (
                  <Text type="secondary">
                    <HistoryOutlined /> 마지막 연결:{" "}
                    {toLocalTime(connectionInfo.lastConnectedAt)}
                  </Text>
                ) : null}
                {connectionInfo.lastEventAt ? (
                  <Text type="secondary">
                    <HistoryOutlined /> 마지막 이벤트:{" "}
                    {toLocalTime(connectionInfo.lastEventAt)}
                  </Text>
                ) : null}
              </Space>

              <Space>
                {connectionInfo.connected ? (
                  <Badge status="processing" text="라이브 모드 활성" />
                ) : (
                  <Badge
                    status="default"
                    text="라이브 모드 비활성 또는 미연결"
                  />
                )}
                <Text type="secondary">
                  마지막 이벤트:{" "}
                  {latestEvent ? toLocalTime(latestEvent.timestamp) : "-"}
                </Text>
              </Space>
            </Space>

            <Tabs
              size="small"
              defaultActiveKey="timeline"
              items={[
                {
                  key: "timeline",
                  label: "이벤트 타임라인",
                  children: isEventsLoading ? (
                    <Spin />
                  ) : (
                    <List
                      bordered
                      dataSource={eventItems}
                      locale={{ emptyText: "이벤트가 없습니다." }}
                      renderItem={(event) => <EventMessage event={event} />}
                    />
                  ),
                },
                {
                  key: "json",
                  label: "요약",
                  children: (
                    <pre
                      style={{
                        maxHeight: 420,
                        overflow: "auto",
                        margin: 0,
                        background: "#fafafa",
                        padding: 12,
                        borderRadius: 8,
                      }}
                    >
                      {safeJsonStringify({
                        selectedSession,
                        connectionInfo,
                        events: eventItems.slice(0, 50),
                        totalEvents: eventItems.length,
                      })}
                    </pre>
                  ),
                },
                {
                  key: "activity",
                  label: "활동 로그",
                  children:
                    activityTimelineItems.length === 0 ? (
                      <Text type="secondary">활동 로그가 없습니다.</Text>
                    ) : isEventsLoading ? (
                      <Spin />
                    ) : (
                      <Timeline
                        mode="left"
                        items={activityTimelineItems}
                        style={{ minHeight: 220 }}
                      />
                    ),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
}
