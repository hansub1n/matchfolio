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

// 공고에 같은 기술이 여러 섹션(자격요건/우대사항)에 나오면 AI가 중복으로 넣는다.
// 표기 차이(Next.js/nextjs)까지 같은 기술로 보고 처음 나온 표기만 남긴다.
export function dedupeTechStack(techStack: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const tech of techStack) {
    const trimmed = tech.trim();
    const key = normalizeTech(trimmed);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

export function normalizeExtraction(raw: ExtractedJobPosting): ExtractedJobPosting {
  return {
    ...raw,
    deadline: normalizeDeadline(raw.deadline),
    techStack: dedupeTechStack(raw.techStack ?? []),
  };
}
