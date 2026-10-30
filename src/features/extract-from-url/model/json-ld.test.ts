import { describe, expect, it } from "vitest";

import { parseJobPostingLd, visibleText } from "./json-ld";

const page = (ld: unknown) => `<html><head><script type="application/ld+json">${JSON.stringify(ld)}</script></head><body>본문</body></html>`;

// JSON-LD 값은 AI 결과를 덮어쓰는 "정답"으로 쓴다 — 잘못 읽으면 회사명·마감일이 통째로 틀린다.
describe("parseJobPostingLd", () => {
  it("리멤버처럼 마감일·기술이 있는 JobPosting을 읽는다", () => {
    const ld = parseJobPostingLd(
      page({
        "@context": "https://schema.org",
        "@type": "JobPosting",
        title: "백엔드 엔지니어",
        hiringOrganization: { "@type": "Organization", name: "(주)엘리스" },
        validThrough: "2026-10-31T23:59:59+09:00",
        description: "<p>주요업무</p><ul><li>API 개발 &amp; 운영</li></ul>",
        skills: "Kotlin, Spring",
      })
    );
    expect(ld).toEqual({
      company: "(주)엘리스",
      title: "백엔드 엔지니어",
      deadline: "2026-10-31",
      description: "주요업무\nAPI 개발 & 운영",
      skills: ["Kotlin", "Spring"],
    });
  });

  it("@graph 안에 있어도 찾고, 마감일이 없으면 null(원티드)", () => {
    const ld = parseJobPostingLd(
      page({ "@graph": [{ "@type": "WebPage" }, { "@type": "JobPosting", title: "SOX Manager", hiringOrganization: { name: "토스" } }] })
    );
    expect(ld).toMatchObject({ company: "토스", title: "SOX Manager", deadline: null, skills: [] });
  });

  it("JobPosting이 없거나 깨진 JSON이면 null(점핏)", () => {
    expect(parseJobPostingLd(page({ "@type": "Organization", name: "점핏" }))).toBeNull();
    expect(parseJobPostingLd('<script type="application/ld+json">{깨짐</script>')).toBeNull();
  });
});

describe("visibleText", () => {
  it("스크립트·스타일은 빼고 보이는 글자만", () => {
    expect(visibleText("<head><title>x</title></head><style>.a{}</style><script>var a</script><div>주요업무<br>개발</div>")).toBe("주요업무\n개발");
  });
});
