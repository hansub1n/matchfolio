"use client";

import { useState } from "react";
import { cn } from "cn";

import type { Application, ApplicationResult } from "@/entities/application";

import { KanbanColumn } from "./kanban-column";

type ResultFilter = "all" | ApplicationResult;

const FILTERS: { value: ResultFilter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "passed", label: "합격" },
  { value: "failed", label: "불합격" },
];

export function ResultColumn({
  applications,
  onRequestResult,
}: {
  applications: Application[];
  onRequestResult: (id: string) => void;
}) {
  const [filter, setFilter] = useState<ResultFilter>("all");

  const filtered = applications.filter((app) =>
    filter === "all" ? true : app.result === filter
  );

  return (
    <KanbanColumn
      id="result"
      title="결과"
      applications={filtered}
      onRequestResult={onRequestResult}
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
