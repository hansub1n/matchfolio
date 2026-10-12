/**
 * 프로젝트 전역에서 쓰는 환경변수를 한 곳에서 읽는다.
 * 아직 Supabase/Gemini/Tavily 계정을 안 붙였다면 .env.local에 값이 비어있을 수 있는데,
 * 그건 각 기능(entities/features)을 실제로 구현하는 시점에 채우면 된다.
 */
export const env = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY ?? "",
  },
  tavily: {
    apiKey: process.env.TAVILY_API_KEY ?? "",
  },
} as const;
