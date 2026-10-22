import { describe, expect, it } from "vitest";

import type { Schedule } from "./types";
import { buildRoundChips, shouldUpdateExistingSchedule } from "./resolve-interview-round";

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

describe("buildRoundChips", () => {
  it("shows 1차/2차/최종 when there's no current round yet", () => {
    expect(buildRoundChips(null)).toEqual(["1차", "2차", "최종"]);
  });

  it("includes the current round and everything after it, dropping earlier rounds", () => {
    expect(buildRoundChips("1차")).toEqual(["1차", "2차", "3차", "최종"]);
    expect(buildRoundChips("2차")).toEqual(["2차", "3차", "최종"]);
    expect(buildRoundChips("3차")).toEqual(["3차", "최종"]);
  });

  it("shows only the current round once it's the last one", () => {
    expect(buildRoundChips("최종")).toEqual(["최종"]);
  });

  it("falls back to just the current round when it isn't a recognized round name", () => {
    expect(buildRoundChips("임원면접")).toEqual(["임원면접"]);
  });
});
