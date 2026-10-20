"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "cn";

import {
  updateApplication,
  type Application,
  type UpdateApplicationInput,
} from "@/entities/application";
import {
  updateInterestedCompany,
  type InterestedCompany,
  type UpdateInterestedCompanyInput,
} from "@/entities/interested-company";
import { useScheduleRequests, type Schedule } from "@/entities/schedule";
import { getDdayTier, type DdayTier } from "@/shared/lib/dday";
import { todayKST } from "@/shared/lib/kst-date";
import { Button } from "@/shared/ui/button";
import {
  ApplicationDetailDialog,
  CodingTestScheduleDialog,
  InterviewRoundDialog,
} from "@/widgets/kanban-board";
import { InterestedCompanyDetailDialog } from "@/widgets/watchlist";

import { buildCalendarMonth, type CalendarEvent } from "../model/build-calendar-month";
import { buildUpcomingSchedule } from "../model/build-upcoming-schedule";

const WEEKDAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];
const MAX_VISIBLE_CHIPS = 2;

function addMonthOffset(
  year: number,
  month: number,
  offset: number
): { year: number; month: number } {
  const total = year * 12 + (month - 1) + offset;
  return { year: Math.floor(total / 12), month: (total % 12) + 1 };
}

function tierClasses(tier: DdayTier): string {
  switch (tier) {
    case "urgent":
      return "bg-urgent text-urgent-foreground";
    case "soon":
      return "bg-highlight text-highlight-foreground";
    case "past":
      return "text-muted-foreground";
    default:
      return "bg-muted text-foreground";
  }
}

function formatUpcomingDate(date: string, time: string | null, today: string): string {
  if (date === today) return time ? `오늘 ${time}` : "오늘";
  const d = new Date(`${date}T00:00:00`);
  const label = `${d.getMonth() + 1}.${d.getDate()} ${["일", "월", "화", "수", "목", "금", "토"][d.getDay()]}`;
  return time ? `${label} ${time}` : label;
}

export function CalendarView({
  applications,
  interestedCompanies,
  schedules,
}: {
  applications: Application[];
  interestedCompanies: InterestedCompany[];
  schedules: Schedule[];
}) {
  const router = useRouter();
  const today = todayKST();
  const [year, setYear] = useState(Number(today.slice(0, 4)));
  const [month, setMonth] = useState(Number(today.slice(5, 7)));
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailCompanyId, setDetailCompanyId] = useState<string | null>(null);

  const [scheduleItems, setScheduleItems] = useState(schedules);
  const [prevSchedules, setPrevSchedules] = useState(schedules);
  if (schedules !== prevSchedules) {
    setPrevSchedules(schedules);
    setScheduleItems(schedules);
  }

  const {
    latestSchedules,
    pendingRoundApplication,
    pendingRoundSchedule,
    setPendingRoundId,
    pendingCodingTestApplication,
    pendingCodingTestSchedule,
    setPendingCodingTestId,
    handleSetInterviewRound,
    handleSetCodingTestSchedule,
  } = useScheduleRequests(applications, scheduleItems, setScheduleItems);

  const calendar = buildCalendarMonth(applications, interestedCompanies, scheduleItems, year, month, today);
  const { upcoming, unscheduled } = buildUpcomingSchedule(
    applications,
    interestedCompanies,
    scheduleItems,
    today
  );

  const detailApplication = applications.find((app) => app.id === detailId) ?? null;
  const detailCompany = interestedCompanies.find((c) => c.id === detailCompanyId) ?? null;

  function goTo(offset: number) {
    const next = addMonthOffset(year, month, offset);
    setYear(next.year);
    setMonth(next.month);
  }

  function goToday() {
    setYear(Number(today.slice(0, 4)));
    setMonth(Number(today.slice(5, 7)));
  }

  function openEvent(event: CalendarEvent) {
    if (event.kind === "application") {
      setDetailId(event.refId);
    } else {
      setDetailCompanyId(event.refId);
    }
  }

  function handleUpdateApplication(id: string, input: UpdateApplicationInput) {
    updateApplication(id, input)
      .then(() => router.refresh())
      .catch(console.error);
  }

  function handleUpdateInterestedCompany(id: string, input: UpdateInterestedCompanyInput) {
    updateInterestedCompany(id, input)
      .then(() => router.refresh())
      .catch(console.error);
  }

  return (
    <div className="mx-auto flex max-w-[1040px] flex-col gap-4 px-6 pt-10 pb-8 md:flex-row md:gap-8">
      <div className="hidden min-w-0 flex-1 flex-col gap-4 md:flex">
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-medium tracking-tight">
            {year}년 {month}월
          </h2>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" onClick={() => goTo(-1)}>
              <ChevronLeft />
            </Button>
            <Button variant="outline" size="sm" onClick={goToday}>
              오늘
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => goTo(1)}>
              <ChevronRight />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 text-center text-[11px] text-muted-foreground">
          {WEEKDAY_LABELS.map((label, i) => (
            <span key={label} className={i >= 5 ? "text-destructive" : undefined}>
              {label}
            </span>
          ))}
        </div>

        <div className="flex flex-col">
          {calendar.weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 border-t border-border">
              {week.map((day) => {
                const tier = getDdayTier(day.date, today);
                return (
                  <div key={day.date} className="flex min-h-[76px] flex-col gap-1 p-1.5">
                    <div className="flex items-center gap-1">
                      <span
                        className={cn(
                          "text-xs tabular-nums",
                          day.isToday
                            ? "rounded bg-foreground px-1.5 text-background"
                            : day.isCurrentMonth
                              ? "text-muted-foreground"
                              : "text-muted-foreground/50"
                        )}
                      >
                        {Number(day.date.slice(8, 10))}
                      </span>
                      {day.appliedCount > 0 && day.date < today && (
                        <span
                          title={`${day.appliedCount}곳 지원`}
                          className="size-1.5 rounded-full"
                          style={{ backgroundColor: "var(--heat-3)" }}
                        />
                      )}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      {day.events.slice(0, MAX_VISIBLE_CHIPS).map((event) => (
                        <button
                          key={event.id}
                          type="button"
                          onClick={() => openEvent(event)}
                          className={cn(
                            "truncate rounded px-1.5 py-0.5 text-left text-[10.5px] hover:opacity-80",
                            tierClasses(tier)
                          )}
                        >
                          {event.company} {event.label}
                        </button>
                      ))}
                      {day.events.length > MAX_VISIBLE_CHIPS && (
                        <span className="px-1.5 text-[10.5px] text-muted-foreground">
                          +{day.events.length - MAX_VISIBLE_CHIPS}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="flex w-full flex-col gap-3 md:w-[240px] md:shrink-0">
        <p className="text-xs text-muted-foreground">다가오는 일정</p>

        {upcoming.length === 0 && unscheduled.length === 0 ? (
          <p className="text-xs text-muted-foreground">다가오는 일정이 없어요</p>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              {upcoming.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => openEvent(event)}
                  className="flex flex-col gap-0.5 text-left"
                >
                  <span
                    className={cn(
                      "text-[11px] tabular-nums",
                      event.date === today ? "text-urgent" : "text-muted-foreground"
                    )}
                  >
                    {formatUpcomingDate(event.date, event.time, today)}
                  </span>
                  <span className="text-sm">
                    <span className="font-medium">{event.company}</span>{" "}
                    <span className="text-muted-foreground">{event.label}</span>
                  </span>
                </button>
              ))}
            </div>

            {unscheduled.length > 0 && (
              <div className="flex flex-col gap-3 border-t border-border pt-3">
                <p className="text-[11px] text-muted-foreground">일정 미정</p>
                {unscheduled.map((item) => (
                  <div key={item.applicationId} className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm">
                      <span className="font-medium">{item.company}</span>{" "}
                      <span className="text-muted-foreground">{item.label}</span>
                    </span>
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => {
                        if (item.label === "코테") {
                          setPendingCodingTestId(item.applicationId);
                        } else {
                          setPendingRoundId(item.applicationId);
                        }
                      }}
                    >
                      날짜 입력
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <InterviewRoundDialog
        key={`round-${pendingRoundApplication?.id ?? "none"}`}
        application={pendingRoundApplication}
        schedule={pendingRoundSchedule}
        onSelect={handleSetInterviewRound}
        onOpenChange={(open) => {
          if (!open) setPendingRoundId(null);
        }}
      />
      <CodingTestScheduleDialog
        key={`coding-test-${pendingCodingTestApplication?.id ?? "none"}`}
        application={pendingCodingTestApplication}
        schedule={pendingCodingTestSchedule}
        onSelect={handleSetCodingTestSchedule}
        onOpenChange={(open) => {
          if (!open) setPendingCodingTestId(null);
        }}
      />
      <ApplicationDetailDialog
        application={detailApplication}
        schedule={detailId ? (latestSchedules.get(detailId) ?? null) : null}
        onOpenChange={(open) => {
          if (!open) setDetailId(null);
        }}
        onUpdate={handleUpdateApplication}
      />
      <InterestedCompanyDetailDialog
        company={detailCompany}
        onOpenChange={(open) => {
          if (!open) setDetailCompanyId(null);
        }}
        onUpdate={handleUpdateInterestedCompany}
      />
    </div>
  );
}
