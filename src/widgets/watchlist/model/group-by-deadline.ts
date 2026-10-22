import { endOfWeek } from "date-fns";

import type { InterestedCompany } from "@/entities/interested-company";

export interface GroupedWatchlist {
  upcoming: InterestedCompany[];
  past: InterestedCompany[];
}

function parseCalendarDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00`);
}

// 마감일 오름차순으로 정렬하고, 마감이 지난 공고는 따로 묶는다. 마감일이 없는
// 공고(상시 채용 등)는 upcoming 묶음 맨 뒤에 둔다.
export function groupByDeadline(companies: InterestedCompany[], today: string): GroupedWatchlist {
  const upcoming: InterestedCompany[] = [];
  const past: InterestedCompany[] = [];
  for (const company of companies) {
    if (company.deadline && company.deadline < today) past.push(company);
    else upcoming.push(company);
  }

  upcoming.sort((a, b) => {
    if (!a.deadline && !b.deadline) return 0;
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return a.deadline.localeCompare(b.deadline);
  });
  past.sort((a, b) => (b.deadline ?? "").localeCompare(a.deadline ?? ""));

  return { upcoming, past };
}

// 이번 주(월~일, 오늘 이후) 안에 마감인 공고 수.
export function countDueThisWeek(companies: InterestedCompany[], today: string): number {
  const todayDate = parseCalendarDate(today);
  const weekEnd = endOfWeek(todayDate, { weekStartsOn: 1 });
  return companies.filter((company) => {
    if (!company.deadline) return false;
    const deadlineDate = parseCalendarDate(company.deadline);
    return deadlineDate >= todayDate && deadlineDate <= weekEnd;
  }).length;
}
