import type {
  InterviewPrep,
  InterviewPrepBriefing,
  InterviewPrepFact,
  InterviewPrepQuestion,
  InterviewPrepReverseQuestion,
  InterviewPrepSection,
  InterviewPrepSource,
} from "./types";

export interface InterviewPrepRow {
  id: string;
  application_id: string;
  summary: string | null;
  facts: InterviewPrepFact[] | null;
  briefing: InterviewPrepBriefing | null;
  sections: InterviewPrepSection[] | null;
  questions: InterviewPrepQuestion[] | null;
  confidence: "high" | "low" | null;
  project_questions: InterviewPrepQuestion[] | null;
  reverse_questions: InterviewPrepReverseQuestion[] | null;
  project_questions_updated_at: string | null;
  company_analysis: string | null;
  interview_questions: string[] | null;
  sources: InterviewPrepSource[];
  created_at: string;
  updated_at: string;
}

// DB 행 → 화면용 객체. 서버 라우트도 응답을 이 모양으로 돌려준다.
export function toInterviewPrep(row: InterviewPrepRow): InterviewPrep {
  return {
    id: row.id,
    applicationId: row.application_id,
    summary: row.summary,
    facts: row.facts,
    briefing: row.briefing,
    sections: row.sections,
    questions: row.questions,
    confidence: row.confidence,
    projectQuestions: row.project_questions,
    // 015 이전엔 역질문이 briefing 안에 있었다(마이그레이션으로 옮겼지만 안전하게 한 번 더).
    reverseQuestions: row.reverse_questions ?? row.briefing?.reverseQuestions ?? null,
    projectQuestionsUpdatedAt: row.project_questions_updated_at,
    companyAnalysis: row.company_analysis,
    interviewQuestions: row.interview_questions,
    sources: row.sources,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
