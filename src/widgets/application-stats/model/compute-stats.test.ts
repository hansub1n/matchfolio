import { describe, expect, it } from "vitest";

import type { Application } from "@/entities/application";

import { computeApplicationStats } from "./compute-stats";

function buildApplication(overrides: Partial<Application> = {}): Application {
  return {
    id: "1",
    company: "토스",
    position: "프론트엔드",
    status: "applied",
    interviewRound: null,
    result: null,
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

describe("computeApplicationStats", () => {
  it("counts total applications", () => {
    const stats = computeApplicationStats([
      buildApplication({ id: "1" }),
      buildApplication({ id: "2" }),
    ]);

    expect(stats.total).toBe(2);
  });

  it("buckets applications by status in the pipeline order", () => {
    const stats = computeApplicationStats([
      buildApplication({ id: "1", status: "applied" }),
      buildApplication({ id: "2", status: "applied" }),
      buildApplication({ id: "3", status: "interview" }),
    ]);

    expect(stats.statusCounts).toEqual([
      { label: "지원완료", count: 2 },
      { label: "서류합격", count: 0 },
      { label: "코딩테스트", count: 0 },
      { label: "면접", count: 1 },
      { label: "결과", count: 0 },
    ]);
  });

  it("returns a null pass rate when no results exist yet", () => {
    const stats = computeApplicationStats([buildApplication({ status: "applied" })]);

    expect(stats.passRate).toBeNull();
  });

  it("computes the pass rate from passed vs failed results only", () => {
    const stats = computeApplicationStats([
      buildApplication({ id: "1", status: "result", result: "passed" }),
      buildApplication({ id: "2", status: "result", result: "passed" }),
      buildApplication({ id: "3", status: "result", result: "failed" }),
      buildApplication({ id: "4", status: "interview", result: null }),
    ]);

    expect(stats.passedCount).toBe(2);
    expect(stats.failedCount).toBe(1);
    expect(stats.passRate).toBe(67); // 2/3 rounded
  });

  it("tallies tech stack mentions across applications, sorted by frequency", () => {
    const stats = computeApplicationStats([
      buildApplication({ id: "1", techStack: ["React", "TypeScript"] }),
      buildApplication({ id: "2", techStack: ["React"] }),
      buildApplication({ id: "3", techStack: ["Vue"] }),
    ]);

    expect(stats.techStackCounts).toEqual([
      { tech: "React", count: 2 },
      { tech: "TypeScript", count: 1 },
      { tech: "Vue", count: 1 },
    ]);
  });
});
