import { describe, expect, it } from "vitest";

import { buildCompanySearchLinks } from "./company-search-links";

describe("buildCompanySearchLinks", () => {
  it("법인 표기를 뗀 회사명으로 4개 링크를 만든다", () => {
    const links = buildCompanySearchLinks("(주)텐빌리언");
    expect(links).toEqual([
      { label: "네이버 뉴스", url: "https://search.naver.com/search.naver?where=news&query=%ED%85%90%EB%B9%8C%EB%A6%AC%EC%96%B8" },
      { label: "잡플래닛", url: "https://www.jobplanet.co.kr/search?query=%ED%85%90%EB%B9%8C%EB%A6%AC%EC%96%B8" },
      {
        label: "사람인 기업정보",
        url: "https://www.saramin.co.kr/zf_user/search/company?searchword=%ED%85%90%EB%B9%8C%EB%A6%AC%EC%96%B8",
      },
      { label: "원티드", url: "https://www.wanted.co.kr/search?query=%ED%85%90%EB%B9%8C%EB%A6%AC%EC%96%B8" },
    ]);
  });

  it("정규화 후 빈 문자열이면 원래 이름을 그대로 쓴다", () => {
    const links = buildCompanySearchLinks("(주)");
    expect(links[0].url).toContain(encodeURIComponent("(주)"));
  });
});
