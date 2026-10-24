import { getBrowserSupabase } from "@/shared/api/supabase";

import type {
  InterviewPrep,
  InterviewPrepBriefing,
  InterviewPrepFact,
  InterviewPrepQuestion,
  InterviewPrepSection,
  InterviewPrepSource,
} from "../model/types";

interface InterviewPrepRow {
  id: string;
  application_id: string;
  summary: string | null;
  facts: InterviewPrepFact[] | null;
  briefing: InterviewPrepBriefing | null;
  sections: InterviewPrepSection[] | null;
  questions: InterviewPrepQuestion[] | null;
  confidence: "high" | "low" | null;
  project_questions: InterviewPrepQuestion[] | null;
  project_questions_updated_at: string | null;
  company_analysis: string | null;
  interview_questions: string[] | null;
  sources: InterviewPrepSource[];
  created_at: string;
  updated_at: string;
}

function toInterviewPrep(row: InterviewPrepRow): InterviewPrep {
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
    projectQuestionsUpdatedAt: row.project_questions_updated_at,
    companyAnalysis: row.company_analysis,
    interviewQuestions: row.interview_questions,
    sources: row.sources,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getInterviewPrep(applicationId: string): Promise<InterviewPrep | null> {
  const { data, error } = await getBrowserSupabase()
    .from("interview_prep")
    .select("*")
    .eq("application_id", applicationId)
    .maybeSingle();

  if (error) throw error;
  return data ? toInterviewPrep(data) : null;
}
