import { describe, expect, it } from "vitest";

import { getMonogram, normalizeCompanyName } from "./company-name";

describe("normalizeCompanyName", () => {
  it("strips bracket-style corporate markers wherever they appear", () => {
    expect(normalizeCompanyName("(주)이트리즈시스템")).toBe("이트리즈시스템");
    expect(normalizeCompanyName("㈜당근")).toBe("당근");
    expect(normalizeCompanyName("넷지헬스케어(주)")).toBe("넷지헬스케어");
  });

  it("strips full-name corporate markers", () => {
    expect(normalizeCompanyName("주식회사 카카오")).toBe("카카오");
  });

  it("strips English corporate suffixes case-insensitively", () => {
    expect(normalizeCompanyName("toss Inc.")).toBe("toss");
  });

  it("strips a leading bracketed tag", () => {
    expect(normalizeCompanyName("[신입] 라인")).toBe("라인");
  });

  it("returns an empty string when the name is only a corporate marker", () => {
    expect(normalizeCompanyName("(주)")).toBe("");
  });
});

describe("getMonogram", () => {
  it("takes the first character after normalizing", () => {
    expect(getMonogram("(주)이트리즈시스템")).toBe("이");
    expect(getMonogram("㈜당근")).toBe("당");
    expect(getMonogram("주식회사 카카오")).toBe("카");
    expect(getMonogram("넷지헬스케어(주)")).toBe("넷");
    expect(getMonogram("[신입] 라인")).toBe("라");
  });

  it("uppercases a Latin first character", () => {
    expect(getMonogram("toss Inc.")).toBe("T");
  });

  it("falls back to the original name's first character when normalizing empties it out", () => {
    expect(getMonogram("(주)")).toBe("(");
  });
});
