import { normalizeExtraction, type ExtractedJobPosting } from "@/features/extract-job-posting/model/normalize-extraction";

import { parseJobPostingLd, visibleText, type JobPostingLd } from "./json-ld";
import { FetchFailure, type FetchFailReason } from "./safe-fetch";
import type { SiteAdapter } from "./sites";

// 링크로 공고 읽기 — 받아오기 → 본문 글자를 AI(Groq)로 정리 → JSON-LD로 회사명·직무·마감일 덮어쓰기 → 정리.
// AI가 실패해도 JSON-LD에 회사명·직무가 있으면 그것만으로 폼을 채운다(method "url-jsonld").
// 본문 이미지 읽기(url-image)는 사람인·잡코리아처럼 본문이 통이미지인 사이트를 열 때 쓸 자리 — 지금 지원하는
// 세 곳은 본문이 글자이고 큰 이미지는 회사 사진이라 쓰지 않는다.

export type LinkReadMethod = "url-jsonld" | "url-text" | "url-image";
export type LinkFailReason = FetchFailReason | "no_content" | "ai_failed";

export const MIN_TEXT_CHARS = 200;
// Groq 분당 토큰 한도(입력+출력 8000, 앱 전체가 함께 씀)를 아끼려고 본문 앞쪽만 보낸다. 한국어는 글자당 토큰이 많다.
// 공고 핵심은 앞쪽에 있고, JSON-LD 본문이 있으면 그게 맨 앞이다.
export const MAX_TEXT_CHARS = 3500;

export interface ReadJobDeps {
  fetchHtml: (url: string) => Promise<{ html: string; finalUrl: string }>;
  // 공고 본문 글자 → 스크린샷 읽기와 같은 모양의 결과. 실패하면 던진다.
  extractFromText: (text: string, hint: JobPostingLd | null) => Promise<ExtractedJobPosting>;
}

export type ReadJobResult =
  | { ok: true; method: LinkReadMethod; usedAi: boolean; posting: ExtractedJobPosting }
  | { ok: false; reason: LinkFailReason; usedAi: boolean };

export async function readJobFromUrl(adapter: SiteAdapter, postingId: string, deps: ReadJobDeps): Promise<ReadJobResult> {
  let html = "";
  try {
    for (const url of adapter.fetchUrls(postingId)) {
      html += (await deps.fetchHtml(url)).html;
    }
  } catch (error) {
    return { ok: false, reason: error instanceof FetchFailure ? error.reason : "network", usedAi: false };
  }

  const ld = parseJobPostingLd(html);
  // 페이지 글자 중 머리말·바닥글 같은 것도 섞이지만, 공고 본문이 대부분이라 그대로 보낸다. JSON-LD 본문이 있으면
  // 그걸 앞에 둔다(가장 깨끗한 본문).
  const text = [ld?.description, visibleText(html)].filter(Boolean).join("\n\n").slice(0, MAX_TEXT_CHARS);
  const ldOnly = ld?.company && ld.title ? fromLd(ld) : null;

  if (text.length < MIN_TEXT_CHARS) {
    return ldOnly ? { ok: true, method: "url-jsonld", usedAi: false, posting: ldOnly } : { ok: false, reason: "no_content", usedAi: false };
  }

  try {
    const ai = await deps.extractFromText(text, ld);
    return { ok: true, method: "url-text", usedAi: true, posting: normalizeExtraction(mergeLd(ai, ld)) };
  } catch {
    return ldOnly ? { ok: true, method: "url-jsonld", usedAi: true, posting: ldOnly } : { ok: false, reason: "ai_failed", usedAi: true };
  }
}

// 회사명·직무·마감일은 사이트가 적어둔 값(JSON-LD)이 정답 — AI가 지어낼 여지를 없앤다. 기술스택은 둘을 합친다.
export function mergeLd(ai: ExtractedJobPosting, ld: JobPostingLd | null): ExtractedJobPosting {
  if (!ld) return ai;
  return {
    company: ld.company ?? ai.company,
    position: ld.title ?? ai.position,
    deadline: ld.deadline ?? ai.deadline,
    techStack: [...ai.techStack, ...ld.skills],
    description: ai.description || ld.description || "",
  };
}

function fromLd(ld: JobPostingLd): ExtractedJobPosting {
  return normalizeExtraction({
    company: ld.company ?? "",
    position: ld.title ?? "",
    deadline: ld.deadline,
    techStack: ld.skills,
    description: ld.description ?? "",
  });
}
