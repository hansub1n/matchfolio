import { describe, expect, it } from "vitest";

import { buildProjectQuestionsUpdatePayload, shouldGenerateProjectQuestions } from "./project-questions-payload";
import type { InterviewPrepQuestion } from "@/entities/interview-prep";

describe("shouldGenerateProjectQuestions", () => {
  it("프로젝트가 0개면 false", () => {
    expect(shouldGenerateProjectQuestions(0)).toBe(false);
  });

  it("프로젝트가 1개 이상이면 true", () => {
    expect(shouldGenerateProjectQuestions(1)).toBe(true);
    expect(shouldGenerateProjectQuestions(5)).toBe(true);
  });
});

describe("buildProjectQuestionsUpdatePayload", () => {
  it("프로젝트 레이어 필드만 담고, 기본 질문/회사 정보(summary/briefing/questions)는 건드리지 않는다", () => {
    const questions: InterviewPrepQuestion[] = [
      {
        category: "프로젝트 경험",
        question: "q",
        intent: "i",
        hint: "h",
        relatedProjectId: "p1",
        noExperience: false,
      },
    ];
    const motivation = [
      { point: "자사몰 운영과 DreamCard 폼 설계 연결", example: "DreamCard에서 복합 폼 상태를 설계했습니다." },
    ];
    const payload = buildProjectQuestionsUpdatePayload("app-1", questions, motivation, "2026-01-01T00:00:00Z");

    expect(payload).toEqual({
      application_id: "app-1",
      project_questions: questions,
      motivation,
      project_questions_updated_at: "2026-01-01T00:00:00Z",
    });
    expect(payload).not.toHaveProperty("summary");
    expect(payload).not.toHaveProperty("briefing");
    expect(payload).not.toHaveProperty("sections");
    expect(payload).not.toHaveProperty("questions");
    expect(payload).not.toHaveProperty("confidence");
  });
});
