import { getBrowserSupabase } from "@/shared/api/supabase";

import { toInterviewPrep } from "../model/row";
import type { InterviewPrep } from "../model/types";

export async function getInterviewPrep(applicationId: string): Promise<InterviewPrep | null> {
  const { data, error } = await getBrowserSupabase()
    .from("interview_prep")
    .select("*")
    .eq("application_id", applicationId)
    .maybeSingle();

  if (error) throw error;
  return data ? toInterviewPrep(data) : null;
}
