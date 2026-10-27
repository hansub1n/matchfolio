import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient, User } from "@supabase/supabase-js";

import { env } from "@/shared/config/env";

import { isEphemeralCookieSet, toSessionCookieOptions } from "./session-persistence";

// 요청 쿠키의 세션으로 동작하는 서버 클라이언트 — RLS가 그대로 적용돼서 이 사용자
// 데이터만 보인다. 사용자 데이터 조회/수정은 전부 이걸 쓴다(service role은 RLS를 우회함).
export async function createServerSupabase(): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  return createServerClient(env.supabase.url, env.supabase.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          const ephemeral = isEphemeralCookieSet(cookieStore.getAll());
          for (const { name, value, options } of cookiesToSet)
            cookieStore.set(name, value, toSessionCookieOptions(options, ephemeral));
        } catch {
          // 서버 컴포넌트에서는 쿠키를 쓸 수 없다 — 세션 갱신은 proxy가 맡는다.
        }
      },
    },
  });
}

// API 라우트용 — 토큰을 Supabase Auth에 실제로 확인한 사용자(getUser)만 믿는다.
export async function getRequestUser(): Promise<{ supabase: SupabaseClient; user: User | null }> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}
