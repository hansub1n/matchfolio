"use client";

import type { ReactNode } from "react";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "cn";

import type { Application, ApplicationStatus } from "@/entities/application";

import { ApplicationCard } from "./application-card";

export function KanbanColumn({
  id,
  title,
  applications,
  headerExtra,
}: {
  id: ApplicationStatus;
  title: string;
  applications: Application[];
  headerExtra?: ReactNode;
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
        <h2 className="text-sm font-medium">{title}</h2>
        <span className="text-xs text-muted-foreground">{applications.length}</span>
        {headerExtra}
      </div>
      <div className="flex flex-col gap-2 px-1 pb-2">
        {applications.map((application) => (
          <ApplicationCard key={application.id} application={application} />
        ))}
      </div>
    </div>
  );
}
