import { describe, expect, it } from "vitest";

import { formatDateTime } from "./format-date-time";

describe("formatDateTime", () => {
  it("returns null when there's no value", () => {
    expect(formatDateTime(null)).toBeNull();
    expect(formatDateTime(undefined)).toBeNull();
  });

  it("formats a plain date string as date-only with the weekday", () => {
    // 2026-10-20은 화요일
    expect(formatDateTime("2026-10-20")).toBe("10.20 (화)");
  });

  it("formats an ISO datetime with both date and time, no seconds", () => {
    expect(formatDateTime("2026-10-20T13:31:00")).toBe("10.20 (화) 13:31");
  });
});
