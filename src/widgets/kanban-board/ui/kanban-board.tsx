"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";

import {
  APPLICATION_STAGES,
  deleteApplication,
  updateApplication,
  type Application,
  type UpdateApplicationInput,
} from "@/entities/application";
import type { MyProject } from "@/entities/my-project";
import { useScheduleRequests, type Schedule } from "@/entities/schedule";

import { applyStageChange, type BoardColumnId } from "../model/apply-stage-change";
import { ApplicationDetailDialog } from "./application-detail-dialog";
import { CodingTestScheduleDialog } from "./coding-test-schedule-dialog";
import { FinishedColumn } from "./finished-column";
import { KanbanColumn } from "./kanban-column";
import { ResultPickerDialog } from "./result-picker-dialog";

export function KanbanBoard({
  applications,
  schedules,
  myProjects,
}: {
  applications: Application[];
  schedules: Schedule[];
  myProjects: MyProject[];
}) {
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

  // 면접 차수 진행 바(카드 하단)용 — 지금까지 몇 차수를 거쳤는지는 그 지원 건의
  // interview 스케줄 행 개수로 센다(차수마다 한 행씩 쌓이므로).
  const interviewRoundCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of scheduleItems) {
      if (s.stage !== "interview") continue;
      counts.set(s.applicationId, (counts.get(s.applicationId) ?? 0) + 1);
    }
    return counts;
  }, [scheduleItems]);

  const [pendingOutcomeId, setPendingOutcomeId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailMode, setDetailMode] = useState<"view" | "edit">("view");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  function openDetail(id: string, mode: "view" | "edit") {
    setDetailMode(mode);
    setDetailId(id);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over) return;
    const target = over.id as BoardColumnId;
    const draggedId = active.id as string;
    const draggedApp = items.find((app) => app.id === draggedId);
    if (!draggedApp) return;

    if (target === "finished") {
      setPendingOutcomeId(draggedId);
      return;
    }

    const leavingFinished = draggedApp.outcome !== "in_progress";
    setItems((prev) => applyStageChange(prev, draggedId, target));
    updateApplication(draggedId, {
      stage: target,
      ...(leavingFinished ? { outcome: "in_progress" as const } : {}),
    }).catch(console.error);

    if (target === "interview" && !latestSchedules.get(draggedId)) {
      setAutoOpenRoundId(draggedId);
    }

    if (target === "coding_test" && !codingTestMarked.has(draggedId)) {
      setPendingCodingTestId(draggedId);
    }
  }

  function handleSetOutcome(id: string, outcome: "passed" | "failed") {
    setItems((prev) => prev.map((app) => (app.id === id ? { ...app, outcome } : app)));
    setPendingOutcomeId(null);
    updateApplication(id, { outcome }).catch(console.error);
  }

  function handleUpdateApplication(id: string, input: UpdateApplicationInput) {
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
    updateApplication(id, input).catch(console.error);
  }

  function handleDeleteApplication(id: string) {
    const app = items.find((a) => a.id === id);
    setItems((prev) => prev.filter((a) => a.id !== id));
    setDetailId(null);
    deleteApplication(id, { screenshotPaths: app?.screenshotPaths }).catch(console.error);
  }

  const pendingOutcomeApplication = items.find((app) => app.id === pendingOutcomeId) ?? null;
  const detailApplication = items.find((app) => app.id === detailId) ?? null;
  const detailSchedule = detailApplication ? latestSchedules.get(detailApplication.id) : null;

  return (
    <DndContext id="kanban-board" sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="grid flex-1 grid-cols-[repeat(4,minmax(240px,1fr))] items-stretch gap-3 overflow-x-auto px-6 pb-4">
        {APPLICATION_STAGES.map((stage) => {
          const columnApplications = items.filter(
            (app) => app.stage === stage.value && app.outcome === "in_progress"
          );

          return (
            <KanbanColumn
              key={stage.value}
              id={stage.value}
              title={stage.label}
              applications={columnApplications}
              schedules={latestSchedules}
              interviewRoundCounts={interviewRoundCounts}
              autoOpenRoundId={autoOpenRoundId}
              onAutoOpenHandled={() => setAutoOpenRoundId(null)}
              emptyPlaceholder={
                stage.value === "document" ? (
                  <div className="rounded-lg border border-dashed border-border p-4 text-center text-[11px] text-muted-foreground">
                    공고 스크린샷을 끌어다 놓으세요
                  </div>
                ) : undefined
              }
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
      <ApplicationDetailDialog
        key={`detail-${detailApplication?.id ?? "none"}`}
        application={detailApplication}
        schedule={detailSchedule ?? null}
        myProjectTechStack={myProjectTechStack}
        initialMode={detailMode}
        onOpenChange={(open) => {
          if (!open) setDetailId(null);
        }}
        onUpdate={handleUpdateApplication}
        onDelete={handleDeleteApplication}
        onSaveInterviewRound={handleSetInterviewRound}
        onSaveCodingTestSchedule={handleSetCodingTestSchedule}
      />
    </DndContext>
  );
}
