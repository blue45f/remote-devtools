/**
 * 디바이스 관련 서비스
 */

import { appState } from '../state/app.state'
import { SessionInfo, TicketInfo } from '../types'

/**
 * 디바이스 선택 및 관련 데이터 로드
 */
export async function selectDevice(deviceId: string): Promise<void> {
  console.log('[selectDevice] 디바이스 선택:', deviceId)

  // 이미 선택된 디바이스면 무시
  if (appState.selectedDeviceId === deviceId) {
    console.log('[selectDevice] 이미 선택된 디바이스')
    return
  }

  // 디바이스 선택 상태 업데이트
  appState.setSelectedDevice(deviceId)

  // 녹화 세션과 티켓 데이터 동시에 가져오기
  try {
    console.log('[selectDevice] API 호출 시작')
    const [sessionsResponse, ticketsResponse] = await Promise.all([
      appState.apiClient?.getUserSessions(deviceId),
      appState.apiClient?.getUserTickets(deviceId),
    ])

    console.log('[selectDevice] API 응답:', {
      sessions: sessionsResponse?.sessions?.length || 0,
      tickets: ticketsResponse?.tickets?.length || 0
    })

    // 녹화 세션 데이터 저장
    if (sessionsResponse?.sessions) {
      appState.setSessions(sessionsResponse.sessions as SessionInfo[])
      console.log('[selectDevice] 녹화 세션 저장 완료:', sessionsResponse.sessions.length)
    } else {
      appState.setSessions([])
      console.log('[selectDevice] 녹화 세션 없음')
    }

    // 티켓 데이터 저장
    if (ticketsResponse?.tickets) {
      appState.setTickets(ticketsResponse.tickets as TicketInfo[])
      console.log('[selectDevice] 티켓 저장 완료:', ticketsResponse.tickets.length)
    } else {
      appState.setTickets([])
      console.log('[selectDevice] 티켓 없음')
    }
  } catch (error) {
    console.error('[selectDevice] API 호출 실패:', error)
    appState.setSessions([])
    appState.setTickets([])
  }
}
