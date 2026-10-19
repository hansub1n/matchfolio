"use client";

import type { ReactNode } from "react";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "cn";

import type { Application } from "@/entities/application";
import type { Schedule } from "@/entities/schedule";

import type { BoardColumnId } from "../model/apply-stage-change";
import { ApplicationCard } from "./application-card";

export function KanbanColumn({
  id,
  title,
  applications,
  schedules,
  headerExtra,
  onRequestInterviewRound,
  onRequestCodingTestSchedule,
  onOpenDetail,
  onDelete,
}: {
  id: BoardColumnId;
  title: string;
  applications: Application[];
  schedules?: Map<string, Schedule>;
  headerExtra?: ReactNode;
  onRequestInterviewRound?: (id: string) => void;
  onRequestCodingTestSchedule?: (id: string) => void;
  onOpenDetail?: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-64 shrink-0 flex-col gap-3 rounded-lg transition-colors",
        isOver && "bg-muted/60"
      )}
    >
      <div className="flex items-center gap-2 px-1">
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium text-muted-foreground">
          {applications.length}
        </span>
        {headerExtra}
      </div>
      <div className="flex flex-col gap-2 px-1 pb-2">
        {applications.map((application) => (
          <ApplicationCard
            key={application.id}
            application={application}
            schedule={schedules?.get(application.id) ?? null}
            onRequestInterviewRound={onRequestInterviewRound}
            onRequestCodingTestSchedule={onRequestCodingTestSchedule}
            onOpenDetail={onOpenDetail}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}
