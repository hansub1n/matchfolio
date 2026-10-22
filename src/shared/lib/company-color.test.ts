import { describe, expect, it } from "vitest";

import { getCompanyColor } from "./company-color";

describe("getCompanyColor", () => {
  it("returns the same color for the same company name every time", () => {
    expect(getCompanyColor("토스")).toEqual(getCompanyColor("토스"));
  });

  it("returns one of the 6 palette slots", () => {
    const { background, foreground } = getCompanyColor("당근마켓");
    expect(background).toMatch(/^var\(--avatar-[1-6]-bg\)$/);
    expect(foreground).toMatch(/^var\(--avatar-[1-6]-fg\)$/);
  });

  it("pairs each background with its matching foreground slot", () => {
    const { background, foreground } = getCompanyColor("라인");
    const [, bgIndex] = background.match(/--avatar-(\d)-bg/) ?? [];
    const [, fgIndex] = foreground.match(/--avatar-(\d)-fg/) ?? [];
    expect(bgIndex).toBe(fgIndex);
  });

  it("gives the same color regardless of a corporate marker in the name", () => {
    expect(getCompanyColor("(주)이트리즈")).toEqual(getCompanyColor("이트리즈"));
  });
});
