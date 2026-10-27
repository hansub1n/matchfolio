"use client";

import { useRef, useState } from "react";
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
import type { UserDocument } from "@/entities/document";
import type { MyProject } from "@/entities/my-project";
import { recordedInterviewRounds, useScheduleRequests, type Schedule } from "@/entities/schedule";
import { getDdayTier, type DdayTier } from "@/shared/lib/dday";
import { formatDateTime } from "@/shared/lib/format-date-time";
import { toKSTTimeString, todayKST } from "@/shared/lib/kst-date";
import { CreateApplicationDialog } from "@/features/create-application";
import { Button } from "@/shared/ui/button";
import { CompanyMonogram } from "@/shared/ui/company-monogram";
import { PageLayout } from "@/shared/ui/page-layout";
import {
  ApplicationDetailDialog,
  CodingTestScheduleDialog,
  InterviewScheduleDialog,
} from "@/widgets/kanban-board";

import { buildCalendarMonth, type CalendarDay, type CalendarEvent } from "../model/build-calendar-month";
import { buildUpcomingSchedule, type UnscheduledItem } from "../model/build-upcoming-schedule";

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
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

// 휴대폰 달력 칸의 일정 점 색 — 칩(tierClasses)과 같은 기준.
function dotClass(tier: DdayTier): string {
  switch (tier) {
    case "urgent":
      return "bg-urgent";
    case "soon":
      return "bg-highlight";
    case "past":
      return "bg-muted-foreground/40";
    default:
      return "bg-foreground/60";
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
        <InterviewScheduleDialog
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

const PANEL_LABEL = "text-[11px] text-muted-foreground";

// 달력에서 고른 날의 일정과 지원한 곳. "오늘" 버튼이나 같은 날짜를 다시 누르면 다가오는 일정으로 돌아간다.
function SelectedDayPanel({
  day,
  today,
  onOpenEvent,
  onOpenApplication,
}: {
  day: CalendarDay;
  today: string;
  onOpenEvent: (event: CalendarEvent) => void;
  onOpenApplication: (id: string) => void;
}) {
  return (
    <>
      {/* "다가오는 일정" 제목 줄과 같은 높이 — 패널이 바뀌어도 아래 내용이 밀리지 않게. */}
      <p className="flex h-4 items-center text-xs font-medium">
        {formatDateTime(day.date)}
        {day.date === today && <span className="ml-1 font-normal text-muted-foreground">· 오늘</span>}
      </p>

      <div className="flex flex-col gap-2">
        <p className={PANEL_LABEL}>일정{day.events.length > 0 && ` ${day.events.length}`}</p>
        {day.events.length === 0 ? (
          <p className="text-xs text-muted-foreground">없어요</p>
        ) : (
          day.events.map((event) => (
            <button
              key={event.id}
              type="button"
              onClick={() => onOpenEvent(event)}
              className="grid grid-cols-[2.5rem_1fr] items-baseline gap-2 rounded text-left hover:bg-accent/60"
            >
              <span className="text-[11px] tabular-nums text-muted-foreground">{event.time ?? "종일"}</span>
              <span className="truncate text-sm">
                <span className="font-medium">{event.company}</span>{" "}
                <span className="text-muted-foreground">{event.label}</span>
              </span>
            </button>
          ))
        )}
      </div>

      {day.applied.length > 0 && (
        <div className="flex flex-col gap-2 border-t pt-3">
          <p className={PANEL_LABEL}>지원 {day.applied.length}곳</p>
          {day.applied.map((app) => (
            <button
              key={app.id}
              type="button"
              onClick={() => onOpenApplication(app.id)}
              className="flex items-center gap-2 rounded text-left hover:bg-accent/60"
            >
              <CompanyMonogram company={app.company} />
              <span className="min-w-0">
                <span className="block truncate text-sm">{app.company}</span>
                {app.position && (
                  <span className="block truncate text-[11px] text-muted-foreground">{app.position}</span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

export function CalendarView({
  applications,
  schedules,
  myProjects,
  documents,
  onNavigateToBoard,
}: {
  applications: Application[];
  schedules: Schedule[];
  myProjects: MyProject[];
  documents: UserDocument[];
  onNavigateToBoard?: () => void;
}) {
  const router = useRouter();
  const myProjectTechStack = [...new Set(myProjects.flatMap((p) => p.techStack))];
  const today = todayKST();
  const nowTime = toKSTTimeString(new Date());
  const [year, setYear] = useState(Number(today.slice(0, 4)));
  const [month, setMonth] = useState(Number(today.slice(5, 7)));
  const [detailId, setDetailId] = useState<string | null>(null);
  // 달력에서 고른 날짜 — 고르면 오른쪽 패널이 "다가오는 일정" 대신 그날 일정을 보여준다(지난 날짜 포함).
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
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

  // 이번 달로 돌아오면서 고른 날짜도 풀어 오른쪽 패널을 다가오는 일정으로 되돌린다.
  function goToday() {
    setYear(Number(today.slice(0, 4)));
    setMonth(Number(today.slice(5, 7)));
    setSelectedDate(null);
  }

  const selectedDay = calendar.weeks.flat().find((day) => day.date === selectedDate) ?? null;

  // 지난 날·앞으로의 날 모두 누르면 그날을 보여주고, 같은 날을 다시 눌러도 그대로 둔다(눌러서 풀리면 실수로
  // 두 번 누를 때 패널이 갑자기 바뀌어서). 다가오는 일정으로 돌아가는 길은 "오늘" 버튼과 오늘 칸 — 다가오는
  // 일정이 오늘부터 보여주므로 오늘 칸은 따로 고르지 않는다.
  function selectDate(date: string) {
    setSelectedDate(date === today ? null : date);
    // 휴대폰은 패널이 달력 아래라 눌러도 화면 밖에 있다 — 보일 만큼 부드럽게 내려간다. 데스크톱은 옆이라 그대로.
    requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel || panel.getBoundingClientRect().top < window.innerHeight - 120) return;
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      panel.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    });
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
        {/* 휴대폰에서도 달력을 보여준다 — 칸이 좁아 일정 이름 대신 점으로, 날짜를 누르면 아래 패널에 그날 일정. */}
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {/* 요일도 날짜 숫자와 같은 정렬 — 휴대폰 가운데, 데스크톱 왼쪽(칸 안쪽 여백만큼 들여서). */}
          <div className="grid grid-cols-7 text-center text-[11px] text-muted-foreground md:text-left [&>span]:md:px-1.5">
            {WEEKDAY_LABELS.map((label) => (
              // 주말 색은 쓰지 않는다 — 이 달력의 색은 마감 임박(주황·연두)과 지원한 날(연두 밑줄)을 뜻해서,
              // 빨강·파랑이 섞이면 그 색들이 덜 보인다.
              <span key={label}>{label}</span>
            ))}
          </div>

          <div className="flex flex-col">
            {calendar.weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-7 border-t border-border">
                {week.map((day) => {
                  const tier = getDdayTier(day.date, today);
                  const isSelected = day.date === selectedDate;
                  const hasApplied = day.appliedCount > 0 && day.date < today;
                  return (
                    <div
                      key={day.date}
                      role="button"
                      tabIndex={0}
                      aria-pressed={isSelected}
                      onClick={() => selectDate(day.date)}
                      onKeyDown={(e) => {
                        if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
                          e.preventDefault();
                          selectDate(day.date);
                        }
                      }}
                      className={cn(
                        // 선택은 칸을 칠하지 않고 숫자 동그라미로만 — 좁고 긴 칸이 통째로 칠해지면 무거웠다.
                        // hover 배경은 데스크톱만(휴대폰은 누른 뒤에도 hover가 남아 칠해진 것처럼 보임).
                        "flex min-h-12 cursor-pointer flex-col gap-1 p-1 outline-none focus-visible:bg-accent md:min-h-[76px] md:p-1.5 md:hover:bg-accent/60"
                      )}
                    >
                      <div className="flex items-center justify-center gap-1 md:justify-start">
                        {/* 날짜 상태는 전부 숫자 동그라미 하나로: 오늘 = 검은 채움, 선택 = 검은 테두리, 지원한 날 = 연한
                            연두 채움(통계 잔디와 같은 색). 일정은 그 아래 점. */}
                        <span
                          title={hasApplied ? `${day.appliedCount}곳 지원` : undefined}
                          className={cn(
                            "inline-flex size-7 items-center justify-center rounded-full text-sm tabular-nums md:size-6 md:text-xs",
                            day.isToday
                              ? "bg-foreground font-medium text-background"
                              : day.isCurrentMonth
                                ? "text-foreground"
                                : "text-muted-foreground/50",
                            isSelected && !day.isToday && "ring-1 ring-foreground"
                          )}
                          style={hasApplied && !day.isToday ? { backgroundColor: "var(--heat-1)" } : undefined}
                        >
                          {Number(day.date.slice(8, 10))}
                        </span>
                      </div>
                      {/* 휴대폰: 일정 수만큼 점(최대 3개, 마감 임박 색 그대로, 지난 일정은 회색). 날짜를 누르면 아래 패널. */}
                      {day.events.length > 0 && (
                        <div aria-hidden className="flex justify-center gap-0.5 md:hidden">
                          {day.events.slice(0, 3).map((event) => (
                            <span key={event.id} className={cn("size-1.5 rounded-full", dotClass(tier))} />
                          ))}
                        </div>
                      )}
                      <div className="flex flex-col gap-0.5 max-md:hidden">
                        {day.events.slice(0, MAX_VISIBLE_CHIPS).map((event) => (
                          <button
                            key={event.id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEvent(event);
                            }}
                            className={cn(
                              "truncate rounded px-1.5 py-0.5 text-left text-[10.5px] hover:opacity-80",
                              tierClasses(tier)
                            )}
                          >
                            {event.company} {event.label}
                          </button>
                        ))}
                        {day.events.length > MAX_VISIBLE_CHIPS && (
                          // 칸이 좁아 2개까지만 보이고, 나머지는 날짜를 눌러 오른쪽 패널에서 본다.
                          <span className="px-1.5 text-[10.5px] text-muted-foreground">
                            +{day.events.length - MAX_VISIBLE_CHIPS}개 더
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

        <div ref={panelRef} className="flex w-full scroll-mt-36 flex-col gap-3 md:scroll-mt-28 md:w-[220px] md:shrink-0">
          {selectedDay ? (
            <SelectedDayPanel
              day={selectedDay}
              today={today}
              onOpenEvent={openEvent}
              onOpenApplication={setDetailId}
            />
          ) : (
            <>
            <p className="flex h-4 items-center text-xs text-muted-foreground">다가오는 일정</p>

            {upcoming.length === 0 && unscheduled.length === 0 ? (
              <>
                <p className="text-sm">다가오는 일정이 없어요</p>
                <EmptySchedulePlaces onNavigateToBoard={onNavigateToBoard} />
              </>
            ) : (
              <>
                <div className="flex flex-col gap-3">
                  {upcoming.map((event) => {
                    // 오늘 일정은 시간이 지나도 하루 동안 남기되(그날 무슨 일정이 있었는지 보려고) 흐리게 둔다.
                    const isPastToday = event.date === today && event.time !== null && event.time < nowTime;
                    return (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => openEvent(event)}
                      // 서버와 브라우저의 "지금" 분이 다를 수 있어서 흐림 여부 차이는 경고하지 않는다.
                      suppressHydrationWarning
                      className={cn("flex flex-col gap-0.5 text-left", isPastToday && "opacity-50")}
                    >
                      <span
                        className={cn(
                          "text-[11px] tabular-nums",
                          event.date === today && !isPastToday ? "text-urgent" : "text-muted-foreground"
                        )}
                      >
                        {formatUpcomingDate(event.date, event.time, today)}
                      </span>
                      <span className="text-sm">
                        <span className="font-medium">{event.company}</span>{" "}
                        <span className="text-muted-foreground">{event.label}</span>
                      </span>
                    </button>
                    );
                  })}
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
          documents={documents}
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
          documents={documents}
          onOpenChange={(open: boolean) => {
            if (!open) setDetailCompanyId(null);
          }}
          onUpdate={handleUpdateApplication}
          onApply={handleApply}
        />
    </PageLayout>
  );
}
