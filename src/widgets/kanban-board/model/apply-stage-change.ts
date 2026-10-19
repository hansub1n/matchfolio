import type { Application, ApplicationStage } from "@/entities/application";

export type BoardColumnId = ApplicationStage | "finished";

// "finished"로 드래그하는 건 이 함수가 처리하지 않는다 — 합격/불합격을 고르기 전엔
// 어떤 state도 바뀌지 않아야 해서(고르면 그제서야 outcome이 생기고 finished 컬럼
// 필터에 걸려 들어온다), 그건 ResultPickerDialog에서 직접 outcome을 써준다.
export function applyStageChange(
  items: Application[],
  draggedId: string,
  nextStage: ApplicationStage
): Application[] {
  return items.map((app) => {
    if (app.id !== draggedId) return app;
    const leavingFinished = app.outcome !== "in_progress";
    return { ...app, stage: nextStage, outcome: leavingFinished ? "in_progress" : app.outcome };
  });
}
