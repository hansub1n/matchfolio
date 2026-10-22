import { supabase } from "@/shared/api/supabase";

import type { ProjectMatches, ProjectMatchItem, ProjectMatchWithCompany } from "../model/types";

interface ProjectMatchesRow {
  id: string;
  interested_company_id: string;
  matches: ProjectMatchItem[];
  created_at: string;
  updated_at: string;
}

function toProjectMatches(row: ProjectMatchesRow): ProjectMatches {
  return {
    id: row.id,
    interestedCompanyId: row.interested_company_id,
    matches: row.matches,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getProjectMatches(
  interestedCompanyId: string
): Promise<ProjectMatches | null> {
  const { data, error } = await supabase
    .from("project_matches")
    .select("*")
    .eq("interested_company_id", interestedCompanyId)
    .maybeSingle();

  if (error) throw error;
  return data ? toProjectMatches(data) : null;
}

interface ProjectMatchesWithCompanyRow {
  matches: ProjectMatchItem[];
  interested_companies: { company: string } | null;
}

// "내 프로젝트" 탭에서 프로젝트별로 "가장 잘 맞는 공고"를 보여주려고, 회사별로
// 쌓인 매칭 결과를 전부 가져와 회사명과 함께 평평하게 편다.
export async function getAllProjectMatches(): Promise<ProjectMatchWithCompany[]> {
  const { data, error } = await supabase
    .from("project_matches")
    .select("matches, interested_companies(company)")
    .returns<ProjectMatchesWithCompanyRow[]>();

  if (error) throw error;
  return (data ?? []).map((row) => ({
    company: row.interested_companies?.company ?? "",
    matches: row.matches,
  }));
}
