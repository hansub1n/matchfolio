import { describe, expect, it } from "vitest";

import { buildSearchCacheKey, isSearchCacheFresh } from "./search-cache";

// 키가 흔들리면 같은 회사 검색이 매번 새로 나가서(무료 한도 소모) 캐시가 의미 없고, 다른 검색이 같은 키가 되면
// 엉뚱한 결과를 보여준다.
describe("buildSearchCacheKey", () => {
  it("공백·대소문자 차이는 같은 검색으로 본다", () => {
    expect(buildSearchCacheKey('"토스"  회사')).toBe(buildSearchCacheKey(' "토스" 회사 '));
    expect(buildSearchCacheKey("Toss 채용")).toBe(buildSearchCacheKey("toss 채용"));
  });

  it("일반·뉴스·채용사이트 한정 검색은 서로 다른 키", () => {
    const keys = new Set([
      buildSearchCacheKey('"토스"'),
      buildSearchCacheKey('"토스"', { news: true }),
      buildSearchCacheKey('"토스"', { includeDomains: ["saramin.co.kr"] }),
    ]);
    expect(keys.size).toBe(3);
  });

  it("도메인 순서는 상관없다", () => {
    expect(buildSearchCacheKey("q", { includeDomains: ["a.com", "b.com"] })).toBe(
      buildSearchCacheKey("q", { includeDomains: ["b.com", "a.com"] })
    );
  });
});

describe("isSearchCacheFresh", () => {
  const now = new Date("2026-10-25T00:00:00Z");
  it("일반 검색은 7일, 뉴스는 2일까지 쓴다", () => {
    expect(isSearchCacheFresh("2026-10-19T00:00:00Z", {}, now)).toBe(true);
    expect(isSearchCacheFresh("2026-10-17T00:00:00Z", {}, now)).toBe(false);
    expect(isSearchCacheFresh("2026-10-23T12:00:00Z", { news: true }, now)).toBe(true);
    expect(isSearchCacheFresh("2026-10-22T00:00:00Z", { news: true }, now)).toBe(false);
  });
});
