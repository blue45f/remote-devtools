/**
 * 피그마 플러그인 타입 정의
 */

import type { ApiClient } from '../api/ApiClient'

export interface PluginUser {
  id: string
  name: string
  email?: string
  photoUrl?: string
  color?: {
    r: number
    g: number
    b: number
    a: number
  }
}

export interface PluginMessage {
  type: string
  data?: unknown
}

export interface DeviceInfo {
  id: number
  deviceId: string
  name: string | null
  createdAt: Date
  updatedAt: Date
}

export interface ApiResponse {
  success: boolean
  user?: {
    id: number
    name: string
    username: string
    empNo: string
    slackId: string
    jobType: string
  }
  devices?: DeviceInfo[]
  error?: string
}

export interface DOMElements {
  messageContainer: HTMLDivElement | null
  deviceSection: HTMLDivElement | null
  sessionsSection: HTMLDivElement | null
  ticketsSection: HTMLDivElement | null
}

// 녹화 세션 타입
export interface SessionInfo {
  id: number
  sessionName: string
  recordMode: boolean
  recordId: number | null
  userInfoFound: boolean
  slackMessageSent: boolean
  slackUserId: string | null
  username: string | null
  userDisplayName: string | null
  createdAt: Date
}

// 티켓 타입
export interface TicketInfo {
  id: number
  sessionName: string
  ticketUrl: string
  jiraProjectKey: string
  title?: string
  assignee: string | null
  parentEpic: string | null
  components: string[]
  labels: string[]
  createdAt: Date
}

// AppState 타입
export interface AppState {
  apiClient: ApiClient | null
  isConnected: boolean
  pendingUser: PluginUser | null
  selectedDeviceId: string | null
  sessions: SessionInfo[]
  tickets: TicketInfo[]
  activeTicket: TicketInfo | null
  elements: DOMElements
  initializeElements(): void
  setApiClient(client: ApiClient): void
  setConnected(status: boolean): void
  setPendingUser(user: PluginUser | null): void
  clearPendingUser(): void
  setSelectedDevice(deviceId: string | null): void
  setSessions(sessions: SessionInfo[]): void
  setTickets(tickets: TicketInfo[]): void
  setActiveTicket(ticket: TicketInfo | null): void
  getActiveTicket(): TicketInfo | null
}