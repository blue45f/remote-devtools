/**
 * 애플리케이션 설정 상수
 * 
 * 빌드 시 환경변수로 설정:
 * - 개발: pnpm build (기본값 사용)
 * - 배포: pnpm build:prod (프로덕션 URL 주입)
 */

// 프로덕션 서버 URL (두 도메인 모두 동작함)
const DEV_API_URL = 'http://localhost:3001'

// Vite 환경변수로 URL 설정, 없으면 기본값 사용
export const API_BASE_URL = import.meta.env.VITE_API_URL || DEV_API_URL

// 현재 환경 확인
export const IS_PRODUCTION = !API_BASE_URL.includes('localhost')

// 디버깅용 로그 (빌드된 값 확인)
console.log('=================================')
console.log('[Figma Plugin] Build Info:')
console.log('  Environment:', IS_PRODUCTION ? 'PRODUCTION' : 'DEVELOPMENT')
console.log('  API URL:', API_BASE_URL)
console.log('  Build Time:', new Date().toISOString())
console.log('=================================')

export const RETRY_DELAY = 5000 // 서버 재연결 시도 간격 (ms)
export const MESSAGE_TIMEOUT = 5000 // 메시지 표시 시간 (ms)