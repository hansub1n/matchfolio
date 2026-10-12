import { APPLICATION_STATUSES, type Application } from "@/entities/application";

import { KanbanColumn } from "./kanban-column";
import { ResultColumn } from "./result-column";

export function KanbanBoard({ applications }: { applications: Application[] }) {
  return (
    <div className="flex gap-4 overflow-x-auto px-4 pb-4">
      {APPLICATION_STATUSES.map((status) => {
        const columnApplications = applications.filter(
          (app) => app.status === status.value
        );

        if (status.value === "result") {
          return <ResultColumn key={status.value} applications={columnApplications} />;
        }

        return (
          <KanbanColumn
            key={status.value}
            title={status.label}
            applications={columnApplications}
          />
        );
      })}
    </div>
  );
}
