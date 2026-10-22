import type { ProjectMatchWithCompany } from "@/entities/project-match";

export interface BestProject {
  projectName: string;
  fitScore: number;
}

// 관심기업 한 곳의 매칭 결과 중 fitScore가 가장 높은 프로젝트 하나를 고른다.
export function computeBestProject(
  companyName: string,
  allMatches: ProjectMatchWithCompany[]
): BestProject | null {
  const row = allMatches.find((m) => m.company === companyName);
  if (!row || row.matches.length === 0) return null;
  return row.matches.reduce((best, entry) =>
    entry.fitScore > best.fitScore ? { projectName: entry.projectName, fitScore: entry.fitScore } : best,
    { projectName: row.matches[0].projectName, fitScore: row.matches[0].fitScore }
  );
}
