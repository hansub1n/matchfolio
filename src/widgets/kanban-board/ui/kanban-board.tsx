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
import {
  createSchedule,
  latestScheduleByApplication,
  updateSchedule,
  type Schedule,
} from "@/entities/schedule";

import { applyStageChange, type BoardColumnId } from "../model/apply-stage-change";
import { shouldUpdateExistingSchedule } from "../model/resolve-interview-round";
import { ApplicationDetailDialog } from "./application-detail-dialog";
import { CodingTestScheduleDialog } from "./coding-test-schedule-dialog";
import { FinishedColumn } from "./finished-column";
import { InterviewRoundDialog } from "./interview-round-dialog";
import { KanbanColumn } from "./kanban-column";
import { ResultPickerDialog } from "./result-picker-dialog";

export function KanbanBoard({
  applications,
  schedules,
}: {
  applications: Application[];
  schedules: Schedule[];
}) {
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
  const latestSchedules = useMemo(
    () => latestScheduleByApplication(scheduleItems),
    [scheduleItems]
  );
  // "코테를 실제로 밟았는지" 통계용 — 코테 컬럼에 처음 들어갈 때 한 번만 다이얼로그로
  // 일정을 묻고(건너뛰기 가능), 이후 재진입 시엔 다시 묻지 않는다.
  const codingTestMarked = useMemo(
    () => new Set(scheduleItems.filter((s) => s.stage === "coding_test").map((s) => s.applicationId)),
    [scheduleItems]
  );

  const [pendingOutcomeId, setPendingOutcomeId] = useState<string | null>(null);
  const [pendingRoundId, setPendingRoundId] = useState<string | null>(null);
  const [pendingCodingTestId, setPendingCodingTestId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

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
      setPendingRoundId(draggedId);
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

  function handleSetInterviewRound(id: string, round: string, scheduledAt: string | null) {
    setPendingRoundId(null);
    const existing = latestSchedules.get(id);

    if (shouldUpdateExistingSchedule(existing, round)) {
      updateSchedule(existing.id, { scheduledAt })
        .then((updated) =>
          setScheduleItems((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
        )
        .catch(console.error);
      return;
    }

    createSchedule({ applicationId: id, stage: "interview", roundLabel: round, scheduledAt })
      .then((created) => setScheduleItems((prev) => [created, ...prev]))
      .catch(console.error);
  }

  function handleSetCodingTestSchedule(id: string, scheduledAt: string | null) {
    setPendingCodingTestId(null);
    const existing = scheduleItems.find((s) => s.applicationId === id && s.stage === "coding_test");

    if (existing) {
      updateSchedule(existing.id, { scheduledAt })
        .then((updated) =>
          setScheduleItems((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
        )
        .catch(console.error);
      return;
    }

    createSchedule({ applicationId: id, stage: "coding_test", scheduledAt })
      .then((created) => setScheduleItems((prev) => [created, ...prev]))
      .catch(console.error);
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
  const pendingRoundApplication = items.find((app) => app.id === pendingRoundId) ?? null;
  const pendingCodingTestApplication =
    items.find((app) => app.id === pendingCodingTestId) ?? null;
  const pendingCodingTestSchedule = pendingCodingTestApplication
    ? (scheduleItems.find(
        (s) => s.applicationId === pendingCodingTestApplication.id && s.stage === "coding_test"
      ) ?? null)
    : null;
  const detailApplication = items.find((app) => app.id === detailId) ?? null;
  const detailSchedule = detailApplication ? latestSchedules.get(detailApplication.id) : null;

  return (
    <DndContext id="kanban-board" sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto px-6 pb-4">
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
              onRequestInterviewRound={setPendingRoundId}
              onRequestCodingTestSchedule={setPendingCodingTestId}
              onOpenDetail={setDetailId}
              onDelete={handleDeleteApplication}
            />
          );
        })}
        <FinishedColumn
          applications={items.filter((app) => app.outcome !== "in_progress")}
          onOpenDetail={setDetailId}
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
      <InterviewRoundDialog
        key={`round-${pendingRoundApplication?.id ?? "none"}`}
        application={pendingRoundApplication}
        schedule={pendingRoundApplication ? latestSchedules.get(pendingRoundApplication.id) : null}
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
        schedule={detailSchedule ?? null}
        onOpenChange={(open) => {
          if (!open) setDetailId(null);
        }}
        onUpdate={handleUpdateApplication}
      />
    </DndContext>
  );
}
