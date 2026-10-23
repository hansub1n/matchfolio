import { differenceInCalendarDays } from "date-fns";

// 서류 결과를 기다린 일수를 사실로만 보여준다("지원 후 14일") — 재촉하는 문구는 붙이지 않는다.
// appliedAt/today 둘 다 'yyyy-MM-dd' KST 날짜 문자열.
export function formatWaitingDays(appliedAt: string | null, today: string): string | null {
  if (!appliedAt) return null;
  const days = differenceInCalendarDays(new Date(`${today}T00:00:00`), new Date(`${appliedAt}T00:00:00`));
  if (days < 0) return null;
  return days === 0 ? "오늘 지원" : `지원 후 ${days}일`;
}
