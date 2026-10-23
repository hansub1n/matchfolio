import { describe, expect, it } from "vitest";

import { hasNewerProjectSinceGeneration, hasNewerSubmissionSinceGeneration } from "./project-questions-staleness";

describe("hasNewerProjectSinceGeneration", () => {
  it("아직 한 번도 생성한 적 없으면(null) false를 돌려준다", () => {
    expect(hasNewerProjectSinceGeneration([{ createdAt: "2026-01-02" }], null)).toBe(false);
  });

  it("생성 이후 등록된 프로젝트가 있으면 true", () => {
    const result = hasNewerProjectSinceGeneration(
      [{ createdAt: "2026-01-01" }, { createdAt: "2026-02-01" }],
      "2026-01-15T00:00:00Z"
    );
    expect(result).toBe(true);
  });

  it("전부 생성 이전에 등록됐으면 false", () => {
    const result = hasNewerProjectSinceGeneration(
      [{ createdAt: "2026-01-01" }, { createdAt: "2026-01-10" }],
      "2026-01-15T00:00:00Z"
    );
    expect(result).toBe(false);
  });

  it("프로젝트가 없으면 false", () => {
    expect(hasNewerProjectSinceGeneration([], "2026-01-15T00:00:00Z")).toBe(false);
  });
});

describe("hasNewerSubmissionSinceGeneration", () => {
  it("질문 생성 뒤에 제출 기록을 고쳤으면 true", () => {
    expect(hasNewerSubmissionSinceGeneration("2026-10-23T10:00:00Z", "2026-10-22T00:00:00Z")).toBe(true);
  });

  it("제출 기록이 질문보다 먼저면 false — 이미 반영됨", () => {
    expect(hasNewerSubmissionSinceGeneration("2026-10-21T00:00:00Z", "2026-10-22T00:00:00Z")).toBe(false);
  });

  it("제출 기록이 없거나 질문을 아직 안 만들었으면 false", () => {
    expect(hasNewerSubmissionSinceGeneration(null, "2026-10-22T00:00:00Z")).toBe(false);
    expect(hasNewerSubmissionSinceGeneration("2026-10-23T00:00:00Z", null)).toBe(false);
  });
});
