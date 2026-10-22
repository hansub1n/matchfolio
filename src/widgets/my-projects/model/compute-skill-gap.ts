import type { Application } from "@/entities/application";
import type { MyProject } from "@/entities/my-project";
import { normalizeTech } from "@/shared/lib/normalize-tech";

export interface SkillGapItem {
  name: string;
  count: number;
}

// 지원한 공고에 자주 나왔지만 등록된 프로젝트 어디에도 없는 기술을 찾는다.
// 표시용 이름은 공고에서 처음 등장한 표기를 그대로 쓴다.
export function computeSkillGap(
  applications: Application[],
  projects: MyProject[],
  limit = 8
): SkillGapItem[] {
  const ownedTech = new Set(
    projects.flatMap((project) => project.techStack.map(normalizeTech))
  );

  const counts = new Map<string, SkillGapItem>();
  for (const app of applications) {
    for (const tech of app.techStack) {
      const key = normalizeTech(tech);
      if (!key || ownedTech.has(key)) continue;
      const existing = counts.get(key);
      if (existing) existing.count += 1;
      else counts.set(key, { name: tech, count: 1 });
    }
  }

  return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}
