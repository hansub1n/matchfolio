import { differenceInCalendarDays } from "date-fns";

import { getDdayTier, type DdayTier } from "./dday";

export function formatDeadline(deadline: string | null) {
  if (!deadline) return null;
  const [, month, day] = deadline.split("-");
  return `마감 ${month}/${day}`;
}

export interface DeadlineBadge {
  label: string;
  tier: DdayTier;
}

function parseCalendarDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00`);
}

// 칸반 카드 1행 오른쪽에 붙는 D-day 배지용 — 지남/당일/D-1 등 라벨과 색 단계를
// 한 번에 계산한다. 색 단계 자체(urgent/soon/...)는 dday.ts가 맡고, 여기는
// "서류 마감 배지"라는 특정 용도에 맞는 문구만 입힌다.
export function formatDeadlineBadge(
  deadline: string | null,
  today: string
): DeadlineBadge | null {
  if (!deadline) return null;
  const tier = getDdayTier(deadline, today);
  if (tier === "past") return { label: "마감", tier };
  if (deadline === today) return { label: "오늘", tier };
  const diffDays = differenceInCalendarDays(parseCalendarDate(deadline), parseCalendarDate(today));
  return { label: `D-${diffDays}`, tier };
}
