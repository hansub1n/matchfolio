import { describe, expect, it } from "vitest";

import { buildRoundChips, resolveRoundSave, roundsAfter } from "./resolve-interview-round";
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

describe("buildRoundChips", () => {
  it("기록이 없으면 1차/2차/최종만 보여준다", () => {
    expect(buildRoundChips([])).toEqual(["1차", "2차", "최종"]);
  });

  it("기록된 차수 전부 + 다음 번호 + 최종을 보여준다", () => {
    expect(buildRoundChips(["1차", "2차", "3차"])).toEqual(["1차", "2차", "3차", "4차", "최종"]);
  });

  it("최종까지 기록됐으면 다음 번호 없이 최종에서 끝난다", () => {
    expect(buildRoundChips(["1차", "최종"])).toEqual(["1차", "최종"]);
  });

  it("커스텀(번호 없는) 차수여도 최종은 선택지로 남는다", () => {
    expect(buildRoundChips(["1차", "임원면접"])).toEqual(["1차", "임원면접", "최종"]);
  });
});

describe("roundsAfter", () => {
  it("선택한 차수보다 나중에 기록된 차수만 반환한다", () => {
    expect(roundsAfter(["1차", "2차", "3차"], "1차")).toEqual(["2차", "3차"]);
    expect(roundsAfter(["1차", "2차", "3차"], "3차")).toEqual([]);
  });

  it("기록에 없는 차수를 넘기면 빈 배열을 반환한다", () => {
    expect(roundsAfter(["1차", "2차"], "4차")).toEqual([]);
  });
});

describe("resolveRoundSave", () => {
  it("처음 보는 차수면 새로 만들 대상이라 existingRound가 없다", () => {
    const schedules = [buildSchedule({ id: "s1", roundLabel: "1차" })];
    expect(resolveRoundSave(schedules, "2차")).toEqual({ existingRound: null, roundsToDelete: [] });
  });

  it("같은 차수를 다시 저장하면 그 행을 고치고 지울 건 없다", () => {
    const schedules = [buildSchedule({ id: "s1", roundLabel: "1차" })];
    const result = resolveRoundSave(schedules, "1차");
    expect(result.existingRound?.id).toBe("s1");
    expect(result.roundsToDelete).toEqual([]);
  });

  it("이전 차수로 되돌리면 그 뒤에 기록된 행들을 지울 대상으로 돌려준다", () => {
    const s1 = buildSchedule({ id: "s1", roundLabel: "1차", createdAt: "2026-01-01T00:00:00Z" });
    const s2 = buildSchedule({ id: "s2", roundLabel: "2차", createdAt: "2026-01-02T00:00:00Z" });
    const s3 = buildSchedule({ id: "s3", roundLabel: "3차", createdAt: "2026-01-03T00:00:00Z" });
    const result = resolveRoundSave([s1, s2, s3], "1차");
    expect(result.existingRound?.id).toBe("s1");
    expect(result.roundsToDelete.map((s) => s.id).sort()).toEqual(["s2", "s3"]);
  });

  it("코딩테스트 행은 같은 차수로 취급하지 않는다", () => {
    const schedules = [
      buildSchedule({ id: "s1", stage: "coding_test", roundLabel: null }),
    ];
    expect(resolveRoundSave(schedules, "1차").existingRound).toBeNull();
  });
});
