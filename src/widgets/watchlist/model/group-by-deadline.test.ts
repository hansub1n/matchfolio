import { describe, expect, it } from "vitest";

import type { Application } from "@/entities/application";

import { countDueThisWeek, groupByDeadline } from "./group-by-deadline";

function company(id: string, deadline: string | null): Application {
  return {
    id,
    company: id,
    position: null,
    stage: "interested",
    outcome: "in_progress",
    appliedAt: null,
    deadline,
    jobPostingUrl: null,
    screenshotPaths: [],
    description: null,
    memo: null,
    techStack: [],
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
  };
}

const TODAY = "2026-10-22"; // Thursday — 이번 주는 10/19(월) ~ 10/25(일)

describe("groupByDeadline", () => {
  it("마감이 지난 공고는 past로 분리한다", () => {
    const { upcoming, past } = groupByDeadline(
      [company("지남", "2026-10-21"), company("안지남", "2026-10-25")],
      TODAY
    );
    expect(upcoming.map((c) => c.id)).toEqual(["안지남"]);
    expect(past.map((c) => c.id)).toEqual(["지남"]);
  });

  it("upcoming은 마감일 오름차순으로 정렬한다", () => {
    const { upcoming } = groupByDeadline(
      [company("B", "2026-10-30"), company("A", "2026-10-23")],
      TODAY
    );
    expect(upcoming.map((c) => c.id)).toEqual(["A", "B"]);
  });

  it("마감일이 없는 공고는 upcoming 맨 뒤에 둔다", () => {
    const { upcoming } = groupByDeadline(
      [company("상시", null), company("마감있음", "2026-10-23")],
      TODAY
    );
    expect(upcoming.map((c) => c.id)).toEqual(["마감있음", "상시"]);
  });

  it("past는 최근에 지난 순으로 정렬한다", () => {
    const { past } = groupByDeadline(
      [company("오래됨", "2026-10-01"), company("최근", "2026-10-20")],
      TODAY
    );
    expect(past.map((c) => c.id)).toEqual(["최근", "오래됨"]);
  });
});

describe("countDueThisWeek", () => {
  it("이번 주(오늘 포함) 안의 마감만 센다", () => {
    const companies = [
      company("오늘", "2026-10-22"),
      company("토요일", "2026-10-24"),
      company("일요일경계", "2026-10-25"),
      company("다음주", "2026-10-26"),
      company("어제", "2026-10-21"),
      company("상시", null),
    ];
    expect(countDueThisWeek(companies, TODAY)).toBe(3);
  });
});
