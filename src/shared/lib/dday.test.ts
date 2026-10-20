import { describe, expect, it } from "vitest";

import { getDdayTier } from "./dday";

describe("getDdayTier", () => {
  const today = "2026-10-20";

  it("marks today as urgent", () => {
    expect(getDdayTier("2026-10-20", today)).toBe("urgent");
  });

  it("marks D-1 as urgent", () => {
    expect(getDdayTier("2026-10-21", today)).toBe("urgent");
  });

  it("marks D-2 and D-3 as soon", () => {
    expect(getDdayTier("2026-10-22", today)).toBe("soon");
    expect(getDdayTier("2026-10-23", today)).toBe("soon");
  });

  it("marks D-4 and beyond as normal", () => {
    expect(getDdayTier("2026-10-24", today)).toBe("normal");
  });

  it("marks any date before today as past", () => {
    expect(getDdayTier("2026-10-19", today)).toBe("past");
  });
});
