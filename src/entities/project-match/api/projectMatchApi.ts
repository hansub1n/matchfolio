import { supabase } from "@/shared/api/supabase";

import type {
  DetailedProjectMatchItem,
  LegacyProjectMatchItem,
  ProjectMatchItem,
  ProjectMatches,
  ProjectMatchWithCompany,
} from "../model/types";

// DB에 실제로 저장되는 형태 — 신버전 매치는 projectName을 안 들고 있다(이름은
// 항상 projectId로 my_projects를 조인해서 채운다. AI가 지어낸 이름을 못 믿어서).
type StoredDetailedMatch = Omit<DetailedProjectMatchItem, "projectName">;
type StoredMatch = LegacyProjectMatchItem | StoredDetailedMatch;

function isStoredDetailed(match: StoredMatch): match is StoredDetailedMatch {
  return "projectId" in match;
}

function resolveMatch(match: StoredMatch, nameById: Map<string, string>): ProjectMatchItem {
  if (!isStoredDetailed(match)) return match;
  return { ...match, projectName: nameById.get(match.projectId) ?? "(삭제된 프로젝트)" };
}

async function fetchProjectNameMap(): Promise<Map<string, string>> {
  const { data, error } = await supabase.from("my_projects").select("id, name");
  if (error) throw error;
  return new Map((data ?? []).map((p) => [p.id as string, p.name as string]));
}

interface ProjectMatchesRow {
  id: string;
  interested_company_id: string;
  recommendation: string | null;
  matches: StoredMatch[];
  created_at: string;
  updated_at: string;
}

export async function getProjectMatches(
  interestedCompanyId: string
): Promise<ProjectMatches | null> {
  const { data, error } = await supabase
    .from("project_matches")
    .select("*")
    .eq("interested_company_id", interestedCompanyId)
    .maybeSingle<ProjectMatchesRow>();

  if (error) throw error;
  if (!data) return null;

  const nameById = await fetchProjectNameMap();
  return {
    id: data.id,
    interestedCompanyId: data.interested_company_id,
    recommendation: data.recommendation,
    matches: data.matches.map((m) => resolveMatch(m, nameById)),
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

interface ProjectMatchesWithCompanyRow {
  matches: StoredMatch[];
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

  const nameById = await fetchProjectNameMap();
  return (data ?? []).map((row) => ({
    company: row.interested_companies?.company ?? "",
    matches: row.matches.map((m) => resolveMatch(m, nameById)),
  }));
}
