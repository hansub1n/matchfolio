import { createBrowserClient, parseCookieHeader, serializeCookieHeader } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { env } from "@/shared/config/env";

import { EPHEMERAL_COOKIE, isEphemeralCookieSet, toSessionCookieOptions } from "./session-persistence";

let browserClient: SupabaseClient | null = null;

// 브라우저용 클라이언트 — 세션을 쿠키에 둬서 서버(proxy/서버 컴포넌트/라우트)와
// 같은 익명 계정을 공유한다. entities가 서버에서도 import되기 때문에 모듈을 읽는
// 시점이 아니라 처음 쓸 때 만든다.
// 쿠키 읽기/쓰기는 기본 동작(document.cookie)과 같고, 로그인 유지를 안 켰으면 만료일만 뗀다(session-persistence).
export function getBrowserSupabase(): SupabaseClient {
  browserClient ??= createBrowserClient(env.supabase.url, env.supabase.anonKey, {
    cookies: {
      getAll() {
        return parseCookieHeader(document.cookie).map(({ name, value }) => ({ name, value: value ?? "" }));
      },
      setAll(cookiesToSet) {
        const ephemeral = isEphemeralCookieSet(parseCookieHeader(document.cookie));
        for (const { name, value, options } of cookiesToSet) {
          document.cookie = serializeCookieHeader(name, value, toSessionCookieOptions(options, ephemeral));
        }
      },
    },
  });
  return browserClient;
}

// GitHub 로그인을 시작할 때(유지 안 함) 세우고, "로그인 유지"를 켜거나 로그아웃하면 지운다.
// 표시 쿠키 자신도 만료일이 없어서 브라우저를 닫으면 사라진다.
export function setSessionOnlyLogin(on: boolean) {
  document.cookie = on
    ? `${EPHEMERAL_COOKIE}=1; Path=/; SameSite=Lax`
    : `${EPHEMERAL_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function isSessionOnlyLogin(): boolean {
  return isEphemeralCookieSet(parseCookieHeader(document.cookie));
}
