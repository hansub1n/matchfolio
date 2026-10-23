import { describe, expect, it } from "vitest";

import type { Application } from "@/entities/application";
import type { Schedule } from "@/entities/schedule";

import { computeApplicationStats } from "./compute-stats";

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
    coverLetter: null,
    submissionUpdatedAt: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function buildSchedule(overrides: Partial<Schedule> = {}): Schedule {
  return {
    id: "s1",
    applicationId: "1",
    stage: "interview",
    roundLabel: "1차",
    scheduledAt: null,
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("computeApplicationStats", () => {
  it("counts total and in-progress applications", () => {
    const stats = computeApplicationStats([
      buildApplication({ id: "1", outcome: "in_progress" }),
      buildApplication({ id: "2", outcome: "passed" }),
    ]);

    expect(stats.total).toBe(2);
    expect(stats.inProgressCount).toBe(1);
  });

  it("builds a funnel of 지원/서류통과/면접진출/최종합격 with no failures attached when nothing failed", () => {
    const stats = computeApplicationStats([
      buildApplication({ id: "1", stage: "document" }),
      buildApplication({ id: "2", stage: "coding_test" }),
      buildApplication({ id: "3", stage: "interview" }),
      buildApplication({ id: "4", stage: "interview", outcome: "passed" }),
    ]);

    expect(stats.funnel.map((s) => ({ label: s.label, count: s.count, percent: s.percent }))).toEqual([
      { label: "지원", count: 4, percent: 100 },
      { label: "서류 통과", count: 3, percent: 75 },
      { label: "면접 진출", count: 2, percent: 50 },
      { label: "최종 합격", count: 1, percent: 25 },
    ]);
    expect(stats.funnel.every((s) => s.failures.length === 0)).toBe(true);
  });

  it("attaches failures to the step the drop-off happened before, and omits zero-count stages", () => {
    const stats = computeApplicationStats(
      [
        buildApplication({ id: "1", stage: "document", outcome: "failed" }),
        buildApplication({ id: "2", stage: "interview", outcome: "failed" }),
        buildApplication({ id: "3", stage: "interview", outcome: "failed" }),
      ],
      [
        buildSchedule({ id: "s1", applicationId: "2", roundLabel: "1차" }),
        buildSchedule({ id: "s2", applicationId: "3", roundLabel: "2차" }),
      ]
    );

    // 서류에서 떨어진 건 "서류 통과" 단계 밑에 붙고, 코딩테스트 탈락이 0건이라
    // "면접 진출" 단계에는 아무 failures도 안 붙는다.
    expect(stats.funnel[1].failures).toEqual([{ label: "서류 탈락", count: 1 }]);
    expect(stats.funnel[2].failures).toEqual([]);
    expect(stats.funnel[3].failures).toEqual([
      { label: "1차 면접 탈락", count: 1 },
      { label: "2차 면접 탈락", count: 1 },
    ]);
  });

  it("labels interview failures with no schedule as 면접(라운드 미정) 탈락", () => {
    const stats = computeApplicationStats([
      buildApplication({ id: "1", stage: "interview", outcome: "failed" }),
    ]);

    expect(stats.funnel[3].failures).toEqual([
      { label: "면접(라운드 미정) 탈락", count: 1 },
    ]);
  });

  it("hides percent (via showPercent) until 5 applications have a final outcome", () => {
    const small = computeApplicationStats([
      buildApplication({ id: "1", outcome: "passed" }),
      buildApplication({ id: "2", outcome: "failed" }),
      buildApplication({ id: "3", outcome: "in_progress" }),
    ]);
    expect(small.showPercent).toBe(false);

    const big = computeApplicationStats([
      buildApplication({ id: "1", outcome: "passed" }),
      buildApplication({ id: "2", outcome: "passed" }),
      buildApplication({ id: "3", outcome: "failed" }),
      buildApplication({ id: "4", outcome: "failed" }),
      buildApplication({ id: "5", outcome: "failed" }),
    ]);
    expect(big.showPercent).toBe(true);
  });

  it("counts in-progress cards as pending on the step after their current stage, not as a failure", () => {
    const stats = computeApplicationStats([
      buildApplication({ id: "1", stage: "interview", outcome: "in_progress" }),
      buildApplication({ id: "2", stage: "interview", outcome: "failed" }),
    ]);

    // 면접 진출 2건 중 1건은 탈락, 1건은 아직 진행 중 — 최종 합격 0건이 "둘 다 탈락"으로
    // 읽히면 안 된다.
    const finalStep = stats.funnel[3];
    expect(finalStep.count).toBe(0);
    expect(finalStep.failures).toEqual([{ label: "면접(라운드 미정) 탈락", count: 1 }]);
    expect(finalStep.pending).toBe(1);
    expect(finalStep.pendingLabel).toBe("결과 대기");
  });

  it("lists in-progress applications with their current stage/round/schedule", () => {
    const stats = computeApplicationStats(
      [buildApplication({ id: "1", company: "넷지헬스케어(주)", stage: "interview" })],
      [buildSchedule({ id: "s1", applicationId: "1", roundLabel: "1차", scheduledAt: null })]
    );

    expect(stats.inProgressList).toEqual([
      {
        id: "1",
        company: "넷지헬스케어(주)",
        stage: "interview",
        roundLabel: "1차",
        scheduledAt: null,
      },
    ]);
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

  it("switches tech stack display to bars once any tech repeats, chips otherwise", () => {
    const chips = computeApplicationStats([
      buildApplication({ id: "1", techStack: ["React"] }),
      buildApplication({ id: "2", techStack: ["Vue"] }),
    ]);
    expect(chips.techStackMode).toBe("chips");

    const bars = computeApplicationStats([
      buildApplication({ id: "1", techStack: ["React"] }),
      buildApplication({ id: "2", techStack: ["React"] }),
    ]);
    expect(bars.techStackMode).toBe("bars");
  });

  describe("headline", () => {
    it("prompts for a first upload when there are no applications", () => {
      const stats = computeApplicationStats([]);
      expect(stats.headline).toEqual({
        prefix: "아직 지원한 공고가 없어요",
        highlight: null,
        suffix: "",
      });
    });

    it("highlights the in-progress count when something is still pending", () => {
      const stats = computeApplicationStats([
        buildApplication({ id: "1", outcome: "in_progress" }),
        buildApplication({ id: "2", outcome: "passed" }),
      ]);
      expect(stats.headline).toEqual({
        prefix: "지금까지 2곳에 지원했고, ",
        highlight: "1곳",
        suffix: "의 결과를 기다리고 있어요",
      });
    });

    it("highlights the final-passed count when nothing is pending but something passed", () => {
      const stats = computeApplicationStats([
        buildApplication({ id: "1", outcome: "passed" }),
        buildApplication({ id: "2", outcome: "failed" }),
      ]);
      expect(stats.headline).toEqual({
        prefix: "2곳 중 ",
        highlight: "1곳",
        suffix: "에 최종 합격했어요",
      });
    });

    it("reports everything resolved when nothing is pending or passed", () => {
      const stats = computeApplicationStats([
        buildApplication({ id: "1", outcome: "failed" }),
        buildApplication({ id: "2", outcome: "failed" }),
      ]);
      expect(stats.headline).toEqual({
        prefix: "2곳의 결과가 모두 나왔어요",
        highlight: null,
        suffix: "",
      });
    });
  });

  describe("관심 단계 제외", () => {
    it("stage=interested는 총 지원/진행 중/퍼널/기술 집계 어디에도 들어가지 않는다", () => {
      const stats = computeApplicationStats([
        buildApplication({ id: "1", stage: "document", techStack: ["React"] }),
        buildApplication({ id: "2", stage: "interested", techStack: ["React", "Vue"] }),
      ]);

      expect(stats.total).toBe(1);
      expect(stats.inProgressCount).toBe(1);
      expect(stats.funnel[0].count).toBe(1);
      expect(stats.funnel[1].pending).toBe(1);
      expect(stats.inProgressList.map((i) => i.id)).toEqual(["1"]);
      expect(stats.techStackCounts).toEqual([{ tech: "React", count: 1 }]);
    });

    it("관심 단계만 있으면 지원 0건으로 본다", () => {
      const stats = computeApplicationStats([buildApplication({ stage: "interested" })]);
      expect(stats.total).toBe(0);
    });
  });

});
