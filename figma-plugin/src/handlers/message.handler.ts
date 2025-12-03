/**
 * 피그마 플러그인 메시지 핸들러
 */

import { PluginMessage, PluginUser } from '../types'
import { registerUserAndFetchDevices } from '../services/api.service'

/**
 * 메시지 핸들러 초기화
 */
export function initializeMessageHandler() {
  window.onmessage = async (event) => {
    const msg = event.data.pluginMessage as PluginMessage
    if (!msg) return

    switch (msg.type) {
      case 'user-info': {
        const userData = msg.data as PluginUser | null
        if (!userData) break

        // 서버에 사용자 등록 및 디바이스 정보 조회
        await registerUserAndFetchDevices(userData)
        break
      }
    }
  }
}

/**
 * 피그마에 사용자 정보 요청
 */
export function requestUserInfo() {
  parent.postMessage({ pluginMessage: { type: 'get-user-info' } }, '*')
}
