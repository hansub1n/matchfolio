import { describe, expect, it } from "vitest";

import { defaultOpenGroups } from "./detail-groups";

describe("defaultOpenGroups", () => {
  it("관심 단계는 공고 내용·회사 분석·지원 준비를 먼저 펼친다", () => {
    expect(defaultOpenGroups({ stage: "interested", outcome: "in_progress" })).toEqual([
      "posting",
      "company",
      "application",
    ]);
  });

  it("서류 단계는 지원 준비만 펼친다", () => {
    expect(defaultOpenGroups({ stage: "document", outcome: "in_progress" })).toEqual(["application"]);
  });

  it("코테·면접 단계는 면접 준비를 펼친다", () => {
    expect(defaultOpenGroups({ stage: "coding_test", outcome: "in_progress" })).toEqual(["interview"]);
    expect(defaultOpenGroups({ stage: "interview", outcome: "in_progress" })).toEqual(["interview"]);
  });

  it("종료된 카드는 전부 접어둔다", () => {
    expect(defaultOpenGroups({ stage: "interview", outcome: "passed" })).toEqual([]);
    expect(defaultOpenGroups({ stage: "document", outcome: "failed" })).toEqual([]);
  });
});
