import { describe, expect, it } from "vitest";

import type { Application } from "@/entities/application";

import { applyStageChange, buildStageChangeInput, canMoveToFinished } from "./apply-stage-change";

const TODAY = "2026-10-23";

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
    submittedProjectIds: [],
    submittedCoverLetterId: null,
    submissionUpdatedAt: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("applyStageChange", () => {
  it("moves a card to the target stage", () => {
    const items = [buildApplication({ id: "1", stage: "document" })];
    const result = applyStageChange(items, "1", "coding_test", TODAY);
    expect(result[0].stage).toBe("coding_test");
  });

  it("resets outcome to in_progress when dragging out of the finished column", () => {
    const items = [buildApplication({ id: "1", stage: "interview", outcome: "failed" })];
    const result = applyStageChange(items, "1", "document", TODAY);
    expect(result[0].outcome).toBe("in_progress");
  });

  it("leaves outcome untouched when it was already in_progress", () => {
    const items = [buildApplication({ id: "1", stage: "document", outcome: "in_progress" })];
    const result = applyStageChange(items, "1", "interview", TODAY);
    expect(result[0].outcome).toBe("in_progress");
  });

  it("does not touch other cards", () => {
    const items = [
      buildApplication({ id: "1", stage: "document" }),
      buildApplication({ id: "2", stage: "coding_test" }),
    ];
    const result = applyStageChange(items, "1", "interview", TODAY);
    expect(result[1].stage).toBe("coding_test");
  });
});

describe("buildStageChangeInput — 관심 ↔ 지원 경계", () => {
  it("관심에서 서류로 옮기면 지원일을 오늘로 채운다", () => {
    const app = buildApplication({ stage: "interested", appliedAt: null });
    expect(buildStageChangeInput(app, "document", TODAY)).toEqual({ stage: "document", appliedAt: TODAY });
  });

  it("관심에서 바로 면접으로 옮겨도 지원으로 본다", () => {
    const app = buildApplication({ stage: "interested", appliedAt: null });
    expect(buildStageChangeInput(app, "interview", TODAY).appliedAt).toBe(TODAY);
  });

  it("관심 카드에 지원일이 이미 있으면 덮어쓰지 않는다", () => {
    const app = buildApplication({ stage: "interested", appliedAt: "2026-10-01" });
    expect(buildStageChangeInput(app, "document", TODAY)).toEqual({ stage: "document" });
  });

  it("관심으로 되돌리면 지원일을 비운다", () => {
    const app = buildApplication({ stage: "document", appliedAt: "2026-10-01" });
    expect(buildStageChangeInput(app, "interested", TODAY)).toEqual({ stage: "interested", appliedAt: null });
  });

  it("지원한 단계끼리의 이동은 지원일을 건드리지 않는다", () => {
    const app = buildApplication({ stage: "document", appliedAt: "2026-10-01" });
    expect(buildStageChangeInput(app, "coding_test", TODAY)).toEqual({ stage: "coding_test" });
  });
});

describe("canMoveToFinished", () => {
  it("관심 카드는 종료로 옮길 수 없다", () => {
    expect(canMoveToFinished(buildApplication({ stage: "interested" }))).toBe(false);
  });

  it("지원한 카드는 종료로 옮길 수 있다", () => {
    expect(canMoveToFinished(buildApplication({ stage: "document" }))).toBe(true);
  });
});
