import { addDays, addWeeks, differenceInCalendarWeeks, format, startOfWeek } from "date-fns";

import type { Application } from "@/entities/application";
import type { InterestedCompany } from "@/entities/interested-company";
import type { Schedule } from "@/entities/schedule";
import { todayKST } from "@/shared/lib/kst-date";

import { buildCalendarEvents, type CalendarEvent } from "./build-calendar-events";

function parseCalendarDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00`);
}

function lastDayOfMonth(year: number, month: number): string {
  const daysInMonth = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;
}

export type { CalendarEvent };

export interface CalendarDay {
  date: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: CalendarEvent[];
  appliedCount: number;
}

export interface CalendarMonthData {
  year: number;
  month: number;
  weeks: CalendarDay[][];
}

export function buildCalendarMonth(
  applications: Application[],
  interestedCompanies: InterestedCompany[],
  schedules: Schedule[],
  year: number,
  month: number,
  today: string = todayKST()
): CalendarMonthData {
  const firstOfMonth = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastOfMonth = lastDayOfMonth(year, month);

  const gridStartMonday = startOfWeek(parseCalendarDate(firstOfMonth), { weekStartsOn: 1 });
  const lastWeekMonday = startOfWeek(parseCalendarDate(lastOfMonth), { weekStartsOn: 1 });
  const weekCount =
    differenceInCalendarWeeks(lastWeekMonday, gridStartMonday, { weekStartsOn: 1 }) + 1;

  const eventsByDate = buildCalendarEvents(applications, interestedCompanies, schedules);

  const appliedCountByDate = new Map<string, number>();
  for (const app of applications) {
    if (!app.appliedAt) continue;
    appliedCountByDate.set(app.appliedAt, (appliedCountByDate.get(app.appliedAt) ?? 0) + 1);
  }

  const weeks: CalendarDay[][] = [];
  for (let weekIndex = 0; weekIndex < weekCount; weekIndex++) {
    const weekStart = addWeeks(gridStartMonday, weekIndex);
    const week: CalendarDay[] = [];
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const date = format(addDays(weekStart, dayIndex), "yyyy-MM-dd");
      week.push({
        date,
        isCurrentMonth: date >= firstOfMonth && date <= lastOfMonth,
        isToday: date === today,
        events: eventsByDate.get(date) ?? [],
        appliedCount: appliedCountByDate.get(date) ?? 0,
      });
    }
    weeks.push(week);
  }

  return { year, month, weeks };
}
