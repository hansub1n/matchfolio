import { supabase } from "@/shared/api/supabase";

import type { InterviewPrep, InterviewPrepSource } from "../model/types";

interface InterviewPrepRow {
  id: string;
  application_id: string;
  company_analysis: string;
  interview_questions: string[];
  sources: InterviewPrepSource[];
  created_at: string;
  updated_at: string;
}

function toInterviewPrep(row: InterviewPrepRow): InterviewPrep {
  return {
    id: row.id,
    applicationId: row.application_id,
    companyAnalysis: row.company_analysis,
    interviewQuestions: row.interview_questions,
    sources: row.sources,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getInterviewPrep(applicationId: string): Promise<InterviewPrep | null> {
  const { data, error } = await supabase
    .from("interview_prep")
    .select("*")
    .eq("application_id", applicationId)
    .maybeSingle();

  if (error) throw error;
  return data ? toInterviewPrep(data) : null;
}
