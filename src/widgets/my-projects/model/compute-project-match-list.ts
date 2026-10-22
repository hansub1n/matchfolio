import type { ProjectMatchWithCompany } from "@/entities/project-match";

import type { BestMatch } from "./compute-best-match";

// 프로젝트 상세 모달의 "잘 맞는 공고" 목록용 — computeBestMatch와 같은 소스를
// 쓰지만 하나만 고르지 않고 이 프로젝트가 등장한 회사 전부를 fitScore 높은
// 순으로 돌려준다.
export function computeProjectMatchList(
  projectName: string,
  allMatches: ProjectMatchWithCompany[]
): BestMatch[] {
  const results: BestMatch[] = [];
  for (const row of allMatches) {
    const entry = row.matches.find((m) => m.projectName === projectName);
    if (!entry) continue;
    results.push({ company: row.company, fitScore: entry.fitScore });
  }
  return results.sort((a, b) => b.fitScore - a.fitScore);
}
