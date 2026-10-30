import { lookup } from "node:dns/promises";
import { NextResponse, type NextRequest } from "next/server";

import { readJobFromUrl } from "@/features/extract-from-url/model/read-job-from-url";
import { safeFetchHtml } from "@/features/extract-from-url/model/safe-fetch";
import { isAllowedFetchHost, LINK_READING_ENABLED } from "@/features/extract-from-url/model/sites";
import { checkJobUrl } from "@/features/extract-from-url/model/url-guard";
import { EXTRACTION_SCHEMA } from "@/features/extract-job-posting/model/extraction-schema";
import type { ExtractedJobPosting } from "@/features/extract-job-posting/model/normalize-extraction";
import { getRequestUser } from "@/shared/api/supabase-server";
import { env } from "@/shared/config/env";
import { consumeAiQuota, quotaExceededResponse } from "@/shared/lib/ai-quota";
import { createGroqClient, GROQ_TEXT_MODEL, isRetryable, retryDelayMs } from "@/shared/lib/groq";
import { isSameOrigin, unauthorizedResponse } from "@/shared/lib/request-guard";

// 링크로 공고 넣기 — 지원 사이트(원티드·리멤버·점핏)의 공고 주소만 받아서 읽는다.
// 받아온 HTML은 저장하지 않는다. 같은 공고가 이미 보드에 있으면 받아오지 않고 그 카드를 알려준다.
export const maxDuration = 60;

// 분당 한도(429)와 출력이 잘려 JSON이 깨지는 경우(400 json_validate_failed)가 이어서 올 수 있어 세 번까지.
const GROQ_ATTEMPTS = 3;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function extractFromText(text: string): Promise<ExtractedJobPosting> {
  const groq = createGroqClient(env.groq.apiKey);
  const prompt = `다음은 채용공고 페이지에서 가져온 글자다. 메뉴·추천 공고·바닥글 같은 다른 글자가 섞여 있을 수 있으니 이 공고 하나에 해당하는 내용만 써라.

${text}

회사명, 직무, 마감일, 기술스택 태그를 추출하고, 주요업무/자격요건/우대사항을 소제목과 불릿으로 정리해줘. 글자에 없는 내용은 지어내지 말고 비워둬.`;
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await groq.chat.completions.create(
        {
          model: GROQ_TEXT_MODEL,
          messages: [{ role: "user", content: prompt }],
          // 이 모델은 출력 토큰 일부를 속으로 생각하는 데 쓴다 — 1500이면 공고 정리가 중간에 잘려 JSON이 깨졌다.
          // 생각은 짧게(low), 상한은 조금 넉넉하게.
          reasoning_effort: "low",
          max_completion_tokens: 2000,
          response_format: {
            type: "json_schema",
            json_schema: { name: "job_posting", schema: EXTRACTION_SCHEMA, strict: true },
          },
        },
        { signal: AbortSignal.timeout(25000) }
      );
      return JSON.parse(response.choices[0]?.message?.content ?? "{}") as ExtractedJobPosting;
    } catch (error) {
      if (attempt < GROQ_ATTEMPTS && isRetryable(error)) {
        await sleep(retryDelayMs(error, attempt));
        continue;
      }
      console.warn("extract-from-url AI 실패:", error instanceof Error ? error.message : error);
      throw error;
    }
  }
}

const FAIL_MESSAGES: Record<string, string> = {
  invalid: "링크 주소를 다시 확인해주세요",
  unsupported: "아직 지원하지 않는 사이트예요",
  not_posting: "공고 상세 페이지 링크를 넣어주세요",
  blocked: "사이트가 자동으로 읽는 걸 막고 있어요",
  not_found: "공고를 찾을 수 없어요. 마감되었거나 지워진 공고일 수 있어요",
  timeout: "사이트가 응답하지 않아요",
  too_large: "페이지가 너무 커서 읽지 못했어요",
  redirect_blocked: "다른 사이트로 넘어가는 링크라 읽지 않았어요",
  private_ip: "읽을 수 없는 주소예요",
  network: "사이트에 연결하지 못했어요",
  no_content: "페이지에서 공고 내용을 찾지 못했어요",
  ai_failed: "지금 AI 요청이 몰려서 읽지 못했어요",
};

function failure(reason: string, site: string | null, status = 422) {
  return NextResponse.json({ error: FAIL_MESSAGES[reason] ?? FAIL_MESSAGES.network, reason, site }, { status });
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "허용되지 않은 요청입니다." }, { status: 403 });
  }
  // 꺼져 있으면 아무 사이트도 받아오지 않는다(sites.ts의 LINK_READING_ENABLED).
  if (!LINK_READING_ENABLED) {
    return NextResponse.json({ error: "지금은 링크로 넣기를 쓸 수 없어요", reason: "unsupported", site: null }, { status: 404 });
  }
  const { supabase, user } = await getRequestUser();
  if (!user) return unauthorizedResponse();

  const { url } = (await request.json().catch(() => ({}))) as { url?: unknown };
  const check = checkJobUrl(typeof url === "string" ? url : "");
  if (!check.ok) return failure(check.reason, check.adapter?.id ?? null);
  const site = check.adapter.id;

  // 이미 보드에 있는 공고면 받아오지 않는다(횟수도 쓰지 않음).
  const { data: existing } = await supabase
    .from("applications")
    .select("id")
    .eq("job_posting_url", check.canonicalUrl)
    .limit(1)
    .maybeSingle();
  if (existing) {
    return NextResponse.json(
      { error: "이미 추가한 공고예요", reason: "duplicate", site, applicationId: existing.id },
      { status: 409 }
    );
  }

  // 받아오기와 AI 읽기를 한 번으로 친다(공고 추출 하루 한도). AI까지 가지 못하고 끝나면 돌려준다.
  const quota = await consumeAiQuota(user.id, "extract_job_posting");
  if (!quota) return quotaExceededResponse();

  const result = await readJobFromUrl(check.adapter, check.postingId, {
    fetchHtml: (target) =>
      safeFetchHtml(target, {
        fetch,
        lookup: async (host) => (await lookup(host, { all: true })).map((a) => a.address),
        isAllowedHost: isAllowedFetchHost,
      }),
    extractFromText,
  });

  if (!result.ok) {
    await quota.refund();
    console.warn("extract-from-url 실패:", site, check.postingId, result.reason);
    return failure(result.reason, site, result.reason === "ai_failed" ? 503 : 422);
  }
  if (!result.usedAi) await quota.refund();

  return NextResponse.json({ ...result.posting, sourceUrl: check.canonicalUrl, method: result.method, site });
}
