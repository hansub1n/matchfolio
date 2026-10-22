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
  interviewRoundCounts,
  autoOpenRoundId,
  onAutoOpenHandled,
  variant = "default",
  headerExtra,
  emptyPlaceholder,
  onSaveInterviewRound,
  onRequestCodingTestSchedule,
  onCardClick,
  onOpenDetail,
  onDelete,
}: {
  id: BoardColumnId;
  title: string;
  applications: Application[];
  schedules?: Map<string, Schedule>;
  interviewRoundCounts?: Map<string, number>;
  autoOpenRoundId?: string | null;
  onAutoOpenHandled?: () => void;
  variant?: "default" | "outline";
  headerExtra?: ReactNode;
  emptyPlaceholder?: ReactNode;
  onSaveInterviewRound: (id: string, round: string, scheduledAt: string | null) => void;
  onRequestCodingTestSchedule?: (id: string) => void;
  onCardClick?: (id: string) => void;
  onOpenDetail?: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        // 높이는 고정값 없이 그리드의 stretch에 맡긴다 — 부모(칸반 영역)가
        // flex-1로 남은 화면 높이를 갖고, 카드가 그보다 많아지면 자연히 더 늘어난다.
        "flex flex-col gap-3 rounded-xl p-2 transition-colors",
        variant === "outline" ? "border border-border" : "bg-lane",
        isOver && "bg-accent"
      )}
    >
      <div className="flex items-center gap-2 px-1">
        <h2 className="text-xs text-muted-foreground">{title}</h2>
        <span className="num text-xs text-muted-foreground">{applications.length}</span>
        {headerExtra}
      </div>
      <div className="flex flex-col gap-1.5">
        {applications.length === 0 && emptyPlaceholder}
        {applications.map((application) => (
          <ApplicationCard
            key={application.id}
            application={application}
            schedule={schedules?.get(application.id) ?? null}
            interviewRoundCount={interviewRoundCounts?.get(application.id) ?? 0}
            autoOpenRound={autoOpenRoundId === application.id}
            onAutoOpenHandled={onAutoOpenHandled}
            onSaveInterviewRound={onSaveInterviewRound}
            onRequestCodingTestSchedule={onRequestCodingTestSchedule}
            onCardClick={onCardClick}
            onOpenDetail={onOpenDetail}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}
