"use client";

import { useEffect, useEffectEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "cn";
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";

import {
  APPLICATION_STAGES,
  buildApplyInput,
  deleteApplication,
  updateApplication,
  type Application,
  type UpdateApplicationInput,
} from "@/entities/application";
import type { UserDocument } from "@/entities/document";
import type { MyProject } from "@/entities/my-project";
import {
  deleteSchedules,
  recordedInterviewRounds,
  useScheduleRequests,
  type Schedule,
} from "@/entities/schedule";
import {
  CreateApplicationDialog,
  type CreateApplicationStatus,
} from "@/features/create-application";
import { track } from "@/shared/lib/analytics";
import { registerApplicationOpener } from "@/shared/lib/application-open-store";
import { todayKST } from "@/shared/lib/kst-date";
import { blockInSampleMode } from "@/shared/lib/sample-mode";
import { openTutorial } from "@/shared/lib/tutorial-store";

import {
  applyStageChange,
  buildStageChangeInput,
  schedulesToDropOnStageChange,
  canMoveToFinished,
  type BoardColumnId,
} from "../model/apply-stage-change";
import { orderByDeadline } from "../model/order-by-deadline";
import { ApplicationDetailDialog } from "./application-detail-dialog";
import { CodingTestScheduleDialog } from "./coding-test-schedule-dialog";
import { FinishedColumn } from "./finished-column";
import { KanbanColumn } from "./kanban-column";
import { ResultPickerDialog } from "./result-picker-dialog";

export function KanbanBoard({
  applications,
  schedules,
  myProjects,
  documents,
}: {
  applications: Application[];
  schedules: Schedule[];
  myProjects: MyProject[];
  documents: UserDocument[];
}) {
  const router = useRouter();
  const myProjectTechStack = [...new Set(myProjects.flatMap((p) => p.techStack))];
  const [items, setItems] = useState(applications);
  const [prevApplications, setPrevApplications] = useState(applications);
  if (applications !== prevApplications) {
    setPrevApplications(applications);
    setItems(applications);
  }
  const [scheduleItems, setScheduleItems] = useState(schedules);
  const [prevSchedules, setPrevSchedules] = useState(schedules);
  if (schedules !== prevSchedules) {
    setPrevSchedules(schedules);
    setScheduleItems(schedules);
  }

  const {
    latestSchedules,
    autoOpenRoundId,
    setAutoOpenRoundId,
    pendingCodingTestApplication,
    pendingCodingTestSchedule,
    setPendingCodingTestId,
    handleSetInterviewRound,
    handleSetCodingTestSchedule,
  } = useScheduleRequests(items, scheduleItems, setScheduleItems);

  // "코테를 실제로 밟았는지" 통계용 — 코테 컬럼에 처음 들어갈 때 한 번만 다이얼로그로
  // 일정을 묻고(건너뛰기 가능), 이후 재진입 시엔 다시 묻지 않는다.
  const codingTestMarked = useMemo(
    () => new Set(scheduleItems.filter((s) => s.stage === "coding_test").map((s) => s.applicationId)),
    [scheduleItems]
  );

  // 면접 차수 진행 바(카드 하단)용 — 지금까지 거친 차수 라벨들을 기록 순서대로
  // 모아둔다(같은 차수 중복 행이 있어도 라벨 기준으로 한 번만 센다).
  const interviewRounds = useMemo(() => {
    const rounds = new Map<string, string[]>();
    for (const app of items) {
      rounds.set(app.id, recordedInterviewRounds(scheduleItems, app.id));
    }
    return rounds;
  }, [scheduleItems, items]);

  const [pendingOutcomeId, setPendingOutcomeId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailMode, setDetailMode] = useState<"view" | "edit">("view");
  // 컬럼에 스크린샷을 놓으면 그 컬럼(관심/서류)을 상태로 정한 채 추가 모달을 연다.
  const [fileDrop, setFileDrop] = useState<{
    id: number;
    files: File[];
    status: CreateApplicationStatus;
  } | null>(null);
  const sensors = useSensors(
    // 마우스는 8px 움직이면 드래그. 터치는 0.25초 길게 눌러야 드래그 — 바로 드래그되면 손가락으로 보드를
    // 옆으로 넘기거나 화면을 내리려다 카드가 끌려간다.
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } })
  );

  function openDetail(id: string, mode: "view" | "edit") {
    if (mode === "edit" && blockInSampleMode()) return;
    setDetailMode(mode);
    setDetailId(id);
  }

  // 공고 추가 모달의 "이미 추가한 공고예요 · 그 카드 열기" 같은 바깥 요청으로 상세를 연다.
  useEffect(() => registerApplicationOpener((id) => openDetail(id, "view")), []);

  // 드래그 중에는 컬럼 단위 멈춤(snap)을 끈다 — 화면 끝에서 자동으로 넘어갈 때 snap이 겹쳐 한 번에 휙 넘어갔다.
  const [isDragging, setIsDragging] = useState(false);

  function handleDragEnd({ active, over }: DragEndEvent) {
    setIsDragging(false);
    if (over && blockInSampleMode()) return;
    if (!over) return;
    const target = over.id as BoardColumnId;
    const draggedId = active.id as string;
    const draggedApp = items.find((app) => app.id === draggedId);
    if (!draggedApp) return;
    const from: BoardColumnId = draggedApp.outcome === "in_progress" ? draggedApp.stage : "finished";
    if (from !== target && (target !== "finished" || canMoveToFinished(draggedApp))) {
      track("card_moved", { from, to: target });
    }

    if (target === "finished") {
      if (canMoveToFinished(draggedApp)) setPendingOutcomeId(draggedId);
      return;
    }

    const today = todayKST();
    const droppedScheduleIds = schedulesToDropOnStageChange(scheduleItems, draggedApp, target);
    setItems((prev) => applyStageChange(prev, draggedId, target, today));
    if (droppedScheduleIds.length > 0) {
      setScheduleItems((prev) => prev.filter((s) => !droppedScheduleIds.includes(s.id)));
    }
    Promise.all([
      updateApplication(draggedId, buildStageChangeInput(draggedApp, target, today)),
      deleteSchedules(droppedScheduleIds),
    ])
      .then(() => router.refresh())
      .catch(console.error);

    if (target === "interview" && !scheduleItems.some((s) => s.applicationId === draggedId && s.stage === "interview")) {
      setAutoOpenRoundId(draggedId);
    }

    if (target === "coding_test" && !codingTestMarked.has(draggedId)) {
      setPendingCodingTestId(draggedId);
    }
  }

  function handleSetOutcome(id: string, outcome: "passed" | "failed") {
    setItems((prev) => prev.map((app) => (app.id === id ? { ...app, outcome } : app)));
    setPendingOutcomeId(null);
    updateApplication(id, { outcome })
      .then(() => router.refresh())
      .catch(console.error);
  }

  function handleUpdateApplication(id: string, input: UpdateApplicationInput) {
    if (blockInSampleMode()) return;
    setItems((prev) =>
      prev.map((app) =>
        app.id === id
          ? {
              ...app,
              ...input,
              techStack: input.techStack ?? app.techStack,
            }
          : app
      )
    );
    updateApplication(id, input)
      .then(() => router.refresh())
      .catch(console.error);
  }

  // "지원하기" — 같은 카드를 서류로 넘긴다(매칭/분석 결과가 그대로 이어짐).
  function handleApply(app: Application) {
    if (blockInSampleMode()) return;
    const input = buildApplyInput(todayKST());
    setItems((prev) => prev.map((a) => (a.id === app.id ? { ...a, ...input } : a)));
    setDetailId(null);
    updateApplication(app.id, input)
      .then(() => router.refresh())
      .catch(console.error);
  }

  // 보드 화면 어디서든 캡처를 붙여넣으면 관심 단계로 공고 추가를 시작한다. 입력칸이나 열려
  // 있는 모달 안에서의 붙여넣기는 그쪽이 처리하도록 건드리지 않는다(모달은 자체 onPaste가 있음).
  const handleDocumentPaste = useEffectEvent((e: ClipboardEvent) => {
    const target = e.target instanceof Element ? e.target : null;
    if (fileDrop || target?.closest("input, textarea, [contenteditable], [role='dialog']")) return;
    const files = Array.from(e.clipboardData?.items ?? [])
      .filter((item) => item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter((file): file is File => file !== null);
    if (files.length === 0) return;
    e.preventDefault();
    handleFilesDrop(files, "interested");
  });

  useEffect(() => {
    const listener = (e: ClipboardEvent) => handleDocumentPaste(e);
    document.addEventListener("paste", listener);
    return () => document.removeEventListener("paste", listener);
  }, []);

  function handleFilesDrop(files: File[], status: CreateApplicationStatus) {
    if (blockInSampleMode()) return;
    setFileDrop({ id: Date.now(), files, status });
  }

  function handleDeleteApplication(id: string) {
    if (blockInSampleMode()) return;
    const app = items.find((a) => a.id === id);
    setItems((prev) => prev.filter((a) => a.id !== id));
    setDetailId(null);
    deleteApplication(id, { screenshotPaths: app?.screenshotPaths })
      .then(() => router.refresh())
      .catch(console.error);
  }

  const pendingOutcomeApplication = items.find((app) => app.id === pendingOutcomeId) ?? null;
  const detailApplication = items.find((app) => app.id === detailId) ?? null;
  const detailSchedule = detailApplication ? latestSchedules.get(detailApplication.id) : null;
  const isInterestedDetail = detailApplication?.stage === "interested";
  const isBoardEmpty = items.length === 0;
  const today = todayKST();

  return (
    <DndContext
      id="kanban-board"
      sensors={sensors}
      onDragStart={() => {
        setIsDragging(true);
        // 휴대폰에서 길게 눌러 드래그가 시작된 순간을 손끝으로 알 수 있게 짧게 진동(지원하는 기기만).
        navigator.vibrate?.(10);
      }}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setIsDragging(false)}
      // 카드를 끌고 화면 끝에 가면 옆 컬럼으로 넘어가는데, 기본 속도는 휴대폰에서 너무 빨라 원하는 컬럼을
      // 지나쳤다. 끝에 더 가까이 가야 넘어가고(threshold), 천천히 넘어가게(acceleration) 줄인다.
      autoScroll={{ threshold: { x: 0.12, y: 0.12 }, acceleration: 4 }}
    >
      <div
        // 휴대폰은 컬럼이 화면 폭의 80%라 다음 컬럼이 살짝 보이고, 넘기면 컬럼 단위로 멈춘다.
        className={cn(
          "grid flex-1 snap-x snap-mandatory scroll-px-4 grid-cols-[repeat(5,minmax(80vw,1fr))] items-stretch gap-3 overflow-x-auto px-4 pb-4 sm:snap-none sm:grid-cols-[repeat(5,minmax(240px,1fr))] sm:px-6",
          isDragging && "snap-none"
        )}
      >
        {APPLICATION_STAGES.map((stage) => {
          const inColumn = items.filter(
            (app) => app.stage === stage.value && app.outcome === "in_progress"
          );
          const columnApplications =
            stage.value === "interested" ? orderByDeadline(inColumn, today) : inColumn;
          const dropStatus: CreateApplicationStatus | null =
            stage.value === "interested" ? "interested" : stage.value === "document" ? "applied" : null;

          return (
            <KanbanColumn
              key={stage.value}
              id={stage.value}
              title={stage.label}
              applications={columnApplications}
              schedules={latestSchedules}
              interviewRounds={interviewRounds}
              autoOpenRoundId={autoOpenRoundId}
              onAutoOpenHandled={() => setAutoOpenRoundId(null)}
              emptyPlaceholder={
                stage.value === "interested" ? (
                  <div
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border p-4 text-center text-[11px] text-muted-foreground",
                      isBoardEmpty && "flex-1 text-xs"
                    )}
                  >
                    <p>스크린샷을 여기로 끌어오거나</p>
                    <p>캡처 후 ⌘V / Ctrl+V</p>
                    {isBoardEmpty && (
                      <button
                        type="button"
                        onClick={() => openTutorial({ mode: "basic" })}
                        className="pointer-events-auto mt-1 text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                      >
                        사용법 보기
                      </button>
                    )}
                  </div>
                ) : undefined
              }
              onFilesDrop={dropStatus ? (files) => handleFilesDrop(files, dropStatus) : undefined}
              onSaveInterviewRound={handleSetInterviewRound}
              onRequestCodingTestSchedule={setPendingCodingTestId}
              onCardClick={(id) => openDetail(id, "view")}
              onOpenDetail={(id) => openDetail(id, "edit")}
              onDelete={handleDeleteApplication}
            />
          );
        })}
        <FinishedColumn
          applications={items.filter((app) => app.outcome !== "in_progress")}
          onSaveInterviewRound={handleSetInterviewRound}
          onCardClick={(id) => openDetail(id, "view")}
          onOpenDetail={(id) => openDetail(id, "edit")}
          onDelete={handleDeleteApplication}
        />
      </div>
      <ResultPickerDialog
        application={pendingOutcomeApplication}
        onSelect={handleSetOutcome}
        onOpenChange={(open) => {
          if (!open) setPendingOutcomeId(null);
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
      {isInterestedDetail ? (
        <ApplicationDetailDialog
          key={`detail-${detailApplication.id}`}
          variant="interested"
          company={detailApplication}
          myProjects={myProjects}
          documents={documents}
          myProjectTechStack={myProjectTechStack}
          initialMode={detailMode}
          onOpenChange={(open) => {
            if (!open) setDetailId(null);
          }}
          onUpdate={handleUpdateApplication}
          onDelete={handleDeleteApplication}
          onApply={handleApply}
        />
      ) : (
        <ApplicationDetailDialog
          key={`detail-${detailApplication?.id ?? "none"}`}
          application={detailApplication}
          schedule={detailSchedule ?? null}
          interviewRounds={detailApplication ? interviewRounds.get(detailApplication.id) ?? [] : []}
          myProjectTechStack={myProjectTechStack}
          myProjects={myProjects}
          documents={documents}
          initialMode={detailMode}
          onOpenChange={(open) => {
            if (!open) setDetailId(null);
          }}
          onUpdate={handleUpdateApplication}
          onDelete={handleDeleteApplication}
          onSaveInterviewRound={handleSetInterviewRound}
          onSaveCodingTestSchedule={handleSetCodingTestSchedule}
        />
      )}
      {fileDrop && (
        <CreateApplicationDialog
          key={fileDrop.id}
          trigger={null}
          open
          initialStatus={fileDrop.status}
          initialFiles={fileDrop.files}
          onOpenChange={(open) => {
            if (!open) setFileDrop(null);
          }}
        />
      )}
    </DndContext>
  );
}
