import { describe, expect, it } from "vitest";

import type { Application } from "@/entities/application";

import { orderByDeadline } from "./order-by-deadline";

function company(id: string, deadline: string | null): Application {
  return {
    id,
    company: id,
    position: null,
    stage: "interested",
    outcome: "in_progress",
    appliedAt: null,
    deadline,
    jobPostingUrl: null,
    screenshotPaths: [],
    description: null,
    memo: null,
    techStack: [],
    submittedProjectIds: [],
    coverLetter: null,
    submissionUpdatedAt: null,
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
  };
}

const TODAY = "2026-10-22"; // Thursday — 이번 주는 10/19(월) ~ 10/25(일)

describe("orderByDeadline", () => {
  const ids = (apps: Application[]) => apps.map((a) => a.id);

  it("마감이 남은 공고를 마감일 오름차순으로 먼저 둔다", () => {
    expect(ids(orderByDeadline([company("B", "2026-10-30"), company("A", "2026-10-23")], TODAY))).toEqual([
      "A",
      "B",
    ]);
  });

  it("마감일이 없는 공고는 마감이 남은 공고 뒤, 지난 공고 앞에 둔다", () => {
    expect(
      ids(orderByDeadline([company("지남", "2026-10-21"), company("상시", null), company("A", "2026-10-23")], TODAY))
    ).toEqual(["A", "상시", "지남"]);
  });

  it("마감이 지난 공고는 맨 아래에 최근에 지난 순으로 둔다", () => {
    expect(
      ids(orderByDeadline([company("오래됨", "2026-10-01"), company("A", "2026-10-25"), company("최근", "2026-10-20")], TODAY))
    ).toEqual(["A", "최근", "오래됨"]);
  });

  it("오늘 마감은 아직 지나지 않은 것으로 본다", () => {
    expect(ids(orderByDeadline([company("오늘", "2026-10-22"), company("어제", "2026-10-21")], TODAY))).toEqual([
      "오늘",
      "어제",
    ]);
  });
});
