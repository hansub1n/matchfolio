import { normalizeTech } from "@/shared/lib/normalize-tech";

export interface ExtractedJobPosting {
  company: string;
  position: string;
  deadline: string | null;
  techStack: string[];
  description: string;
}

const DATE_PATTERN = /(\d{4})\s*[-./년]\s*(\d{1,2})\s*[-./월]\s*(\d{1,2})/;

// 스키마에 YYYY-MM-DD를 요구해도 AI가 "채용 진행중 (2024-11-30 23:59)"처럼 문장을
// 돌려줄 때가 있다 — 그대로 두면 date input이 거부하고 DB(date 컬럼) 저장도 실패한다.
// 문장 안의 첫 날짜만 꺼내고, 없거나 존재하지 않는 날짜면 null(상시 채용 취급).
export function normalizeDeadline(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const match = raw.match(DATE_PATTERN);
  if (!match) return null;
  const [, year, month, day] = match;
  const date = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  const parsed = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date ? date : null;
}

const MAX_TECH_STACK = 12;
const MAX_TECH_NAME_LENGTH = 30;
const HANGUL_ONLY = /^[\s가-힣·/,]+$/;

// 공고에 같은 기술이 여러 섹션(자격요건/우대사항)에 나오면 AI가 중복으로 넣는다.
// 표기 차이(Next.js/nextjs)까지 같은 기술로 보고 처음 나온 표기만 남긴다.
// 프롬프트로 "기술 이름만"을 요구해도 업무 분야("빅데이터 분석")나 괄호 설명이
// 섞여 들어올 때가 있어서 한 번 더 거른다 — 기술 이름은 거의 영문이라 한글로만
// 된 항목은 기술이 아닌 것으로 보고 뺀다.
export function dedupeTechStack(techStack: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const tech of techStack) {
    const trimmed = tech.replace(/\s*\(.*\)\s*$/, "").trim();
    if (!trimmed || trimmed.length > MAX_TECH_NAME_LENGTH || HANGUL_ONLY.test(trimmed)) continue;
    const key = normalizeTech(trimmed);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
    if (result.length === MAX_TECH_STACK) break;
  }
  return result;
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

// 채용 사이트가 공고 본문을 HTML 그대로 보여주는 경우 AI가 태그까지 옮겨 적는다.
// 줄바꿈 의미가 있는 태그는 줄바꿈으로 바꾸고 나머지 태그는 지운 뒤 엔티티를 푼다.
export function cleanDescription(raw: string): string {
  return raw
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&([a-z]+);/gi, (match, name) => NAMED_ENTITIES[name.toLowerCase()] ?? match)
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function normalizeExtraction(raw: ExtractedJobPosting): ExtractedJobPosting {
  return {
    ...raw,
    deadline: normalizeDeadline(raw.deadline),
    techStack: dedupeTechStack(raw.techStack ?? []),
    description: cleanDescription(raw.description ?? ""),
  };
}
