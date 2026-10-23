import { describe, expect, it } from "vitest";

import { countProjectQuestionsByBasis, countQuestionGroups } from "./question-groups";
import type { InterviewPrepQuestion } from "@/entities/interview-prep";

function buildQuestion(overrides: Partial<InterviewPrepQuestion> = {}): InterviewPrepQuestion {
  return {
    category: "기술",
    question: "질문",
    intent: "의도",
    hint: "",
    relatedProjectId: null,
    noExperience: false,
    ...overrides,
  };
}

describe("countQuestionGroups", () => {
  it("기본/프로젝트 그룹별 개수와 합을 센다", () => {
    const basic = [buildQuestion(), buildQuestion()];
    const project = [buildQuestion(), buildQuestion(), buildQuestion()];
    expect(countQuestionGroups(basic, project)).toEqual({ all: 5, basic: 2, project: 3 });
  });

  it("프로젝트 질문이 없으면 project는 0, all은 기본 질문 수와 같다", () => {
    const basic = [buildQuestion(), buildQuestion()];
    expect(countQuestionGroups(basic, [])).toEqual({ all: 2, basic: 2, project: 0 });
  });
});

describe("countProjectQuestionsByBasis", () => {
  it("내 경험(noExperience=false) / 대비 필요(noExperience=true)로 나눈다", () => {
    const questions = [
      buildQuestion({ noExperience: false }),
      buildQuestion({ noExperience: false }),
      buildQuestion({ noExperience: false }),
      buildQuestion({ noExperience: true }),
      buildQuestion({ noExperience: true }),
    ];
    expect(countProjectQuestionsByBasis(questions)).toEqual({ ownExperience: 3, gapsToAddress: 2 });
  });

  it("빈 배열이면 둘 다 0", () => {
    expect(countProjectQuestionsByBasis([])).toEqual({ ownExperience: 0, gapsToAddress: 0 });
  });
});
