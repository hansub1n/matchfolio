import type { Application } from "@/entities/application";
import type { InterestedCompany } from "@/entities/interested-company";
import type { Schedule } from "@/entities/schedule";

import { buildCalendarEvents, type CalendarEvent } from "./build-calendar-events";

export interface UpcomingItem extends CalendarEvent {
  date: string;
}

export interface UnscheduledItem {
  applicationId: string;
  company: string;
  label: string;
}

export interface UpcomingScheduleData {
  upcoming: UpcomingItem[];
  unscheduled: UnscheduledItem[];
}

const UNSCHEDULED_STAGES = ["coding_test", "interview"] as const;

export function buildUpcomingSchedule(
  applications: Application[],
  interestedCompanies: InterestedCompany[],
  schedules: Schedule[],
  today: string,
  limit = 8
): UpcomingScheduleData {
  const eventsByDate = buildCalendarEvents(applications, interestedCompanies, schedules);

  const upcoming = [...eventsByDate.entries()]
    .filter(([date]) => date >= today)
    .flatMap(([date, events]) => events.map((event) => ({ ...event, date })))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? ""))
    .slice(0, limit);

  const unscheduled: UnscheduledItem[] = [];
  for (const app of applications) {
    if (app.outcome !== "in_progress") continue;
    if (!UNSCHEDULED_STAGES.includes(app.stage as (typeof UNSCHEDULED_STAGES)[number])) continue;

    const schedule = schedules
      .filter((s) => s.applicationId === app.id && s.stage === app.stage)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

    if (!schedule || !schedule.scheduledAt) {
      unscheduled.push({
        applicationId: app.id,
        company: app.company,
        label: app.stage === "interview" ? (schedule?.roundLabel ?? "면접") : "코테",
      });
    }
  }

  return { upcoming, unscheduled };
}
