/**
 * 디바이스 관련 이벤트 핸들러
 */

import { selectDevice } from '../services/device.service'
import { showSessions, showTickets } from '../utils/ui.utils'

/**
 * 디바이스 클릭 이벤트 처리
 */
export function handleDeviceClick(event: Event) {
  const target = event.target as HTMLElement
  const deviceItem = target.closest('.device-item') as HTMLElement

  if (!deviceItem) return

  const deviceId = deviceItem.dataset.deviceId
  if (!deviceId) return
  
  console.log('[handleDeviceClick] 디바이스 클릭:', deviceId)

  // 이전 선택 제거
  const previousSelected = document.querySelector('.device-item.selected')
  if (previousSelected) {
    previousSelected.classList.remove('selected')
  }

  // 새로운 선택 추가
  deviceItem.classList.add('selected')

  // 디바이스 선택 및 데이터 로드
  selectDevice(deviceId)
    .then(() => {
      console.log('[handleDeviceClick] selectDevice 완료, UI 업데이트 시작')
      // 녹화 세션과 티켓 표시
      showSessions()
      showTickets()
      console.log('[handleDeviceClick] UI 업데이트 완료')
    })
    .catch(error => {
      console.error('[handleDeviceClick] 에러:', error)
    })
}

/**
 * 디바이스 관련 이벤트 리스너 초기화
 */
export function initializeDeviceHandlers() {
  // 디바이스 섹션에 이벤트 위임 사용
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement
    if (target.closest('.device-item')) {
      handleDeviceClick(event)
    }
  })
}
