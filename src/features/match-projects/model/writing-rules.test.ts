import { describe, expect, it } from "vitest";

import { stripBannedClosing } from "./writing-rules";

describe("stripBannedClosing", () => {
  it("틀에 박힌 맺음말이 든 마지막 문장을 뺀다", () => {
    expect(
      stripBannedClosing("무한 스크롤로 목록 로딩을 줄였습니다. 이 경험은 귀사 개발에 기여할 수 있습니다.")
    ).toBe("무한 스크롤로 목록 로딩을 줄였습니다.");
  });

  it("한 문장뿐이면 지우지 않고 그대로 둔다(빈 문장보다 낫다)", () => {
    const only = "Next.js 경험은 바로 적용할 수 있습니다.";
    expect(stripBannedClosing(only)).toBe(only);
  });

  it("금지 표현이 없으면 그대로", () => {
    expect(stripBannedClosing("폼 상태를 한 곳으로 모았습니다.")).toBe("폼 상태를 한 곳으로 모았습니다.");
  });

  it("기술 이름 속 점(Next.js)은 문장 끝으로 보지 않는다", () => {
    expect(
      stripBannedClosing("Next.js로 목록을 다시 짰습니다. 이는 귀사 개발에 기여할 수 있습니다.")
    ).toBe("Next.js로 목록을 다시 짰습니다.");
  });
});
