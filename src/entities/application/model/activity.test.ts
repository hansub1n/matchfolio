import { describe, expect, it } from "vitest";

import type { Application } from "./types";
import {
  buildHeatmap,
  buildMonthLabels,
  buildYearHeatmap,
  computeLongestStreak,
  type HeatmapCell,
} from "./activity";

function buildApplication(overrides: Partial<Application> = {}): Application {
  return {
    id: "1",
    company: "토스",
    position: "프론트엔드",
    stage: "document",
    outcome: "in_progress",
    appliedAt: null,
    deadline: null,
    jobPostingUrl: null,
    screenshotPaths: [],
    description: null,
    memo: null,
    techStack: [],
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("buildHeatmap", () => {
  const today = "2026-10-21"; // 수요일

  it("returns the requested number of weeks, each starting on Monday", () => {
    const heatmap = buildHeatmap([], 52, today);
    expect(heatmap.weeks).toHaveLength(52);
    for (const week of heatmap.weeks) {
      expect(week).toHaveLength(7);
      expect(new Date(`${week[0].date}T00:00:00`).getDay()).toBe(1); // 월요일
    }
  });

  it("marks dates after today in the current week as future, but not today itself", () => {
    const heatmap = buildHeatmap([], 20, today);
    const lastWeek = heatmap.weeks.at(-1) as HeatmapCell[];
    expect(lastWeek.map((c) => [c.date, c.isFuture])).toEqual([
      ["2026-10-19", false],
      ["2026-10-20", false],
      ["2026-10-21", false], // 오늘
      ["2026-10-22", true],
      ["2026-10-23", true],
      ["2026-10-24", true],
      ["2026-10-25", true],
    ]);
  });

  it("leaves only today-and-earlier cells non-future when today falls mid-week", () => {
    // 오늘(수, dayIndex=2)까지만 과거/오늘이고 나머지 4칸(목~일)은 미래.
    const heatmap = buildHeatmap([], 20, today);
    const lastWeek = heatmap.weeks.at(-1) as HeatmapCell[];
    const nonFutureCount = lastWeek.filter((c) => !c.isFuture).length;
    expect(nonFutureCount).toBe(3);
  });

  it("handles the year boundary without gaps or errors", () => {
    const heatmap = buildHeatmap([], 10, "2027-01-03");
    const dates = heatmap.weeks.flat().map((c) => c.date);
    // 10주(70일) 연속이어야 하고, 연도가 바뀌는 지점도 하루도 안 빠져야 한다.
    expect(dates).toHaveLength(70);
    expect(dates).toContain("2026-12-31");
    expect(dates).toContain("2027-01-01");
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(`${dates[i - 1]}T00:00:00`);
      const curr = new Date(`${dates[i]}T00:00:00`);
      expect(curr.getTime() - prev.getTime()).toBe(24 * 60 * 60 * 1000);
    }
  });

  it("counts applications per KST calendar date", () => {
    const heatmap = buildHeatmap(
      [
        buildApplication({ id: "1", appliedAt: "2026-10-20" }),
        buildApplication({ id: "2", appliedAt: "2026-10-20" }),
        buildApplication({ id: "3", appliedAt: "2026-10-21" }),
        buildApplication({ id: "4", appliedAt: null }),
      ],
      20,
      today
    );
    const lastWeek = heatmap.weeks.at(-1) as HeatmapCell[];
    expect(lastWeek[1]).toMatchObject({ date: "2026-10-20", count: 2 });
    expect(lastWeek[2]).toMatchObject({ date: "2026-10-21", count: 1 });
    expect(heatmap.totalCount).toBe(3);
  });

  it("counts thisWeekCount only from this week's Monday through today", () => {
    const heatmap = buildHeatmap(
      [
        buildApplication({ id: "1", appliedAt: "2026-10-19" }), // 이번주 월
        buildApplication({ id: "2", appliedAt: "2026-10-12" }), // 지난주
      ],
      20,
      today
    );
    expect(heatmap.thisWeekCount).toBe(1);
  });
});

describe("computeLongestStreak", () => {
  const today = "2026-10-21";

  it("returns 0 when there's no activity at all", () => {
    const heatmap = buildHeatmap([], 10, today);
    expect(computeLongestStreak(heatmap)).toBe(0);
  });

  it("finds the longest run even when it isn't the most recent one", () => {
    const heatmap = buildHeatmap(
      [
        // 과거에 5일 연속 (9/1~9/5)
        buildApplication({ id: "1", appliedAt: "2026-09-01" }),
        buildApplication({ id: "2", appliedAt: "2026-09-02" }),
        buildApplication({ id: "3", appliedAt: "2026-09-03" }),
        buildApplication({ id: "4", appliedAt: "2026-09-04" }),
        buildApplication({ id: "5", appliedAt: "2026-09-05" }),
        // 최근엔 2일 연속뿐 (10/20~10/21)
        buildApplication({ id: "6", appliedAt: "2026-10-20" }),
        buildApplication({ id: "7", appliedAt: "2026-10-21" }),
      ],
      10,
      today
    );
    expect(computeLongestStreak(heatmap)).toBe(5);
  });

  it("ignores future cells when scanning for runs", () => {
    // buildHeatmap 자체가 미래 날짜엔 카운트를 넣지 않지만(실제 데이터가 없는 한),
    // isFuture 플래그가 있는 셀은 어차피 건너뛴다는 걸 명시적으로 확인.
    const heatmap = buildHeatmap([buildApplication({ id: "1", appliedAt: today })], 1, today);
    const future = heatmap.weeks[0].filter((c) => c.isFuture);
    expect(future.length).toBeGreaterThan(0);
    expect(computeLongestStreak(heatmap)).toBe(1);
  });
});

describe("buildMonthLabels", () => {
  function week(date: string): HeatmapCell[] {
    return [{ date, count: 0, isFuture: false }];
  }

  it("labels the first column of each month when they're spaced normally (~4-5 columns apart)", () => {
    const weeks = [
      week("2026-09-07"), // 0
      week("2026-09-14"), // 1
      week("2026-09-21"), // 2
      week("2026-09-28"), // 3
      week("2026-10-05"), // 4 - 9월->10월
      week("2026-10-12"), // 5
      week("2026-10-19"), // 6
      week("2026-10-26"), // 7
      week("2026-11-02"), // 8 - 10월->11월
      week("2026-11-09"), // 9
    ];
    expect(buildMonthLabels(weeks)).toEqual([
      { columnIndex: 0, label: "9월" },
      { columnIndex: 4, label: "10월" },
      { columnIndex: 8, label: "11월" },
    ]);
  });

  it("drops the earlier label when two month changes are too close together", () => {
    const weeks = [
      week("2026-09-28"), // 0
      week("2026-10-05"), // 1 - 10월 라벨 후보 (0과 간격 1)
      week("2026-10-12"), // 2
      week("2026-11-02"), // 3 - 11월 라벨 후보 (1과 간격 2, MIN_GAP(3) 미만)
    ];
    const labels = buildMonthLabels(weeks);
    // 9월, 10월 라벨이 차례로 바로 다음 라벨에 밀려서 결국 11월만 남는다.
    expect(labels).toEqual([{ columnIndex: 3, label: "11월" }]);
  });
});

describe("buildYearHeatmap", () => {
  it("starts the first week on the Monday before Jan 1, marking pre-Jan-1 days as out of year", () => {
    // 2026-01-01은 목요일 -> 그 주 월~수(2025-12-29~31)는 작년 날짜.
    const heatmap = buildYearHeatmap([], 2026, "2026-06-01");
    const firstWeek = heatmap.weeks[0];
    expect(firstWeek.map((c) => [c.date, c.isOutOfYear])).toEqual([
      ["2025-12-29", true],
      ["2025-12-30", true],
      ["2025-12-31", true],
      ["2026-01-01", false],
      ["2026-01-02", false],
      ["2026-01-03", false],
      ["2026-01-04", false],
    ]);
  });

  it("ends the last week on the Sunday after Dec 31, marking post-Dec-31 days as out of year", () => {
    // 2026-12-31도 목요일 -> 그 주 금~일(2027-01-01~03)은 내년 날짜.
    const heatmap = buildYearHeatmap([], 2026, "2026-06-01");
    const lastWeek = heatmap.weeks.at(-1) as (typeof heatmap.weeks)[number];
    expect(lastWeek.map((c) => [c.date, c.isOutOfYear])).toEqual([
      ["2026-12-28", false],
      ["2026-12-29", false],
      ["2026-12-30", false],
      ["2026-12-31", false],
      ["2027-01-01", true],
      ["2027-01-02", true],
      ["2027-01-03", true],
    ]);
  });

  it("includes Feb 29 and all 366 days for a leap year, with no out-of-year padding when Dec 31 lands on Sunday", () => {
    // 2028은 윤년이고 12/31이 일요일이라 마지막 주에 다음 해로 넘치는 날이 없다.
    const heatmap = buildYearHeatmap([], 2028, "2028-06-01");
    const inYearDates = heatmap.weeks.flat().filter((c) => !c.isOutOfYear);
    expect(inYearDates).toHaveLength(366);
    expect(inYearDates.map((c) => c.date)).toContain("2028-02-29");
    expect(heatmap.weeks.at(-1)?.every((c) => !c.isOutOfYear)).toBe(true);
  });

  it("marks dates after today as future only within the year being viewed as the current year", () => {
    const heatmap = buildYearHeatmap([], 2026, "2026-06-15");
    const juneCell = heatmap.weeks.flat().find((c) => c.date === "2026-06-20");
    const mayCell = heatmap.weeks.flat().find((c) => c.date === "2026-05-01");
    expect(juneCell?.isFuture).toBe(true);
    expect(mayCell?.isFuture).toBe(false);

    // 과거 연도를 보는 중이면 "오늘"이 그 해보다 뒤에 있으니 future 칸이 아예 없어야 한다.
    const pastYear = buildYearHeatmap([], 2025, "2026-06-15");
    expect(pastYear.weeks.flat().some((c) => c.isFuture)).toBe(false);
  });

  it("counts applications within the year only, ignoring out-of-year padding dates", () => {
    const heatmap = buildYearHeatmap(
      [
        buildApplication({ id: "1", appliedAt: "2026-01-01" }),
        buildApplication({ id: "2", appliedAt: "2025-12-31" }), // 패딩 칸 — 집계에서 빠져야 함
      ],
      2026,
      "2026-06-01"
    );
    expect(heatmap.totalCount).toBe(1);
  });
});
