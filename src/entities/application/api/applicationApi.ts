import { supabase } from "@/shared/api/supabase";
import { JOB_POSTING_SCREENSHOTS_BUCKET } from "@/shared/config/constants";
import { todayKST } from "@/shared/lib/kst-date";

import { buildApplyInput } from "../model/stage";
import type { Application, ApplicationOutcome, ApplicationStage } from "../model/types";

interface ApplicationRow {
  id: string;
  company: string;
  position: string | null;
  stage: ApplicationStage;
  outcome: ApplicationOutcome;
  applied_at: string | null;
  deadline: string | null;
  job_posting_url: string | null;
  screenshot_paths: string[];
  description: string | null;
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
    stage: row.stage,
    outcome: row.outcome,
    appliedAt: row.applied_at,
    deadline: row.deadline,
    jobPostingUrl: row.job_posting_url,
    screenshotPaths: row.screenshot_paths,
    description: row.description,
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
  position?: string | null;
  stage?: ApplicationStage;
  outcome?: ApplicationOutcome;
  appliedAt?: string | null;
  deadline?: string | null;
  jobPostingUrl?: string | null;
  screenshotPaths?: string[];
  description?: string | null;
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
      stage: input.stage,
      outcome: input.outcome,
      applied_at: input.appliedAt,
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
  return toApplication(data);
}

export interface UpdateApplicationInput {
  company?: string;
  position?: string | null;
  stage?: ApplicationStage;
  outcome?: ApplicationOutcome;
  appliedAt?: string | null;
  deadline?: string | null;
  jobPostingUrl?: string | null;
  description?: string | null;
  memo?: string | null;
  techStack?: string[];
}

export async function updateApplication(
  id: string,
  input: UpdateApplicationInput
): Promise<void> {
  const { error } = await supabase
    .from("applications")
    .update({
      company: input.company,
      position: input.position,
      stage: input.stage,
      outcome: input.outcome,
      applied_at: input.appliedAt,
      deadline: input.deadline,
      job_posting_url: input.jobPostingUrl,
      description: input.description,
      memo: input.memo,
      tech_stack: input.techStack,
    })
    .eq("id", id);

  if (error) throw error;
}

export async function applyToApplication(id: string): Promise<void> {
  await updateApplication(id, buildApplyInput(todayKST()));
}

export async function deleteApplication(
  id: string,
  options?: { screenshotPaths?: string[] }
): Promise<void> {
  const { error } = await supabase.from("applications").delete().eq("id", id);
  if (error) throw error;

  if (options?.screenshotPaths?.length) {
    const { error: storageError } = await supabase.storage
      .from(JOB_POSTING_SCREENSHOTS_BUCKET)
      .remove(options.screenshotPaths);
    if (storageError) console.warn("스크린샷 삭제 실패:", storageError);
  }
}
