import { describe, expect, it } from "vitest";

import { buildApplyInput, hasActiveDeadline, isSubmitted } from "./stage";

describe("isSubmitted", () => {
  it("관심 단계는 지원으로 세지 않는다", () => {
    expect(isSubmitted({ stage: "interested" })).toBe(false);
  });

  it("서류 이후 단계는 전부 지원으로 센다", () => {
    expect(isSubmitted({ stage: "document" })).toBe(true);
    expect(isSubmitted({ stage: "coding_test" })).toBe(true);
    expect(isSubmitted({ stage: "interview" })).toBe(true);
  });
});

describe("hasActiveDeadline", () => {
  it("관심 단계 + 마감일이 있으면 마감 표시 대상", () => {
    expect(hasActiveDeadline({ stage: "interested", deadline: "2026-11-01" })).toBe(true);
  });

  it("이미 지원한 서류 단계는 마감일이 있어도 표시하지 않는다", () => {
    expect(hasActiveDeadline({ stage: "document", deadline: "2026-11-01" })).toBe(false);
  });

  it("마감일이 없으면 대상이 아니다", () => {
    expect(hasActiveDeadline({ stage: "interested", deadline: null })).toBe(false);
  });
});

describe("buildApplyInput", () => {
  it("단계를 서류로 넘기고 지원일을 오늘로 채운다", () => {
    expect(buildApplyInput("2026-10-23")).toEqual({
      stage: "document",
      outcome: "in_progress",
      appliedAt: "2026-10-23",
    });
  });

  it("id나 다른 필드는 건드리지 않는다 — 같은 카드를 갱신해서 매칭/분석 결과가 유지된다", () => {
    expect(Object.keys(buildApplyInput("2026-10-23")).sort()).toEqual(["appliedAt", "outcome", "stage"]);
  });
});
