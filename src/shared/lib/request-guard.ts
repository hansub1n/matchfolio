import "server-only";

import { NextResponse } from "next/server";

// 세션 확인(getRequestUser)과 별개로, AI API를 호출하는 라우트를 외부에서 직접
// curl로 두드리는 걸 한 겹 더 거른다. Origin이 이 서버의 Host와 같은지만 본다 —
// 완벽한 보안은 아니지만(Origin 헤더는 조작 가능) 브라우저가 아닌 호출은 걸러진다.
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

// 세션이 없거나 만료된 요청 — 페이지를 새로고침하면 proxy가 세션을 다시 만든다.
export function unauthorizedResponse() {
  return NextResponse.json({ error: "세션이 만료됐어요. 페이지를 새로고침해주세요." }, { status: 401 });
}
