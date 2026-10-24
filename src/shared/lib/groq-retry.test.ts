import { describe, expect, it } from "vitest";

import { computeRetryDelayMs, MAX_RETRY_WAIT_MS } from "./groq-retry";

// 분당 한도에 걸린 요청은 Groq가 말한 만큼 기다려야 다음 시도가 통과한다(바로 다시 보내면 또 429).
describe("computeRetryDelayMs", () => {
  it("retry-after가 있으면 그만큼 기다린다", () => {
    expect(computeRetryDelayMs(3, 1)).toBe(3200);
    expect(computeRetryDelayMs(0.5, 2)).toBe(700);
  });

  it("함수 시간 안에 끝나도록 상한을 둔다", () => {
    expect(computeRetryDelayMs(55, 1)).toBe(MAX_RETRY_WAIT_MS);
  });

  it("retry-after가 없으면 1초·2초로 늘린다", () => {
    expect(computeRetryDelayMs(null, 1)).toBe(1000);
    expect(computeRetryDelayMs(null, 2)).toBe(2000);
  });
});
