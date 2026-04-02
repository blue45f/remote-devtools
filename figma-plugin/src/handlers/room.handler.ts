/**
 * 녹화 세션/티켓 관련 이벤트 핸들러
 */

import { appState } from '../state/app.state'
import { showMessage, showTickets } from '../utils/ui.utils'

// 녹화 세션 상세 응답 타입
interface RoomDetailResponse {
  id: number
  roomName: string
  recordId: number | null
  deviceId: string
  username: string
  createdAt: string
  screenPreviewUrl: string | null
}

// 스크린샷 API 응답 타입
interface ScreenshotResponse {
  dataURL: string
}

/**
 * 녹화 세션/티켓 클릭 이벤트 처리 - roomName만 사용
 */
async function handleRoomClick(roomName: string): Promise<void> {
  try {
    showMessage(`"${roomName}" 이미지를 가져오는 중...`)

    if (!appState.apiClient) {
      showMessage('API 클라이언트가 초기화되지 않았습니다', 'error')
      return
    }

    // 녹화 세션 상세 정보 가져오기 (roomName으로 조회)
    const roomDetail = (await appState.apiClient.getSessionDetail(roomName)) as RoomDetailResponse

    if (roomDetail.screenPreviewUrl) {
      // screenPreviewUrl이 API 엔드포인트인 경우 ApiClient를 통해 dataURL 가져오기
      let imageDataUrl = roomDetail.screenPreviewUrl

      if (!roomDetail.screenPreviewUrl.startsWith('data:')) {
        try {
          console.log('Screenshot URL:', roomDetail.screenPreviewUrl)

          // URL에서 recordId 추출 (예: http://localhost:3001/rooms/generate-screenshot?recordId=123)
          const urlParams = new URLSearchParams(roomDetail.screenPreviewUrl.split('?')[1])
          const recordId = urlParams.get('recordId')

          if (recordId) {
            // fullPage 옵션: 전체 페이지 캡처를 기본으로
            const useFullPage = true // 전체 HTML body 캡처
            console.log('Fetching screenshot for recordId:', recordId, `(Full page mode: ${useFullPage})`)
            const screenshotData = (await appState.apiClient.getScreenshot(
              parseInt(recordId),
              useFullPage,
            )) as ScreenshotResponse
            console.log('Screenshot data received:', screenshotData)

            if (screenshotData.dataURL) {
              imageDataUrl = screenshotData.dataURL
              console.log('Using dataURL from API, length:', imageDataUrl.length)
            } else {
              showMessage(`"${roomName}"에 유효한 스크린샷이 없습니다`, 'error')
              return
            }
          } else {
            console.error('No recordId found in URL:', roomDetail.screenPreviewUrl)
            showMessage('스크린샷 URL이 올바르지 않습니다', 'error')
            return
          }
        } catch (fetchError) {
          console.error('스크린샷 fetch 실패:', fetchError)
          showMessage('스크린샷을 가져오는데 실패했습니다', 'error')
          return
        }
      }

      // 피그마에 이미지 추가 요청
      parent.postMessage(
        {
          pluginMessage: {
            type: 'add-image',
            imageUrl: imageDataUrl,
            roomName: roomDetail.roomName,
          },
        },
        '*',
      )
      showMessage(`"${roomName}" 이미지를 피그마에 추가했습니다`)
    } else {
      // screenPreviewUrl이 없는 경우 - recordId가 있으면 직접 스크린샷 API 호출
      if (roomDetail.recordId) {
        try {
          const useFullPage = true // 전체 페이지 캡처
          console.log(
            'No screenPreviewUrl, trying direct screenshot API for recordId:',
            roomDetail.recordId,
            `(Full page mode: ${useFullPage})`,
          )
          const screenshotData = (await appState.apiClient.getScreenshot(
            roomDetail.recordId,
            useFullPage,
          )) as ScreenshotResponse

          if (screenshotData.dataURL) {
            parent.postMessage(
              {
                pluginMessage: {
                  type: 'add-image',
                  dataURL: screenshotData.dataURL,
                  roomName: roomDetail.roomName,
                },
              },
              '*',
            )
            showMessage(`"${roomName}" 이미지를 피그마에 추가했습니다`)
          } else {
            showMessage(`"${roomName}"에 스크린샷이 없습니다`)
          }
        } catch (error) {
          console.error('스크린샷 생성 실패:', error)
          showMessage(`"${roomName}"에 스크린샷이 없습니다`)
        }
      } else {
        showMessage(`"${roomName}"에 스크린샷이 없습니다`)
      }
    }
  } catch (error) {
    console.error('녹화 세션 상세 조회 실패:', error)
    showMessage('녹화 세션 정보를 가져오는데 실패했습니다', 'error')
  }
}

/**
 * 녹화 세션/티켓 관련 이벤트 리스너 초기화
 */
export function initializeRoomHandlers(): void {
  // 이벤트 위임을 사용하여 동적으로 생성된 요소도 처리
  document.addEventListener('click', async (event) => {
    const target = event.target as HTMLElement

    // 녹화 세션 아이템 클릭
    const roomItem = target.closest<HTMLElement>('.room-item')
    if (roomItem && !target.closest('a')) {
      // 링크 클릭은 제외
      event.preventDefault()
      const roomName = roomItem.dataset.roomName || ''
      if (roomName) {
        // 로딩 상태 시작
        roomItem.classList.add('loading')

        try {
          await handleRoomClick(roomName)
        } finally {
          // 로딩 상태 종료
          roomItem.classList.remove('loading')
        }
      }
    }

    // 티켓 선택 영역 클릭
    const ticketSelector = target.closest<HTMLElement>('.ticket-selector')
    if (ticketSelector) {
      event.preventDefault()
      const ticketItem = ticketSelector.closest<HTMLElement>('.ticket-item')
      const ticketId = ticketItem?.dataset.ticketId || ''

      if (ticketId) {
        // 티켓을 활성 상태로 설정 (선택된 UI 표시)
        const ticket = appState.tickets.find((t) => t.id.toString() === ticketId)
        if (ticket) {
          appState.setActiveTicket(ticket)
          // 티켓 리스트 다시 렌더링하여 업로드 버튼 표시
          showTickets()
        }
      }
      return // 더 이상 처리하지 않음
    }

    // 이미지 불러오기 버튼 클릭
    const imageBtn = target.closest<HTMLButtonElement>('.ticket-image-btn')
    if (imageBtn) {
      event.preventDefault()
      event.stopPropagation() // 티켓 아이템 클릭 이벤트 방지

      const roomName = imageBtn.dataset.roomName || ''
      const ticketItemEl = imageBtn.closest<HTMLElement>('.ticket-item')
      const ticketId = ticketItemEl?.dataset.ticketId || ''

      if (roomName && ticketId) {
        // 로딩 상태 시작
        imageBtn.classList.add('loading')

        try {
          // 티켓을 활성 상태로 설정 (선택된 UI 표시)
          const ticket = appState.tickets.find((t) => t.id.toString() === ticketId)
          if (ticket) {
            appState.setActiveTicket(ticket)

            // 티켓 리스트 다시 렌더링하여 업로드 버튼 표시
            showTickets()

            // DOM 재렌더링 후 다시 로딩 클래스 적용
            const newImageBtn = document.querySelector(`.ticket-item[data-ticket-id="${ticketId}"] .ticket-image-btn`)
            if (newImageBtn) {
              newImageBtn.classList.add('loading')
            }
          }

          // 이미지 로드
          await handleRoomClick(roomName)
        } finally {
          // 로딩 상태 종료 - 재렌더링된 요소 찾아서 제거
          const ticket = appState.tickets.find((t) => t.id.toString() === ticketId)
          if (ticket) {
            const newImageBtn = document.querySelector(`.ticket-item[data-ticket-id="${ticketId}"] .ticket-image-btn`)
            if (newImageBtn) {
              newImageBtn.classList.remove('loading')
            }
          }
        }
      }
    }

    // 선택 항목 업로드 버튼 클릭
    const uploadBtn = target.closest<HTMLButtonElement>('.upload-selection-btn')
    if (uploadBtn) {
      event.preventDefault()
      event.stopPropagation()

      const ticketId = uploadBtn.dataset.ticketId || ''
      const ticket = appState.tickets.find((t) => t.id.toString() === ticketId)

      if (ticket) {
        // JIRA 이슈 ID 추출
        const issueIdMatch = ticket.ticketUrl.match(/([A-Z]+-\d+)/)
        const issueId = issueIdMatch ? issueIdMatch[1] : ticket.jiraProjectKey

        if (!issueId) {
          showMessage('JIRA 이슈 ID를 찾을 수 없습니다', 'error')
          return
        }

        // 버튼 비활성화 및 텍스트 변경
        uploadBtn.disabled = true
        const originalText = uploadBtn.textContent
        uploadBtn.textContent = '⏳ 업로드 중...'

        // Figma에 캡처 요청
        parent.postMessage(
          {
            pluginMessage: {
              type: 'capture-for-ticket',
              issueId: issueId,
            },
          },
          '*',
        )

        showMessage(`🎯 Figma에서 캡처할 영역을 선택해주세요`, 'info')

        // 3초 후 버튼 복원
        setTimeout(() => {
          uploadBtn.disabled = false
          uploadBtn.textContent = originalText || '현재 선택된 항목 티켓에 업로드하기'
        }, 3000)
      }
    }
  })

  // 드래그 앤 드롭 이벤트 핸들러 추가
  initDropZoneHandlers()
}

/**
 * 드래그 앤 드롭 이벤트 핸들러 초기화
 */
function initDropZoneHandlers() {
  // 이벤트 위임을 사용하여 동적으로 생성되는 drop-zone 처리
  document.addEventListener('dragover', (event) => {
    const dropZone = (event.target as HTMLElement).closest('.drop-zone')
    if (dropZone) {
      event.preventDefault()
      event.stopPropagation()
      dropZone.classList.add('drag-over')
    }
  })

  document.addEventListener('dragleave', (event) => {
    const dropZone = (event.target as HTMLElement).closest('.drop-zone')
    if (dropZone && !dropZone.contains(event.relatedTarget as Node)) {
      dropZone.classList.remove('drag-over')
    }
  })

  document.addEventListener('drop', async (event) => {
    const dropZone = (event.target as HTMLElement).closest<HTMLElement>('.drop-zone')
    if (!dropZone) return

    event.preventDefault()
    event.stopPropagation()
    dropZone.classList.remove('drag-over')

    const ticketId = dropZone.dataset.ticketId
    const ticket = appState.tickets.find((t) => t.id.toString() === ticketId)

    if (!ticket) {
      showMessage('티켓 정보를 찾을 수 없습니다', 'error')
      return
    }

    // 파일 가져오기
    const files = event.dataTransfer?.files
    if (!files || files.length === 0) {
      showMessage('이미지 파일을 선택해주세요', 'error')
      return
    }

    const file = files[0]

    // 파일 타입 확인
    if (!file.type.startsWith('image/')) {
      showMessage('이미지 파일만 업로드 가능합니다', 'error')
      return
    }

    // 파일 크기 확인 (20MB 제한)
    const maxSize = 20 * 1024 * 1024 // 20MB
    if (file.size > maxSize) {
      showMessage('파일 크기는 20MB 이하여야 합니다', 'error')
      return
    }

    // 업로드 중 UI 표시
    dropZone.classList.add('uploading')
    dropZone.innerHTML = `
      <div class="spinner"></div>
      <p class="drop-zone-text">업로드 중...</p>
    `

    try {
      // JIRA 이슈 ID 추출
      const issueIdMatch = ticket.ticketUrl.match(/([A-Z]+-\d+)/)
      const issueId = issueIdMatch ? issueIdMatch[1] : ticket.jiraProjectKey

      if (!issueId) {
        throw new Error('JIRA 이슈 ID를 찾을 수 없습니다')
      }

      // ApiClient를 사용해 직접 업로드
      if (!appState.apiClient) {
        throw new Error('API 클라이언트가 초기화되지 않았습니다')
      }

      // FormData 생성
      const formData = new FormData()
      formData.append('image', file, file.name)

      // ApiClient의 uploadImageToJira 메서드 사용
      await appState.apiClient.uploadImageToJira(issueId, formData)

      // 성공 UI 표시
      dropZone.classList.remove('uploading')
      dropZone.innerHTML = `
        <div class="drop-zone-success">✅</div>
        <p class="drop-zone-text">업로드 완료!</p>
      `

      showMessage(`📎 이미지가 티켓에 업로드되었습니다`, 'success')

      // 3초 후 원래 상태로 복원
      setTimeout(() => {
        dropZone.innerHTML = `
          <p class="drop-zone-text">티켓에 첨부할 이미지를 여기에 드래그하세요</p>
          <p class="drop-zone-hint">PNG, JPG 파일 지원 (최대 20MB)</p>
        `
      }, 3000)
    } catch (error) {
      console.error('이미지 업로드 실패:', error)
      dropZone.classList.remove('uploading')
      dropZone.innerHTML = `
        <div class="drop-zone-icon">❌</div>
        <p class="drop-zone-text">업로드 실패</p>
        <p class="drop-zone-hint">${error instanceof Error ? error.message : '알 수 없는 오류'}</p>
      `

      showMessage('이미지 업로드에 실패했습니다', 'error')

      // 3초 후 원래 상태로 복원
      setTimeout(() => {
        dropZone.innerHTML = `
          <p class="drop-zone-text">티켓에 첨부할 이미지를 여기에 드래그하세요</p>
          <p class="drop-zone-hint">PNG, JPG 파일 지원 (최대 20MB)</p>
        `
      }, 3000)
    }
  })

  // 클릭으로 파일 선택도 가능하게 처리
  document.addEventListener('click', (event) => {
    const dropZone = (event.target as HTMLElement).closest<HTMLElement>('.drop-zone')
    if (!dropZone || dropZone.classList.contains('uploading')) return

    // 임시 파일 입력 요소 생성
    const fileInput = document.createElement('input')
    fileInput.type = 'file'
    fileInput.accept = 'image/*'

    fileInput.addEventListener('change', async () => {
      const file = fileInput.files?.[0]
      if (!file) return

      // drop 이벤트를 시뮬레이션
      const dropEvent = new DragEvent('drop', {
        dataTransfer: new DataTransfer(),
      })

      const fileList = new DataTransfer()
      fileList.items.add(file)

      // drop 이벤트 디스패치
      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: fileList,
        writable: false,
      })

      dropZone.dispatchEvent(dropEvent)
    })

    fileInput.click()
  })
}
