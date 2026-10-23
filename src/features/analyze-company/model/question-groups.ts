import type { InterviewPrepQuestion } from "@/entities/interview-prep";

export type QuestionGroupTab = "all" | "basic" | "project";

export interface QuestionGroupCounts {
  all: number;
  basic: number;
  project: number;
}

// 탭 라벨("전체"/"기본 N"/"내 프로젝트 N")에 쓰는 그룹별 개수.
export function countQuestionGroups(
  basicQuestions: InterviewPrepQuestion[],
  projectQuestions: InterviewPrepQuestion[]
): QuestionGroupCounts {
  return {
    all: basicQuestions.length + projectQuestions.length,
    basic: basicQuestions.length,
    project: projectQuestions.length,
  };
}

export interface ProjectQuestionDistribution {
  ownExperience: number;
  gapsToAddress: number;
}

// 프로젝트 기반 질문 5개가 "내 경험"(noExperience=false) 3 / "대비 필요"
// (noExperience=true) 2로 잘 나뉘었는지 확인할 때 쓴다.
export function countProjectQuestionsByBasis(
  questions: InterviewPrepQuestion[]
): ProjectQuestionDistribution {
  return {
    ownExperience: questions.filter((q) => !q.noExperience).length,
    gapsToAddress: questions.filter((q) => q.noExperience).length,
  };
}
