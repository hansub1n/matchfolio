import { afterEach, describe, expect, it, vi } from "vitest";

import { todayKST, toKSTDateString } from "./kst-date";

describe("toKSTDateString", () => {
  it("rolls over to the next day when UTC time is already past KST midnight", () => {
    // 2026-01-01 15:30 UTC = 2026-01-02 00:30 KST (UTC+9) — 날짜가 넘어가야 한다.
    expect(toKSTDateString("2026-01-01T15:30:00Z")).toBe("2026-01-02");
  });

  it("stays on the same day right before KST midnight", () => {
    // 2026-01-01 14:59 UTC = 2026-01-01 23:59 KST — 아직 자정 전.
    expect(toKSTDateString("2026-01-01T14:59:00Z")).toBe("2026-01-01");
  });
});

describe("todayKST", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the KST calendar date even when the system clock is UTC-based and past midnight KST", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-09T16:00:00Z")); // = 2026-03-10 01:00 KST
    expect(todayKST()).toBe("2026-03-10");
  });
});
