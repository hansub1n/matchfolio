/**
 * 프로젝트 전역에서 쓰는 환경변수를 한 곳에서 읽는다.
 * 아직 Supabase/Groq/Tavily 계정을 안 붙였다면 .env.local에 값이 비어있을 수 있는데,
 * 그건 각 기능(entities/features)을 실제로 구현하는 시점에 채우면 된다.
 */
export const env = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY ?? "",
  },
  groq: {
    apiKey: process.env.GROQ_API_KEY ?? "",
  },
  tavily: {
    apiKey: process.env.TAVILY_API_KEY ?? "",
  },
  // 공개용 사이트 키(브라우저 위젯에 그대로 들어감). 비밀 키는 Supabase Auth의 CAPTCHA 설정에만 있다.
  turnstile: {
    siteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "",
  },
  // Vercel Cron이 정리 라우트를 부를 때 Authorization 헤더로 보내는 값(Vercel 환경변수 CRON_SECRET).
  cron: {
    secret: process.env.CRON_SECRET ?? "",
  },
} as const;
