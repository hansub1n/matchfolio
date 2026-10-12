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
  type Application,
  type ApplicationStatus,
} from "@/entities/application";

import { KanbanColumn } from "./kanban-column";
import { ResultColumn } from "./result-column";

export function KanbanBoard({ applications }: { applications: Application[] }) {
  const [items, setItems] = useState(applications);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over) return;
    const nextStatus = over.id as ApplicationStatus;

    setItems((prev) =>
      prev.map((app) =>
        app.id === active.id ? { ...app, status: nextStatus } : app
      )
    );
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto px-4 pb-4">
        {APPLICATION_STATUSES.map((status) => {
          const columnApplications = items.filter((app) => app.status === status.value);

          if (status.value === "result") {
            return <ResultColumn key={status.value} applications={columnApplications} />;
          }

          return (
            <KanbanColumn
              key={status.value}
              id={status.value}
              title={status.label}
              applications={columnApplications}
            />
          );
        })}
      </div>
    </DndContext>
  );
}
