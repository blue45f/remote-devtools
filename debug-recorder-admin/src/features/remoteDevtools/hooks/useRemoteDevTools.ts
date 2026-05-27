import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import message from "antd/es/message";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  buildRemoteDevToolsWsUrl,
  mergeRemoteDevToolsEvents,
  normalizeRemoteDevToolsEvent,
  parseRemoteDevToolsTimestamp,
  DEFAULT_SESSION_STATUS_FILTER,
  doesRemoteDevToolsCommandRequireValue,
  isRemoteDevToolsCommandAllowed,
} from "../utils";
import {
  createRemoteDevToolsSession,
  getRemoteDevToolsEvents,
  getRemoteDevToolsSessions,
  controlRemoteDevToolsSession,
} from "../api";
import {
  type RemoteDevToolsCommand,
  type RemoteDevToolsCommandPayload,
  type RemoteDevToolsConnectionInfo,
  type RemoteDevToolsEvent,
  type RemoteDevToolsEventLevel,
  type RemoteDevToolsSession,
  type RemoteDevToolsSessionFilter,
  type RemoteDevToolsActivity,
} from "../types";
import { CONFIG } from "@/shared/constants";
import { useLocalStorage } from "@/shared/hooks";

const DEFAULT_LEVEL_FILTER: "all" | RemoteDevToolsEventLevel = "all";

const EVENTS_FALLBACK_POLLING_MS = 10_000;
const RECONNECT_MAX_ATTEMPTS = 5;
const MAX_ACTIVITY_LOG = 150;

type CommandMutationArgs = {
  sessionId: string;
} & RemoteDevToolsCommandPayload;

const createSearchMatcher = (value: string): string =>
  value.trim().toLowerCase();

const safeSerializeValue = (value: unknown): string => {
  const seen = new Set<object>();

  try {
    const serialized = JSON.stringify(value, (_key, nestedValue) => {
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
    });

    return serialized === undefined ? String(value) : serialized;
  } catch {
    return String(value);
  }
};

const stringifyPayload = (value: unknown): string => {
  if (typeof value === "string") {
    return value.toLowerCase();
  }

  if (value instanceof Error) {
    return value.message.toLowerCase();
  }

  return safeSerializeValue(value).toLowerCase();
};

const safeTimestamp = (): string => new Date().toISOString();

const formatActivityDetails = (value?: unknown): string | undefined => {
  if (typeof value === "undefined") {
    return undefined;
  }

  if (typeof value === "string") {
    return value;
  }

  return value instanceof Error
    ? value.message || String(value)
    : safeSerializeValue(value);
};

export function useRemoteDevTools() {
  const queryClient = useQueryClient();
  const [selectedSessionId, setSelectedSessionId] = useLocalStorage<
    string | null
  >("remote-devtools.selectedSessionId", null);

  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<
    "all" | RemoteDevToolsEventLevel
  >(DEFAULT_LEVEL_FILTER);
  const [sessionSearchQuery, setSessionSearchQuery] = useState("");
  const [sessionStatusFilter, setSessionStatusFilter] = useState<
    RemoteDevToolsSessionFilter["status"]
  >(DEFAULT_SESSION_STATUS_FILTER);
  const [isLiveMode, setLiveMode] = useState(true);

  const [streamEvents, setStreamEvents] = useState<RemoteDevToolsEvent[]>([]);
  const [activityLog, setActivityLog] = useState<RemoteDevToolsActivity[]>([]);
  const [connectionInfo, setConnectionInfo] =
    useState<RemoteDevToolsConnectionInfo>({
      connected: false,
      reconnecting: false,
      reconnectAttempts: 0,
      liveMode: true,
    });

  const wsRef = useRef<InstanceType<typeof window.WebSocket> | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const connectWebSocketRef = useRef<
    ((sessionId: string | null) => Promise<void> | void) | null
  >(null);
  const activeSessionIdRef = useRef<string | null>(null);
  const shouldReconnectRef = useRef(false);
  const isMountedRef = useRef(true);

  const isFeatureEnabled = CONFIG.REMOTE_DEVTOOLS_ENABLED;
  const maxEvents = CONFIG.REMOTE_DEVTOOLS_MAX_EVENTS;

  const appendActivity = useCallback(
    (
      level: RemoteDevToolsActivity["level"],
      message: string,
      details?: unknown,
      sessionId?: string,
    ) => {
      setActivityLog((prev) => {
        const next = [
          {
            id: `activity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            timestamp: safeTimestamp(),
            sessionId,
            level,
            message,
            details: formatActivityDetails(details),
          },
          ...prev,
        ];

        return next.slice(0, MAX_ACTIVITY_LOG);
      });
    },
    [],
  );

  const sessionsQuery = useQuery<RemoteDevToolsSession[], Error>({
    queryKey: ["remoteDevTools", "sessions"],
    queryFn: getRemoteDevToolsSessions,
    enabled: isFeatureEnabled,
    refetchInterval: isFeatureEnabled ? EVENTS_FALLBACK_POLLING_MS : false,
    staleTime: 10_000,
  });

  const sessions = sessionsQuery.data || [];

  const currentSessionId = sessions[0]?.id ?? null;
  const activeSessionId = selectedSessionId ?? currentSessionId;

  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  useEffect(() => {
    if (!selectedSessionId && currentSessionId) {
      appendActivity("info", `자동으로 활성 세션 선택: ${currentSessionId}`);
      setSelectedSessionId(currentSessionId);
      return;
    }

    if (
      selectedSessionId &&
      !sessions.some((session) => session.id === selectedSessionId)
    ) {
      appendActivity(
        "warning",
        "선택한 세션이 목록에서 사라졌습니다.",
        `session=${selectedSessionId}`,
      );
      setSelectedSessionId(null);
    }
  }, [
    appendActivity,
    selectedSessionId,
    currentSessionId,
    sessions,
    setSelectedSessionId,
  ]);

  const filteredSessions = useMemo(() => {
    const query = createSearchMatcher(sessionSearchQuery);

    return sessions.filter((session) => {
      if (
        sessionStatusFilter !== "all" &&
        session.status !== sessionStatusFilter
      ) {
        return false;
      }

      if (!query) {
        return true;
      }

      const searchable = [
        session.id,
        session.name,
        session.environment,
        session.device?.name,
        session.device?.platform,
        session.roomName,
        session.device?.browser,
        session.deviceId,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [sessions, sessionSearchQuery, sessionStatusFilter]);

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) || null,
    [sessions, activeSessionId],
  );

  const clearReconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const appendEvents = useCallback(
    (nextEvents: RemoteDevToolsEvent[]) => {
      setStreamEvents((prev) =>
        mergeRemoteDevToolsEvents(prev, nextEvents, maxEvents),
      );
      setConnectionInfo((prev) => ({ ...prev, lastEventAt: safeTimestamp() }));
    },
    [maxEvents],
  );

  const closeWebSocket = useCallback(
    (errorMessage?: string, preserveConnectionState = false) => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      shouldReconnectRef.current = false;
      setConnectionInfo((prev) => ({
        ...prev,
        connected: false,
        reconnecting: false,
        lastError: preserveConnectionState ? prev.lastError : errorMessage,
      }));

      if (!preserveConnectionState) {
        clearReconnect();
        reconnectAttemptsRef.current = 0;
      }
    },
    [clearReconnect],
  );

  const parseAndAppendEvents = useCallback(
    (rawData: unknown, fallbackSessionId: string) => {
      const candidates = Array.isArray(rawData) ? rawData : [rawData];
      const normalized = candidates
        .map((candidate) =>
          normalizeRemoteDevToolsEvent(candidate, fallbackSessionId),
        )
        .filter((event): event is RemoteDevToolsEvent => Boolean(event));

      if (normalized.length === 0) {
        return 0;
      }

      appendEvents(normalized);
      setConnectionInfo((prev) => ({ ...prev, lastError: undefined }));

      appendActivity(
        "debug",
        `${normalized.length}건 이벤트 수신`,
        `session=${fallbackSessionId}`,
        fallbackSessionId,
      );

      return normalized.length;
    },
    [appendEvents, appendActivity],
  );

  const connectWebSocket = useCallback(
    async (sessionId: string | null) => {
      if (!isFeatureEnabled || !sessionId || !isLiveMode) {
        return;
      }

      if (wsRef.current) {
        closeWebSocket(undefined, true);
      }

      const wsUrl = buildRemoteDevToolsWsUrl(sessionId);
      if (!wsUrl) {
        appendActivity(
          "warning",
          "WebSocket URL이 설정되지 않아 연결할 수 없습니다.",
          `session=${sessionId}`,
          sessionId,
        );
        setConnectionInfo((prev) => ({
          ...prev,
          connected: false,
          reconnecting: false,
          lastError: "WebSocket URL이 설정되지 않았습니다.",
        }));
        return;
      }

      shouldReconnectRef.current = true;
      clearReconnect();

      appendActivity(
        "info",
        "WebSocket 연결 시도",
        `session=${sessionId}`,
        sessionId,
      );

      try {
        const socket = new window.WebSocket(wsUrl);
        wsRef.current = socket;

        socket.onopen = () => {
          reconnectAttemptsRef.current = 0;
          appendActivity(
            "success",
            "실시간 연결됨",
            `session=${sessionId}`,
            sessionId,
          );
          setConnectionInfo((prev) => ({
            ...prev,
            connected: true,
            reconnecting: false,
            reconnectAttempts: 0,
            lastError: undefined,
            lastConnectedAt: safeTimestamp(),
          }));
        };

        socket.onmessage = (event) => {
          if (!isMountedRef.current) {
            return;
          }

          let parsed: unknown;
          try {
            parsed = JSON.parse(event.data);
          } catch {
            parsed = event.data;
          }

          const receivedCount = parseAndAppendEvents(parsed, sessionId);
          if (receivedCount === 0) {
            appendActivity(
              "debug",
              "빈 이벤트 데이터 수신",
              `session=${sessionId}`,
              sessionId,
            );
          }
        };

        socket.onclose = (socketEvent) => {
          if (!isMountedRef.current || !shouldReconnectRef.current) {
            return;
          }

          setConnectionInfo((prev) => ({
            ...prev,
            connected: false,
            reconnecting: false,
            lastError: socketEvent.wasClean
              ? "실시간 연결이 종료되었습니다."
              : `실시간 연결이 예기치 않게 종료되었습니다. (code: ${socketEvent.code})`,
          }));
          appendActivity(
            socketEvent.wasClean ? "warning" : "error",
            "실시간 연결 종료",
            socketEvent.reason ||
              `code=${socketEvent.code}, clean=${socketEvent.wasClean}`,
            sessionId,
          );

          scheduleReconnect();
        };

        socket.onerror = () => {
          appendActivity(
            "error",
            "실시간 연결 오류",
            `session=${sessionId}`,
            sessionId,
          );
          setConnectionInfo((prev) => ({
            ...prev,
            connected: false,
            lastError: "원격 DevTools WebSocket 연결에서 오류가 발생했습니다.",
          }));
        };
      } catch {
        appendActivity(
          "error",
          "WebSocket 생성 실패",
          `session=${sessionId}`,
          sessionId,
        );
        setConnectionInfo((prev) => ({
          ...prev,
          connected: false,
          reconnecting: false,
          lastError: "원격 DevTools WebSocket 연결 실패",
        }));

        if (shouldReconnectRef.current) {
          scheduleReconnect();
        }
      }
    },
    [
      appendActivity,
      clearReconnect,
      closeWebSocket,
      isFeatureEnabled,
      isLiveMode,
      parseAndAppendEvents,
    ],
  );

  connectWebSocketRef.current = connectWebSocket;

  const scheduleReconnect = useCallback(() => {
    const targetSessionId = activeSessionIdRef.current;

    if (
      !shouldReconnectRef.current ||
      !targetSessionId ||
      !isLiveMode ||
      !isFeatureEnabled
    ) {
      return;
    }

    if (reconnectAttemptsRef.current >= RECONNECT_MAX_ATTEMPTS) {
      setConnectionInfo((prev) => ({
        ...prev,
        reconnecting: false,
        lastError: `실시간 연결 재시도 실패(최대 ${RECONNECT_MAX_ATTEMPTS}회). 수동 새로고침 또는 WebSocket URL을 확인하세요.`,
      }));
      shouldReconnectRef.current = false;
      return;
    }

    const delayMs = Math.min(1000 * 2 ** reconnectAttemptsRef.current, 20_000);
    reconnectAttemptsRef.current += 1;

    appendActivity(
      "info",
      "실시간 연결이 끊어져 재연결을 예약했습니다.",
      `지연 ${delayMs}ms 후 재시도 ${reconnectAttemptsRef.current}회`,
      targetSessionId,
    );

    setConnectionInfo((prev) => ({
      ...prev,
      reconnecting: true,
      reconnectAttempts: reconnectAttemptsRef.current,
    }));

    reconnectTimerRef.current = setTimeout(() => {
      const sessionId = activeSessionIdRef.current;

      if (sessionId) {
        void connectWebSocketRef.current?.(sessionId);
      }
    }, delayMs);
  }, [appendActivity, isFeatureEnabled, isLiveMode]);

  const eventsQuery = useQuery<RemoteDevToolsEvent[], Error>({
    queryKey: ["remoteDevTools", "events", activeSessionId],
    enabled: Boolean(
      isFeatureEnabled &&
      activeSessionId &&
      (isLiveMode ? !connectionInfo.connected : true),
    ),
    queryFn: () => getRemoteDevToolsEvents(activeSessionId as string),
    staleTime: 3_000,
    refetchInterval:
      isFeatureEnabled && activeSessionId && !isLiveMode
        ? EVENTS_FALLBACK_POLLING_MS
        : false,
    select: (events) => mergeRemoteDevToolsEvents([], events, maxEvents),
  });

  useEffect(() => {
    if (!isMountedRef.current) {
      return;
    }

    if (!activeSessionId) {
      setStreamEvents([]);
      return;
    }

    if (isLiveMode && connectionInfo.connected) {
      return;
    }

    const loaded = eventsQuery.data;
    if (loaded) {
      setStreamEvents(mergeRemoteDevToolsEvents([], loaded, maxEvents));
    }
  }, [
    activeSessionId,
    eventsQuery.data,
    isLiveMode,
    connectionInfo.connected,
    maxEvents,
  ]);

  useEffect(() => {
    isMountedRef.current = true;

    if (!isFeatureEnabled || !activeSessionId || !isLiveMode) {
      closeWebSocket(undefined, false);
      setStreamEvents([]);
      return;
    }

    setConnectionInfo((prev) => ({
      ...prev,
      connected: false,
      reconnecting: false,
      reconnectAttempts: 0,
      liveMode: true,
      lastError: undefined,
    }));

    closeWebSocket(undefined, true);
    shouldReconnectRef.current = true;
    void connectWebSocket(activeSessionId);

    return () => {
      closeWebSocket(undefined, false);
    };
  }, [
    activeSessionId,
    isFeatureEnabled,
    isLiveMode,
    closeWebSocket,
    connectWebSocket,
  ]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      closeWebSocket(undefined, false);
      clearReconnect();
    };
  }, [clearReconnect, closeWebSocket]);

  const createSessionMutation = useMutation({
    mutationFn: createRemoteDevToolsSession,
    onSuccess: (session) => {
      void queryClient.invalidateQueries({
        queryKey: ["remoteDevTools", "sessions"],
      });
      setSelectedSessionId(session.id);
      appendActivity(
        "success",
        `세션 생성됨: ${session.name}`,
        `session=${session.id}`,
      );
      message.success(`세션 '${session.name}' 생성됨`);
    },
    onError: (error) => {
      appendActivity("error", "세션 생성 실패", error);
      console.error("Failed to create remote devtools session:", error);
      message.error("새 세션 생성에 실패했습니다.");
    },
  });

  const commandMutation = useMutation({
    mutationFn: ({ sessionId, command, value, payload }: CommandMutationArgs) =>
      controlRemoteDevToolsSession(sessionId, {
        command,
        ...(value !== undefined ? { value } : {}),
        ...(payload !== undefined ? { payload } : {}),
      }),
    onSuccess: (_, { command, sessionId }) => {
      appendActivity(
        "success",
        `명령 전송 완료: ${command}`,
        `session=${sessionId}`,
      );
      message.success(`명령 '${command}' 전송 완료`);
      void queryClient.invalidateQueries({
        queryKey: ["remoteDevTools", "sessions"],
      });
    },
    onError: (error) => {
      appendActivity("error", "명령 전송 실패", error);
      console.error("Failed to send remote devtools command:", error);
      message.error("원격 DevTools 명령 전송에 실패했습니다");
    },
  });

  const sendCommand = useCallback(
    (
      command: RemoteDevToolsCommand,
      options?: { value?: string; payload?: Record<string, unknown> },
    ) => {
      if (!activeSessionId) {
        message.warning("먼저 세션을 선택해 주세요.");
        appendActivity(
          "warning",
          "명령 요청이 거부됨",
          "세션이 선택되지 않았습니다.",
        );
        return;
      }

      if (!isFeatureEnabled) {
        message.warning("Remote DevTools 연동이 비활성화 상태입니다.");
        appendActivity(
          "warning",
          "명령 요청이 거부됨",
          "원격 DevTools 연동 비활성",
        );
        return;
      }

      if (
        doesRemoteDevToolsCommandRequireValue(command) &&
        (!options?.value || !options.value.trim())
      ) {
        message.warning("이 명령은 값이 필요합니다.");
        appendActivity(
          "warning",
          "명령 요청이 거부됨",
          `명령=${command} (값 누락)`,
        );
        return;
      }

      if (activeSession) {
        if (!isRemoteDevToolsCommandAllowed(activeSession.status, command)) {
          message.warning("현재 세션 상태에서 실행할 수 없는 명령입니다.");
          appendActivity(
            "warning",
            "명령 요청이 거부됨",
            `명령=${command}, 상태=${activeSession.status}`,
          );
          return;
        }
      }

      appendActivity(
        "info",
        `명령 요청: ${command}`,
        `session=${activeSessionId}, value=${options?.value || "-"}`,
      );
      commandMutation.mutate({
        sessionId: activeSessionId,
        command,
        value: options?.value,
        payload: options?.payload,
      });
    },
    [
      activeSession,
      activeSessionId,
      appendActivity,
      commandMutation,
      isFeatureEnabled,
    ],
  );

  const setSelectedSession = useCallback(
    (id: string | null) => {
      appendActivity(
        "info",
        id ? `세션 선택: ${id}` : "세션 선택이 해제되었습니다.",
        `session=${id || "none"}`,
      );
      setSelectedSessionId(id);
      setSearchQuery("");
      setStreamEvents([]);
    },
    [appendActivity, setSearchQuery, setSelectedSessionId],
  );

  const clearActivityLog = useCallback(() => {
    setActivityLog([
      {
        id: `activity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: safeTimestamp(),
        sessionId: activeSessionId || undefined,
        level: "info",
        message: "활동 로그를 초기화했습니다.",
        details: `session=${activeSessionId}`,
      },
    ]);
  }, [activeSessionId]);

  const clearEvents = useCallback(() => {
    appendActivity(
      "info",
      "이벤트 목록을 초기화했습니다.",
      `session=${activeSessionId}`,
    );
    setStreamEvents([]);
    setConnectionInfo((prev) => ({
      ...prev,
      lastError: undefined,
    }));
  }, [appendActivity, activeSessionId]);

  const reconnectNow = useCallback(() => {
    if (!isFeatureEnabled) {
      message.warning("Remote DevTools 연동이 비활성화 상태입니다.");
      appendActivity(
        "warning",
        "재연결 요청이 거부됨",
        "원격 DevTools 연동 비활성",
      );
      return;
    }

    if (!activeSessionId) {
      message.warning("먼저 세션을 선택해 주세요.");
      return;
    }

    if (!isLiveMode) {
      message.info(
        "실시간 모드가 비활성화되어 있습니다. 먼저 실시간 모드를 켜주세요.",
      );
      appendActivity(
        "warning",
        "재연결 요청이 거부됨",
        "실시간 모드 비활성 상태",
      );
      return;
    }

    appendActivity(
      "info",
      "재연결을 수동으로 실행합니다.",
      `session=${activeSessionId}`,
    );
    reconnectAttemptsRef.current = 0;
    shouldReconnectRef.current = true;
    closeWebSocket(undefined, true);
    setConnectionInfo((prev) => ({
      ...prev,
      reconnecting: true,
      reconnectAttempts: 0,
      lastError: undefined,
    }));
    void connectWebSocket(activeSessionId);
  }, [
    activeSessionId,
    appendActivity,
    closeWebSocket,
    connectWebSocket,
    isFeatureEnabled,
    isLiveMode,
  ]);

  const filteredEvents = useMemo(() => {
    const query = createSearchMatcher(searchQuery);

    return streamEvents.filter((event) => {
      if (levelFilter !== "all" && event.level !== levelFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      const searchable = [
        event.type,
        event.source,
        event.message,
        stringifyPayload(event.payload),
      ]
        .filter(Boolean)
        .join(" ");

      return searchable.toLowerCase().includes(query);
    });
  }, [streamEvents, levelFilter, searchQuery]);

  const eventLevelSummary = useMemo(() => {
    const summary = {
      total: filteredEvents.length,
      info: 0,
      warn: 0,
      error: 0,
      debug: 0,
    };

    for (const event of filteredEvents) {
      summary[event.level] += 1;
    }

    return summary;
  }, [filteredEvents]);

  const eventsNewestFirst = useMemo(
    () =>
      [...filteredEvents].sort((a, b) =>
        parseRemoteDevToolsTimestamp(b.timestamp).localeCompare(
          parseRemoteDevToolsTimestamp(a.timestamp),
        ),
      ),
    [filteredEvents],
  );

  const latestEvent = eventsNewestFirst[0];

  return {
    isFeatureEnabled,
    sessions,
    sessionsFiltered: filteredSessions,
    activeSessionId,
    selectedSession: activeSession,
    setSelectedSession,

    isSessionsLoading: sessionsQuery.isLoading,
    isSessionsError: sessionsQuery.isError,
    sessionsError: sessionsQuery.error,
    sessionListRefetch: sessionsQuery.refetch,
    setSessionSearchQuery,
    sessionStatusFilter,
    setSessionStatusFilter,

    events: eventsNewestFirst,
    eventsQuery,
    isEventsLoading: eventsQuery.isLoading,
    eventsRefetch: eventsQuery.refetch,

    isLiveMode,
    setLiveMode,
    connectionInfo,
    activityLog,
    clearActivityLog,

    setSearchQuery,
    setLevelFilter,

    eventLevelSummary,
    latestEvent,
    filteredSessionCount: filteredSessions.length,
    totalSessionCount: sessions.length,

    createSession: createSessionMutation.mutate,
    isCreatingSession: createSessionMutation.isPending,

    clearEvents,
    reconnectNow,

    sendCommand,
    isCommandRunning: commandMutation.isPending,

    connectionUrl: activeSessionId
      ? buildRemoteDevToolsWsUrl(activeSessionId)
      : "",
    eventSearchQuery: searchQuery,
    eventLevelFilter: levelFilter,
  };
}
