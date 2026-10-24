import { describe, expect, it } from "vitest";

import { buildMaterialsPrompt, canRunApplicationMatch, MAX_COVER_LETTER_CHARS } from "./match-materials";

describe("canRunApplicationMatch", () => {
  it("프로젝트·이력서·자소서가 하나도 없으면 돌릴 수 없다", () => {
    expect(canRunApplicationMatch({ projectCount: 0, resume: null, coverLetter: null })).toBe(false);
    expect(canRunApplicationMatch({ projectCount: 0, resume: "  ", coverLetter: { title: "a", content: " " } })).toBe(false);
  });

  it("셋 중 하나만 있어도 돌릴 수 있다", () => {
    expect(canRunApplicationMatch({ projectCount: 1, resume: null, coverLetter: null })).toBe(true);
    expect(canRunApplicationMatch({ projectCount: 0, resume: "경력", coverLetter: null })).toBe(true);
    expect(canRunApplicationMatch({ projectCount: 0, resume: null, coverLetter: { title: "a", content: "지원 동기" } })).toBe(true);
  });
});

describe("buildMaterialsPrompt", () => {
  it("없는 자료는 '없음'으로 적는다", () => {
    expect(buildMaterialsPrompt({ projectCount: 0, resume: null, coverLetter: null })).toBe(
      "이력서:\n(등록된 이력서 없음)\n\n자소서:\n(등록된 자소서 없음)"
    );
  });

  it("긴 자소서는 앞부분만 넣고 생략을 표시한다", () => {
    const long = "가".repeat(MAX_COVER_LETTER_CHARS + 50);
    const prompt = buildMaterialsPrompt({ projectCount: 0, resume: null, coverLetter: { title: "대표", content: long } });
    expect(prompt).toContain("[대표]");
    expect(prompt).toContain("(이하 생략)");
    expect(prompt).not.toContain("가".repeat(MAX_COVER_LETTER_CHARS + 1));
  });
});
