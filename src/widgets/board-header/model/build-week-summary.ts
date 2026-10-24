import { format, startOfWeek } from "date-fns";

import { hasActiveDeadline, WEEK_STARTS_ON, type Application } from "@/entities/application";
import { latestScheduleByApplication, type Schedule } from "@/entities/schedule";
import { todayKST, toKSTDateString } from "@/shared/lib/kst-date";

export interface Headline {
  prefix: string;
  highlight: string | null;
  suffix: string;
}

export interface WeekSummary {
  deadlineCount: number;
  interviewCount: number;
  headline: Headline;
}

// 이번 주 첫날~마지막 날(일~토, 잔디·캘린더와 같은 기준).
function currentWeekRange(today: string): { start: string; end: string } {
  const start = startOfWeek(new Date(`${today}T00:00:00`), { weekStartsOn: WEEK_STARTS_ON });
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { start: format(start, "yyyy-MM-dd"), end: format(end, "yyyy-MM-dd") };
}

function buildWeekHeadline(deadlineCount: number, interviewCount: number): Headline {
  if (deadlineCount === 0 && interviewCount === 0) {
    return { prefix: "이번 주는 예정된 일정이 없어요", highlight: null, suffix: "" };
  }
  if (deadlineCount > 0 && interviewCount > 0) {
    return {
      prefix: "이번 주 마감 ",
      highlight: `${deadlineCount}곳`,
      suffix: `, 면접 ${interviewCount}곳`,
    };
  }
  if (deadlineCount > 0) {
    return { prefix: "이번 주 마감 ", highlight: `${deadlineCount}곳`, suffix: "" };
  }
  return { prefix: "이번 주 면접 ", highlight: `${interviewCount}곳`, suffix: "" };
}

// "이번 주"는 월~일 전체 — 이미 지난 요일의 마감/면접도 "이번 주에 있었던" 일정으로 센다.
export function buildWeekSummary(
  applications: Application[],
  schedules: Schedule[],
  today: string = todayKST()
): WeekSummary {
  const { start, end } = currentWeekRange(today);
  const inRange = (date: string | null) => !!date && date >= start && date <= end;

  // 마감은 아직 지원하지 않은 관심 단계에만 의미가 있다.
  const deadlineCount = applications.filter(
    (app) => hasActiveDeadline(app) && inRange(app.deadline)
  ).length;

  const latestSchedules = latestScheduleByApplication(schedules);
  const interviewCount = [...latestSchedules.values()].filter((s) =>
    inRange(s.scheduledAt ? toKSTDateString(s.scheduledAt) : null)
  ).length;

  return {
    deadlineCount,
    interviewCount,
    headline: buildWeekHeadline(deadlineCount, interviewCount),
  };
}
