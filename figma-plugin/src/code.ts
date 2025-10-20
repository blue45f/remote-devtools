/// <reference types="@figma/plugin-typings" />

// 피그마 플러그인 메인 코드 (Sandbox에서 실행)

// 명령어 처리
if (figma.command === 'show-selection') {
  // 선택 정보만 빠르게 보여주고 종료
  const selection = figma.currentPage.selection
  if (selection.length === 0) {
    figma.notify('선택된 요소가 없습니다')
  } else {
    const info = selection.map((node) => `${node.name} (${node.type})`).join(', ')
    figma.notify(`선택: ${info}`, { timeout: 5000 })
  }
  figma.closePlugin()
} else if (figma.command === 'show-user') {
  // 사용자 정보만 빠르게 보여주고 종료
  const user = figma.currentUser
  if (user) {
    figma.notify(`사용자: ${user.name}`, { timeout: 3000 })
  }
  figma.closePlugin()
} else {
  // 기본 UI 열기 (open 명령 또는 기본 실행)
  figma.showUI(__html__, {
    width: 420,
    height: 720,
    title: 'Remote Debug Tools',
    themeColors: true, // 다크 모드 지원
  })

  figma.ui.resize(420, 720)
}

// Base64 디코딩 함수 (Figma 플러그인 환경에는 atob이 없음)
function base64ToBytes(base64: string): Uint8Array {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='
  const lookup = new Map<string, number>()

  for (let i = 0; i < chars.length; i++) {
    lookup.set(chars[i], i)
  }

  // Remove whitespace and padding
  base64 = base64.replace(/[\s=]+$/g, '')

  // Ensure proper padding
  while (base64.length % 4 !== 0) {
    base64 += '='
  }

  const len = base64.length
  const bufferLength = (len * 3) / 4 - (base64[len - 1] === '=' ? 1 : 0) - (base64[len - 2] === '=' ? 1 : 0)
  const bytes = new Uint8Array(bufferLength)

  let p = 0
  for (let i = 0; i < len; i += 4) {
    const encoded1 = lookup.get(base64[i]) || 0
    const encoded2 = lookup.get(base64[i + 1]) || 0
    const encoded3 = lookup.get(base64[i + 2]) || 0
    const encoded4 = lookup.get(base64[i + 3]) || 0

    bytes[p] = (encoded1 << 2) | (encoded2 >> 4)
    p += 1

    if (base64[i + 2] !== '=' && p < bufferLength) {
      bytes[p] = ((encoded2 & 15) << 4) | (encoded3 >> 2)
      p += 1
    }

    if (base64[i + 3] !== '=' && p < bufferLength) {
      bytes[p] = ((encoded3 & 3) << 6) | (encoded4 & 63)
      p += 1
    }
  }

  return bytes
}

// 이미지를 캔버스에 추가하는 함수
async function addImageToCanvas(imageUrl: string, sessionName: string) {
  try {
    console.log('========== addImageToCanvas 시작 ==========')
    console.log('URL length:', imageUrl.length)
    console.log('Session name:', sessionName)

    // URL 시작 부분 로깅
    if (imageUrl.startsWith('data:image')) {
      const header = imageUrl.substring(0, 50)
      console.log('Data URL header:', header)

      // 이미지 형식 확인 (PNG 또는 JPEG)
      const isJPEG = imageUrl.includes('image/jpeg')
      console.log('Image format:', isJPEG ? 'JPEG' : 'PNG')
    }

    // Data URL을 Uint8Array로 변환
    let imageData: Uint8Array

    if (imageUrl.startsWith('data:image')) {
      // data:image/png;base64, 또는 data:image/jpeg;base64, 부분 제거하고 base64 데이터만 추출
      const base64Data = imageUrl.split(',')[1]
      console.log('Base64 data length:', base64Data.length)

      // 크기 체크
      const estimatedSizeInMB = (base64Data.length * 0.75) / (1024 * 1024)
      console.log(`Estimated image size: ${estimatedSizeInMB.toFixed(2)} MB`)

      // Figma는 압축된 이미지는 더 큰 크기도 처리 가능 (JPEG 압축 시 30MB까지)
      if (estimatedSizeInMB > 30) {
        throw new Error(`이미지 크기가 너무 큽니다: ${estimatedSizeInMB.toFixed(2)} MB (최대 30MB)`)
      }

      try {
        imageData = base64ToBytes(base64Data)
        console.log('Decoded bytes length:', imageData.length)
        console.log('Actual size in MB:', (imageData.length / (1024 * 1024)).toFixed(2))
      } catch (decodeError: any) {
        console.error('Base64 디코딩 실패:', decodeError)
        throw new Error(`Base64 디코딩 실패: ${(decodeError && decodeError.message) || '알 수 없는 오류'}`)
      }
    } else {
      // 일반 URL인 경우 fetch로 가져오기
      console.log('Fetching from URL:', imageUrl)
      const response = await fetch(imageUrl)
      const arrayBuffer = await response.arrayBuffer()
      imageData = new Uint8Array(arrayBuffer)
      console.log('Fetched image size:', (imageData.length / (1024 * 1024)).toFixed(2), 'MB')
    }

    // 이미지 생성
    console.log('Creating Figma image object...')
    let image
    try {
      image = figma.createImage(imageData)
      console.log('Figma image created successfully, hash:', image.hash)
    } catch (createError: any) {
      console.error('Figma createImage 실패:', createError)
      throw new Error(`이미지 생성 실패: ${(createError && createError.message) || 'Figma API 오류'}`)
    }

    // Rectangle 노드 생성
    console.log('Creating rectangle node...')
    const rect = figma.createRectangle()
    rect.name = `Screenshot - ${sessionName}`

    // 이미지의 원본 크기 가져오기
    console.log('Getting image dimensions...')
    let width, height
    try {
      const dimensions = await image.getSizeAsync()
      width = dimensions.width
      height = dimensions.height
      console.log('Original image size:', width, 'x', height)
      console.log('Aspect ratio:', (width / height).toFixed(2))

      // Figma 픽셀 제한 체크 (압축을 사용하므로 크기를 더 늘림)
      const MAX_HEIGHT = 15000 // 높이는 15000px까지 허용 (전체 페이지를 위해)
      const MAX_WIDTH = 8000 // 너비는 8000px까지
      if (width > MAX_WIDTH) {
        console.error(`이미지 너비가 Figma 제한을 초과: ${width}px (최대 ${MAX_WIDTH}px)`)
        throw new Error(`이미지 너비 초과: ${width}px (최대 ${MAX_WIDTH}px)`)
      }
      if (height > MAX_HEIGHT) {
        console.error(`이미지 높이가 Figma 제한을 초과: ${height}px (최대 ${MAX_HEIGHT}px)`)
        throw new Error(`이미지 높이 초과: ${height}px (최대 ${MAX_HEIGHT}px)`)
      }

      // 전체 픽셀 수 체크 (압축을 사용하므로 제한 완화)
      const totalPixels = width * height
      const MAX_TOTAL_PIXELS = 60000000 // 60백만 픽셀 (예: 4000x15000)
      if (totalPixels > MAX_TOTAL_PIXELS) {
        console.error(`전체 픽셀 수 초과: ${totalPixels} (최대 ${MAX_TOTAL_PIXELS})`)
        throw new Error(`이미지 전체 픽셀 수 초과`)
      }
    } catch (sizeError: any) {
      console.error('이미지 크기 가져오기 실패:', sizeError)
      throw new Error(`이미지 크기 확인 실패: ${(sizeError && sizeError.message) || '크기 정보 없음'}`)
    }

    // 적절한 크기로 조정 (전체 페이지 캡처일 경우 더 큰 크기 허용)
    const isLargePage = height > 2000 // 2000px 이상이면 긴 페이지로 간주
    const isVeryLargePage = height > 5000 // 5000px 이상이면 매우 긴 페이지

    let maxWidth = 800
    let maxHeight = 600

    if (isVeryLargePage) {
      maxWidth = 1600 // 매우 긴 페이지는 더 크게
      maxHeight = 12000 // 최대 12000px까지 표시
    } else if (isLargePage) {
      maxWidth = 1200
      maxHeight = 8000 // 긴 페이지는 최대 8000px까지
    }

    const minWidth = 400
    const minHeight = 300

    let finalWidth = width
    let finalHeight = height

    // 이미지가 너무 작은 경우 최소 크기로 확대
    if (width < minWidth || height < minHeight) {
      console.log('Image too small, scaling up to minimum size')
      const scaleX = minWidth / width
      const scaleY = minHeight / height
      const scale = Math.max(scaleX, scaleY)
      finalWidth = width * scale
      finalHeight = height * scale
    }
    // 이미지가 너무 큰 경우 축소
    else if (width > maxWidth || height > maxHeight) {
      const scaleX = maxWidth / width
      const scaleY = maxHeight / height
      const scale = Math.min(scaleX, scaleY)
      finalWidth = width * scale
      finalHeight = height * scale
    }

    const pageType = isVeryLargePage ? '매우 긴 페이지' : isLargePage ? '긴 페이지' : '일반 페이지'
    console.log(`Final image size: ${finalWidth.toFixed(0)} x ${finalHeight.toFixed(0)} (${pageType})`)

    rect.resize(finalWidth, finalHeight)

    // 뷰포트 중앙에 배치
    const viewport = figma.viewport.center
    rect.x = viewport.x - finalWidth / 2
    rect.y = viewport.y - finalHeight / 2

    // 이미지 채우기
    rect.fills = [
      {
        type: 'IMAGE',
        scaleMode: 'FIT',
        imageHash: image.hash,
      },
    ]

    // 현재 페이지에 추가
    figma.currentPage.appendChild(rect)

    // 생성된 노드 선택
    figma.currentPage.selection = [rect]

    // 뷰포트를 노드로 이동
    figma.viewport.scrollAndZoomIntoView([rect])

    figma.notify(`"${sessionName}" 스크린샷을 추가했습니다`, { timeout: 3000 })
    console.log('========== addImageToCanvas 완료 ==========')
  } catch (error: any) {
    console.error('========== 이미지 추가 실패 ==========')
    console.error('Error type:', typeof error)
    console.error('Error message:', error && error.message)
    console.error('Error stack:', error && error.stack)
    console.error('Full error:', error)

    // 사용자에게 구체적인 에러 메시지 표시
    let errorMessage = '이미지를 추가하는데 실패했습니다'
    if (error && error.message) {
      if (error.message.includes('크기가 너무 큽니다')) {
        errorMessage = error.message
      } else if (error.message.includes('디코딩 실패')) {
        errorMessage = '이미지 디코딩 실패: 잘못된 형식'
      } else if (error.message.includes('이미지 생성 실패')) {
        errorMessage = 'Figma에서 이미지 생성 실패'
      } else {
        errorMessage = `실패: ${error.message}`
      }
    }

    figma.notify(errorMessage, { timeout: 5000, error: true })
  }
}

// 선택된 노드를 이미지로 캡처하여 JIRA에 업로드
async function captureAndUploadToJira(issueId: string) {
  const selection = figma.currentPage.selection

  if (selection.length === 0) {
    figma.notify('❌ 캡처할 요소를 선택해주세요', { timeout: 3000, error: true })
    // 구체적인 가이드 제공
    setTimeout(() => {
      figma.notify('💡 Tip: Shift+클릭으로 여러 요소를 선택하거나, 드래그로 영역을 선택할 수 있습니다', {
        timeout: 5000,
      })
    }, 500)
    return
  }

  try {
    // 선택 개수 알림
    if (selection.length > 1) {
      figma.notify(`${selection.length}개 요소를 캡처 중...`, { timeout: 2000 })
    }

    // 선택된 노드들을 하나의 그룹으로 캡처
    const node = selection.length === 1 ? selection[0] : figma.group(selection, figma.currentPage)

    // 노드를 이미지로 내보내기
    const imageData = await node.exportAsync({
      format: 'PNG',
      constraint: { type: 'SCALE', value: 2 }, // 2x 해상도로 내보내기
    })

    // Base64로 변환
    const base64 = figma.base64Encode(imageData)
    const dataURL = `data:image/png;base64,${base64}`

    // 그룹을 생성했다면 다시 해제
    if (selection.length > 1 && node.type === 'GROUP') {
      figma.ungroup(node)
    }

    // UI로 캡처 완료 메시지 전송
    figma.ui.postMessage({
      type: 'capture-complete',
      data: {
        dataURL,
        issueId,
        fileName: `figma-capture-${Date.now()}.png`,
      },
    })

    figma.notify('캡처 완료! JIRA에 업로드 중...', { timeout: 2000 })
  } catch (error: any) {
    console.error('캡처 실패:', error)
    figma.notify('캡처에 실패했습니다', { timeout: 3000, error: true })
  }
}

// 사용자 정보 가져오기
function getCurrentUser() {
  try {
    const user = figma.currentUser
    if (user) {
      // Figma 사용자 이름이 이메일 형식일 수 있음 (예: user@example.com)
      let email = ''

      // 사용자 이름에서 이메일 추출 시도
      if (user.name && user.name.includes('@')) {
        email = user.name
      }

      return {
        id: user.id,
        name: user.name,
        email: email, // 이메일 정보 추가
        photoUrl: user.photoUrl,
        color: user.color,
      }
    }
    return null
  } catch (error: any) {
    console.error('Failed to get current user:', error)
    return null
  }
}

interface PluginMessage {
  type: string
  message?: string
  timeout?: number
  [key: string]: any
}

// UI로부터 메시지 받기
figma.ui.onmessage = (msg: PluginMessage) => {
  console.log('Message from UI:', msg)

  switch (msg.type) {
    case 'get-user-info': {
      // 현재 사용자 정보 전송
      const userInfo = getCurrentUser()
      figma.ui.postMessage({
        type: 'user-info',
        data: userInfo,
      })
      break
    }

    case 'get-selection': {
      // 현재 선택된 노드 정보 가져오기
      const selection = figma.currentPage.selection
      const selectionData = selection.map((node) => ({
        id: node.id,
        name: node.name,
        type: node.type,
      }))

      figma.ui.postMessage({
        type: 'selection-data',
        data: selectionData,
      })
      break
    }

    case 'get-page-info': {
      // 현재 페이지 정보 가져오기
      const currentPage = figma.currentPage
      figma.ui.postMessage({
        type: 'page-info',
        data: {
          id: currentPage.id,
          name: currentPage.name,
          nodeCount: currentPage.children.length,
        },
      })
      break
    }

    case 'close-plugin':
      figma.closePlugin()
      break

    case 'notify':
      // 알림 표시
      figma.notify(msg.message || 'Notification', {
        timeout: msg.timeout || 3000,
      })
      break

    case 'add-image': {
      // 이미지를 피그마 캔버스에 추가
      // dataURL 또는 imageUrl 둘 다 지원
      const imageUrl = msg.dataURL || msg.imageUrl
      if (imageUrl) {
        void addImageToCanvas(imageUrl, msg.sessionName)
      } else {
        console.error('No image URL provided in message:', msg)
        figma.notify('이미지 URL이 제공되지 않았습니다', { timeout: 3000, error: true })
      }
      break
    }

    case 'capture-selection': {
      // 선택된 영역 캡처하여 JIRA에 업로드
      void captureAndUploadToJira(msg.issueId)
      break
    }

    case 'start-capture-mode': {
      // 캡처 모드 시작 - 사용자가 영역을 선택하면 자동으로 캡처
      const { issueId, ticketInfo } = msg

      // 현재 선택 상태 확인
      const currentSelection = figma.currentPage.selection

      if (currentSelection.length > 0) {
        // 이미 선택된 요소가 있으면 바로 캡처 제안
        figma.notify(`🎯 이미 ${currentSelection.length}개 요소가 선택되어 있습니다`, { timeout: 2000 })
        setTimeout(() => {
          figma.notify('이대로 캡처하려면 다시 클릭하거나, 새로 선택하세요', { timeout: 3000 })
        }, 500)

        // 2초 후 자동 캡처 (사용자가 아무 행동도 하지 않으면)
        setTimeout(() => {
          if (
            figma.currentPage.selection.length === currentSelection.length &&
            figma.currentPage.selection[0] === currentSelection[0]
          ) {
            void captureAndUploadToJira(issueId)
            figma.ui.postMessage({
              type: 'capture-started',
              data: { issueId, ticketInfo },
            })
          }
        }, 2000)
      } else {
        // 선택된 요소가 없으면 선택 가이드 제공
        figma.notify('캡처할 요소를 선택해주세요', { timeout: 3000 })
        setTimeout(() => {
          figma.notify('💡 Tip: 여러 요소를 선택하려면 Shift+클릭 또는 드래그를 사용하세요', { timeout: 5000 })
        }, 1000)
      }

      // 선택 변경 리스너 설정
      let previousSelectionCount = currentSelection.length
      const selectionHandler = () => {
        const newSelection = figma.currentPage.selection

        if (newSelection.length > 0) {
          // 선택 개수 변경 알림
          if (newSelection.length !== previousSelectionCount) {
            figma.notify(`✅ ${newSelection.length}개 요소 선택됨`, { timeout: 1500 })
            previousSelectionCount = newSelection.length
          }

          // 1.5초 대기 후 자동으로 캡처 (사용자가 추가 선택할 시간 제공)
          setTimeout(() => {
            if (figma.currentPage.selection.length === newSelection.length) {
              figma.off('selectionchange', selectionHandler)
              void captureAndUploadToJira(issueId)

              // UI에 캡처 완료 알림
              figma.ui.postMessage({
                type: 'capture-started',
                data: {
                  issueId,
                  ticketInfo,
                },
              })
            }
          }, 1500)
        }
      }

      // 선택 변경 이벤트 리스너 등록
      figma.on('selectionchange', selectionHandler)

      // 30초 후 자동으로 리스너 제거 (타임아웃)
      setTimeout(() => {
        figma.off('selectionchange', selectionHandler)
        figma.notify('⏱️ 캡처 모드가 시간 초과로 종료되었습니다', { timeout: 3000 })
      }, 30000)

      break
    }

    case 'capture-for-ticket': {
      // 티켓 전용 캡처 모드
      const { issueId } = msg

      if (figma.currentPage.selection.length === 0) {
        figma.notify('먼저 캡처할 요소를 선택해주세요', { timeout: 3000, error: true })

        // 선택 대기 모드
        const selectionHandler = () => {
          if (figma.currentPage.selection.length > 0) {
            figma.off('selectionchange', selectionHandler)
            void captureAndUploadToJira(issueId)
          }
        }

        figma.on('selectionchange', selectionHandler)

        // 10초 후 자동으로 리스너 제거
        setTimeout(() => {
          figma.off('selectionchange', selectionHandler)
        }, 10000)
      } else {
        // 이미 선택된 요소가 있으면 바로 캡처
        void captureAndUploadToJira(issueId)
      }

      break
    }

    case 'upload-image-to-ticket': {
      // 드래그 앤 드롭 이미지 업로드 - 이제 UI에서 직접 ApiClient 사용
      // code.ts에서는 별도 처리 불필요
      console.log('드래그 앤 드롭 이미지 업로드 요청 (UI에서 처리)')
      break
    }

    case 'create-capture-frame': {
      // \ucea1\ucc98 \ud504\ub808\uc784 \uc0dd\uc131 \uae30\ub2a5
      try {
        const viewport = figma.viewport.center
        const frame = figma.createFrame()

        frame.name =
          '\ud83d\udcf8 \ucea1\ucc98 \uc601\uc5ed (\uc774 \ud504\ub808\uc784 \uc548\uc5d0 \ucea1\ucc98\ud560 \uc694\uc18c\ub97c \ub123\uc5b4\uc8fc\uc138\uc694)'
        frame.resize(800, 600)
        frame.x = viewport.x - 400
        frame.y = viewport.y - 300

        // \ud504\ub808\uc784 \uc2a4\ud0c0\uc77c \uc124\uc815 (\uc810\uc120 \ud14c\ub450\ub9ac)
        frame.fills = []
        frame.strokes = [
          {
            type: 'SOLID',
            color: { r: 0.2, g: 0.6, b: 1 },
            opacity: 1,
          },
        ]
        frame.strokeWeight = 2
        frame.dashPattern = [10, 5]
        frame.cornerRadius = 8

        // \ud504\ub808\uc784 \uc120\ud0dd
        figma.currentPage.selection = [frame]
        figma.viewport.scrollAndZoomIntoView([frame])

        figma.notify(
          '\ud83c\udfa8 \ucea1\ucc98 \ud504\ub808\uc784\uc774 \uc0dd\uc131\ub418\uc5c8\uc2b5\ub2c8\ub2e4. \uc774 \uc548\uc5d0 \ucea1\ucc98\ud560 \uc694\uc18c\ub97c \ub123\uc5b4\uc8fc\uc138\uc694',
          { timeout: 5000 },
        )

        // UI\uc5d0 \ud504\ub808\uc784 \uc0dd\uc131 \uc54c\ub9bc
        figma.ui.postMessage({
          type: 'capture-frame-created',
          data: {
            frameId: frame.id,
            frameName: frame.name,
          },
        })
      } catch (error: any) {
        console.error('\ud504\ub808\uc784 \uc0dd\uc131 \uc2e4\ud328:', error)
        figma.notify('\u274c \ucea1\ucc98 \ud504\ub808\uc784 \uc0dd\uc131\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4', {
          timeout: 3000,
          error: true,
        })
      }

      break
    }

    default:
      console.log('Unknown message type:', msg.type)
  }
}

// 선택 변경 이벤트 리스너
figma.on('selectionchange', () => {
  const selection = figma.currentPage.selection
  figma.ui.postMessage({
    type: 'selection-changed',
    data: selection.map((node) => ({
      id: node.id,
      name: node.name,
      type: node.type,
    })),
  })
})

// 페이지 변경 이벤트 리스너
figma.on('currentpagechange', () => {
  const currentPage = figma.currentPage
  figma.ui.postMessage({
    type: 'page-changed',
    data: {
      id: currentPage.id,
      name: currentPage.name,
    },
  })
})

// 플러그인 종료 시 정리
figma.on('close', () => {
  console.log('Plugin closed')
})
