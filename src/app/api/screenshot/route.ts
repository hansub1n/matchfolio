import { NextResponse } from "next/server";

import { JOB_POSTING_SCREENSHOTS_BUCKET } from "@/shared/config/constants";
import { getRequestUser } from "@/shared/api/supabase-server";
import { unauthorizedResponse } from "@/shared/lib/request-guard";

export async function GET(request: Request) {
  const { supabase, user } = await getRequestUser();
  if (!user) return unauthorizedResponse();
  const path = new URL(request.url).searchParams.get("path");
  if (!path) {
    return NextResponse.json({ error: "path가 필요합니다." }, { status: 400 });
  }

  // 세션 클라이언트로 만든다 — Storage RLS가 본인 폴더 파일만 서명 URL을 내준다.
  const { data, error } = await supabase.storage
    .from(JOB_POSTING_SCREENSHOTS_BUCKET)
    .createSignedUrl(path, 60);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.redirect(data.signedUrl);
}
