import { describe, expect, it } from "vitest";

import { formatWaitingDays } from "./waiting";

describe("formatWaitingDays", () => {
  it("지원일부터 오늘까지 지난 일수를 센다", () => {
    expect(formatWaitingDays("2026-10-09", "2026-10-23")).toBe("지원 후 14일");
  });

  it("당일이면 '오늘 지원'", () => {
    expect(formatWaitingDays("2026-10-23", "2026-10-23")).toBe("오늘 지원");
  });

  it("달이 바뀌어도 달력 날짜 기준으로 센다", () => {
    expect(formatWaitingDays("2026-09-30", "2026-10-01")).toBe("지원 후 1일");
  });

  it("지원일이 없거나 미래면 표시하지 않는다", () => {
    expect(formatWaitingDays(null, "2026-10-23")).toBeNull();
    expect(formatWaitingDays("2026-10-24", "2026-10-23")).toBeNull();
  });
});
