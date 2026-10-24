import type { Application } from "@/entities/application";

export type DetailGroupId = "company" | "application" | "interview" | "posting";

// 상세 모달은 카드 단계에 맞는 영역만 먼저 펼친다. 나머지는 접혀 있을 뿐 언제든 연다.
// 관심: 지원할지 정하고 준비 → 회사 분석 + 지원 준비
// 서류: 결과 대기 — 지원 때 본 공고 매칭 결과를 다시 보게 지원 준비
// 코테·면접: 면접 준비
// 종료: 결과만 위에 보이고 전부 접어둔다(전체 기록은 펼쳐서 다시 본다)
export function defaultOpenGroups(app: Pick<Application, "stage" | "outcome">): DetailGroupId[] {
  if (app.outcome !== "in_progress") return [];
  switch (app.stage) {
    case "interested":
      return ["company", "application"];
    case "document":
      return ["application"];
    case "coding_test":
    case "interview":
      return ["interview"];
  }
}
