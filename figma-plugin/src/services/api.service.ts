/**
 * API 서비스 - 서버와의 통신 담당
 */

import { ApiClient, UserInfo } from '../api/ApiClient'
import { API_BASE_URL, RETRY_DELAY } from '../config/constants'
import { appState } from '../state/app.state'
import { PluginUser, ApiResponse } from '../types'
import { extractKoreanName } from '../utils/helpers'
import { showMessage, showDeviceInfo } from '../utils/ui.utils'

/**
 * 서버 연결
 */
export async function connectToServer(): Promise<void> {
  try {
    const client = new ApiClient(API_BASE_URL)
    const connected = await client.testConnection()

    if (connected) {
      appState.setApiClient(client)
      appState.setConnected(true)

      // 서버 연결 후 대기 중인 유저 정보가 있으면 처리
      if (appState.pendingUser) {
        await registerUserAndFetchDevices(appState.pendingUser)
        appState.clearPendingUser()
      }
    } else {
      throw new Error('Connection test failed')
    }
  } catch (error) {
    appState.setConnected(false)
    console.error('서버 연결 실패:', error)
    // 재시도
    setTimeout(connectToServer, RETRY_DELAY)
  }
}

/**
 * 사용자 정보를 서버에 등록하고 디바이스 정보 조회
 */
export async function registerUserAndFetchDevices(user: PluginUser): Promise<void> {
  console.log('[registerUserAndFetchDevices] 시작:', user)

  // 서버 연결이 안 되어 있으면 대기
  if (!appState.apiClient || !appState.isConnected) {
    console.log('[registerUserAndFetchDevices] 서버 연결 대기 중')
    appState.setPendingUser(user)
    return
  }

  try {
    // username 추출 (한글 이름 우선)
    const username = extractKoreanName(user.name)

    if (!username) {
      console.log('한글 이름을 추출할 수 없습니다:', user.name)
      return
    }

    // API 호출
    const response = (await appState.apiClient.registerUser({
      id: user.id,
      name: user.name,
      username,
      photoUrl: user.photoUrl,
      color: user.color,
    } as UserInfo)) as ApiResponse

    console.log('[registerUserAndFetchDevices] API 응답:', response)

    // 디바이스 정보 표시
    if (response?.success && response?.devices) {
      console.log('[registerUserAndFetchDevices] 디바이스 정보 표시 시도, 디바이스 개수:', response.devices.length)
      showDeviceInfo(response)
    } else {
      console.log('[registerUserAndFetchDevices] 응답에 디바이스 정보 없음', {
        success: response?.success,
        devices: response?.devices,
        error: response?.error,
      })

      // username이 필요한 경우 처리
      if (response?.error === 'username-required') {
        console.log('[registerUserAndFetchDevices] username 입력 필요')
        // TODO: UI에서 username 입력받기
      }
    }
  } catch (error) {
    console.error('사용자 등록 실패:', error)
    showMessage('사용자 정보 처리 실패', 'error')
  }
}
