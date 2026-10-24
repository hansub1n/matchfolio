import { describe, expect, it } from "vitest";

import { classifyAuthError } from "./auth-error";

// 이미 연결된 GitHub면 "그 기록으로 들어가기"를, 그 외 실패는 일반 안내를 보여줘야 한다 — 새 기기에서 예전
// 기록을 찾는 유일한 길이라 구분이 틀리면 사용자가 기록을 못 찾는다.
describe("classifyAuthError", () => {
  it("이미 다른 기록에 연결된 GitHub", () => {
    expect(classifyAuthError("identity_already_exists")).toBe("already_linked");
  });

  it("그 외 오류는 일반 실패", () => {
    expect(classifyAuthError("manual_linking_disabled")).toBe("failed");
    expect(classifyAuthError("access_denied")).toBe("failed");
  });

  it("오류가 없으면 아무것도 안 보인다", () => {
    expect(classifyAuthError(null)).toBeNull();
  });
});
