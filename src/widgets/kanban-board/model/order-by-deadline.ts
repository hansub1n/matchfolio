import type { Application } from "@/entities/application";

// 관심 컬럼 정렬: 마감이 남은 공고를 마감일 오름차순(마감일 없는 상시 채용은 그
// 뒤)으로 먼저, 마감이 지난 공고는 맨 아래에 최근에 지난 순으로 둔다.
export function orderByDeadline(applications: Application[], today: string): Application[] {
  const upcoming: Application[] = [];
  const past: Application[] = [];
  for (const app of applications) {
    if (app.deadline && app.deadline < today) past.push(app);
    else upcoming.push(app);
  }

  upcoming.sort((a, b) => {
    if (!a.deadline && !b.deadline) return 0;
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return a.deadline.localeCompare(b.deadline);
  });
  past.sort((a, b) => (b.deadline ?? "").localeCompare(a.deadline ?? ""));

  return [...upcoming, ...past];
}
