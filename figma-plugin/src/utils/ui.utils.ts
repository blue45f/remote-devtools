/**
 * UI 유틸리티 함수
 */

import { MESSAGE_TIMEOUT } from '../config/constants'
import { appState } from '../state/app.state'
import { ApiResponse } from '../types'

/**
 * HTML 텍스트 콘텐츠 이스케이프
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * HTML 속성값 이스케이프
 */
function escapeHtmlAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/'/g, '&#39;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * 메시지 표시
 */
export function showMessage(text: string, type: 'success' | 'error' | 'info' = 'info') {
  if (!appState.elements.messageContainer) return

  const message = document.createElement('div')
  message.className = `message ${type}`
  message.textContent = text
  appState.elements.messageContainer.innerHTML = ''
  appState.elements.messageContainer.appendChild(message)

  setTimeout(() => message.remove(), MESSAGE_TIMEOUT)
}

/**
 * 디바이스 정보 표시
 */
export function showDeviceInfo(response: ApiResponse) {
  console.log('[showDeviceInfo] 호출됨', response)

  if (!response || !appState.elements.deviceSection) {
    console.log('[showDeviceInfo] 조건 불충족', {
      response: response,
      deviceSection: appState.elements.deviceSection,
    })
    return
  }

  const devices = response.devices || []

  // .device-info 요소 찾기 (deviceSection 안에 있는)
  const deviceInfoElement = appState.elements.deviceSection.querySelector('.device-info')
  if (!deviceInfoElement) {
    console.log('[showDeviceInfo] device-info 요소를 찾을 수 없음')
    return
  }

  console.log('[showDeviceInfo] 디바이스 목록:', devices)

  // 디바이스 목록 HTML
  let devicesHtml = '<div class="device-list">'

  if (devices.length > 0) {
    devicesHtml += '<ul class="device-list-items">'
    devices.forEach((device) => {
      const deviceName = device.name || '이름 없음'
      const isSelected = appState.selectedDeviceId === device.deviceId
      devicesHtml += `
        <li class="device-item ${isSelected ? 'selected' : ''}" data-device-id="${escapeHtmlAttr(device.deviceId)}">
          <strong>${escapeHtml(deviceName)}</strong>
          <span class="device-id">${escapeHtml(device.deviceId)}</span>
        </li>
      `
    })
    devicesHtml += '</ul>'
  } else {
    devicesHtml += '<p>등록된 디바이스가 없습니다.</p>'
  }

  devicesHtml += '</div>'

  // DOM 업데이트 - device-info div 안에만 내용 추가
  deviceInfoElement.innerHTML = devicesHtml
  appState.elements.deviceSection.style.display = 'block'

  console.log('[showDeviceInfo] 디바이스 섹션 표시 완료, display:', appState.elements.deviceSection.style.display)
}

/**
 * 녹화 세션 리스트 표시
 */
export function showSessions() {
  console.log('[showSessions] 호출, sessionsSection:', !!appState.elements.sessionsSection)
  console.log('[showSessions] 녹화 세션 개수:', appState.sessions.length)

  if (!appState.elements.sessionsSection) {
    console.log('[showSessions] sessionsSection이 없음')
    return
  }

  const sessions = appState.sessions

  // 탭 배지 업데이트 - 직접 DOM 조작
  const sessionsBadge = document.getElementById('sessionsBadge')
  if (sessionsBadge) {
    if (sessions.length > 0) {
      sessionsBadge.textContent = sessions.length.toString()
      sessionsBadge.style.display = 'inline-block'
    } else {
      sessionsBadge.style.display = 'none'
    }
  }

  let html = '<div class="sessions-container">'

  if (sessions.length > 0) {
    html += '<ul class="sessions-list">'
    sessions.forEach((session) => {
      const createdDate = new Date(session.createdAt).toLocaleString('ko-KR')
      html += `
        <li class="session-item" data-session-name="${escapeHtmlAttr(session.sessionName)}" style="cursor: pointer;">
          <div class="session-name">${escapeHtml(session.sessionName)}</div>
          <div class="session-meta">
            <span class="session-date">${createdDate}</span>
            ${session.recordMode ? '<span class="session-badge">녹화</span>' : ''}
          </div>
        </li>
      `
    })
    html += '</ul>'
  } else {
    html += '<p class="empty-message">생성된 녹화 세션이 없습니다.</p>'
  }

  html += '</div>'

  appState.elements.sessionsSection.innerHTML = html

  console.log('[showSessions] HTML 설정 완료')
  console.log('[showSessions] innerHTML:', appState.elements.sessionsSection.innerHTML.substring(0, 100))
}

/**
 * 티켓 리스트 표시
 */
export function showTickets() {
  console.log('[showTickets] 호출, ticketsSection:', !!appState.elements.ticketsSection)
  console.log('[showTickets] 티켓 개수:', appState.tickets.length)

  if (!appState.elements.ticketsSection) {
    console.log('[showTickets] ticketsSection이 없음')
    return
  }

  const tickets = appState.tickets
  const activeTicket = appState.getActiveTicket()

  // 탭 배지 업데이트 - 직접 DOM 조작
  const ticketsBadge = document.getElementById('ticketsBadge')
  if (ticketsBadge) {
    if (tickets.length > 0) {
      ticketsBadge.textContent = tickets.length.toString()
      ticketsBadge.style.display = 'inline-block'
    } else {
      ticketsBadge.style.display = 'none'
    }
  }

  let html = '<div class="tickets-container">'

  if (tickets.length > 0) {
    html += '<ul class="tickets-list">'
    tickets.forEach((ticket) => {
      const isActive = activeTicket?.id === ticket.id

      html += `
        <li class="ticket-item ${isActive ? 'active' : ''}" 
            data-session-name="${escapeHtmlAttr(ticket.sessionName)}" 
            data-ticket-id="${ticket.id}">
          <div class="ticket-content">
            <div class="ticket-selector" title="티켓 활성화">
              <div class="selector-circle ${isActive ? 'selected' : ''}"></div>
            </div>
            <div class="ticket-title-wrapper">
              <a href="${escapeHtmlAttr(ticket.ticketUrl)}" target="_blank" class="ticket-link" title="${escapeHtmlAttr(ticket.title || ticket.jiraProjectKey)}">
                ${escapeHtml(ticket.title || ticket.jiraProjectKey)}
              </a>
            </div>
            <button class="ticket-image-btn" data-session-name="${escapeHtmlAttr(ticket.sessionName)}" title="이미지 불러오기">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            </button>
          </div>
          ${
            isActive
              ? `
          <div class="ticket-upload-section">
            <button class="upload-selection-btn" data-ticket-id="${ticket.id}">
              현재 선택된 항목 티켓에 업로드하기
            </button>
            <div class="drop-zone" data-ticket-id="${ticket.id}">
              <p class="drop-zone-text">티켓에 첨부할 이미지를 여기에 드래그하세요</p>
              <p class="drop-zone-hint">PNG, JPG 파일 지원 (최대 20MB)</p>
            </div>
          </div>
        `
              : ''
          }
        </li>
      `
    })
    html += '</ul>'
  } else {
    html += '<p class="empty-message">생성된 티켓이 없습니다.</p>'
  }

  html += '</div>'

  appState.elements.ticketsSection.innerHTML = html

  console.log('[showTickets] HTML 설정 완료')
  console.log('[showTickets] innerHTML:', appState.elements.ticketsSection.innerHTML.substring(0, 100))
}
