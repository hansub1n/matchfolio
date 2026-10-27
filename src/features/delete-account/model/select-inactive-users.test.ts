import { describe, expect, it } from "vitest";

import { selectInactiveUsers } from "./select-inactive-users";

// 잘못 고르면 매일 쓰는 사람의 보드가 통째로 지워진다 — 특히 익명 계정은 last_sign_in_at이 만든 날에 멈춰
// 있으니, 첫 화면을 열 때 적은 날(last_seen_at)을 같이 봐야 한다.
const now = new Date("2026-10-27T00:00:00Z");
const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();

describe("selectInactiveUsers", () => {
  it("만든 지 오래됐어도 최근에 들어온 익명 계정은 남긴다", () => {
    const users = [{ id: "anon", createdAt: daysAgo(500), lastSignInAt: daysAgo(500) }];
    expect(selectInactiveUsers(users, new Map([["anon", daysAgo(3)]]), now)).toEqual([]);
  });

  it("셋 중 가장 늦은 날도 1년이 넘었으면 고른다", () => {
    const users = [
      { id: "old", createdAt: daysAgo(800), lastSignInAt: daysAgo(400) },
      { id: "fresh", createdAt: daysAgo(10), lastSignInAt: null },
    ];
    expect(selectInactiveUsers(users, new Map([["old", daysAgo(366)]]), now)).toEqual(["old"]);
  });

  it("기록이 하나도 없으면 만든 날 기준", () => {
    const users = [{ id: "never", createdAt: daysAgo(400), lastSignInAt: null }];
    expect(selectInactiveUsers(users, new Map(), now)).toEqual(["never"]);
  });
});
