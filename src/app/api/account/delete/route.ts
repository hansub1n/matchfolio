import { NextResponse, type NextRequest } from "next/server";

import { adminDeletionClient } from "@/features/delete-account/api/admin-deletion-client";
import { deleteUserData } from "@/features/delete-account/model/delete-user-data";
import { getRequestUser } from "@/shared/api/supabase-server";
import { isSameOrigin, unauthorizedResponse } from "@/shared/lib/request-guard";

// 계정과 모든 기록 지우기 — 세션으로 확인한 본인만. 지우는 건 service role(RLS 우회)이라 남의 id를 받지 않고
// 세션의 사용자 id만 쓴다. 일부가 실패해도 남은 단계까지 시도한 뒤 실패를 알린다(deleteUserData).
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "허용되지 않은 요청입니다." }, { status: 403 });
  }
  const { user } = await getRequestUser();
  if (!user) return unauthorizedResponse();

  const result = await deleteUserData(adminDeletionClient, user.id);
  if (!result.ok) {
    console.error("계정 삭제 일부 실패:", user.id, result.failed);
    return NextResponse.json(
      { error: "일부 기록을 지우지 못했어요. 잠시 후 다시 시도하거나 의견 보내기로 알려주세요.", failed: result.failed.map((f) => f.step) },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true });
}
