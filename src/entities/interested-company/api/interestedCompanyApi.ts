import { supabase } from "@/shared/api/supabase";

import type { InterestedCompany } from "../model/types";

interface InterestedCompanyRow {
  id: string;
  company: string;
  position: string | null;
  deadline: string | null;
  job_posting_url: string | null;
  memo: string | null;
  tech_stack: string[];
  created_at: string;
}

function toInterestedCompany(row: InterestedCompanyRow): InterestedCompany {
  return {
    id: row.id,
    company: row.company,
    position: row.position,
    deadline: row.deadline,
    jobPostingUrl: row.job_posting_url,
    memo: row.memo,
    techStack: row.tech_stack,
    createdAt: row.created_at,
  };
}

export async function getInterestedCompanies(): Promise<InterestedCompany[]> {
  const { data, error } = await supabase
    .from("interested_companies")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data.map(toInterestedCompany);
}

export interface CreateInterestedCompanyInput {
  company: string;
  position?: string | null;
  deadline?: string | null;
  jobPostingUrl?: string | null;
  memo?: string | null;
  techStack?: string[];
}

export async function createInterestedCompany(
  input: CreateInterestedCompanyInput
): Promise<InterestedCompany> {
  const { data, error } = await supabase
    .from("interested_companies")
    .insert({
      company: input.company,
      position: input.position,
      deadline: input.deadline,
      job_posting_url: input.jobPostingUrl,
      memo: input.memo,
      tech_stack: input.techStack,
    })
    .select()
    .single();

  if (error) throw error;
  return toInterestedCompany(data);
}
