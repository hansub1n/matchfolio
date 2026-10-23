import { hasActiveDeadline, type Application } from "@/entities/application";
import type { Schedule } from "@/entities/schedule";
import { toKSTDateString, toKSTTimeString } from "@/shared/lib/kst-date";

export interface CalendarEvent {
  id: string;
  // 상세 모달을 어떤 variant로 열지 정하는 데 쓴다(관심 단계는 "지원하기"/매칭이 있는 쪽).
  kind: "application" | "interested";
  refId: string;
  company: string;
  label: string;
  time: string | null;
}

const STAGE_LABELS: Record<Schedule["stage"], string> = {
  coding_test: "코테",
  interview: "면접",
};

// 날짜별 이벤트(관심 단계 마감/일정)를 모아준다. 캘린더 그리드와 "다가오는
// 일정" 패널이 같은 소스를 쓰도록 월 그리드 조립과 분리해뒀다.
export function buildCalendarEvents(
  applications: Application[],
  schedules: Schedule[]
): Map<string, CalendarEvent[]> {
  const eventsByDate = new Map<string, CalendarEvent[]>();
  function addEvent(date: string, event: CalendarEvent) {
    const list = eventsByDate.get(date) ?? [];
    list.push(event);
    eventsByDate.set(date, list);
  }

  for (const app of applications) {
    if (!hasActiveDeadline(app) || !app.deadline) continue;
    addEvent(app.deadline, {
      id: `deadline-${app.id}`,
      kind: "interested",
      refId: app.id,
      company: app.company,
      label: "마감",
      time: null,
    });
  }

  const applicationsById = new Map(applications.map((app) => [app.id, app]));
  for (const schedule of schedules) {
    if (!schedule.scheduledAt) continue;
    const app = applicationsById.get(schedule.applicationId);
    if (!app) continue;
    addEvent(toKSTDateString(schedule.scheduledAt), {
      id: `schedule-${schedule.id}`,
      kind: "application",
      refId: app.id,
      company: app.company,
      label:
        schedule.stage === "interview"
          ? (schedule.roundLabel ?? "면접")
          : STAGE_LABELS[schedule.stage],
      time: toKSTTimeString(schedule.scheduledAt),
    });
  }

  for (const events of eventsByDate.values()) {
    events.sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
  }

  return eventsByDate;
}
