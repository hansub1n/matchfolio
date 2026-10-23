import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { env } from "@/shared/config/env";

let browserClient: SupabaseClient | null = null;

// 브라우저용 클라이언트 — 세션을 쿠키에 둬서 서버(proxy/서버 컴포넌트/라우트)와
// 같은 익명 계정을 공유한다. entities가 서버에서도 import되기 때문에 모듈을 읽는
// 시점이 아니라 처음 쓸 때 만든다.
export function getBrowserSupabase(): SupabaseClient {
  browserClient ??= createBrowserClient(env.supabase.url, env.supabase.anonKey);
  return browserClient;
}
