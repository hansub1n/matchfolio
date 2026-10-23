import { NextResponse } from "next/server";

import { JOB_POSTING_SCREENSHOTS_BUCKET } from "@/shared/config/constants";
import { supabaseAdmin } from "@/shared/api/supabase-admin";
import { getRequestUser } from "@/shared/api/supabase-server";
import { unauthorizedResponse } from "@/shared/lib/request-guard";

export async function GET(request: Request) {
  const { user } = await getRequestUser();
  if (!user) return unauthorizedResponse();
  const path = new URL(request.url).searchParams.get("path");
  if (!path) {
    return NextResponse.json({ error: "path가 필요합니다." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.storage
    .from(JOB_POSTING_SCREENSHOTS_BUCKET)
    .createSignedUrl(path, 60);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.redirect(data.signedUrl);
}
