import { describe, expect, it } from "vitest";

import { hasNewerProjectSinceGeneration } from "./project-questions-staleness";

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
