import { supabase } from "@/shared/api/supabase";

import type { InterestedCompany } from "../model/types";

interface InterestedCompanyRow {
  id: string;
  company: string;
  position: string | null;
  job_posting_url: string | null;
  memo: string | null;
  created_at: string;
}

function toInterestedCompany(row: InterestedCompanyRow): InterestedCompany {
  return {
    id: row.id,
    company: row.company,
    position: row.position,
    jobPostingUrl: row.job_posting_url,
    memo: row.memo,
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
  jobPostingUrl?: string | null;
  memo?: string | null;
}

export async function createInterestedCompany(
  input: CreateInterestedCompanyInput
): Promise<InterestedCompany> {
  const { data, error } = await supabase
    .from("interested_companies")
    .insert({
      company: input.company,
      position: input.position,
      job_posting_url: input.jobPostingUrl,
      memo: input.memo,
    })
    .select()
    .single();

  if (error) throw error;
  return toInterestedCompany(data);
}
