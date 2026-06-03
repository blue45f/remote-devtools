import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import Alert from 'antd/es/alert';
import Badge from 'antd/es/badge';
import Button from 'antd/es/button';
import Card from 'antd/es/card';
import Col from 'antd/es/col';
import Collapse from 'antd/es/collapse';
import Input from 'antd/es/input';
import List from 'antd/es/list';
import Row from 'antd/es/row';
import Select from 'antd/es/select';
import Space from 'antd/es/space';
import Spin from 'antd/es/spin';
import Switch from 'antd/es/switch';
import Table from 'antd/es/table';
import Timeline from 'antd/es/timeline';
import Tabs from 'antd/es/tabs';
import Tag from 'antd/es/tag';
import Typography from 'antd/es/typography';
import type { ColumnsType } from 'antd/es/table';
import BulbOutlined from '@ant-design/icons/es/icons/BulbOutlined';
import CaretRightOutlined from '@ant-design/icons/es/icons/CaretRightOutlined';
import CheckCircleOutlined from '@ant-design/icons/es/icons/CheckCircleOutlined';
import ClearOutlined from '@ant-design/icons/es/icons/ClearOutlined';
import CloudServerOutlined from '@ant-design/icons/es/icons/CloudServerOutlined';
import DisconnectOutlined from '@ant-design/icons/es/icons/DisconnectOutlined';
import DownloadOutlined from '@ant-design/icons/es/icons/DownloadOutlined';
import FileSearchOutlined from '@ant-design/icons/es/icons/FileSearchOutlined';
import HistoryOutlined from '@ant-design/icons/es/icons/HistoryOutlined';
import LinkOutlined from '@ant-design/icons/es/icons/LinkOutlined';
import PauseCircleOutlined from '@ant-design/icons/es/icons/PauseCircleOutlined';
import PlayCircleOutlined from '@ant-design/icons/es/icons/PlayCircleOutlined';
import PlusCircleOutlined from '@ant-design/icons/es/icons/PlusCircleOutlined';
import ReloadOutlined from '@ant-design/icons/es/icons/ReloadOutlined';
import SearchOutlined from '@ant-design/icons/es/icons/SearchOutlined';
import SyncOutlined from '@ant-design/icons/es/icons/SyncOutlined';
import ThunderboltOutlined from '@ant-design/icons/es/icons/ThunderboltOutlined';
import type { ReactNode } from 'react';
import { useRemoteDevTools } from '../hooks';
import {
  getRemoteDevToolsCommandsForStatus,
  doesRemoteDevToolsCommandRequireValue,
  REMOTE_DEVTOOLS_COMMAND_LABELS,
} from '../utils';
import { PageContainer } from '@/shared/components';
import type {
  RemoteDevToolsEvent,
  RemoteDevToolsCommand,
  RemoteDevToolsEventLevel,
  RemoteDevToolsSession,
  RemoteDevToolsActivity,
} from '../types';

const { Text, Paragraph, Title } = Typography;

const buildLevelOptions = (
  t: TFunction,
): Array<{
  value: 'all' | RemoteDevToolsEventLevel;
  label: string;
}> => [
  { value: 'all', label: t('remoteDevtools.levelFilterAll') },
  { value: 'info', label: 'INFO' },
  { value: 'warn', label: 'WARN' },
  { value: 'error', label: 'ERROR' },
  { value: 'debug', label: 'DEBUG' },
];

const buildSessionStatusOptions = (
  t: TFunction,
): Array<{
  value: 'all' | RemoteDevToolsSession['status'];
  label: string;
}> => [
  { value: 'all', label: t('remoteDevtools.statusFilterAll') },
  { value: 'running', label: 'running' },
  { value: 'connected', label: 'connected' },
  { value: 'waiting', label: 'waiting' },
  { value: 'idle', label: 'idle' },
  { value: 'stopped', label: 'stopped' },
  { value: 'error', label: 'error' },
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
  'primary' | 'default' | 'dashed' | 'link' | 'text'
> = {
  start: 'primary',
  pause: 'default',
  resume: 'default',
  replay: 'default',
  disconnect: 'default',
  collect: 'default',
};

const ACTIVITY_COLOR_MAP: Record<RemoteDevToolsActivity['level'], string> = {
  info: 'blue',
  success: 'green',
  warning: 'gold',
  error: 'red',
  debug: 'purple',
};

const toDownloadable = (content: string, filename: string, type = 'text/plain') => {
  const blob = new window.Blob([content], { type });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
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
        if (typeof nestedValue === 'bigint') {
          return `${nestedValue}n`;
        }

        if (typeof nestedValue === 'function') {
          return `[Function: ${nestedValue.name || 'anonymous'}]`;
        }

        if (typeof nestedValue === 'symbol') {
          return nestedValue.toString();
        }

        if (typeof nestedValue === 'object' && nestedValue !== null) {
          if (seen.has(nestedValue)) {
            return '[Circular]';
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
  const text = typeof value === 'string' ? value : safeJsonStringify(value, 0);
  const safeText = escapeCsvFieldValue(text);

  const escaped = String(safeText).replace(/"/g, '""');
  return `"${escaped}"`;
};

const buildEventsCsv = (events: RemoteDevToolsEvent[]) => {
  const header = ['timestamp', 'sessionId', 'level', 'source', 'type', 'message', 'payload'];
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
      .join(','),
  );

  return [header.join(','), ...rows].join('\n');
};

const safeExportTimestamp = () => new Date().toISOString().replace(/[:.]/g, '-');

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
      danger={command === 'disconnect'}
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

function statusToColor(status: RemoteDevToolsSession['status']) {
  switch (status) {
    case 'running':
      return 'green';
    case 'connected':
      return 'blue';
    case 'waiting':
      return 'gold';
    case 'error':
      return 'red';
    default:
      return 'default';
  }
}

function toLocalTime(value?: string) {
  if (!value) {
    return '-';
  }

  try {
    return new Date(value).toLocaleString();
  } catch {
    return '-';
  }
}

function EventMessage({ event }: { event: RemoteDevToolsEvent }) {
  const color =
    event.level === 'error'
      ? 'red'
      : event.level === 'warn'
        ? 'gold'
        : event.level === 'debug'
          ? 'geekblue'
          : 'green';

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
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            <Text>{event.message}</Text>
            {typeof event.payload !== 'undefined' ? (
              <Collapse
                size="small"
                items={[
                  {
                    key: 'payload',
                    label: 'Payload',
                    children: (
                      <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
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

function renderConnectionStatus(
  status: {
    connected: boolean;
    reconnecting: boolean;
    reconnectAttempts: number;
  },
  t: TFunction,
) {
  if (status.connected) {
    return <Badge status="success" text={t('remoteDevtools.connectedText')} />;
  }

  if (status.reconnecting) {
    return (
      <Badge
        status="processing"
        text={t('remoteDevtools.reconnectingText', {
          attempts: status.reconnectAttempts,
        })}
      />
    );
  }

  return <Badge status="error" text={t('remoteDevtools.disconnectedText')} />;
}

const buildEventColumns = (t: TFunction): ColumnsType<RemoteDevToolsSession> => [
  {
    title: t('remoteDevtools.columnSession'),
    dataIndex: 'name',
    key: 'name',
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
    title: t('remoteDevtools.columnEnvironment'),
    key: 'environment',
    width: 140,
    render: (_: unknown, record: RemoteDevToolsSession) => record.environment || '-',
  },
  {
    title: t('remoteDevtools.columnDevice'),
    key: 'device',
    width: 180,
    render: (_: unknown, record: RemoteDevToolsSession) =>
      record.device?.name || record.device?.platform || '-',
  },
  {
    title: t('remoteDevtools.columnConnectedAt'),
    key: 'connectedAt',
    width: 190,
    render: (_: unknown, record: RemoteDevToolsSession) =>
      toLocalTime(record.lastHeartbeatAt || record.startedAt),
  },
  {
    title: t('remoteDevtools.columnParticipants'),
    key: 'participants',
    width: 90,
    render: (_: unknown, record: RemoteDevToolsSession) => String(record.participantCount || 0),
  },
];

export function RemoteDevToolsPage() {
  const { t } = useTranslation();
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

  const [commandValue, setCommandValue] = useState('');

  const levelOptions = useMemo(() => buildLevelOptions(t), [t]);
  const sessionStatusOptions = useMemo(() => buildSessionStatusOptions(t), [t]);
  const eventColumns = useMemo(() => buildEventColumns(t), [t]);

  const eventItems = useMemo(() => events, [events]);
  const activityItems = useMemo(() => {
    if (!activeSessionId) {
      return activityLog;
    }

    return activityLog.filter(
      (activity) => !activity.sessionId || activity.sessionId === activeSessionId,
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
              {activity.sessionId ? `session=${activity.sessionId}` : 'scope=system'}
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
        {t('remoteDevtools.refresh')}
      </Button>,
      <Button
        key="add"
        type="primary"
        icon={<PlusCircleOutlined />}
        loading={isCreatingSession}
        onClick={() => createSession()}
      >
        {t('remoteDevtools.createSession')}
      </Button>,
      <Space key="live-switch" size={4} align="center">
        <Text type="secondary">{t('remoteDevtools.liveConnection')}</Text>
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
        {t('remoteDevtools.reconnect')}
      </Button>,
      <Button
        key="clear-events"
        icon={<ClearOutlined />}
        disabled={!activeSessionId || events.length === 0}
        onClick={clearEvents}
      >
        {t('remoteDevtools.clearEvents')}
      </Button>,
      <Button
        key="clear-activity"
        icon={<ClearOutlined />}
        disabled={activityItems.length === 0}
        onClick={clearActivityLog}
      >
        {t('remoteDevtools.clearActivity')}
      </Button>,
      <Button
        key="export-events-json"
        icon={<DownloadOutlined />}
        disabled={events.length === 0}
        onClick={() =>
          toDownloadable(
            safeJsonStringify(eventItems),
            `${eventExportFileName}.json`,
            'application/json',
          )
        }
      >
        {t('remoteDevtools.exportEventsJson')}
      </Button>,
      <Button
        key="export-events-csv"
        icon={<DownloadOutlined />}
        disabled={events.length === 0}
        onClick={() =>
          toDownloadable(buildEventsCsv(eventItems), `${eventExportFileName}.csv`, 'text/csv')
        }
      >
        {t('remoteDevtools.exportEventsCsv')}
      </Button>,
      <Button
        key="export-activity-json"
        icon={<DownloadOutlined />}
        disabled={activityItems.length === 0}
        onClick={() =>
          toDownloadable(
            safeJsonStringify(activityItems),
            `${activityExportFileName}.json`,
            'application/json',
          )
        }
      >
        {t('remoteDevtools.saveActivity')}
      </Button>,
    ];

    const commandEnabled = Boolean(activeSessionId);

    if (!selectedSession) {
      return list;
    }

    const commands = getRemoteDevToolsCommandsForStatus(selectedSession.status);
    for (const command of commands) {
      const requiresValue = doesRemoteDevToolsCommandRequireValue(command);
      const commandDisabled = !commandEnabled || (requiresValue && trimCommandValue.length === 0);

      list.push(
        buildCommandButton({
          command,
          key: command,
          loading: isCommandRunning,
          disabled: commandDisabled,
          title: commandDisabled && requiresValue ? t('remoteDevtools.enterValueTitle') : undefined,
          onClick: () =>
            sendCommand(
              command,
              requiresValue ? { value: trimCommandValue || undefined } : undefined,
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
    t,
  ]);

  if (!isFeatureEnabled) {
    return (
      <PageContainer title={t('remoteDevtools.title')}>
        <Alert
          message={t('remoteDevtools.disabledTitle')}
          description={t('remoteDevtools.disabledDescription')}
          type="warning"
          showIcon
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={t('remoteDevtools.title')}
      extra={
        <Space size="small" wrap>
          {renderConnectionStatus(connectionInfo, t)} {actionButtons}
        </Space>
      }
    >
      {isSessionsError && (
        <Alert
          message={t('remoteDevtools.sessionListLoadFailed')}
          description={
            sessionsError instanceof Error
              ? sessionsError.message
              : t('remoteDevtools.sessionListLoadFailedDescription')
          }
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={10}>
          <Card
            title={t('remoteDevtools.sessionListTitle')}
            extra={
              <Text type="secondary">
                {t('remoteDevtools.sessionCount', {
                  filtered: filteredSessionCount,
                  total: totalSessionCount,
                })}
              </Text>
            }
          >
            <Space style={{ marginBottom: 12 }} size="middle" wrap>
              <Input
                allowClear
                size="small"
                prefix={<SearchOutlined />}
                placeholder={t('remoteDevtools.sessionSearchPlaceholder')}
                onChange={(event) => setSessionSearchQuery(event.target.value)}
              />
              <Select
                size="small"
                style={{ width: 140 }}
                value={sessionStatusFilter}
                onChange={(value) =>
                  setSessionStatusFilter(value as RemoteDevToolsSession['status'] | 'all')
                }
                options={sessionStatusOptions}
              />
            </Space>

            {isSessionsLoading ? (
              <Spin />
            ) : (
              <Table
                rowKey="id"
                size="small"
                columns={eventColumns}
                dataSource={sessionsFiltered}
                pagination={{ pageSize: 8 }}
                onRow={(record) => ({
                  onClick: () => setSelectedSession(record.id),
                  style: {
                    cursor: 'pointer',
                    backgroundColor:
                      activeSessionId === record.id ? 'rgba(24, 144, 255, 0.08)' : 'unset',
                  },
                })}
                locale={{ emptyText: t('remoteDevtools.emptySessions') }}
              />
            )}
          </Card>
        </Col>

        <Col xs={24} xl={14}>
          <Card
            title={t('remoteDevtools.liveEventsTitle')}
            extra={
              <Space>
                <FileSearchOutlined />
                <Text type="secondary">
                  {t('remoteDevtools.eventTotal', {
                    total: eventLevelSummary.total,
                  })}
                </Text>
              </Space>
            }
          >
            {connectionInfo.lastError ? (
              <Alert
                message={t('remoteDevtools.connectionWarning')}
                description={connectionInfo.lastError}
                type="warning"
                showIcon
                style={{ marginBottom: 12 }}
              />
            ) : null}

            <Space direction="vertical" size="middle" style={{ width: '100%', marginBottom: 12 }}>
              <Title level={5}>{t('remoteDevtools.selectedSession')}</Title>
              <Paragraph>
                {selectedSession
                  ? `${selectedSession.name} (${selectedSession.id})`
                  : t('remoteDevtools.selectSessionHint')}
              </Paragraph>

              <Space size="small" wrap>
                <Input.Search
                  allowClear
                  value={eventSearchQuery}
                  placeholder={t('remoteDevtools.eventSearchPlaceholder')}
                  onSearch={(value) => setSearchQuery(value)}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  style={{ width: 280 }}
                  prefix={<SearchOutlined />}
                />
                <Select
                  value={eventLevelFilter}
                  style={{ width: 140 }}
                  onChange={(value) => setLevelFilter(value as 'all' | RemoteDevToolsEventLevel)}
                  options={levelOptions}
                />
                <Input
                  size="middle"
                  style={{ width: 180 }}
                  value={commandValue}
                  placeholder={t('remoteDevtools.commandValuePlaceholder')}
                  onChange={(event) => setCommandValue(event.target.value)}
                />
                <Space>
                  <Badge color="blue" text={`INFO ${eventLevelSummary.info}`} />
                  <Badge color="gold" text={`WARN ${eventLevelSummary.warn}`} />
                  <Badge color="green" text={`DEBUG ${eventLevelSummary.debug}`} />
                  <Badge color="red" text={`ERROR ${eventLevelSummary.error}`} />
                </Space>
              </Space>

              <Space>
                <Text type="secondary">
                  {t('remoteDevtools.connectionAddress')}{' '}
                  <Text code>{connectionUrl || t('remoteDevtools.connectionUnset')}</Text>
                </Text>
                {selectedSession?.roomUrl ? (
                  <a href={selectedSession.roomUrl} target="_blank" rel="noreferrer">
                    <LinkOutlined /> {t('remoteDevtools.roomLink')}
                  </a>
                ) : null}
              </Space>

              <Space size="small">
                {connectionInfo.lastConnectedAt ? (
                  <Text type="secondary">
                    <HistoryOutlined /> {t('remoteDevtools.lastConnected')}{' '}
                    {toLocalTime(connectionInfo.lastConnectedAt)}
                  </Text>
                ) : null}
                {connectionInfo.lastEventAt ? (
                  <Text type="secondary">
                    <HistoryOutlined /> {t('remoteDevtools.lastEvent')}{' '}
                    {toLocalTime(connectionInfo.lastEventAt)}
                  </Text>
                ) : null}
              </Space>

              <Space>
                {connectionInfo.connected ? (
                  <Badge status="processing" text={t('remoteDevtools.liveModeActive')} />
                ) : (
                  <Badge status="default" text={t('remoteDevtools.liveModeInactive')} />
                )}
                <Text type="secondary">
                  {t('remoteDevtools.lastEvent')}{' '}
                  {latestEvent ? toLocalTime(latestEvent.timestamp) : '-'}
                </Text>
              </Space>
            </Space>

            <Tabs
              size="small"
              defaultActiveKey="timeline"
              items={[
                {
                  key: 'timeline',
                  label: t('remoteDevtools.tabTimeline'),
                  children: isEventsLoading ? (
                    <Spin />
                  ) : (
                    <List
                      bordered
                      dataSource={eventItems}
                      locale={{ emptyText: t('remoteDevtools.emptyEvents') }}
                      renderItem={(event) => <EventMessage event={event} />}
                    />
                  ),
                },
                {
                  key: 'json',
                  label: t('remoteDevtools.tabSummary'),
                  children: (
                    <pre
                      style={{
                        maxHeight: 420,
                        overflow: 'auto',
                        margin: 0,
                        background: '#fafafa',
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
                  key: 'activity',
                  label: t('remoteDevtools.tabActivity'),
                  children:
                    activityTimelineItems.length === 0 ? (
                      <Text type="secondary">{t('remoteDevtools.emptyActivity')}</Text>
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
