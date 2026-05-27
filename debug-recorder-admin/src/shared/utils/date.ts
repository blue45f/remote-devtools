/**
 * 날짜를 YYYY-MM-DD 형식으로 포맷합니다.
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 날짜를 MM/DD 형식으로 포맷합니다.
 */
export function formatShortDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${month}/${day}`
}

/**
 * 지정된 일 수만큼 이전의 날짜 배열을 생성합니다.
 */
export function getDateRange(days: number): Date[] {
  const dates: Date[] = []
  const today = new Date()

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(today.getDate() - i)
    dates.push(date)
  }

  return dates
}

/**
 * 지정된 주 수만큼 이전의 주 시작일 배열을 생성합니다.
 */
export function getWeekRange(weeks: number): Date[] {
  const dates: Date[] = []
  const today = new Date()
  const currentDay = today.getDay()
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - currentDay)

  for (let i = weeks - 1; i >= 0; i--) {
    const date = new Date(startOfWeek)
    date.setDate(startOfWeek.getDate() - i * 7)
    dates.push(date)
  }

  return dates
}

/**
 * 지정된 월 수만큼 이전의 월 시작일 배열을 생성합니다.
 */
export function getMonthRange(months: number): Date[] {
  const dates: Date[] = []
  const today = new Date()

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1)
    dates.push(date)
  }

  return dates
}
