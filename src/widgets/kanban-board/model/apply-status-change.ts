import type { Application, ApplicationStatus } from "@/entities/application";

export function applyStatusChange(
  items: Application[],
  draggedId: string,
  nextStatus: ApplicationStatus
): Application[] {
  return items.map((app) => {
    if (app.id !== draggedId) return app;
    const leavingResult = app.status === "result" && nextStatus !== "result";
    return { ...app, status: nextStatus, result: leavingResult ? null : app.result };
  });
}
