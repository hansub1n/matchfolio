import { differenceInCalendarDays } from "date-fns";

export type DdayTier = "urgent" | "soon" | "normal" | "past";

function parseCalendarDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00`);
}

// 당일·D-1은 urgent, D-2~D-3은 soon, 그 이후는 normal, 지난 날짜는 past로 분류한다.
// 보드 카드의 마감일 표시와 캘린더 탭 칩이 같은 기준을 쓴다.
export function getDdayTier(dateStr: string, today: string): DdayTier {
  if (dateStr < today) return "past";
  const diff = differenceInCalendarDays(parseCalendarDate(dateStr), parseCalendarDate(today));
  if (diff <= 1) return "urgent";
  if (diff <= 3) return "soon";
  return "normal";
}
