import type { Application } from "./types";

// 관심 단계는 아직 지원하지 않은 공고라서 통계/잔디의 "지원" 집계에서 뺀다.
export function isSubmitted(app: Pick<Application, "stage">): boolean {
  return app.stage !== "interested";
}

// 마감일은 아직 지원하지 않은 관심 단계에만 의미가 있다 — 서류 이후 단계는
// 이미 지원을 마쳤으니 지난 마감일을 계속 보여줄 이유가 없다.
export function hasActiveDeadline(app: Pick<Application, "stage" | "deadline">): boolean {
  return app.stage === "interested" && app.deadline !== null;
}

// "지원하기"는 새 카드를 만드는 게 아니라 같은 카드의 단계를 넘기는 것 —
// id가 그대로라 공고 매칭/기업분석 결과가 그대로 이어진다.
export function buildApplyInput(today: string) {
  return { stage: "document" as const, outcome: "in_progress" as const, appliedAt: today };
}
