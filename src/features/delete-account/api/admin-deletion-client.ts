import "server-only";

import { supabaseAdmin } from "@/shared/api/supabase-admin";
import { JOB_POSTING_SCREENSHOTS_BUCKET } from "@/shared/config/constants";

import type { DeletionClient } from "../model/delete-user-data";

// service role로 지운다 — RLS를 우회하므로 계정 삭제 라우트와 정리 크론에서만 쓴다.
export const adminDeletionClient: DeletionClient = {
  async deleteRows(table, userId) {
    const { error } = await supabaseAdmin.from(table).delete().eq("user_id", userId);
    if (error) throw new Error(error.message);
  },
  async clearFeedbackContact(userId) {
    const { error } = await supabaseAdmin.from("feedback").update({ contact: null }).eq("user_id", userId);
    if (error) throw new Error(error.message);
  },
  async removeStorageFolder(userId) {
    const storage = supabaseAdmin.storage.from(JOB_POSTING_SCREENSHOTS_BUCKET);
    let removed = 0;
    // 한 번에 100개씩 — 지운 만큼 목록이 줄어드니 매번 첫 페이지를 다시 읽는다.
    for (;;) {
      const { data, error } = await storage.list(userId, { limit: 100 });
      if (error) throw new Error(error.message);
      const paths = (data ?? []).filter((file) => file.id).map((file) => `${userId}/${file.name}`);
      if (paths.length === 0) return removed;
      const { error: removeError } = await storage.remove(paths);
      if (removeError) throw new Error(removeError.message);
      removed += paths.length;
    }
  },
  async deleteAuthUser(userId) {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);
  },
};
