// Helper functions for Figma Plugin

/**
 * 디바운스 함수 - 연속적인 이벤트를 제한
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout !== null) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }
}

/**
 * 쓰로틀 함수 - 일정 시간 간격으로만 실행
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number,
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => {
        inThrottle = false
      }, limit)
    }
  }
}

/**
 * RGB 색상을 HEX로 변환
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (value: number) => {
    const hex = Math.round(value * 255).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

/**
 * HEX 색상을 RGB로 변환
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
      }
    : null
}

/**
 * 고유 ID 생성
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 깊은 복사
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T
  }

  if (obj instanceof Array) {
    const clonedArr: unknown[] = []
    obj.forEach((element, index) => {
      clonedArr[index] = deepClone(element)
    })
    return clonedArr as unknown as T
  }

  if (obj instanceof Object) {
    const clonedObj: Record<string, unknown> = {}
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        clonedObj[key] = deepClone((obj as Record<string, unknown>)[key])
      }
    }
    return clonedObj as T
  }

  return obj
}

/**
 * 로컬 스토리지 헬퍼
 */
export const storage = {
  get<T>(key: string, defaultValue?: T): T | null {
    try {
      const item = localStorage.getItem(key)
      return item ? (JSON.parse(item) as T) : (defaultValue ?? null)
    } catch (error) {
      console.error(`Error reading from localStorage:`, error)
      return defaultValue ?? null
    }
  },

  set(key: string, value: unknown): void {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error(`Error writing to localStorage:`, error)
    }
  },

  remove(key: string): void {
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.error(`Error removing from localStorage:`, error)
    }
  },

  clear(): void {
    try {
      localStorage.clear()
    } catch (error) {
      console.error(`Error clearing localStorage:`, error)
    }
  },
}

interface ErrorWithMessage {
  message: string
}

interface ErrorWithResponse {
  response?: {
    data?: {
      message?: string
    }
  }
}

/**
 * 에러 메시지 포맷팅
 */
export function formatError(error: unknown): string {
  if (typeof error === 'string') {
    return error
  }

  if (error && typeof error === 'object') {
    const errorWithResponse = error as ErrorWithResponse
    if (errorWithResponse.response?.data?.message) {
      return errorWithResponse.response.data.message
    }

    const errorWithMessage = error as ErrorWithMessage
    if (errorWithMessage.message) {
      return errorWithMessage.message
    }
  }

  return 'An unknown error occurred'
}

/**
 * 타임스탬프 포맷팅
 */
export function formatTimestamp(date: Date = new Date()): string {
  return date.toISOString()
}

/**
 * 상대 시간 계산 (예: "2분 전")
 */
export function getRelativeTime(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return `${seconds}초 전`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}분 전`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}일 전`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}개월 전`
  const years = Math.floor(months / 12)
  return `${years}년 전`
}

/**
 * 노드 타입별 아이콘 반환
 */
export function getNodeIcon(type: string): string {
  const icons: Record<string, string> = {
    FRAME: '⬜',
    GROUP: '📁',
    SLICE: '✂️',
    RECTANGLE: '▭',
    LINE: '—',
    ELLIPSE: '⭕',
    POLYGON: '⬟',
    STAR: '⭐',
    VECTOR: '✏️',
    TEXT: '📝',
    COMPONENT: '🧩',
    INSTANCE: '🔗',
    BOOLEAN_OPERATION: '⊕',
    DEFAULT: '📄',
  }

  return icons[type] || icons.DEFAULT
}

export function extractKoreanName(figmaUserName: string): string {
  const converted = figmaUserName
    .split(' ')
    .map((str) => str.split('/')[0])
    .map((str) => str.replace(/\([^)]*\)/g, ''))
    .filter((str) => str.length > 0)

  // 한글이 포함된 부분만 추출
  const koreanParts = converted.filter((part) => /[가-힣]/.test(part))
  
  // 한글이 없으면 빈 문자열 반환
  if (koreanParts.length === 0) {
    return ''
  }

  // 한글 부분이 하나면 그대로 반환
  if (koreanParts.length === 1) {
    return koreanParts[0]
  }

  // 한글 부분이 두 개 이상이면 순서 조정 (이름 성 → 성이름)
  return `${koreanParts[1]}${koreanParts[0]}`
}
