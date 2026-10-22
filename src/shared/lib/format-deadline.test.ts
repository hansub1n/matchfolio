import { describe, expect, it } from "vitest";

import { formatDeadline, formatDeadlineBadge } from "./format-deadline";

describe("formatDeadline", () => {
  it("formats a deadline as '마감 M/D'", () => {
    expect(formatDeadline("2026-10-21")).toBe("마감 10/21");
  });

  it("returns null when there's no deadline", () => {
    expect(formatDeadline(null)).toBeNull();
  });
});

describe("formatDeadlineBadge", () => {
  const today = "2026-10-20";

  it("returns null when there's no deadline", () => {
    expect(formatDeadlineBadge(null, today)).toBeNull();
  });

  it("labels today's deadline as '오늘' with the urgent tier", () => {
    expect(formatDeadlineBadge("2026-10-20", today)).toEqual({ label: "오늘", tier: "urgent" });
  });

  it("labels D-1 as 'D-1' with the urgent tier", () => {
    expect(formatDeadlineBadge("2026-10-21", today)).toEqual({ label: "D-1", tier: "urgent" });
  });

  it("labels D-2/D-3 with the soon tier", () => {
    expect(formatDeadlineBadge("2026-10-22", today)).toEqual({ label: "D-2", tier: "soon" });
    expect(formatDeadlineBadge("2026-10-23", today)).toEqual({ label: "D-3", tier: "soon" });
  });

  it("labels D-4 and beyond with the normal tier", () => {
    expect(formatDeadlineBadge("2026-10-27", today)).toEqual({ label: "D-7", tier: "normal" });
  });

  it("labels any date before today as '마감' with the past tier", () => {
    expect(formatDeadlineBadge("2026-10-19", today)).toEqual({ label: "마감", tier: "past" });
  });
});
