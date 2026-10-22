import type { Application } from "@/entities/application";
import type { MyProject } from "@/entities/my-project";
import { normalizeTech } from "@/shared/lib/normalize-tech";
import { techSatisfies } from "@/shared/lib/tech-aliases";

export interface SkillGapItem {
  name: string;
  count: number;
}

const MIN_POSTING_COUNT = 2;

// 지원한 공고에 자주(2곳 이상) 나왔지만 등록된 프로젝트 어디에도 없는 기술을
// 찾는다. "없다"는 별칭/포함 관계(Next.js → React 등)까지 고려해서 판단한다.
// 표시용 이름은 공고에서 처음 등장한 표기를 그대로 쓴다.
export function computeSkillGap(
  applications: Application[],
  projects: MyProject[],
  limit = 8
): SkillGapItem[] {
  const ownedTechs = projects.flatMap((project) => project.techStack);

  const counts = new Map<string, SkillGapItem>();
  for (const app of applications) {
    for (const tech of app.techStack) {
      const key = normalizeTech(tech);
      if (!key) continue;
      if (ownedTechs.some((owned) => techSatisfies(tech, owned))) continue;
      const existing = counts.get(key);
      if (existing) existing.count += 1;
      else counts.set(key, { name: tech, count: 1 });
    }
  }

  return [...counts.values()]
    .filter((item) => item.count >= MIN_POSTING_COUNT)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
