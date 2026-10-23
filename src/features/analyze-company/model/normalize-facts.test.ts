import { describe, expect, it } from "vitest";

import type { InterviewPrepFact } from "@/entities/interview-prep";

import { formatFact, formatFactsLine, normalizeFacts } from "./normalize-facts";

function buildFact(overrides: Partial<InterviewPrepFact> = {}): InterviewPrepFact {
  return {
    label: "설립연도",
    value: "2021년",
    source: "잡플래닛",
    asOf: null,
    ...overrides,
  };
}

describe("normalizeFacts", () => {
  it("null이면 빈 배열을 반환해서 facts 영역이 숨겨지게 한다", () => {
    expect(normalizeFacts(null)).toEqual([]);
  });

  it("이미 빈 배열이면 그대로 둔다", () => {
    expect(normalizeFacts([])).toEqual([]);
  });

  it("값이 있으면 그대로 돌려준다", () => {
    const facts = [buildFact()];
    expect(normalizeFacts(facts)).toBe(facts);
  });
});

describe("formatFact", () => {
  it("설립연도는 '~ 설립'로 이어붙인다", () => {
    expect(formatFact(buildFact({ label: "설립연도", value: "2021년" }))).toBe("2021년 설립");
  });

  it("업종은 값 그대로", () => {
    expect(formatFact(buildFact({ label: "업종", value: "쇼핑몰·오픈마켓" }))).toBe("쇼핑몰·오픈마켓");
  });

  it("직원수는 '직원 ~'로 붙인다", () => {
    expect(formatFact(buildFact({ label: "직원수", value: "12명" }))).toBe("직원 12명");
  });

  it("매출은 '매출 ~'에 asOf가 있으면 괄호로 연도를 덧붙인다", () => {
    expect(formatFact(buildFact({ label: "매출", value: "2,409만원", asOf: "2024" }))).toBe(
      "매출 2,409만원 (2024)"
    );
  });

  it("매출이라도 asOf가 없으면 괄호를 붙이지 않는다", () => {
    expect(formatFact(buildFact({ label: "매출", value: "2,409만원", asOf: null }))).toBe("매출 2,409만원");
  });

  it("투자단계는 값 그대로", () => {
    expect(formatFact(buildFact({ label: "투자단계", value: "시리즈A" }))).toBe("시리즈A");
  });
});

describe("formatFactsLine", () => {
  it("여러 fact를 ' · '로 이어붙인다", () => {
    const facts = [
      buildFact({ label: "설립연도", value: "2021년" }),
      buildFact({ label: "업종", value: "쇼핑몰·오픈마켓" }),
      buildFact({ label: "직원수", value: "12명" }),
    ];
    expect(formatFactsLine(facts)).toBe("2021년 설립 · 쇼핑몰·오픈마켓 · 직원 12명");
  });

  it("빈 배열이면 빈 문자열", () => {
    expect(formatFactsLine([])).toBe("");
  });
});
