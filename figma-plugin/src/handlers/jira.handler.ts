/**
 * JIRA 이슈 관련 핸들러
 */

import type { AppState } from '../types'

/**
 * 선택된 영역을 캡처하여 JIRA에 업로드
 */
export function handleCaptureForJira(appState: AppState, issueId: string) {
  if (!issueId) {
    alert('JIRA 이슈 ID를 입력해주세요 (예: ORDERWEB-4345)')
    return
  }

  // 피그마에 캡처 요청
  parent.postMessage(
    {
      pluginMessage: {
        type: 'capture-selection',
        issueId,
      },
    },
    '*',
  )
}

/**
 * 캡처 완료 후 JIRA에 업로드
 */
export async function handleCaptureComplete(
  appState: AppState,
  data: { dataURL: string; issueId: string; fileName: string },
) {
  try {
    if (!appState.apiClient) {
      throw new Error('API 클라이언트가 초기화되지 않았습니다')
    }

    // dataURL을 Blob으로 변환
    const response = await fetch(data.dataURL)
    const blob = await response.blob()

    // FormData 생성
    const formData = new FormData()
    formData.append('image', blob, data.fileName)
    formData.append('issueId', data.issueId)

    // External server로 업로드
    const uploadResponse = (await appState.apiClient.uploadImageToJira(data.issueId, formData)) as {
      success: boolean
      message?: string
    }

    if (uploadResponse.success) {
      // 성공 메시지
      parent.postMessage(
        {
          pluginMessage: {
            type: 'notify',
            message: `✅ JIRA ${data.issueId}에 이미지가 업로드되었습니다!`,
            timeout: 3000,
          },
        },
        '*',
      )
    } else {
      throw new Error(uploadResponse.message || '업로드 실패')
    }
  } catch (error) {
    console.error('JIRA 업로드 실패:', error)
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다'

    parent.postMessage(
      {
        pluginMessage: {
          type: 'notify',
          message: `❌ JIRA 업로드 실패: ${errorMessage}`,
          timeout: 5000,
        },
      },
      '*',
    )
  }
}

/**
 * JIRA 관련 이벤트 리스너 초기화
 */
export function initJiraHandlers(appState: AppState) {
  // 메시지 리스너 등록 - 캡처 완료 이벤트 처리
  window.addEventListener('message', (event) => {
    const { type, data } = event.data.pluginMessage || {}

    if (type === 'capture-complete') {
      handleCaptureComplete(appState, data)
    }
  })
}
