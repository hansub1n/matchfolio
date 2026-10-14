"use client";

import { useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";

import {
  APPLICATION_STATUSES,
  deleteApplication,
  updateApplication,
  type Application,
  type ApplicationResult,
  type ApplicationStatus,
  type UpdateApplicationInput,
} from "@/entities/application";

import { applyStatusChange } from "../model/apply-status-change";
import { ApplicationDetailDialog } from "./application-detail-dialog";
import { InterviewRoundDialog } from "./interview-round-dialog";
import { KanbanColumn } from "./kanban-column";
import { ResultColumn } from "./result-column";
import { ResultPickerDialog } from "./result-picker-dialog";

export function KanbanBoard({ applications }: { applications: Application[] }) {
  const [items, setItems] = useState(applications);
  const [prevApplications, setPrevApplications] = useState(applications);
  if (applications !== prevApplications) {
    setPrevApplications(applications);
    setItems(applications);
  }
  const [pendingResultId, setPendingResultId] = useState<string | null>(null);
  const [pendingRoundId, setPendingRoundId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over) return;
    const nextStatus = over.id as ApplicationStatus;
    const draggedId = active.id as string;
    const draggedApp = items.find((app) => app.id === draggedId);
    if (!draggedApp) return;

    const leavingResult = draggedApp.status === "result" && nextStatus !== "result";

    setItems((prev) => applyStatusChange(prev, draggedId, nextStatus));
    updateApplication(draggedId, {
      status: nextStatus,
      ...(leavingResult ? { result: null } : {}),
    }).catch(console.error);

    if (nextStatus === "result" && !draggedApp.result) {
      setPendingResultId(draggedId);
    }
    if (nextStatus === "interview" && !draggedApp.interviewRound) {
      setPendingRoundId(draggedId);
    }
  }

  function handleSetResult(id: string, result: ApplicationResult) {
    setItems((prev) => prev.map((app) => (app.id === id ? { ...app, result } : app)));
    setPendingResultId(null);
    updateApplication(id, { result }).catch(console.error);
  }

  function handleSetInterviewRound(id: string, round: string) {
    setItems((prev) =>
      prev.map((app) => (app.id === id ? { ...app, interviewRound: round } : app))
    );
    setPendingRoundId(null);
    updateApplication(id, { interviewRound: round }).catch(console.error);
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
    setItems((prev) => prev.filter((app) => app.id !== id));
    setDetailId(null);
    deleteApplication(id).catch(console.error);
  }

  const pendingApplication = items.find((app) => app.id === pendingResultId) ?? null;
  const pendingRoundApplication = items.find((app) => app.id === pendingRoundId) ?? null;
  const detailApplication = items.find((app) => app.id === detailId) ?? null;

  return (
    <DndContext id="kanban-board" sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto px-4 pb-4">
        {APPLICATION_STATUSES.map((status) => {
          const columnApplications = items.filter((app) => app.status === status.value);

          if (status.value === "result") {
            return (
              <ResultColumn
                key={status.value}
                applications={columnApplications}
                onRequestResult={setPendingResultId}
                onOpenDetail={setDetailId}
                onDelete={handleDeleteApplication}
              />
            );
          }

          return (
            <KanbanColumn
              key={status.value}
              id={status.value}
              title={status.label}
              applications={columnApplications}
              onRequestInterviewRound={setPendingRoundId}
              onOpenDetail={setDetailId}
              onDelete={handleDeleteApplication}
            />
          );
        })}
      </div>
      <ResultPickerDialog
        application={pendingApplication}
        onSelect={handleSetResult}
        onOpenChange={(open) => {
          if (!open) setPendingResultId(null);
        }}
      />
      <InterviewRoundDialog
        application={pendingRoundApplication}
        onSelect={handleSetInterviewRound}
        onOpenChange={(open) => {
          if (!open) setPendingRoundId(null);
        }}
      />
      <ApplicationDetailDialog
        application={detailApplication}
        onOpenChange={(open) => {
          if (!open) setDetailId(null);
        }}
        onUpdate={handleUpdateApplication}
      />
    </DndContext>
  );
}
