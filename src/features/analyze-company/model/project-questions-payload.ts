import type { InterviewPrepMotivation, InterviewPrepQuestion } from "@/entities/interview-prep";

// 등록된 프로젝트가 하나도 없으면 "내 경험" 질문을 만들 근거 자체가 없다.
export function shouldGenerateProjectQuestions(myProjectCount: number): boolean {
  return myProjectCount > 0;
}

// 프로젝트 레이어(프로젝트 기반 질문 + 지원 동기 포인트) 재생성이 summary/
// briefing/questions(기본 질문) 등 다른 필드는 건드리지 않고 이 레이어만
// 갱신하도록, upsert에 보낼 델타만 따로 만든다.
export function buildProjectQuestionsUpdatePayload(
  applicationId: string,
  questions: InterviewPrepQuestion[],
  motivation: InterviewPrepMotivation[],
  updatedAt: string
) {
  return {
    application_id: applicationId,
    project_questions: questions,
    motivation,
    project_questions_updated_at: updatedAt,
  };
}
