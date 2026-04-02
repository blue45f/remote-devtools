import { toZonedTime, format } from "date-fns-tz";

const TIMEZONE = process.env.TZ || "Asia/Seoul";

/**
 * Returns the current date string in YYYY-MM-DD format for the configured timezone.
 */
export function getLocalDateString(timestamp?: number): string {
  const date = timestamp ? new Date(timestamp) : new Date();
  const zonedDate = toZonedTime(date, TIMEZONE);
  return format(zonedDate, "yyyy-MM-dd", { timeZone: TIMEZONE });
}

/**
 * Returns a Date object adjusted to the configured timezone.
 */
export function getLocalDate(timestamp?: number): Date {
  const date = timestamp ? new Date(timestamp) : new Date();
  return toZonedTime(date, TIMEZONE);
}
