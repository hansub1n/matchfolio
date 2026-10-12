import type { ReactNode } from "react";

import type { Application } from "@/entities/application";

import { ApplicationCard } from "./application-card";

export function KanbanColumn({
  title,
  applications,
  headerExtra,
}: {
  title: string;
  applications: Application[];
  headerExtra?: ReactNode;
}) {
  return (
    <div className="flex w-64 shrink-0 flex-col gap-3">
      <div className="flex items-center gap-2 px-1">
        <h2 className="text-sm font-medium">{title}</h2>
        <span className="text-xs text-muted-foreground">{applications.length}</span>
        {headerExtra}
      </div>
      <div className="flex flex-col gap-2">
        {applications.map((application) => (
          <ApplicationCard key={application.id} application={application} />
        ))}
      </div>
    </div>
  );
}
