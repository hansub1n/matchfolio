import { describe, expect, it } from "vitest";

import type { Application } from "@/entities/application";

import { applyStageChange } from "./apply-stage-change";

function buildApplication(overrides: Partial<Application> = {}): Application {
  return {
    id: "1",
    company: "토스",
    position: "프론트엔드",
    stage: "document",
    outcome: "in_progress",
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

describe("applyStageChange", () => {
  it("moves a card to the target stage", () => {
    const items = [buildApplication({ id: "1", stage: "document" })];
    const result = applyStageChange(items, "1", "coding_test");
    expect(result[0].stage).toBe("coding_test");
  });

  it("resets outcome to in_progress when dragging out of the finished column", () => {
    const items = [buildApplication({ id: "1", stage: "interview", outcome: "failed" })];
    const result = applyStageChange(items, "1", "document");
    expect(result[0].outcome).toBe("in_progress");
  });

  it("leaves outcome untouched when it was already in_progress", () => {
    const items = [buildApplication({ id: "1", stage: "document", outcome: "in_progress" })];
    const result = applyStageChange(items, "1", "interview");
    expect(result[0].outcome).toBe("in_progress");
  });

  it("does not touch other cards", () => {
    const items = [
      buildApplication({ id: "1", stage: "document" }),
      buildApplication({ id: "2", stage: "coding_test" }),
    ];
    const result = applyStageChange(items, "1", "interview");
    expect(result[1].stage).toBe("coding_test");
  });
});
