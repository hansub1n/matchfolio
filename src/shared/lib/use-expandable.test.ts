import { describe, expect, it } from "vitest";

import { sliceExpandable } from "./use-expandable";

describe("sliceExpandable", () => {
  const items = [1, 2, 3, 4, 5];

  it("접힌 상태에서는 limit개만 보이고 나머지 개수를 알려준다", () => {
    expect(sliceExpandable(items, 3, false)).toEqual({ visible: [1, 2, 3], canExpand: true, hiddenCount: 2 });
  });

  it("펼친 상태에서는 전부 보이고, 여전히 접을 수 있다(canExpand 유지)", () => {
    expect(sliceExpandable(items, 3, true)).toEqual({ visible: items, canExpand: true, hiddenCount: 2 });
  });

  it("limit 이하면 펼칠 게 없다", () => {
    expect(sliceExpandable([1, 2], 3, false)).toEqual({ visible: [1, 2], canExpand: false, hiddenCount: 0 });
  });
});
