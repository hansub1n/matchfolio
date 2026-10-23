import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { env } from "@/shared/config/env";

// 매 요청마다 세션 쿠키를 갱신하고, 페이지 요청인데 세션이 없으면 익명 계정을
// 바로 만든다 — 로그인 화면 없이 첫 화면부터 본인 데이터로 렌더링되게.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(env.supabase.url, env.supabase.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        for (const [key, value] of Object.entries(headers ?? {})) response.headers.set(key, value);
      },
    },
  });

  const { data } = await supabase.auth.getClaims();

  // API 라우트는 익명 계정을 새로 만들지 않는다 — 세션 없는 호출은 라우트가 401로 거절.
  if (!data?.claims && !request.nextUrl.pathname.startsWith("/api")) {
    const { error } = await supabase.auth.signInAnonymously();
    if (error) console.error("익명 로그인 실패:", error.message);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
