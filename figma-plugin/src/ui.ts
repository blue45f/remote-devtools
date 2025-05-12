/**
 * 피그마 플러그인 UI 메인 엔트리 포인트
 */

import { API_BASE_URL } from './config/constants'
import { initializeDeviceHandlers } from './handlers/device.handler'
import { initJiraHandlers } from './handlers/jira.handler'
import { initializeMessageHandler, requestUserInfo } from './handlers/message.handler'
import { initializeRoomHandlers } from './handlers/room.handler'
import { connectToServer } from './services/api.service'
import { appState } from './state/app.state'

/**
 * 애플리케이션 초기화
 */
function initialize() {
  // DOM 요소 초기화
  appState.initializeElements()

  // 환경 정보 표시
  displayEnvironmentInfo()

  // 탭 기능 초기화
  initializeTabs()

  // 메시지 핸들러 설정
  initializeMessageHandler()

  // 디바이스 핸들러 설정
  initializeDeviceHandlers()

  // 녹화 세션/티켓 핸들러 설정
  initializeRoomHandlers()

  // JIRA 핸들러 설정
  initJiraHandlers(appState)

  // 피그마에 사용자 정보 요청
  requestUserInfo()

  // 서버 연결 시작
  void connectToServer()
}

/**
 * 환경 정보 표시 (로컬 개발 환경에서만)
 */
function displayEnvironmentInfo() {
  const envInfo = document.getElementById('environment-info')
  if (!envInfo) return

  const isProduction = !API_BASE_URL.includes('localhost')

  // 프로덕션 환경이면 환경 정보 섹션 완전히 숨기기
  if (isProduction) {
    envInfo.style.display = 'none'
    return
  }

  // 로컬 개발 환경에서만 표시
  envInfo.style.display = 'block'
  envInfo.style.background = '#fff3cd'

  const envMode = document.getElementById('env-mode')
  const envUrl = document.getElementById('env-url')

  if (envMode && envUrl) {
    envMode.textContent = '💻 로컬 개발'
    envMode.style.color = '#6c757d'
    envUrl.textContent = API_BASE_URL
  }
}

/**
 * 탭 기능 초기화
 */
function initializeTabs() {
  const tabButtons = document.querySelectorAll('.tab-button')
  const tabContents = document.querySelectorAll('.tab-content')

  // 탭 클릭 이벤트 처리
  tabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const targetTab = button.getAttribute('data-tab')

      // 모든 탭 버튼과 컨텐츠 비활성화
      tabButtons.forEach((btn) => btn.classList.remove('active'))
      tabContents.forEach((content) => content.classList.remove('active'))

      // 선택한 탭 활성화
      button.classList.add('active')
      const targetContent = document.getElementById(`${targetTab}TabContent`)
      if (targetContent) {
        targetContent.classList.add('active')
      }

      // Figma 플러그인에서는 localStorage 사용 불가
      // 대신 메모리에 저장 (세션 동안만 유지)
      appState.lastActiveTab = targetTab || 'tickets'
    })
  })

  // 기본 탭 설정 (tickets)
  const defaultTab = appState.lastActiveTab || 'tickets'
  const tabButton = document.querySelector(`.tab-button[data-tab="${defaultTab}"]`)
  if (tabButton instanceof HTMLElement) {
    tabButton.click()
  }
}

// updateTabBadges 함수는 더 이상 사용하지 않음
// 각 showRooms(), showTickets() 함수에서 직접 DOM 업데이트

// 애플리케이션 시작
initialize()
