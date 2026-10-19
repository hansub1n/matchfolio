import { addDays, addWeeks, differenceInCalendarWeeks, format, startOfWeek, subWeeks } from "date-fns";

import { todayKST } from "@/shared/lib/kst-date";

import type { Application } from "./types";

// appliedAt/오늘은 전부 'yyyy-MM-dd' KST 캘린더 날짜 문자열이라(todayKST, Postgres
// date 컬럼 둘 다), 여기서부터는 타임존을 다시 따질 필요 없이 로컬 자정으로
// 파싱해서 날짜 연산만 하면 된다.
function parseCalendarDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00`);
}

export interface HeatmapCell {
  date: string;
  count: number;
  isFuture: boolean;
}

export interface HeatmapData {
  weeks: HeatmapCell[][];
  totalCount: number;
  thisWeekCount: number;
}

export function buildHeatmap(
  applications: Application[],
  weekCount: number,
  today: string = todayKST()
): HeatmapData {
  const tally = new Map<string, number>();
  for (const app of applications) {
    if (!app.appliedAt) continue;
    tally.set(app.appliedAt, (tally.get(app.appliedAt) ?? 0) + 1);
  }

  const todayDate = parseCalendarDate(today);
  const currentWeekMonday = startOfWeek(todayDate, { weekStartsOn: 1 });
  const gridStartMonday = subWeeks(currentWeekMonday, weekCount - 1);

  const weeks: HeatmapCell[][] = [];
  for (let weekIndex = 0; weekIndex < weekCount; weekIndex++) {
    const weekStart = addWeeks(gridStartMonday, weekIndex);
    const week: HeatmapCell[] = [];
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const cellDate = format(addDays(weekStart, dayIndex), "yyyy-MM-dd");
      week.push({
        date: cellDate,
        count: tally.get(cellDate) ?? 0,
        isFuture: cellDate > today,
      });
    }
    weeks.push(week);
  }

  const cells = weeks.flat();
  const totalCount = cells.reduce((sum, c) => sum + c.count, 0);
  const currentWeekMondayStr = format(currentWeekMonday, "yyyy-MM-dd");
  const thisWeekCount = cells
    .filter((c) => c.date >= currentWeekMondayStr && c.date <= today)
    .reduce((sum, c) => sum + c.count, 0);

  return { weeks, totalCount, thisWeekCount };
}

export interface YearHeatmapCell {
  date: string;
  count: number;
  isFuture: boolean;
  // 그 해(1/1~12/31) 바깥인데, 월요일 시작 주 단위로 칸을 채우다 보니 같은 열에
  // 끼어 들어온 전/다음 해 날짜. 화면에 그릴 땐 투명 처리한다.
  isOutOfYear: boolean;
}

export interface YearHeatmapData {
  year: number;
  weeks: YearHeatmapCell[][];
  totalCount: number;
}

export function buildYearHeatmap(
  applications: Application[],
  year: number,
  today: string = todayKST()
): YearHeatmapData {
  const tally = new Map<string, number>();
  for (const app of applications) {
    if (!app.appliedAt) continue;
    tally.set(app.appliedAt, (tally.get(app.appliedAt) ?? 0) + 1);
  }

  const jan1 = `${year}-01-01`;
  const dec31 = `${year}-12-31`;
  const gridStartMonday = startOfWeek(parseCalendarDate(jan1), { weekStartsOn: 1 });
  const lastWeekMonday = startOfWeek(parseCalendarDate(dec31), { weekStartsOn: 1 });
  const weekCount =
    differenceInCalendarWeeks(lastWeekMonday, gridStartMonday, { weekStartsOn: 1 }) + 1;

  const weeks: YearHeatmapCell[][] = [];
  for (let weekIndex = 0; weekIndex < weekCount; weekIndex++) {
    const weekStart = addWeeks(gridStartMonday, weekIndex);
    const week: YearHeatmapCell[] = [];
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const cellDate = format(addDays(weekStart, dayIndex), "yyyy-MM-dd");
      const isOutOfYear = cellDate < jan1 || cellDate > dec31;
      week.push({
        date: cellDate,
        count: isOutOfYear ? 0 : (tally.get(cellDate) ?? 0),
        isFuture: !isOutOfYear && cellDate > today,
        isOutOfYear,
      });
    }
    weeks.push(week);
  }

  const totalCount = weeks
    .flat()
    .filter((c) => !c.isOutOfYear)
    .reduce((sum, c) => sum + c.count, 0);

  return { year, weeks, totalCount };
}

export interface MonthLabel {
  columnIndex: number;
  label: string;
}

// 라벨이 너무 촘촘하면(짧은 달이 연달아 있을 때 등) 뒤 라벨과 겹치므로, 그럴 땐
// 먼저 나온(왼쪽) 라벨을 빼고 뒤 라벨만 남긴다.
const MIN_LABEL_GAP_COLUMNS = 3;

export function buildMonthLabels(weeks: { date: string }[][]): MonthLabel[] {
  const labels: MonthLabel[] = [];
  let lastMonth: string | null = null;

  weeks.forEach((week, columnIndex) => {
    const month = week[0].date.slice(5, 7);
    if (month === lastMonth) return;
    lastMonth = month;

    const previous = labels[labels.length - 1];
    if (previous && columnIndex - previous.columnIndex < MIN_LABEL_GAP_COLUMNS) {
      labels.pop();
    }
    labels.push({ columnIndex, label: `${Number(month)}월` });
  });

  return labels;
}

// heatmap이 이미 "미래 날짜 제외, 날짜순 연속" 구조라 이 위에서 바로 최장 연속
// 기록(사상 최대, 오늘 기준 현재 연속이 아니라)을 셀 수 있다. heatmap이 덮는
// 기간(예: 지난 1년)으로 자연히 범위가 한정된다.
export function computeLongestStreak(heatmap: {
  weeks: { count: number; isFuture: boolean }[][];
}): number {
  let longest = 0;
  let current = 0;
  for (const cell of heatmap.weeks.flat()) {
    if (cell.isFuture) continue;
    if (cell.count > 0) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }
  return longest;
}
