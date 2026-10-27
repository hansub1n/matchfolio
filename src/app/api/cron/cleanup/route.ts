import { NextResponse, type NextRequest } from "next/server";

import { adminDeletionClient } from "@/features/delete-account/api/admin-deletion-client";
import { deleteUserData } from "@/features/delete-account/model/delete-user-data";
import { selectInactiveUsers } from "@/features/delete-account/model/select-inactive-users";
import { supabaseAdmin } from "@/shared/api/supabase-admin";
import { env } from "@/shared/config/env";

// 하루 한 번(vercel.json) 개인정보처리방침의 "보관 기간"대로 정리한다.
// - 마지막으로 들어온 날부터 1년이 지난 계정 → 모든 기록과 함께 삭제(계정 지우기와 같은 함수)
// - 받은 지 3년이 지난 의견 → 삭제
// Vercel Cron은 Authorization: Bearer <CRON_SECRET>을 붙여 부른다. 값이 없거나 다르면 아무것도 하지 않는다.
export const maxDuration = 300;

// 한 번에 너무 많이 지우다 시간 제한에 걸리지 않게 — 남은 건 다음 날 이어서.
const MAX_DELETIONS_PER_RUN = 200;

export async function GET(request: NextRequest) {
  if (!env.cron.secret || request.headers.get("authorization") !== `Bearer ${env.cron.secret}`) {
    return NextResponse.json({ error: "허용되지 않은 요청입니다." }, { status: 401 });
  }

  const now = new Date();
  const users: { id: string; createdAt: string; lastSignInAt: string | null }[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    users.push(
      ...data.users.map((u) => ({ id: u.id, createdAt: u.created_at, lastSignInAt: u.last_sign_in_at ?? null }))
    );
    if (data.users.length < 1000) break;
  }
  const { data: activity, error: activityError } = await supabaseAdmin
    .from("user_activity")
    .select("user_id, last_seen_at");
  if (activityError) return NextResponse.json({ error: activityError.message }, { status: 500 });
  const lastSeen = new Map((activity ?? []).map((row) => [row.user_id as string, row.last_seen_at as string]));

  const inactive = selectInactiveUsers(users, lastSeen, now).slice(0, MAX_DELETIONS_PER_RUN);
  const failures: { userId: string; steps: string[] }[] = [];
  for (const userId of inactive) {
    const result = await deleteUserData(adminDeletionClient, userId);
    if (!result.ok) failures.push({ userId, steps: result.failed.map((f) => f.step) });
  }

  const threeYearsAgo = new Date(now);
  threeYearsAgo.setFullYear(now.getFullYear() - 3);
  const { error: feedbackError, count: feedbackDeleted } = await supabaseAdmin
    .from("feedback")
    .delete({ count: "exact" })
    .lt("created_at", threeYearsAgo.toISOString());

  if (failures.length > 0 || feedbackError) {
    console.error("정리 일부 실패:", failures, feedbackError?.message);
  }
  return NextResponse.json({
    deletedUsers: inactive.length - failures.length,
    failedUsers: failures.length,
    deletedFeedback: feedbackDeleted ?? 0,
    feedbackError: feedbackError?.message ?? null,
  });
}
