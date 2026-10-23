import { format, startOfWeek } from "date-fns";

import { hasActiveDeadline, type Application } from "@/entities/application";
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

function currentWeekRange(today: string): { monday: string; sunday: string } {
  const monday = startOfWeek(new Date(`${today}T00:00:00`), { weekStartsOn: 1 });
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  return { monday: format(monday, "yyyy-MM-dd"), sunday: format(sunday, "yyyy-MM-dd") };
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
  const { monday, sunday } = currentWeekRange(today);
  const inRange = (date: string | null) => !!date && date >= monday && date <= sunday;

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
