import { describe, expect, it } from "vitest";

import { isMetaRewrite, stripBannedClosing } from "./writing-rules";

describe("stripBannedClosing", () => {
  it("틀에 박힌 맺음말이 든 마지막 문장을 뺀다", () => {
    expect(
      stripBannedClosing("무한 스크롤로 목록 로딩을 줄였습니다. 이 경험은 귀사 개발에 기여할 수 있습니다.")
    ).toBe("무한 스크롤로 목록 로딩을 줄였습니다.");
  });

  it("금지 표현이 든 문장 하나뿐이면 비운다(근거 없는 문장은 보여주지 않는다)", () => {
    expect(stripBannedClosing("Next.js 경험은 바로 적용할 수 있습니다.")).toBe("");
    expect(
      stripBannedClosing("런픽에서 전체 흐름을 구현한 경험을 바탕으로 풀스택 개발 능력을 강조할 수 있습니다.")
    ).toBe("");
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

// 첨삭이 "고친 문장" 대신 "무엇을 고쳤는지"를 돌려주면 붙여 쓸 수 없어서 걸러낸다.
describe("isMetaRewrite", () => {
  it("고친 내용을 설명하는 문장을 잡는다", () => {
    expect(isMetaRewrite("Next.js와 Zustand로 UI를 구현한 경험을 강조했습니다")).toBe(true);
    expect(isMetaRewrite("최신 기술을 빠르게 적용하겠다고 명시했습니다.")).toBe(true);
  });

  it("실제 자소서 문장은 그대로 둔다", () => {
    expect(isMetaRewrite("드림카드에서 폼 상태를 Zustand로 한곳에 모았습니다.")).toBe(false);
  });
});
