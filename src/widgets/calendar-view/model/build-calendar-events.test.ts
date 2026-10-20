import { describe, expect, it } from "vitest";

import type { Application } from "@/entities/application";
import type { InterestedCompany } from "@/entities/interested-company";
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
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function buildInterestedCompany(overrides: Partial<InterestedCompany> = {}): InterestedCompany {
  return {
    id: "ic1",
    company: "당근",
    position: null,
    deadline: null,
    jobPostingUrl: null,
    screenshotPaths: [],
    description: null,
    memo: null,
    techStack: [],
    createdAt: "2026-01-01T00:00:00Z",
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
  it("shows the document deadline for an application still in the document stage", () => {
    const events = buildCalendarEvents(
      [buildApplication({ id: "1", company: "토스", deadline: "2026-10-20", stage: "document" })],
      [],
      []
    );
    expect(events.get("2026-10-20")).toEqual([
      { id: "deadline-1", kind: "application", refId: "1", company: "토스", label: "마감", time: null },
    ]);
  });

  it("hides the stale document deadline once the application has moved past the document stage", () => {
    // 넷지헬스케어 버그: 면접 단계로 넘어간 카드의 '서류' 마감일이 계속 떠 있던 문제.
    const events = buildCalendarEvents(
      [
        buildApplication({
          id: "1",
          company: "넷지헬스케어",
          deadline: "2026-10-20",
          stage: "interview",
        }),
      ],
      [],
      []
    );
    expect(events.get("2026-10-20") ?? []).toEqual([]);
  });

  it("hides the deadline once the application is resolved (passed/failed), even in document stage", () => {
    const events = buildCalendarEvents(
      [
        buildApplication({
          id: "1",
          deadline: "2026-10-20",
          stage: "document",
          outcome: "failed",
        }),
      ],
      [],
      []
    );
    expect(events.get("2026-10-20") ?? []).toEqual([]);
  });

  it("includes interested-company deadlines", () => {
    const events = buildCalendarEvents(
      [],
      [buildInterestedCompany({ id: "ic1", company: "당근", deadline: "2026-10-22" })],
      []
    );
    expect(events.get("2026-10-22")).toEqual([
      {
        id: "interested-deadline-ic1",
        kind: "interested_company",
        refId: "ic1",
        company: "당근",
        label: "마감",
        time: null,
      },
    ]);
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
    const events = buildCalendarEvents(applications, [], schedules);
    expect(events.get("2026-10-14")).toEqual([
      { id: "schedule-s1", kind: "application", refId: "1", company: "토스", label: "코테", time: "10:00" },
    ]);
  });

  it("sorts same-day events by time, with the all-day deadline first", () => {
    const applications = [
      buildApplication({ id: "1", company: "토스", deadline: "2026-10-20", stage: "document" }),
    ];
    const schedules = [
      buildSchedule({
        id: "s1",
        applicationId: "1",
        stage: "interview",
        roundLabel: "1차",
        scheduledAt: "2026-10-20T01:00:00Z", // = 10:00 KST
      }),
    ];
    const events = buildCalendarEvents(applications, [], schedules);
    expect(events.get("2026-10-20")?.map((e) => e.label)).toEqual(["마감", "1차"]);
  });
});
