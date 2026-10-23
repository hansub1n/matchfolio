import { normalizeCompanyName } from "@/shared/lib/company-name";

// 출처 목록에서 "사이트명"으로도 재사용한다.
export function extractDomain(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

// 회사명 하나로만 검색하면 결과가 빈약해서, 다른 각도로 여러 번 나눠 검색한다.
export function buildSearchQueries(company: string, position: string): string[] {
  const quoted = `"${company}"`;
  const queries = [`${quoted} 회사`, `${quoted} 채용`];
  if (position.trim()) queries.push(`${quoted} ${position.trim()}`);
  return queries;
}

// 채용/기업정보 사이트에 한정한 검색 1회를 추가로 보낸다 — 일반 검색보다
// 회사 정보가 정리돼 있을 확률이 높다.
export const COMPANY_SEARCH_JOB_SITE_DOMAINS = [
  "saramin.co.kr",
  "wanted.co.kr",
  "jobkorea.co.kr",
  "thevc.kr",
  "kreditjob.com",
  "rocketpunch.com",
  "jobplanet.co.kr",
];

// 모바일(m.)/www. 표기나 쿼리스트링만 다른 같은 글을 같은 글로 보기 위한 키.
// 실제 링크(url)는 그대로 쓰고, 중복 판단에만 쓴다.
function normalizeUrlForDedup(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^(www|m)\./, "");
    return `${host}${parsed.pathname}`.replace(/\/$/, "");
  } catch {
    return url;
  }
}

// 검색 결과 URL(정규화 기준) 또는 제목 중 하나라도 겹치면 중복으로 본다(같은
// 글이 여러 검색어에 또 걸리거나, 모바일/PC 버전으로 각각 걸리는 경우가 많음).
export function dedupeSourcesByUrl<T extends { title: string; url: string }>(sources: T[]): T[] {
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();
  const result: T[] = [];
  for (const s of sources) {
    const urlKey = normalizeUrlForDedup(s.url);
    const titleKey = s.title.trim();
    if (seenUrls.has(urlKey) || seenTitles.has(titleKey)) continue;
    seenUrls.add(urlKey);
    seenTitles.add(titleKey);
    result.push(s);
  }
  return result;
}

// "참고한 자료"에서 도메인 대신 사람이 읽기 쉬운 사이트명을 보여준다. 매칭 안
// 되는 도메인은 그대로 둔다. jumpit은 호스트에 saramin이 포함돼 있어서(
// jumpit.saramin.co.kr) saramin보다 먼저 검사해야 한다.
const SITE_NAME_BY_DOMAIN_KEYWORD: [string, string][] = [
  ["jumpit.saramin", "점핏"],
  ["saramin", "사람인"],
  ["wanted", "원티드"],
  ["jobkorea", "잡코리아"],
  ["thevc", "더브이씨"],
  ["jobplanet", "잡플래닛"],
  ["rocketpunch", "로켓펀치"],
];

export function domainToSiteName(domain: string): string {
  for (const [keyword, name] of SITE_NAME_BY_DOMAIN_KEYWORD) {
    if (domain.includes(keyword)) return name;
  }
  return domain;
}

// 검색 결과 제목/본문/URL 중 하나에라도 공고 회사명이 들어있는 것만 남긴다 —
// 법인 표기("(주)", "주식회사" 등)는 떼고 비교해야 "(주)텐빌리언"처럼 표기가
// 섞여도 걸린다. 이름이 비슷한 다른 회사(예: "텐빌리언" vs "쓰리빌리언")가
// 섞이는 걸 줄이는 용도.
export function filterSourcesByCompany<T extends { title: string; content: string; url: string }>(
  sources: T[],
  company: string
): T[] {
  const normalized = normalizeCompanyName(company);
  if (!normalized) return sources;
  return sources.filter(
    (s) => s.title.includes(normalized) || s.content.includes(normalized) || s.url.includes(normalized)
  );
}
