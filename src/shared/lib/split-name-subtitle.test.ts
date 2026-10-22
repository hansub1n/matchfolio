import { describe, expect, it } from "vitest";

import { splitNameSubtitle } from "./split-name-subtitle";

describe("splitNameSubtitle", () => {
  it("splits off a trailing parenthetical subtitle", () => {
    expect(splitNameSubtitle("런픽 (Run-Pick)")).toEqual({ main: "런픽", subtitle: "(Run-Pick)" });
  });

  it("returns the name as-is with no subtitle when there are no parens", () => {
    expect(splitNameSubtitle("드림카드")).toEqual({ main: "드림카드", subtitle: null });
  });
});
