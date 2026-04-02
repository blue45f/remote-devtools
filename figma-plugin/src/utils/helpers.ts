// Helper functions for Figma Plugin
// Lightweight utilities using native APIs (structuredClone, crypto.randomUUID)

/** 디바운스 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T, wait: number,
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

/** 쓰로틀 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T, limit: number,
): (...args: Parameters<T>) => void {
  let blocked = false
  return (...args: Parameters<T>) => {
    if (!blocked) { func(...args); blocked = true; setTimeout(() => (blocked = false), limit) }
  }
}

/** RGB → HEX */
export const rgbToHex = (r: number, g: number, b: number): string => {
  const h = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0')
  return `#${h(r)}${h(g)}${h(b)}`
}

/** HEX → RGB */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return m ? { r: parseInt(m[1], 16) / 255, g: parseInt(m[2], 16) / 255, b: parseInt(m[3], 16) / 255 } : null
}

/** 고유 ID (crypto.randomUUID fallback) */
export const generateId = (): string =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`

/** 깊은 복사 (native structuredClone) */
export const deepClone = <T>(obj: T): T => structuredClone(obj)

/** 로컬 스토리지 헬퍼 */
export const storage = {
  get: <T>(key: string, defaultValue?: T): T | null => {
    try { return JSON.parse(localStorage.getItem(key) || 'null') ?? defaultValue ?? null }
    catch { return defaultValue ?? null }
  },
  set: (key: string, value: unknown) => { try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* */ } },
  remove: (key: string) => { try { localStorage.removeItem(key) } catch { /* */ } },
  clear: () => { try { localStorage.clear() } catch { /* */ } },
}

/** 에러 메시지 추출 */
export function formatError(error: unknown): string {
  if (typeof error === 'string') return error
  if (error && typeof error === 'object') {
    const e = error as Record<string, unknown>
    const msg = ((e.response as Record<string, unknown>)?.data as Record<string, unknown>)?.message
    if (typeof msg === 'string') return msg
    if (typeof (e as { message?: string }).message === 'string') return (e as { message: string }).message
  }
  return 'An unknown error occurred'
}

/** ISO 타임스탬프 */
export const formatTimestamp = (date = new Date()): string => date.toISOString()

/** 상대 시간 (예: "2분 전") */
export function getRelativeTime(timestamp: string | Date): string {
  const s = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000)
  if (s < 60) return `${s}초 전`
  if (s < 3600) return `${Math.floor(s / 60)}분 전`
  if (s < 86400) return `${Math.floor(s / 3600)}시간 전`
  if (s < 2592000) return `${Math.floor(s / 86400)}일 전`
  if (s < 31536000) return `${Math.floor(s / 2592000)}개월 전`
  return `${Math.floor(s / 31536000)}년 전`
}

/** 노드 타입 아이콘 */
const ICONS: Record<string, string> = {
  FRAME: '⬜', GROUP: '📁', SLICE: '✂️', RECTANGLE: '▭', LINE: '—',
  ELLIPSE: '⭕', POLYGON: '⬟', STAR: '⭐', VECTOR: '✏️', TEXT: '📝',
  COMPONENT: '🧩', INSTANCE: '🔗', BOOLEAN_OPERATION: '⊕', DEFAULT: '📄',
}
export const getNodeIcon = (type: string): string => ICONS[type] || ICONS.DEFAULT

/** 한글 이름 추출 */
export function extractKoreanName(name: string): string {
  const parts = name.split(' ').map(s => s.split('/')[0].replace(/\([^)]*\)/g, '')).filter(Boolean)
  const kr = parts.filter(p => /[가-힣]/.test(p))
  return kr.length === 0 ? '' : kr.length === 1 ? kr[0] : `${kr[1]}${kr[0]}`
}
