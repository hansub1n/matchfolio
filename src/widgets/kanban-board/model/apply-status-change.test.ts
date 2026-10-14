import { describe, expect, it } from "vitest";

import type { Application } from "@/entities/application";

import { applyStatusChange } from "./apply-status-change";

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

describe("applyStatusChange", () => {
  it("moves the dragged application to the new status", () => {
    const items = [buildApplication({ id: "1", status: "applied" })];

    const result = applyStatusChange(items, "1", "document_passed");

    expect(result[0].status).toBe("document_passed");
  });

  it("leaves other applications untouched", () => {
    const items = [
      buildApplication({ id: "1", status: "applied" }),
      buildApplication({ id: "2", status: "coding_test" }),
    ];

    const result = applyStatusChange(items, "1", "document_passed");

    expect(result[1]).toEqual(items[1]);
  });

  it("clears result when the card leaves the result column", () => {
    const items = [
      buildApplication({ id: "1", status: "result", result: "passed" }),
    ];

    const result = applyStatusChange(items, "1", "interview");

    expect(result[0]).toMatchObject({ status: "interview", result: null });
  });

  it("keeps result untouched when the card is not in the result column", () => {
    const items = [buildApplication({ id: "1", status: "applied", result: null })];

    const result = applyStatusChange(items, "1", "coding_test");

    expect(result[0].result).toBeNull();
  });

  it("does nothing when the dragged id is not found", () => {
    const items = [buildApplication({ id: "1", status: "applied" })];

    const result = applyStatusChange(items, "missing", "coding_test");

    expect(result).toEqual(items);
  });
});
