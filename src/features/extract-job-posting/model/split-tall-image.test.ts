import { describe, expect, it } from "vitest";

import { computeTileRects } from "./split-tall-image";

function coversWholeImage(rects: { top: number; height: number }[], height: number) {
  for (let i = 1; i < rects.length; i++) {
    // 이전 조각 끝보다 다음 조각 시작이 위에 있어야(겹쳐야) 빈 줄이 없다.
    if (rects[i].top >= rects[i - 1].top + rects[i - 1].height) return false;
  }
  const last = rects[rects.length - 1];
  return rects[0].top === 0 && last.top + last.height === height;
}

describe("computeTileRects", () => {
  it("세로가 가로의 2배 이하면 자르지 않는다", () => {
    expect(computeTileRects(1280, 2560)).toEqual([{ top: 0, height: 2560 }]);
    expect(computeTileRects(1280, 800)).toEqual([{ top: 0, height: 800 }]);
  });

  it("전체 페이지 캡처(1280×4192)는 3조각으로 겹치게 자르고 끝까지 덮는다", () => {
    const rects = computeTileRects(1280, 4192);
    expect(rects).toHaveLength(3);
    expect(rects[0]).toEqual({ top: 0, height: 1536 });
    expect(rects[1].top).toBe(1436);
    expect(coversWholeImage(rects, 4192)).toBe(true);
  });

  it("아주 긴 이미지는 최대 6조각으로 하되 끝부분을 잃지 않는다", () => {
    const rects = computeTileRects(1000, 20000);
    expect(rects).toHaveLength(6);
    expect(coversWholeImage(rects, 20000)).toBe(true);
  });

  it("마지막 조각은 남은 높이만큼만", () => {
    const rects = computeTileRects(1000, 2100);
    const last = rects[rects.length - 1];
    expect(last.top + last.height).toBe(2100);
    expect(last.height).toBeLessThanOrEqual(1200);
  });
});
