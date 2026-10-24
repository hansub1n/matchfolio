import { NextResponse, type NextRequest } from "next/server";

import { createServerSupabase } from "@/shared/api/supabase-server";

// GitHub 승인 → Supabase → 여기로 돌아온다. 받은 코드를 세션으로 바꾸고 첫 화면으로 보낸다.
// 연결에 실패하면(이미 다른 기록에 붙은 GitHub 등) Supabase가 error_code를 붙여 보내서, 그대로 첫 화면에
// 넘겨 화면에서 안내한다.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const errorCode = searchParams.get("error_code") ?? searchParams.get("error");
  if (errorCode) return NextResponse.redirect(`${origin}/?auth_error=${encodeURIComponent(errorCode)}`);

  const code = searchParams.get("code");
  if (code) {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("GitHub 로그인 코드 교환 실패:", error.message);
      return NextResponse.redirect(`${origin}/?auth_error=${encodeURIComponent(error.code ?? "exchange_failed")}`);
    }
  }
  return NextResponse.redirect(`${origin}/`);
}
