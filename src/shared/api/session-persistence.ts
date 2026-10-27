// "로그인 유지"를 켜지 않은 GitHub 로그인은 브라우저를 닫으면 끝나게 한다(공용 컴퓨터에서 로그아웃을 깜빡해도
// 다음 사람이 내 보드를 보지 못하게).
// - 표시 쿠키(EPHEMERAL_COOKIE)가 있으면 Supabase 세션 쿠키를 만료일 없이(브라우저 세션 동안만) 쓴다.
//   표시 쿠키 자신도 만료일 없는 쿠키라 브라우저를 닫으면 같이 사라진다.
// - GitHub 로그인을 시작할 때 표시를 세우고, "로그인 유지"를 켜거나 로그아웃하면 지운다. 익명 계정은 표시가
//   없어서 지금처럼 오래 유지된다 — 익명은 쿠키 말고는 계정을 찾을 방법이 없어서 지우면 보드가 사라진다.
// @supabase/ssr은 cookieOptions로 넘긴 maxAge를 무시하고 400일로 덮어써서, 쿠키를 쓰는 자리(proxy·서버·브라우저)
// 에서 직접 걸러낸다.

export const EPHEMERAL_COOKIE = "mf-ephemeral";

interface CookieOptionsLike {
  maxAge?: number;
  expires?: Date;
}

// 지우는 쿠키(maxAge 0)는 그대로 두고, 오래 남기려는 쿠키에서만 만료일을 뗀다.
export function toSessionCookieOptions<T extends CookieOptionsLike>(options: T, ephemeral: boolean): T {
  if (!ephemeral) return options;
  if (options.maxAge !== undefined && options.maxAge <= 0) return options;
  const rest = { ...options };
  delete rest.maxAge;
  delete rest.expires;
  return rest;
}

export function isEphemeralCookieSet(cookies: { name: string }[]): boolean {
  return cookies.some((c) => c.name === EPHEMERAL_COOKIE);
}
