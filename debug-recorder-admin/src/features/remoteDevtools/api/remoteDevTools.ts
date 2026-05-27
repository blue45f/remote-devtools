import { apiClient } from "@/shared/api";
import { type ApiResponse, isApiError, isApiSuccess } from "@/shared/types";
import type {
  RemoteDevToolsCommandPayload,
  RemoteDevToolsEvent,
  RemoteDevToolsSession,
  RemoteDevToolsSessionHistory,
} from "../types";
import { CONFIG } from "@/shared/constants";

type WrappedResponse<T> = ApiResponse<T> | T;

const API_BASE = CONFIG.REMOTE_DEVTOOLS_API_BASE;

const parseApiResponse = <T>(response: WrappedResponse<T>): T => {
  if (!response || typeof response !== "object") {
    return response as T;
  }

  const wrappedResponse = response as ApiResponse<T>;

  if (isApiSuccess(wrappedResponse)) {
    return wrappedResponse.data;
  }

  if (isApiError(wrappedResponse)) {
    const error = wrappedResponse.error;
    throw new Error(error.message || "원격 DevTools 응답이 유효하지 않습니다.");
  }

  return response as T;
};

export async function getRemoteDevToolsSessions(): Promise<
  RemoteDevToolsSession[]
> {
  const response = await apiClient.get<
    WrappedResponse<RemoteDevToolsSession[]>
  >(`${API_BASE}/sessions`);
  return parseApiResponse(response);
}

export async function getRemoteDevToolsEvents(
  sessionId: string,
): Promise<RemoteDevToolsEvent[]> {
  const response = await apiClient.get<
    WrappedResponse<RemoteDevToolsSessionHistory>
  >(`${API_BASE}/sessions/${encodeURIComponent(sessionId)}/events`);

  const data = parseApiResponse(response);
  return data.events;
}

export async function controlRemoteDevToolsSession(
  sessionId: string,
  payload: RemoteDevToolsCommandPayload,
): Promise<void> {
  const response = await apiClient.post<WrappedResponse<{ ok: boolean }>>(
    `${API_BASE}/sessions/${encodeURIComponent(sessionId)}/commands`,
    payload,
  );

  parseApiResponse(response);
  return;
}

export async function createRemoteDevToolsSession(): Promise<RemoteDevToolsSession> {
  const response = await apiClient.post<WrappedResponse<RemoteDevToolsSession>>(
    `${API_BASE}/sessions`,
    {},
  );
  return parseApiResponse(response);
}
