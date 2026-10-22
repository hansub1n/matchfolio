"use client";

import { useEffect, useRef, useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { ArrowRight, Calendar, CalendarPlus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { cn } from "cn";

import { APPLICATION_STAGES, type Application } from "@/entities/application";
import type { Schedule } from "@/entities/schedule";
import { type DdayTier } from "@/shared/lib/dday";
import { formatDateTime } from "@/shared/lib/format-date-time";
import { formatDeadlineBadge } from "@/shared/lib/format-deadline";
import { todayKST } from "@/shared/lib/kst-date";
import { Button } from "@/shared/ui/button";
import { CompanyMonogram } from "@/shared/ui/company-monogram";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

import { InterviewSchedulePopover } from "./interview-schedule-popover";

const STAGE_LABELS = Object.fromEntries(
  APPLICATION_STAGES.map((stage) => [stage.value, stage.label])
);

// 카드 D-day 배지 전용 색 규칙 — 캘린더 탭 칩과 달리 지남/D-4 이상은 배경 없이
// 텍스트만 바꾼다(카드가 작아서 칩 배경을 여러 개 칠하면 더 복잡해 보임).
function deadlineBadgeClasses(tier: DdayTier): string {
  switch (tier) {
    case "urgent":
      return "bg-urgent text-urgent-foreground";
    case "soon":
      return "bg-highlight text-highlight-foreground";
    default:
      return "text-muted-foreground";
  }
}

function stopDrag(e: React.PointerEvent) {
  e.stopPropagation();
}

function stopClick(e: React.MouseEvent) {
  e.stopPropagation();
}

export function ApplicationCard({
  application,
  schedule,
  interviewRounds = [],
  autoOpenRound,
  onAutoOpenHandled,
  onSaveInterviewRound,
  onRequestCodingTestSchedule,
  onCardClick,
  onOpenDetail,
  onDelete,
}: {
  application: Application;
  schedule?: Schedule | null;
  interviewRounds?: string[];
  autoOpenRound?: boolean;
  onAutoOpenHandled?: () => void;
  onSaveInterviewRound: (id: string, round: string, scheduledAt: string | null) => void;
  onRequestCodingTestSchedule?: (id: string) => void;
  onCardClick?: (id: string) => void;
  onOpenDetail?: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  // 드래그로 막 면접 컬럼에 들어온 카드는 이 컬럼에서 처음 마운트되는 순간이라
  // (다른 컬럼 리스트에서 이 컬럼 리스트로 옮겨오는 거라 실제로 새로 마운트된다)
  // 초기값으로 바로 열어둘 수 있다 — 이펙트로 별도 동기화가 필요 없다.
  const [scheduleOpen, setScheduleOpen] = useState(Boolean(autoOpenRound));
  const [scheduleDefaultNext, setScheduleDefaultNext] = useState(false);
  const { setNodeRef, listeners, attributes, transform, isDragging } = useDraggable({
    id: application.id,
  });

  // 드래그가 끝난 직후 브라우저가 따라오는 클릭까지 상세 다이얼로그를 여는 걸
  // 막는다 — 새 포인터 상호작용이 시작될 때(capture 단계) 우선 내려두고,
  // 드래그 중이었다면 이펙트에서 다시 세운 뒤 다음 클릭 한 번만 무시하고 내린다.
  const wasDraggingRef = useRef(false);
  useEffect(() => {
    if (isDragging) wasDraggingRef.current = true;
  }, [isDragging]);

  // 보드 쪽의 "자동으로 열어야 할 카드" 표시를 한 번 썼으니 지워달라고 알려준다
  // (이 카드 자신의 open 상태는 위 초기값으로 이미 처리됐다).
  useEffect(() => {
    if (autoOpenRound) onAutoOpenHandled?.();
  }, [autoOpenRound, onAutoOpenHandled]);

  const isFinished = application.outcome !== "in_progress";
  const isPassed = application.outcome === "passed";
  const isFailed = application.outcome === "failed";
  const isInterviewing = application.stage === "interview" && !isFinished;
  const isCodingTest = application.stage === "coding_test" && !isFinished;
  const showBottomRow = isInterviewing || isCodingTest || isFailed || isPassed;

  const failureLabel =
    application.stage === "interview" && schedule?.roundLabel
      ? `${schedule.roundLabel} 면접 탈락`
      : `${STAGE_LABELS[application.stage]} 탈락`;

  const deadlineBadge =
    application.stage === "document" && !isFinished
      ? formatDeadlineBadge(application.deadline, todayKST())
      : null;
  const scheduleTimeLabel = formatDateTime(schedule?.scheduledAt ?? null);

  function handleScheduleButtonClick() {
    if (application.stage === "coding_test") {
      onRequestCodingTestSchedule?.(application.id);
    } else if (application.stage === "interview") {
      setScheduleDefaultNext(false);
      setScheduleOpen(true);
    }
  }

  function handleCardClick() {
    if (wasDraggingRef.current) {
      wasDraggingRef.current = false;
      return;
    }
    onCardClick?.(application.id);
  }

  function handleCardKeyDown(e: React.KeyboardEvent) {
    // 카드 안 버튼에 포커스가 있을 때 누른 Enter/Space는 그 버튼 자체의 동작이어야
    // 하고, 카드 열기로 번지면 안 된다 — 이벤트가 카드 자신에서 시작했을 때만 연다.
    if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
      e.preventDefault();
      onCardClick?.(application.id);
    }
  }

  const scheduleButton = (
    <button
      type="button"
      onPointerDown={stopDrag}
      onClick={(e) => {
        stopClick(e);
        handleScheduleButtonClick();
      }}
      className="flex items-center gap-1 rounded px-1 text-[11px] font-normal text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      {scheduleTimeLabel ? (
        <Calendar className="size-3" />
      ) : (
        <CalendarPlus className="size-3" />
      )}
      <span className={scheduleTimeLabel ? "num" : undefined}>
        {scheduleTimeLabel ?? "일정 미정"}
      </span>
    </button>
  );

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onPointerDownCapture={() => {
        wasDraggingRef.current = false;
      }}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      style={{
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
        touchAction: "none",
      }}
      className={isDragging ? "cursor-grabbing opacity-50" : "cursor-pointer"}
    >
      <div
        className={cn(
          "group relative flex flex-col rounded-lg border px-3 py-2.5 text-sm transition-colors",
          isFinished ? "border-transparent" : "border-border bg-card hover:bg-accent"
        )}
      >
        <div className="flex items-center gap-2">
          <CompanyMonogram company={application.company} muted={isFailed} />
          <span
            className={cn(
              "min-w-0 flex-1 truncate font-medium",
              isFailed && "text-muted-foreground"
            )}
          >
            {application.company}
          </span>

          <div className="flex shrink-0 items-center gap-0.5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  onPointerDown={stopDrag}
                  onClick={stopClick}
                  className="rounded-sm p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 hover:bg-muted hover:text-foreground [@media(hover:none)]:opacity-100"
                >
                  <MoreHorizontal className="size-3.5" />
                  <span className="sr-only">더보기</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onPointerDown={stopDrag} onClick={stopClick}>
                <DropdownMenuItem onSelect={() => onOpenDetail?.(application.id)}>
                  <Pencil className="size-3.5" />
                  수정
                </DropdownMenuItem>
                {isInterviewing && (
                  <DropdownMenuItem
                    onSelect={() => {
                      setScheduleDefaultNext(true);
                      setScheduleOpen(true);
                    }}
                  >
                    <ArrowRight className="size-3.5" />
                    다음 차수로 진행
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem variant="destructive" onSelect={() => setConfirmOpen(true)}>
                  <Trash2 className="size-3.5" />
                  삭제
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex items-center group-hover:hidden group-focus-within:hidden">
              {deadlineBadge && (
                <span
                  className={cn(
                    "num rounded px-1.5 py-0.5 text-[11px]",
                    deadlineBadgeClasses(deadlineBadge.tier)
                  )}
                >
                  {deadlineBadge.label}
                </span>
              )}
            </div>
          </div>
        </div>

        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{application.position}</p>

        {!isFinished && application.techStack.length > 0 && (
          <p className="mt-1.5 truncate text-[11px] text-muted-foreground">
            {application.techStack.slice(0, 3).join(" · ")}
          </p>
        )}

        {showBottomRow && (
          <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-[11px]">
            {isFailed ? (
              <span className="text-destructive">{failureLabel}</span>
            ) : isPassed ? (
              <span className="text-foreground">
                <span className="bg-[linear-gradient(transparent_58%,var(--highlight)_58%)] px-0.5">
                  최종 합격
                </span>
              </span>
            ) : (
              <>
                {isInterviewing ? (
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="flex items-center gap-0.5">
                      {Array.from({ length: Math.max(interviewRounds.length, 1) }).map((_, i) => (
                        <span
                          key={i}
                          className={cn(
                            "h-1 w-3.5 rounded-full",
                            i < interviewRounds.length - 1 ? "bg-foreground" : "bg-border"
                          )}
                        />
                      ))}
                    </span>
                    {interviewRounds.length > 0
                      ? `${interviewRounds[interviewRounds.length - 1]} 면접`
                      : "면접"}
                  </span>
                ) : (
                  <span className="text-muted-foreground">코딩테스트</span>
                )}
                {isInterviewing ? (
                  <InterviewSchedulePopover
                    application={application}
                    schedule={schedule ?? null}
                    recordedRounds={interviewRounds}
                    open={scheduleOpen}
                    defaultNext={scheduleDefaultNext}
                    onOpenChange={setScheduleOpen}
                    onSave={onSaveInterviewRound}
                    trigger={scheduleButton}
                  />
                ) : (
                  scheduleButton
                )}
              </>
            )}
          </div>
        )}
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent onClick={stopClick}>
          <DialogHeader>
            <DialogTitle>{application.company} 카드를 삭제할까요?</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                onDelete?.(application.id);
                setConfirmOpen(false);
              }}
            >
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
