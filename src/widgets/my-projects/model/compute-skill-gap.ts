import type { Application } from "@/entities/application";
import type { MyProject } from "@/entities/my-project";

export interface SkillGapItem {
  name: string;
  count: number;
}

// 대소문자/공백/점을 무시하고 비교한다 — "Next.js"/"nextjs"/"NEXT JS"를 같은
// 기술로 취급하기 위해서다.
function normalize(tech: string): string {
  return tech.toLowerCase().replace(/[\s.]/g, "");
}

// 지원한 공고에 자주 나왔지만 등록된 프로젝트 어디에도 없는 기술을 찾는다.
// 표시용 이름은 공고에서 처음 등장한 표기를 그대로 쓴다.
export function computeSkillGap(
  applications: Application[],
  projects: MyProject[],
  limit = 8
): SkillGapItem[] {
  const ownedTech = new Set(
    projects.flatMap((project) => project.techStack.map(normalize))
  );

  const counts = new Map<string, SkillGapItem>();
  for (const app of applications) {
    for (const tech of app.techStack) {
      const key = normalize(tech);
      if (!key || ownedTech.has(key)) continue;
      const existing = counts.get(key);
      if (existing) existing.count += 1;
      else counts.set(key, { name: tech, count: 1 });
    }
  }

  return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}
