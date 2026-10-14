import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    env: {
      // entities 배럴을 import하면 연쇄적으로 shared/api/supabase.ts가
      // 로드되면서 createClient()가 즉시 호출됨. 실제 네트워크 요청은
      // 없는 순수 로직 테스트라 더미 값만 있으면 됨.
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
