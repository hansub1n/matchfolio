import type { SupabaseClient } from "@supabase/supabase-js";

import { getBrowserSupabase } from "@/shared/api/supabase";
import { JOB_POSTING_SCREENSHOTS_BUCKET } from "@/shared/config/constants";
import { todayKST } from "@/shared/lib/kst-date";
import { assertNotSampleMode } from "@/shared/lib/sample-mode";

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
  submitted_project_ids: string[];
  submitted_cover_letter_id: string | null;
  submission_updated_at: string | null;
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
    submittedProjectIds: row.submitted_project_ids ?? [],
    submittedCoverLetterId: row.submitted_cover_letter_id,
    submissionUpdatedAt: row.submission_updated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getApplications(
  client: SupabaseClient = getBrowserSupabase()
): Promise<Application[]> {
  const { data, error } = await client
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
  assertNotSampleMode();
  const { data, error } = await getBrowserSupabase()
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
  assertNotSampleMode();
  const { error } = await getBrowserSupabase()
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

export interface SubmissionInput {
  submittedProjectIds: string[];
  submittedCoverLetterId: string | null;
}

// 제출 자료은 일반 수정과 따로 저장한다 — 다른 필드를 고칠 때마다
// submission_updated_at이 바뀌면 "제출 자료이 바뀌었으니 질문을 다시 만들라"는
// 표시가 매번 잘못 뜨기 때문이다.
export async function updateSubmission(id: string, input: SubmissionInput): Promise<string> {
  assertNotSampleMode();
  const submissionUpdatedAt = new Date().toISOString();
  const { error } = await getBrowserSupabase()
    .from("applications")
    .update({
      submitted_project_ids: input.submittedProjectIds,
      submitted_cover_letter_id: input.submittedCoverLetterId,
      submission_updated_at: submissionUpdatedAt,
    })
    .eq("id", id);

  if (error) throw error;
  return submissionUpdatedAt;
}

export async function applyToApplication(id: string): Promise<void> {
  assertNotSampleMode();
  await updateApplication(id, buildApplyInput(todayKST()));
}

export async function deleteApplication(
  id: string,
  options?: { screenshotPaths?: string[] }
): Promise<void> {
  assertNotSampleMode();
  const { error } = await getBrowserSupabase().from("applications").delete().eq("id", id);
  if (error) throw error;

  if (options?.screenshotPaths?.length) {
    const { error: storageError } = await getBrowserSupabase().storage
      .from(JOB_POSTING_SCREENSHOTS_BUCKET)
      .remove(options.screenshotPaths);
    if (storageError) console.warn("스크린샷 삭제 실패:", storageError);
  }
}
