"use client";

import { useState } from "react";
import { cn } from "cn";

import type { Application, ApplicationOutcome } from "@/entities/application";

import { KanbanColumn } from "./kanban-column";

type OutcomeFilter = "all" | ApplicationOutcome;

const FILTERS: { value: OutcomeFilter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "passed", label: "합격" },
  { value: "failed", label: "탈락" },
];

export function FinishedColumn({
  applications,
  onSaveInterviewRound,
  onCardClick,
  onOpenDetail,
  onDelete,
}: {
  applications: Application[];
  onSaveInterviewRound: (id: string, round: string, scheduledAt: string | null) => void;
  onCardClick: (id: string) => void;
  onOpenDetail: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [filter, setFilter] = useState<OutcomeFilter>("all");

  const filtered = applications.filter((app) =>
    filter === "all" ? true : app.outcome === filter
  );

  return (
    <KanbanColumn
      id="finished"
      title="종료"
      variant="outline"
      applications={filtered}
      onSaveInterviewRound={onSaveInterviewRound}
      onCardClick={onCardClick}
      onOpenDetail={onOpenDetail}
      onDelete={onDelete}
      headerExtra={
        <div className="ml-auto flex gap-0.5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={cn(
                "rounded-full px-1.5 py-0.5 text-xs transition-colors",
                filter === f.value
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      }
    />
  );
}
