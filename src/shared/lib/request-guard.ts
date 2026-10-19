import "server-only";

// 로그인이 없는 개인용 앱이라 사용자 인증은 없지만, AI API를 호출하는
// 라우트를 외부에서 직접 curl로 두드려 할당량을 소진시키는 건 막아야 한다.
// Origin이 이 서버의 Host와 같은지만 확인한다 — 완벽한 보안은 아니지만
// (Origin 헤더는 조작 가능), 브라우저가 아닌 직접 호출을 걸러내는 데는 충분하다.
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}
