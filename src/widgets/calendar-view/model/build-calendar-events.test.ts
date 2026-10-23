import { describe, expect, it } from "vitest";

import type { Application } from "@/entities/application";
import type { Schedule } from "@/entities/schedule";

import { buildCalendarEvents } from "./build-calendar-events";

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

describe("buildCalendarEvents", () => {
  it("shows the deadline for an interested-stage card, opening it as the interested variant", () => {
    const events = buildCalendarEvents(
      [buildApplication({ id: "1", company: "당근", deadline: "2026-10-22", stage: "interested" })],
      []
    );
    expect(events.get("2026-10-22")).toEqual([
      { id: "deadline-1", kind: "interested", refId: "1", company: "당근", label: "마감", time: null },
    ]);
  });

  it("hides the deadline once the card is submitted (document stage and beyond)", () => {
    const events = buildCalendarEvents(
      [
        buildApplication({ id: "1", deadline: "2026-10-20", stage: "document" }),
        buildApplication({ id: "2", deadline: "2026-10-20", stage: "interview" }),
      ],
      []
    );
    expect(events.get("2026-10-20") ?? []).toEqual([]);
  });

  it("places a schedule event on its KST date, labeled with the round or '코테'", () => {
    const applications = [buildApplication({ id: "1", company: "토스" })];
    const schedules = [
      buildSchedule({
        id: "s1",
        applicationId: "1",
        stage: "coding_test",
        roundLabel: null,
        scheduledAt: "2026-10-14T01:00:00Z", // = 2026-10-14 10:00 KST
      }),
    ];
    const events = buildCalendarEvents(applications, schedules);
    expect(events.get("2026-10-14")).toEqual([
      { id: "schedule-s1", kind: "application", refId: "1", company: "토스", label: "코테", time: "10:00" },
    ]);
  });

  it("sorts same-day events by time, with the all-day deadline first", () => {
    const applications = [
      buildApplication({ id: "1", company: "토스", deadline: "2026-10-20", stage: "interested" }),
      buildApplication({ id: "2", company: "라인", stage: "interview" }),
    ];
    const schedules = [
      buildSchedule({
        id: "s1",
        applicationId: "2",
        stage: "interview",
        roundLabel: "1차",
        scheduledAt: "2026-10-20T01:00:00Z", // = 10:00 KST
      }),
    ];
    const events = buildCalendarEvents(applications, schedules);
    expect(events.get("2026-10-20")?.map((e) => e.label)).toEqual(["마감", "1차"]);
  });
});
