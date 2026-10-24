// 회사 분석의 웹 검색 결과를 사용자끼리 며칠 공유한다(017_search_cache.sql). Tavily 무료 한도가 가장 먼저
// 바닥나서다. 검색 결과는 검색어로만 정해지는 공개 정보라 공유해도 되지만, AI 분석은 각자의 공고 내용으로
// 걸러지므로 공유하지 않는다.

export interface SearchCacheOptions {
  includeDomains?: string[];
  news?: boolean;
}

// 일반·채용사이트 검색은 회사 정보가 잘 안 바뀌어서 7일, 뉴스는 "최근 소식"이라 2일만.
const GENERAL_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const NEWS_TTL_MS = 2 * 24 * 60 * 60 * 1000;

// 같은 검색이면 같은 키 — 공백·대소문자 차이와 도메인 순서는 무시한다.
export function buildSearchCacheKey(query: string, options: SearchCacheOptions = {}): string {
  const q = query.trim().replace(/\s+/g, " ").toLowerCase();
  const domains = [...(options.includeDomains ?? [])].sort().join(",");
  return [options.news ? "news" : "web", domains, q].join("|");
}

export function isSearchCacheFresh(createdAt: string, options: SearchCacheOptions, now: Date = new Date()): boolean {
  const ttl = options.news ? NEWS_TTL_MS : GENERAL_TTL_MS;
  return now.getTime() - new Date(createdAt).getTime() < ttl;
}
