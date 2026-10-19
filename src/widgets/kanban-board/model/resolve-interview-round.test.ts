import { describe, expect, it } from "vitest";

import type { Schedule } from "@/entities/schedule";

import { shouldUpdateExistingSchedule } from "./resolve-interview-round";

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

describe("shouldUpdateExistingSchedule", () => {
  it("creates a new row when there's no existing schedule yet", () => {
    expect(shouldUpdateExistingSchedule(undefined, "1차")).toBe(false);
  });

  it("creates a new row when the latest schedule is for coding_test, not interview", () => {
    const existing = buildSchedule({ stage: "coding_test", roundLabel: null });
    expect(shouldUpdateExistingSchedule(existing, "1차")).toBe(false);
  });

  it("updates in place when correcting the same round's schedule", () => {
    const existing = buildSchedule({ roundLabel: "1차" });
    expect(shouldUpdateExistingSchedule(existing, "1차")).toBe(true);
  });

  it("creates a new row when advancing to a different round, keeping the old round's history", () => {
    const existing = buildSchedule({ roundLabel: "1차" });
    expect(shouldUpdateExistingSchedule(existing, "2차")).toBe(false);
  });
});
