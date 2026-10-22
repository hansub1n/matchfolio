import { describe, expect, it } from "vitest";

import { parseJobDescription } from "./parse-job-description";

describe("parseJobDescription", () => {
  it("returns null when no recognizable section title appears anywhere", () => {
    expect(parseJobDescription("그냥 자유 형식 공고 설명입니다.\n줄바꿈만 있어요.")).toBeNull();
  });

  it("splits into labeled sections when section titles are present", () => {
    const text = [
      "주요업무",
      "- 프론트엔드 개발",
      "- 코드 리뷰",
      "자격요건",
      "- 3년 이상 경력",
    ].join("\n");

    expect(parseJobDescription(text)).toEqual({
      sections: [
        { title: "주요업무", items: ["프론트엔드 개발", "코드 리뷰"] },
        { title: "자격요건", items: ["3년 이상 경력"] },
      ],
    });
  });

  it("recognizes section titles wrapped in brackets or with a trailing colon", () => {
    const text = ["[자격요건]", "- React 경험", "우대사항:", "- TypeScript"].join("\n");

    expect(parseJobDescription(text)).toEqual({
      sections: [
        { title: "자격요건", items: ["React 경험"] },
        { title: "우대사항", items: ["TypeScript"] },
      ],
    });
  });

  it("keeps intro text that appears before the first recognized section as an untitled section", () => {
    const text = ["회사 소개입니다.", "주요업무", "- 백엔드 개발"].join("\n");

    expect(parseJobDescription(text)).toEqual({
      sections: [
        { title: null, items: ["회사 소개입니다."] },
        { title: "주요업무", items: ["백엔드 개발"] },
      ],
    });
  });
});
