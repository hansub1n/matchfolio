"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, ChevronLeft, ChevronRight, Code2, Users } from "lucide-react";
import { cn } from "cn";

import {
  applyToApplication,
  deleteApplication,
  updateApplication,
  type Application,
  type UpdateApplicationInput,
} from "@/entities/application";
import type { MyProject } from "@/entities/my-project";
import { recordedInterviewRounds, useScheduleRequests, type Schedule } from "@/entities/schedule";
import { getDdayTier, type DdayTier } from "@/shared/lib/dday";
import { formatDateTime } from "@/shared/lib/format-date-time";
import { todayKST } from "@/shared/lib/kst-date";
import { CreateApplicationDialog } from "@/features/create-application";
import { Button } from "@/shared/ui/button";
import { PageLayout } from "@/shared/ui/page-layout";
import {
  ApplicationDetailDialog,
  CodingTestScheduleDialog,
  InterviewSchedulePopover,
} from "@/widgets/kanban-board";

import { buildCalendarMonth, type CalendarEvent } from "../model/build-calendar-month";
import { buildUpcomingSchedule, type UnscheduledItem } from "../model/build-upcoming-schedule";

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
  return formatDateTime(time ? `${date}T${time}` : date) ?? "";
}

function UnscheduledRow({
  item,
  application,
  schedule,
  recordedRounds,
  onSaveInterviewRound,
  onRequestCodingTest,
}: {
  item: UnscheduledItem;
  application: Application | null;
  schedule: Schedule | null;
  recordedRounds: string[];
  onSaveInterviewRound: (id: string, round: string, scheduledAt: string | null) => void;
  onRequestCodingTest: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const isCodingTest = item.label === "코테";

  const trigger = (
    <Button
      variant="outline"
      size="xs"
      onClick={() => {
        if (isCodingTest) onRequestCodingTest(item.applicationId);
        else setOpen(true);
      }}
    >
      날짜 입력
    </Button>
  );

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="truncate text-sm">
        <span className="font-medium">{item.company}</span>{" "}
        <span className="text-muted-foreground">{item.label}</span>
      </span>
      {!isCodingTest && application ? (
        <InterviewSchedulePopover
          application={application}
          schedule={schedule}
          recordedRounds={recordedRounds}
          open={open}
          onOpenChange={setOpen}
          onSave={onSaveInterviewRound}
          trigger={trigger}
        />
      ) : (
        trigger
      )}
    </div>
  );
}

const SCHEDULE_PLACES = [
  { icon: CalendarClock, title: "관심 공고 마감일", hint: "공고를 추가하면 마감일이 들어와요" },
  { icon: Code2, title: "코딩테스트", hint: "카드를 코딩테스트로 옮기고 날짜를 넣어요" },
  { icon: Users, title: "면접", hint: "면접 차수와 날짜를 넣어요" },
] as const;

// 일정이 하나도 없을 때 "어디서 일정이 생기는지"를 보여준다. 첫 항목은 공고 추가 모달을
// 바로 열고, 나머지는 보드로 옮겨준다.
function EmptySchedulePlaces({ onNavigateToBoard }: { onNavigateToBoard?: () => void }) {
  return (
    <div className="flex flex-col gap-1">
      {SCHEDULE_PLACES.map(({ icon: Icon, title, hint }, i) => {
        const row = (
          <button
            type="button"
            onClick={i === 0 ? undefined : onNavigateToBoard}
            className="flex items-start gap-2.5 rounded-md px-1.5 py-2 text-left hover:bg-accent"
          >
            <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span className="flex flex-col gap-0.5">
              <span className="text-sm">{title}</span>
              <span className="text-[11.5px] text-muted-foreground">{hint}</span>
            </span>
          </button>
        );
        return i === 0 ? <CreateApplicationDialog key={title} trigger={row} /> : <div key={title}>{row}</div>;
      })}
    </div>
  );
}

export function CalendarView({
  applications,
  schedules,
  myProjects,
  onNavigateToBoard,
}: {
  applications: Application[];
  schedules: Schedule[];
  myProjects: MyProject[];
  onNavigateToBoard?: () => void;
}) {
  const router = useRouter();
  const myProjectTechStack = [...new Set(myProjects.flatMap((p) => p.techStack))];
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
    pendingCodingTestApplication,
    pendingCodingTestSchedule,
    setPendingCodingTestId,
    handleSetInterviewRound,
    handleSetCodingTestSchedule,
  } = useScheduleRequests(applications, scheduleItems, setScheduleItems);

  const calendar = buildCalendarMonth(applications, scheduleItems, year, month, today);
  const { upcoming, unscheduled } = buildUpcomingSchedule(applications, scheduleItems, today);

  const detailApplication = applications.find((app) => app.id === detailId) ?? null;
  const detailCompany = applications.find((app) => app.id === detailCompanyId) ?? null;

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

  function handleApply(company: Application) {
    setDetailCompanyId(null);
    applyToApplication(company.id)
      .then(() => router.refresh())
      .catch(console.error);
  }

  function handleDeleteApplication(id: string) {
    const app = applications.find((a) => a.id === id);
    setDetailId(null);
    deleteApplication(id, { screenshotPaths: app?.screenshotPaths })
      .then(() => router.refresh())
      .catch(console.error);
  }

  return (
    <PageLayout
      title={`${year}년 ${month}월`}
      action={
        <>
          <Button variant="ghost" size="icon-sm" onClick={() => goTo(-1)}>
            <ChevronLeft />
          </Button>
          <Button variant="outline" size="sm" onClick={goToday}>
            오늘
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => goTo(1)}>
            <ChevronRight />
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 md:flex-row md:gap-8">
        <div className="hidden min-w-0 flex-1 flex-col gap-4 md:flex">
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

        <div className="flex w-full flex-col gap-3 md:w-[220px] md:shrink-0">
          <p className="text-xs text-muted-foreground">다가오는 일정</p>

          {upcoming.length === 0 && unscheduled.length === 0 ? (
            <EmptySchedulePlaces onNavigateToBoard={onNavigateToBoard} />
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
                    <UnscheduledRow
                      key={item.applicationId}
                      item={item}
                      application={applications.find((a) => a.id === item.applicationId) ?? null}
                      schedule={
                        scheduleItems.find(
                          (s) => s.applicationId === item.applicationId && s.stage === "interview"
                        ) ?? null
                      }
                      recordedRounds={recordedInterviewRounds(scheduleItems, item.applicationId)}
                      onSaveInterviewRound={handleSetInterviewRound}
                      onRequestCodingTest={setPendingCodingTestId}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

      </div>

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
          key={`detail-${detailApplication?.id ?? "none"}`}
          application={detailApplication}
          schedule={detailId ? (latestSchedules.get(detailId) ?? null) : null}
          interviewRounds={detailId ? recordedInterviewRounds(scheduleItems, detailId) : []}
          myProjectTechStack={myProjectTechStack}
          myProjects={myProjects}
          onOpenChange={(open) => {
            if (!open) setDetailId(null);
          }}
          onUpdate={handleUpdateApplication}
          onDelete={handleDeleteApplication}
          onSaveInterviewRound={handleSetInterviewRound}
          onSaveCodingTestSchedule={handleSetCodingTestSchedule}
        />
        <ApplicationDetailDialog
          key={`detail-company-${detailCompany?.id ?? "none"}`}
          variant="interested"
          company={detailCompany}
          myProjectTechStack={myProjectTechStack}
          myProjects={myProjects}
          onOpenChange={(open: boolean) => {
            if (!open) setDetailCompanyId(null);
          }}
          onUpdate={handleUpdateApplication}
          onApply={handleApply}
        />
    </PageLayout>
  );
}
