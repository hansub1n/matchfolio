import type { ProjectMatchWithCompany } from "@/entities/project-match";

export interface BestMatch {
  company: string;
  fitScore: number;
}

// project_matches가 회사별로 쌓여 있고 그 안의 각 항목이 projectName 문자열로만
// 프로젝트를 가리키기 때문에(FK 없음), 이 프로젝트 이름이 등장한 모든 회사의
// 결과를 훑어서 fitScore가 가장 높은 것 하나를 고른다.
export function computeBestMatch(
  projectName: string,
  allMatches: ProjectMatchWithCompany[]
): BestMatch | null {
  let best: BestMatch | null = null;
  for (const row of allMatches) {
    const entry = row.matches.find((m) => m.projectName === projectName);
    if (!entry) continue;
    if (!best || entry.fitScore > best.fitScore) {
      best = { company: row.company, fitScore: entry.fitScore };
    }
  }
  return best;
}
