import type { SupabaseClient } from "@supabase/supabase-js";

import { getBrowserSupabase } from "@/shared/api/supabase";
import { assertNotSampleMode } from "@/shared/lib/sample-mode";

import type { DocumentKind, UserDocument } from "../model/types";

interface DocumentRow {
  id: string;
  kind: DocumentKind;
  title: string;
  content: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

function toDocument(row: DocumentRow): UserDocument {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    content: row.content,
    isPrimary: row.is_primary,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getDocuments(client: SupabaseClient = getBrowserSupabase()): Promise<UserDocument[]> {
  const { data, error } = await client.from("documents").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return data.map(toDocument);
}

export interface SaveDocumentInput {
  kind: DocumentKind;
  title: string;
  content: string;
}

export async function createDocument(input: SaveDocumentInput): Promise<UserDocument> {
  assertNotSampleMode();
  const supabase = getBrowserSupabase();
  // 첫 자소서는 자동으로 대표로 — 대표가 없으면 공고 매칭 기준이 애매해진다.
  let isPrimary = false;
  if (input.kind === "cover_letter") {
    const { count } = await supabase
      .from("documents")
      .select("*", { count: "exact", head: true })
      .eq("kind", "cover_letter");
    isPrimary = (count ?? 0) === 0;
  }
  const { data, error } = await supabase
    .from("documents")
    .insert({ kind: input.kind, title: input.title, content: input.content, is_primary: isPrimary })
    .select()
    .single();
  if (error) throw error;
  return toDocument(data);
}

export async function updateDocument(id: string, input: { title: string; content: string }): Promise<void> {
  assertNotSampleMode();
  const { error } = await getBrowserSupabase()
    .from("documents")
    .update({ title: input.title, content: input.content, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

// 대표 자소서는 하나만(DB 유니크 인덱스) — 기존 대표를 먼저 내리고 새 대표를 올린다.
export async function setPrimaryCoverLetter(id: string): Promise<void> {
  assertNotSampleMode();
  const supabase = getBrowserSupabase();
  const { error: clearError } = await supabase
    .from("documents")
    .update({ is_primary: false })
    .eq("kind", "cover_letter")
    .eq("is_primary", true);
  if (clearError) throw clearError;
  const { error } = await supabase.from("documents").update({ is_primary: true }).eq("id", id);
  if (error) throw error;
}

export async function deleteDocument(id: string): Promise<void> {
  assertNotSampleMode();
  const { error } = await getBrowserSupabase().from("documents").delete().eq("id", id);
  if (error) throw error;
}
