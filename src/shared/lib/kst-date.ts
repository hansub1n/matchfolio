import { formatInTimeZone } from "date-fns-tz";

export const KST_TIME_ZONE = "Asia/Seoul";

export function todayKST(): string {
  return formatInTimeZone(new Date(), KST_TIME_ZONE, "yyyy-MM-dd");
}

export function toKSTDateString(date: Date | string): string {
  return formatInTimeZone(date, KST_TIME_ZONE, "yyyy-MM-dd");
}

export function toKSTTimeString(date: Date | string): string {
  return formatInTimeZone(date, KST_TIME_ZONE, "HH:mm");
}
