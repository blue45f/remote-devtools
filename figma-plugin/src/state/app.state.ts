/**
 * 애플리케이션 전역 상태 관리
 */

import { ApiClient } from '../api/ApiClient'
import { PluginUser, DOMElements, SessionInfo, TicketInfo } from '../types'

class AppState {
  // API 클라이언트
  apiClient: ApiClient | null = null
  
  // 연결 상태
  isConnected = false
  
  // 서버 연결 전에 받은 유저 정보 저장
  pendingUser: PluginUser | null = null
  
  // 선택된 디바이스 ID
  selectedDeviceId: string | null = null
  
  // 녹화 세션 리스트
  sessions: SessionInfo[] = []
  
  // 티켓 리스트
  tickets: TicketInfo[] = []
  
  // 현재 활성 티켓 (캡처를 위해 선택된 티켓)
  activeTicket: TicketInfo | null = null
  
  // 마지막 활성 탭 (localStorage 대신 메모리 사용)
  lastActiveTab: string = 'tickets'
  
  // DOM 요소
  elements: DOMElements = {
    messageContainer: null,
    deviceSection: null,
    sessionsSection: null,
    ticketsSection: null,
  }

  /**
   * DOM 요소 초기화
   */
  initializeElements() {
    this.elements = {
      messageContainer: document.getElementById('messageContainer') as HTMLDivElement | null,
      deviceSection: document.getElementById('deviceSection') as HTMLDivElement | null,
      sessionsSection: document.getElementById('sessionsSection') as HTMLDivElement | null,
      ticketsSection: document.getElementById('ticketsSection') as HTMLDivElement | null,
    }
    
    console.log('[AppState] DOM 요소 초기화:', {
      messageContainer: !!this.elements.messageContainer,
      deviceSection: !!this.elements.deviceSection,
      sessionsSection: !!this.elements.sessionsSection,
      ticketsSection: !!this.elements.ticketsSection,
    })
  }

  /**
   * API 클라이언트 설정
   */
  setApiClient(client: ApiClient) {
    this.apiClient = client
  }

  /**
   * 연결 상태 업데이트
   */
  setConnected(status: boolean) {
    this.isConnected = status
  }

  /**
   * 대기 중인 사용자 정보 설정
   */
  setPendingUser(user: PluginUser | null) {
    this.pendingUser = user
  }

  /**
   * 대기 중인 사용자 정보 초기화
   */
  clearPendingUser() {
    this.pendingUser = null
  }

  /**
   * 선택된 디바이스 설정
   */
  setSelectedDevice(deviceId: string | null) {
    this.selectedDeviceId = deviceId
  }

  /**
   * 녹화 세션 리스트 설정
   */
  setSessions(sessions: SessionInfo[]) {
    this.sessions = sessions
  }

  /**
   * 티켓 리스트 설정
   */
  setTickets(tickets: TicketInfo[]) {
    this.tickets = tickets
  }

  /**
   * 활성 티켓 설정 (캡처를 위해 선택된 티켓)
   */
  setActiveTicket(ticket: TicketInfo | null) {
    this.activeTicket = ticket
  }

  /**
   * 활성 티켓 가져오기
   */
  getActiveTicket(): TicketInfo | null {
    return this.activeTicket
  }
}

// 싱글톤 인스턴스
export const appState = new AppState()
