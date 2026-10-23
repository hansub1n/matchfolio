import { describe, expect, it } from "vitest";

import type { Application } from "@/entities/application";

import { buildCalendarMonth } from "./build-calendar-month";

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
    submittedProjectIds: [],
    coverLetter: null,
    submissionUpdatedAt: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("buildCalendarMonth", () => {
  it("starts the grid on the Monday before the 1st and ends on the Sunday after the last day", () => {
    // 2026년 3월 1일은 일요일 -> 그 전 월요일(2/23)부터 시작.
    // 2026년 3월 31일은 화요일 -> 그 주 일요일(4/5)까지 포함.
    const calendar = buildCalendarMonth([], [], 2026, 3, "2026-03-01");
    expect(calendar.weeks[0][0].date).toBe("2026-02-23");
    expect(calendar.weeks.at(-1)?.at(-1)?.date).toBe("2026-04-05");
  });

  it("flags days outside the target month as not isCurrentMonth", () => {
    const calendar = buildCalendarMonth([], [], 2026, 3, "2026-03-01");
    expect(calendar.weeks[0][0].isCurrentMonth).toBe(false); // 2026-02-23
    const march1 = calendar.weeks.flat().find((d) => d.date === "2026-03-01");
    expect(march1?.isCurrentMonth).toBe(true);
  });

  it("marks today's cell", () => {
    const calendar = buildCalendarMonth([], [], 2026, 3, "2026-03-15");
    const today = calendar.weeks.flat().find((d) => d.date === "2026-03-15");
    expect(today?.isToday).toBe(true);
  });

  it("counts applications applied on each date for the activity dot, regardless of outcome", () => {
    const applications = [
      buildApplication({ id: "1", appliedAt: "2026-03-10" }),
      buildApplication({ id: "2", appliedAt: "2026-03-10", outcome: "failed" }),
      buildApplication({ id: "3", appliedAt: "2026-03-11" }),
    ];
    const calendar = buildCalendarMonth(applications, [], 2026, 3, "2026-03-15");
    const day10 = calendar.weeks.flat().find((d) => d.date === "2026-03-10");
    const day11 = calendar.weeks.flat().find((d) => d.date === "2026-03-11");
    const day12 = calendar.weeks.flat().find((d) => d.date === "2026-03-12");
    expect(day10?.appliedCount).toBe(2);
    expect(day11?.appliedCount).toBe(1);
    expect(day12?.appliedCount).toBe(0);
  });
});
