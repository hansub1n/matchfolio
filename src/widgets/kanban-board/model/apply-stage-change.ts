import type { Application, ApplicationStage } from "@/entities/application";
import type { Schedule } from "@/entities/schedule";

export type BoardColumnId = ApplicationStage | "finished";

export type StageChangeInput = Pick<Application, "stage"> &
  Partial<Pick<Application, "outcome" | "appliedAt">>;

// 드래그로 단계를 옮길 때 DB에 보낼 변경분. 관심 ↔ 지원 경계를 넘을 때 지원일을
// 같이 맞춘다 — 관심에서 나가는 게 곧 지원이라 지원일이 비어 있으면 오늘로 채우고,
// 관심으로 되돌리면 아직 지원 전이니 지원일을 비운다(통계/잔디에서 빠지도록).
export function buildStageChangeInput(
  app: Application,
  nextStage: ApplicationStage,
  today: string
): StageChangeInput {
  const input: StageChangeInput = { stage: nextStage };
  if (app.outcome !== "in_progress") input.outcome = "in_progress";
  if (nextStage === "interested") input.appliedAt = null;
  else if (app.stage === "interested" && !app.appliedAt) input.appliedAt = today;
  return input;
}

// 아직 지원하지 않은 관심 카드에는 합격/불합격 결과가 있을 수 없다.
export function canMoveToFinished(app: Application): boolean {
  return app.stage !== "interested";
}

// "finished"로 드래그하는 건 이 함수가 처리하지 않는다 — 합격/불합격을 고르기 전엔
// 어떤 state도 바뀌지 않아야 해서(고르면 그제서야 outcome이 생기고 finished 컬럼
// 필터에 걸려 들어온다), 그건 ResultPickerDialog에서 직접 outcome을 써준다.
export function applyStageChange(
  items: Application[],
  draggedId: string,
  nextStage: ApplicationStage,
  today: string
): Application[] {
  return items.map((app) =>
    app.id === draggedId ? { ...app, ...buildStageChangeInput(app, nextStage, today) } : app
  );
}

const STAGE_ORDER: Record<ApplicationStage, number> = {
  interested: 0,
  document: 1,
  coding_test: 2,
  interview: 3,
};

// 앞 단계로 되돌리면, 되돌아간 단계보다 뒤 단계의 일정을 지운다(면접 → 코테면 면접 일정, 서류·관심이면
// 전부) — 아직 거치지 않은 단계 일정이 캘린더에 남지 않게. 앞으로 나아갈 땐 지난 단계 일정을
// 기록으로 남긴다. 종료로 옮기는 건 stage가 남으므로 여기서 다루지 않는다.
export function schedulesToDropOnStageChange(
  schedules: Schedule[],
  app: Pick<Application, "id" | "stage">,
  nextStage: ApplicationStage
): string[] {
  if (STAGE_ORDER[nextStage] >= STAGE_ORDER[app.stage]) return [];
  return schedules
    .filter((s) => s.applicationId === app.id && STAGE_ORDER[s.stage] > STAGE_ORDER[nextStage])
    .map((s) => s.id);
}
