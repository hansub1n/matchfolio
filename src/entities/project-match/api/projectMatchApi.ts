import { supabase } from "@/shared/api/supabase";

import type { ProjectMatches, ProjectMatchItem } from "../model/types";

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
