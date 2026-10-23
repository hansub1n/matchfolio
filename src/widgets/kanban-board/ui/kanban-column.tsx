"use client";

import { useState, type DragEvent, type ReactNode } from "react";
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
  interviewRounds,
  autoOpenRoundId,
  onAutoOpenHandled,
  variant = "default",
  headerExtra,
  emptyPlaceholder,
  onFilesDrop,
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
  interviewRounds?: Map<string, string[]>;
  autoOpenRoundId?: string | null;
  onAutoOpenHandled?: () => void;
  variant?: "default" | "outline";
  headerExtra?: ReactNode;
  emptyPlaceholder?: ReactNode;
  // 공고 스크린샷 파일을 이 컬럼에 놓으면 호출 — 놓은 컬럼이 새 공고의 상태가 된다.
  onFilesDrop?: (files: File[]) => void;
  onSaveInterviewRound: (id: string, round: string, scheduledAt: string | null) => void;
  onRequestCodingTestSchedule?: (id: string) => void;
  onCardClick?: (id: string) => void;
  onOpenDetail?: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const [fileOver, setFileOver] = useState(false);

  // 카드 드래그(dnd-kit, 포인터 이벤트)와 별개로, 브라우저 파일 드래그만 받는다.
  const isFileDrag = (e: DragEvent) => e.dataTransfer.types.includes("Files");
  const fileDropHandlers = onFilesDrop && {
    onDragOver: (e: DragEvent) => {
      if (!isFileDrag(e)) return;
      e.preventDefault();
      setFileOver(true);
    },
    onDragLeave: (e: DragEvent) => {
      if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
      setFileOver(false);
    },
    onDrop: (e: DragEvent) => {
      if (!isFileDrag(e)) return;
      e.preventDefault();
      setFileOver(false);
      const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
      if (files.length > 0) onFilesDrop(files);
    },
  };

  return (
    <div
      ref={setNodeRef}
      {...fileDropHandlers}
      className={cn(
        // 높이는 고정값 없이 그리드의 stretch에 맡긴다 — 부모(칸반 영역)가
        // flex-1로 남은 화면 높이를 갖고, 카드가 그보다 많아지면 자연히 더 늘어난다.
        "flex flex-col gap-3 rounded-xl p-2 transition-colors",
        variant === "outline" ? "border border-border" : "bg-lane",
        (isOver || fileOver) && "bg-accent"
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
            interviewRounds={interviewRounds?.get(application.id) ?? []}
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
