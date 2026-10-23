import { describe, expect, it } from "vitest";

import {
  buildSearchQueries,
  dedupeSourcesByUrl,
  domainToSiteName,
  extractDomain,
  filterSourcesByCompany,
} from "./filter-sources";

describe("buildSearchQueries", () => {
  it("회사명을 따옴표로 감싸고 '회사'/'채용'/직무로 나눠 질의한다", () => {
    expect(buildSearchQueries("텐빌리언", "프론트엔드 개발")).toEqual([
      `"텐빌리언" 회사`,
      `"텐빌리언" 채용`,
      `"텐빌리언" 프론트엔드 개발`,
    ]);
  });

  it("직무가 없으면 직무 질의는 뺀다", () => {
    expect(buildSearchQueries("텐빌리언", "")).toEqual([`"텐빌리언" 회사`, `"텐빌리언" 채용`]);
  });
});

describe("extractDomain", () => {
  it("www를 뗀 호스트명을 돌려준다", () => {
    expect(extractDomain("https://www.tenbillion.co.kr/jobs/1")).toBe("tenbillion.co.kr");
  });

  it("깨진 URL이면 null을 돌려준다", () => {
    expect(extractDomain("not-a-url")).toBeNull();
  });
});

describe("dedupeSourcesByUrl", () => {
  it("같은 URL은 처음 것만 남긴다", () => {
    const a = { url: "https://a.com", title: "A1" };
    const b = { url: "https://a.com", title: "A2" };
    const c = { url: "https://b.com", title: "B" };
    expect(dedupeSourcesByUrl([a, b, c])).toEqual([a, c]);
  });

  it("m./www. 표기나 쿼리스트링만 다른 URL도 같은 글로 보고 뺀다", () => {
    const a = { url: "https://www.a.com/post/1?utm_source=x", title: "A1" };
    const b = { url: "https://m.a.com/post/1", title: "A2" };
    expect(dedupeSourcesByUrl([a, b])).toEqual([a]);
  });

  it("URL이 달라도 제목이 같으면 뺀다", () => {
    const a = { url: "https://a.com/1", title: "같은 기사" };
    const b = { url: "https://b.com/2", title: "같은 기사" };
    expect(dedupeSourcesByUrl([a, b])).toEqual([a]);
  });
});

describe("domainToSiteName", () => {
  it("알려진 채용/기업정보 사이트는 한글 이름으로 바꾼다", () => {
    expect(domainToSiteName("saramin.co.kr")).toBe("사람인");
    expect(domainToSiteName("wanted.co.kr")).toBe("원티드");
    expect(domainToSiteName("jobkorea.co.kr")).toBe("잡코리아");
    expect(domainToSiteName("thevc.kr")).toBe("더브이씨");
    expect(domainToSiteName("jobplanet.co.kr")).toBe("잡플래닛");
    expect(domainToSiteName("rocketpunch.com")).toBe("로켓펀치");
  });

  it("jumpit은 saramin 서브도메인이라도 점핏으로 구분한다", () => {
    expect(domainToSiteName("jumpit.saramin.co.kr")).toBe("점핏");
  });

  it("매칭되지 않는 도메인은 그대로 돌려준다", () => {
    expect(domainToSiteName("tenbillion.co.kr")).toBe("tenbillion.co.kr");
  });
});

describe("filterSourcesByCompany", () => {
  const sources = [
    { title: "텐빌리언 기업 정보", content: "텐빌리언은 AI 코딩 도구를 만듭니다", url: "https://a.com/1" },
    { title: "쓰리빌리언 소개", content: "쓰리빌리언은 유전체 분석 기업입니다", url: "https://b.com/2" },
    { title: "채용 공고 모음", content: "여러 IT 기업 채용 정보", url: "https://search.naver.com?query=텐빌리언" },
    { title: "채용 공고 모음2", content: "여러 IT 기업 채용 정보", url: "https://unrelated.com/jobs" },
  ];

  it("제목/본문/URL 중 하나에라도 법인 표기를 뗀 회사명이 들어있으면 남긴다", () => {
    const result = filterSourcesByCompany(sources, "(주)텐빌리언");
    expect(result.map((s) => s.url)).toEqual(["https://a.com/1", "https://search.naver.com?query=텐빌리언"]);
  });

  it("이름이 비슷한 다른 회사는 걸러낸다", () => {
    const result = filterSourcesByCompany(sources, "텐빌리언");
    expect(result.some((s) => s.title.includes("쓰리빌리언"))).toBe(false);
  });

  it("회사명이 정규화 후 빈 문자열이면 원본을 그대로 돌려준다", () => {
    expect(filterSourcesByCompany(sources, "(주)")).toEqual(sources);
  });
});
