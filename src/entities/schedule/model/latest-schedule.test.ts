import { describe, expect, it } from "vitest";

import { latestScheduleByApplication } from "./latest-schedule";
import type { Schedule } from "./types";

function buildSchedule(overrides: Partial<Schedule> = {}): Schedule {
  return {
    id: "s1",
    applicationId: "a1",
    stage: "interview",
    roundLabel: "1차",
    scheduledAt: null,
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("latestScheduleByApplication", () => {
  it("picks the most recently created schedule per application", () => {
    const schedules = [
      buildSchedule({ id: "s1", applicationId: "a1", roundLabel: "1차", createdAt: "2026-01-01T00:00:00Z" }),
      buildSchedule({ id: "s2", applicationId: "a1", roundLabel: "2차", createdAt: "2026-01-05T00:00:00Z" }),
      buildSchedule({ id: "s3", applicationId: "a2", roundLabel: "1차", createdAt: "2026-01-02T00:00:00Z" }),
    ];

    const result = latestScheduleByApplication(schedules);

    expect(result.get("a1")?.roundLabel).toBe("2차");
    expect(result.get("a2")?.roundLabel).toBe("1차");
  });

  it("is order-independent", () => {
    const schedules = [
      buildSchedule({ id: "s2", applicationId: "a1", roundLabel: "2차", createdAt: "2026-01-05T00:00:00Z" }),
      buildSchedule({ id: "s1", applicationId: "a1", roundLabel: "1차", createdAt: "2026-01-01T00:00:00Z" }),
    ];

    const result = latestScheduleByApplication(schedules);

    expect(result.get("a1")?.roundLabel).toBe("2차");
  });

  it("returns an empty map for no schedules", () => {
    expect(latestScheduleByApplication([]).size).toBe(0);
  });
});
