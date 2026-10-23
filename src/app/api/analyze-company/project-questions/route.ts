import { NextResponse } from "next/server";

import { getRequestUser } from "@/shared/api/supabase-server";
import { consumeAiQuota, quotaExceededResponse } from "@/shared/lib/ai-quota";
import { isSameOrigin, unauthorizedResponse } from "@/shared/lib/request-guard";

import { generateProjectQuestions } from "./generate";

// 재시도 3회 × 35초 + 백오프 ≈ 108초가 최악의 경우.
export const maxDuration = 120;

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "허용되지 않은 요청입니다." }, { status: 403 });
  }
  const { supabase, user } = await getRequestUser();
  if (!user) return unauthorizedResponse();

  const body = await request.json();
  const { applicationId } = body as { applicationId: string };

  if (!applicationId) {
    return NextResponse.json({ error: "applicationId는 필수입니다." }, { status: 400 });
  }

  // "다시 만들기"도 기업분석 횟수로 센다. 실패하면(프로젝트 없음 등 포함) 돌려준다.
  const quota = await consumeAiQuota(user.id, "analyze_company");
  if (!quota) return quotaExceededResponse();

  const result = await generateProjectQuestions(supabase, applicationId);

  if ("error" in result) {
    await quota.refund();
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result);
}
