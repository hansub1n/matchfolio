import { describe, expect, it } from "vitest";

import { normalizeTech } from "./normalize-tech";

describe("normalizeTech", () => {
  it("treats case, whitespace, and dots as insignificant", () => {
    expect(normalizeTech("Next.js")).toBe("nextjs");
    expect(normalizeTech("nextjs")).toBe("nextjs");
    expect(normalizeTech("NEXT JS")).toBe("nextjs");
  });
});
