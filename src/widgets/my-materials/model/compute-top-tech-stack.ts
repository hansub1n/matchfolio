import type { MyProject } from "@/entities/my-project";

// 헤더의 "가장 많이 쓴 기술" 한 줄용 — 등록된 프로젝트 전체에서 기술스택 빈도
// 상위 N개(동점은 먼저 등록된 프로젝트 순).
export function computeTopTechStack(projects: MyProject[], limit = 4): string[] {
  const counts = new Map<string, number>();
  for (const project of projects) {
    for (const tech of project.techStack) {
      counts.set(tech, (counts.get(tech) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name]) => name);
}
