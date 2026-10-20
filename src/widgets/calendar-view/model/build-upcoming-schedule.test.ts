import { describe, expect, it } from "vitest";

import type { Application } from "@/entities/application";
import type { Schedule } from "@/entities/schedule";

import { buildUpcomingSchedule } from "./build-upcoming-schedule";

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

describe("buildUpcomingSchedule", () => {
  const today = "2026-10-20";

  it("excludes past events and sorts upcoming ones by date then time", () => {
    const applications = [
      buildApplication({ id: "1", company: "토스" }),
      buildApplication({ id: "2", company: "당근" }),
    ];
    const schedules = [
      buildSchedule({ id: "s1", applicationId: "1", scheduledAt: "2026-10-19T05:00:00Z" }), // 과거
      buildSchedule({ id: "s2", applicationId: "2", scheduledAt: "2026-10-22T05:00:00Z" }), // 미래
      buildSchedule({ id: "s3", applicationId: "1", roundLabel: "2차", scheduledAt: "2026-10-20T05:00:00Z" }), // 오늘
    ];
    const { upcoming } = buildUpcomingSchedule(applications, [], schedules, today);
    expect(upcoming.map((e) => e.id)).toEqual(["schedule-s3", "schedule-s2"]);
  });

  it("caps the upcoming list at the given limit", () => {
    const applications = [buildApplication({ id: "1", company: "토스" })];
    const schedules = Array.from({ length: 10 }, (_, i) =>
      buildSchedule({
        id: `s${i}`,
        applicationId: "1",
        scheduledAt: `2026-10-${21 + i}T05:00:00Z`,
      })
    );
    const { upcoming } = buildUpcomingSchedule(applications, [], schedules, today, 8);
    expect(upcoming).toHaveLength(8);
  });

  it("lists an in-progress interview application with no scheduled time as unscheduled", () => {
    const applications = [
      buildApplication({ id: "1", company: "토스", stage: "interview", outcome: "in_progress" }),
    ];
    const schedules = [
      buildSchedule({ id: "s1", applicationId: "1", stage: "interview", roundLabel: "2차", scheduledAt: null }),
    ];
    const { unscheduled } = buildUpcomingSchedule(applications, [], schedules, today);
    expect(unscheduled).toEqual([{ applicationId: "1", company: "토스", label: "2차" }]);
  });

  it("lists an in-progress coding_test application with no schedule row at all as unscheduled", () => {
    const applications = [
      buildApplication({ id: "1", company: "토스", stage: "coding_test", outcome: "in_progress" }),
    ];
    const { unscheduled } = buildUpcomingSchedule(applications, [], [], today);
    expect(unscheduled).toEqual([{ applicationId: "1", company: "토스", label: "코테" }]);
  });

  it("does not list an application whose schedule already has a time, or that isn't in progress", () => {
    const applications = [
      buildApplication({ id: "1", company: "토스", stage: "interview", outcome: "in_progress" }),
      buildApplication({ id: "2", company: "당근", stage: "interview", outcome: "passed" }),
    ];
    const schedules = [
      buildSchedule({ id: "s1", applicationId: "1", stage: "interview", scheduledAt: "2026-10-22T05:00:00Z" }),
    ];
    const { unscheduled } = buildUpcomingSchedule(applications, [], schedules, today);
    expect(unscheduled).toEqual([]);
  });
});
