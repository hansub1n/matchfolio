import { describe, expect, it } from "vitest";

import { joinHighlights, parseHighlights } from "./parse-highlights";

describe("parseHighlights", () => {
  it("한 줄에 하나씩 핵심 포인트로 나눈다", () => {
    expect(parseHighlights("낙관적 업데이트\n무한스크롤\n동시성 제어")).toEqual([
      "낙관적 업데이트",
      "무한스크롤",
      "동시성 제어",
    ]);
  });

  it("문장 안의 쉼표는 쪼개지 않는다", () => {
    expect(parseHighlights("React, TypeScript로 만든 낙관적 업데이트 처리")).toEqual([
      "React, TypeScript로 만든 낙관적 업데이트 처리",
    ]);
  });

  it("빈 줄과 양쪽 공백을 제거한다", () => {
    expect(parseHighlights("  낙관적 업데이트  \n\n  무한스크롤\n")).toEqual([
      "낙관적 업데이트",
      "무한스크롤",
    ]);
  });

  it("빈 문자열이면 빈 배열을 반환한다", () => {
    expect(parseHighlights("")).toEqual([]);
  });
});

describe("joinHighlights", () => {
  it("줄바꿈으로 합친다", () => {
    expect(joinHighlights(["낙관적 업데이트", "무한스크롤"])).toBe("낙관적 업데이트\n무한스크롤");
  });

  it("빈 배열이면 빈 문자열을 반환한다", () => {
    expect(joinHighlights([])).toBe("");
  });
});
