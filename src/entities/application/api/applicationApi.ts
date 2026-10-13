import { supabase } from "@/shared/api/supabase";

import type { Application, ApplicationResult, ApplicationStatus } from "../model/types";

interface ApplicationRow {
  id: string;
  company: string;
  position: string;
  status: ApplicationStatus;
  interview_round: string | null;
  result: ApplicationResult | null;
  applied_at: string | null;
  deadline: string | null;
  job_posting_url: string | null;
  memo: string | null;
  tech_stack: string[];
  created_at: string;
  updated_at: string;
}

function toApplication(row: ApplicationRow): Application {
  return {
    id: row.id,
    company: row.company,
    position: row.position,
    status: row.status,
    interviewRound: row.interview_round,
    result: row.result,
    appliedAt: row.applied_at,
    deadline: row.deadline,
    jobPostingUrl: row.job_posting_url,
    memo: row.memo,
    techStack: row.tech_stack,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getApplications(): Promise<Application[]> {
  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data.map(toApplication);
}

export interface CreateApplicationInput {
  company: string;
  position: string;
  status?: ApplicationStatus;
  interviewRound?: string | null;
  result?: ApplicationResult | null;
  appliedAt?: string | null;
  deadline?: string | null;
  jobPostingUrl?: string | null;
  memo?: string | null;
  techStack?: string[];
}

export async function createApplication(
  input: CreateApplicationInput
): Promise<Application> {
  const { data, error } = await supabase
    .from("applications")
    .insert({
      company: input.company,
      position: input.position,
      status: input.status,
      interview_round: input.interviewRound,
      result: input.result,
      applied_at: input.appliedAt,
      deadline: input.deadline,
      job_posting_url: input.jobPostingUrl,
      memo: input.memo,
      tech_stack: input.techStack,
    })
    .select()
    .single();

  if (error) throw error;
  return toApplication(data);
}

export interface UpdateApplicationInput {
  status?: ApplicationStatus;
  interviewRound?: string | null;
  result?: ApplicationResult | null;
}

export async function updateApplication(
  id: string,
  input: UpdateApplicationInput
): Promise<void> {
  const { error } = await supabase
    .from("applications")
    .update({
      status: input.status,
      interview_round: input.interviewRound,
      result: input.result,
    })
    .eq("id", id);

  if (error) throw error;
}
