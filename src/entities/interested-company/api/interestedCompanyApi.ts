import { supabase } from "@/shared/api/supabase";
import { JOB_POSTING_SCREENSHOTS_BUCKET } from "@/shared/config/constants";

import type { InterestedCompany } from "../model/types";

interface InterestedCompanyRow {
  id: string;
  company: string;
  position: string | null;
  deadline: string | null;
  job_posting_url: string | null;
  screenshot_paths: string[];
  description: string | null;
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
    screenshotPaths: row.screenshot_paths,
    description: row.description,
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
  screenshotPaths?: string[];
  description?: string | null;
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
      screenshot_paths: input.screenshotPaths,
      description: input.description,
      memo: input.memo,
      tech_stack: input.techStack,
    })
    .select()
    .single();

  if (error) throw error;
  return toInterestedCompany(data);
}

export interface UpdateInterestedCompanyInput {
  company?: string;
  position?: string | null;
  deadline?: string | null;
  jobPostingUrl?: string | null;
  description?: string | null;
  memo?: string | null;
  techStack?: string[];
}

export async function updateInterestedCompany(
  id: string,
  input: UpdateInterestedCompanyInput
): Promise<void> {
  const { error } = await supabase
    .from("interested_companies")
    .update({
      company: input.company,
      position: input.position,
      deadline: input.deadline,
      job_posting_url: input.jobPostingUrl,
      description: input.description,
      memo: input.memo,
      tech_stack: input.techStack,
    })
    .eq("id", id);

  if (error) throw error;
}

export async function deleteInterestedCompany(
  id: string,
  options?: { screenshotPaths?: string[] }
): Promise<void> {
  const { error } = await supabase.from("interested_companies").delete().eq("id", id);
  if (error) throw error;

  if (options?.screenshotPaths?.length) {
    const { error: storageError } = await supabase.storage
      .from(JOB_POSTING_SCREENSHOTS_BUCKET)
      .remove(options.screenshotPaths);
    if (storageError) console.warn("스크린샷 삭제 실패:", storageError);
  }
}
