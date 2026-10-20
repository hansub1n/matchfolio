import type { Application } from "@/entities/application";
import type { InterestedCompany } from "@/entities/interested-company";
import type { Schedule } from "@/entities/schedule";
import { toKSTDateString, toKSTTimeString } from "@/shared/lib/kst-date";

export interface CalendarEvent {
  id: string;
  kind: "application" | "interested_company";
  refId: string;
  company: string;
  label: string;
  time: string | null;
}

const STAGE_LABELS: Record<Schedule["stage"], string> = {
  coding_test: "코테",
  interview: "면접",
};

// 날짜별 이벤트(지원 카드 마감/관심기업 마감/일정)를 모아준다. 캘린더 그리드와
// "다가오는 일정" 패널이 같은 소스를 쓰도록 월 그리드 조립과 분리해뒀다.
export function buildCalendarEvents(
  applications: Application[],
  interestedCompanies: InterestedCompany[],
  schedules: Schedule[]
): Map<string, CalendarEvent[]> {
  const eventsByDate = new Map<string, CalendarEvent[]>();
  function addEvent(date: string, event: CalendarEvent) {
    const list = eventsByDate.get(date) ?? [];
    list.push(event);
    eventsByDate.set(date, list);
  }

  // 서류 마감은 아직 서류 전형 중인 카드에만 의미가 있다 — 면접/코딩테스트로 넘어간
  // 카드는 이미 서류를 통과했다는 뜻이라 지난 서류 마감을 계속 보여줄 필요가 없다.
  for (const app of applications) {
    if (app.deadline && app.stage === "document" && app.outcome === "in_progress") {
      addEvent(app.deadline, {
        id: `deadline-${app.id}`,
        kind: "application",
        refId: app.id,
        company: app.company,
        label: "마감",
        time: null,
      });
    }
  }

  for (const company of interestedCompanies) {
    if (company.deadline) {
      addEvent(company.deadline, {
        id: `interested-deadline-${company.id}`,
        kind: "interested_company",
        refId: company.id,
        company: company.company,
        label: "마감",
        time: null,
      });
    }
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
