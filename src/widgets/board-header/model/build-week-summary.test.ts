import { describe, expect, it } from "vitest";

import type { Application } from "@/entities/application";
import type { Schedule } from "@/entities/schedule";

import { buildWeekSummary } from "./build-week-summary";

const TODAY = "2026-10-21"; // 수요일, 이번주 월~일 = 10/19 ~ 10/25

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

function buildSchedule(overrides: Partial<Schedule> = {}): Schedule {
  return {
    id: "s1",
    applicationId: "1",
    stage: "interview",
    roundLabel: "1차",
    scheduledAt: null,
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("buildWeekSummary", () => {
  it("reports no schedule when nothing falls this week", () => {
    const summary = buildWeekSummary([], [], TODAY);
    expect(summary.deadlineCount).toBe(0);
    expect(summary.interviewCount).toBe(0);
    expect(summary.headline).toEqual({
      prefix: "이번 주는 예정된 일정이 없어요",
      highlight: null,
      suffix: "",
    });
  });

  it("counts interested-stage deadlines this week, excluding submitted cards and other weeks", () => {
    const summary = buildWeekSummary(
      [
        buildApplication({ id: "1", stage: "interested", deadline: "2026-10-23" }),
        buildApplication({ id: "2", stage: "interested", deadline: "2026-10-26" }), // 다음주
        buildApplication({ id: "3", stage: "document", deadline: "2026-10-23" }), // 이미 지원함 — 마감 의미 없음
      ],
      [],
      TODAY
    );
    expect(summary.deadlineCount).toBe(1);
  });

  it("counts each application's latest schedule only, within this week", () => {
    const summary = buildWeekSummary(
      [buildApplication({ id: "1", stage: "interview" })],
      [
        buildSchedule({
          id: "s1",
          applicationId: "1",
          scheduledAt: "2026-10-05T00:00:00+09:00", // 지난 라운드
          createdAt: "2026-01-01T00:00:00Z",
        }),
        buildSchedule({
          id: "s2",
          applicationId: "1",
          scheduledAt: "2026-10-22T09:00:00+09:00", // 이번주 최신 라운드
          createdAt: "2026-01-02T00:00:00Z",
        }),
      ],
      TODAY
    );
    expect(summary.interviewCount).toBe(1);
  });

  it("doesn't count schedules with no date yet", () => {
    const summary = buildWeekSummary(
      [buildApplication({ id: "1", stage: "interview" })],
      [buildSchedule({ applicationId: "1", scheduledAt: null })],
      TODAY
    );
    expect(summary.interviewCount).toBe(0);
  });

  it("builds a combined headline when both deadlines and interviews exist this week", () => {
    const summary = buildWeekSummary(
      [
        buildApplication({ id: "1", stage: "interested", deadline: "2026-10-20" }),
        buildApplication({ id: "2", stage: "interested", deadline: "2026-10-21" }),
        buildApplication({ id: "3", stage: "interview" }),
      ],
      [buildSchedule({ applicationId: "3", scheduledAt: "2026-10-23T09:00:00+09:00" })],
      TODAY
    );
    expect(summary.headline).toEqual({
      prefix: "이번 주 마감 ",
      highlight: "2곳",
      suffix: ", 면접 1곳",
    });
  });

  it("builds an interview-only headline when there are no deadlines this week", () => {
    const summary = buildWeekSummary(
      [buildApplication({ id: "1", stage: "interview" })],
      [buildSchedule({ applicationId: "1", scheduledAt: "2026-10-23T09:00:00+09:00" })],
      TODAY
    );
    expect(summary.headline).toEqual({
      prefix: "이번 주 면접 ",
      highlight: "1곳",
      suffix: "",
    });
  });
});
