import { describe, expect, it } from "vitest";

import { recordedInterviewRounds } from "./interview-rounds";
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

describe("recordedInterviewRounds", () => {
  it("기록된 순서대로 차수 라벨만 뽑는다", () => {
    const schedules = [
      buildSchedule({ id: "s1", roundLabel: "1차", createdAt: "2026-01-01T00:00:00Z" }),
      buildSchedule({ id: "s2", roundLabel: "2차", createdAt: "2026-01-02T00:00:00Z" }),
    ];
    expect(recordedInterviewRounds(schedules, "a1")).toEqual(["1차", "2차"]);
  });

  it("다른 지원 건이나 코딩테스트 행은 섞지 않는다", () => {
    const schedules = [
      buildSchedule({ id: "s1", applicationId: "a1", roundLabel: "1차" }),
      buildSchedule({ id: "s2", applicationId: "a2", roundLabel: "1차" }),
      buildSchedule({ id: "s3", applicationId: "a1", stage: "coding_test", roundLabel: null }),
    ];
    expect(recordedInterviewRounds(schedules, "a1")).toEqual(["1차"]);
  });

  it("같은 차수 중복 행은 하나로 합친다", () => {
    const schedules = [
      buildSchedule({ id: "s1", roundLabel: "1차", createdAt: "2026-01-01T00:00:00Z" }),
      buildSchedule({ id: "s2", roundLabel: "1차", createdAt: "2026-01-01T00:05:00Z" }),
      buildSchedule({ id: "s3", roundLabel: "2차", createdAt: "2026-01-02T00:00:00Z" }),
    ];
    expect(recordedInterviewRounds(schedules, "a1")).toEqual(["1차", "2차"]);
  });

  it("기록이 없으면 빈 배열을 반환한다", () => {
    expect(recordedInterviewRounds([], "a1")).toEqual([]);
  });
});
