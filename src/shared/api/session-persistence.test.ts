import { describe, expect, it } from "vitest";

import { isEphemeralCookieSet, toSessionCookieOptions } from "./session-persistence";

// 로그인 유지를 끈 사람의 세션 쿠키가 400일로 남거나, 반대로 로그아웃 때 지워야 할 쿠키가 안 지워지면
// 공용 컴퓨터에서 다음 사람이 내 보드를 보게 된다 — 이 갈림길만 확인한다.
describe("toSessionCookieOptions", () => {
  it("로그인 유지를 안 켰으면 만료일을 떼서 브라우저를 닫을 때 사라지게 한다", () => {
    const result = toSessionCookieOptions({ path: "/", maxAge: 34560000, sameSite: "lax" }, true);
    expect(result).toEqual({ path: "/", sameSite: "lax" });
  });

  it("지우는 쿠키(maxAge 0)는 그대로 둔다 — 떼면 지워지지 않고 남는다", () => {
    const options = { path: "/", maxAge: 0 };
    expect(toSessionCookieOptions(options, true)).toEqual(options);
  });

  it("로그인 유지·익명 계정은 손대지 않는다", () => {
    const options = { path: "/", maxAge: 34560000 };
    expect(toSessionCookieOptions(options, false)).toBe(options);
  });
});

describe("isEphemeralCookieSet", () => {
  it("표시 쿠키가 있을 때만 참", () => {
    expect(isEphemeralCookieSet([{ name: "sb-x-auth-token" }, { name: "mf-ephemeral" }])).toBe(true);
    expect(isEphemeralCookieSet([{ name: "sb-x-auth-token" }])).toBe(false);
  });
});
