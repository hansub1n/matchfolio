import { supabase } from "@/shared/api/supabase";

import type { MyProject } from "../model/types";

interface MyProjectRow {
  id: string;
  name: string;
  description: string | null;
  tech_stack: string[];
  highlights: string[];
  created_at: string;
}

function toMyProject(row: MyProjectRow): MyProject {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    techStack: row.tech_stack,
    highlights: row.highlights,
    createdAt: row.created_at,
  };
}

export async function getMyProjects(): Promise<MyProject[]> {
  const { data, error } = await supabase
    .from("my_projects")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data.map(toMyProject);
}

export interface CreateMyProjectInput {
  name: string;
  description?: string | null;
  techStack?: string[];
  highlights?: string[];
}

export async function createMyProject(input: CreateMyProjectInput): Promise<MyProject> {
  const { data, error } = await supabase
    .from("my_projects")
    .insert({
      name: input.name,
      description: input.description,
      tech_stack: input.techStack,
      highlights: input.highlights,
    })
    .select()
    .single();

  if (error) throw error;
  return toMyProject(data);
}

export interface UpdateMyProjectInput {
  name?: string;
  description?: string | null;
  techStack?: string[];
  highlights?: string[];
}

export async function updateMyProject(id: string, input: UpdateMyProjectInput): Promise<void> {
  const { error } = await supabase
    .from("my_projects")
    .update({
      name: input.name,
      description: input.description,
      tech_stack: input.techStack,
      highlights: input.highlights,
    })
    .eq("id", id);

  if (error) throw error;
}

export async function deleteMyProject(id: string): Promise<void> {
  const { error } = await supabase.from("my_projects").delete().eq("id", id);
  if (error) throw error;
}
