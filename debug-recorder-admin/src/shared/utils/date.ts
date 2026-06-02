import { format, startOfMonth, startOfWeek, subDays, subMonths } from 'date-fns';

/**
 * 날짜를 YYYY-MM-DD 형식으로 포맷합니다.
 */
export function formatDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * 날짜를 MM/DD 형식으로 포맷합니다.
 */
export function formatShortDate(date: Date): string {
  return format(date, 'MM/dd');
}

/**
 * 지정된 일 수만큼 이전의 날짜 배열을 생성합니다.
 */
export function getDateRange(days: number): Date[] {
  const today = new Date();
  const dates: Date[] = [];

  for (let i = days - 1; i >= 0; i--) {
    dates.push(subDays(today, i));
  }

  return dates;
}

/**
 * 지정된 주 수만큼 이전의 주 시작일(일요일) 배열을 생성합니다.
 */
export function getWeekRange(weeks: number): Date[] {
  const start = startOfWeek(new Date(), { weekStartsOn: 0 });
  const dates: Date[] = [];

  for (let i = weeks - 1; i >= 0; i--) {
    dates.push(subDays(start, i * 7));
  }

  return dates;
}

/**
 * 지정된 월 수만큼 이전의 월 시작일 배열을 생성합니다.
 */
export function getMonthRange(months: number): Date[] {
  const today = new Date();
  const dates: Date[] = [];

  for (let i = months - 1; i >= 0; i--) {
    dates.push(startOfMonth(subMonths(today, i)));
  }

  return dates;
}
