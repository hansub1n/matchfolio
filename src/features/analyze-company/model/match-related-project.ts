import { techSatisfies } from "@/shared/lib/tech-aliases";

// 기본 질문(기본 6개)의 "프로젝트 경험" 카테고리에 relatedProjectId를 붙이는
// 용도. AI 프롬프트에는 프로젝트 정보를 아예 안 줘서(이름을 질문 본문에 지어
// 넣는 걸 막기 위해) relatedProjectId는 항상 이 함수로 생성 후에 붙인다 —
// 공고 기술스택과 겹치는 게 가장 많은 프로젝트를 고른다. 겹치는 게 하나도
// 없으면 null.
export function matchRelatedProject(
  jobTechStack: string[],
  projects: { id: string; techStack: string[] }[]
): string | null {
  let bestId: string | null = null;
  let bestScore = 0;
  for (const project of projects) {
    const score = jobTechStack.filter((required) =>
      project.techStack.some((owned) => techSatisfies(required, owned))
    ).length;
    if (score > bestScore) {
      bestScore = score;
      bestId = project.id;
    }
  }
  return bestId;
}
