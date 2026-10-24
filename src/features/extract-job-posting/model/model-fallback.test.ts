import { describe, expect, it, vi } from "vitest";

import { runWithModelFallback } from "./model-fallback";

const OVERLOADED = new Error("503 UNAVAILABLE");
const TIMEOUT = new Error("aborted: timeout");

// 1순위 모델이 멈추거나 혼잡할 때 함수 제한 시간 안에 다음 모델까지 가는지 — 실제로 3.8-flash가 응답 없이
// 멈춰서 공고 추가가 몇 시간 동안 실패했다.
function setup(results: Record<string, (Error | string)[]>) {
  const calls: string[] = [];
  const call = vi.fn(async (model: string) => {
    calls.push(model);
    const next = results[model].shift();
    if (next instanceof Error) throw next;
    return next as string;
  });
  const sleep = vi.fn(async () => {});
  const run = () =>
    runWithModelFallback(call, {
      models: ["a", "b", "c"],
      isOverloaded: (e) => e === OVERLOADED,
      retryDelayMs: 1500,
      sleep,
    });
  return { calls, sleep, run };
}

describe("runWithModelFallback", () => {
  it("1순위가 성공하면 그 결과를 쓴다", async () => {
    const { calls, run } = setup({ a: ["ok"], b: [], c: [] });
    await expect(run()).resolves.toBe("ok");
    expect(calls).toEqual(["a"]);
  });

  it("503이면 1.5초 뒤 같은 모델로 한 번 더 시도한다", async () => {
    const { calls, sleep, run } = setup({ a: [OVERLOADED, "retried"], b: [], c: [] });
    await expect(run()).resolves.toBe("retried");
    expect(calls).toEqual(["a", "a"]);
    expect(sleep).toHaveBeenCalledWith(1500);
  });

  it("응답 없이 멈춘 모델은 다시 기다리지 않고 바로 다음 모델로", async () => {
    const { calls, sleep, run } = setup({ a: [TIMEOUT], b: ["b ok"], c: [] });
    await expect(run()).resolves.toBe("b ok");
    expect(calls).toEqual(["a", "b"]);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("앞 모델이 모두 실패하면 마지막 모델까지 간다", async () => {
    const { calls, run } = setup({ a: [TIMEOUT], b: [OVERLOADED, OVERLOADED], c: ["c ok"] });
    await expect(run()).resolves.toBe("c ok");
    expect(calls).toEqual(["a", "b", "b", "c"]);
  });

  it("전부 실패하면 마지막 에러를 던진다 — 다른 모델로 지어낸 값을 채우지 않는다", async () => {
    const { run } = setup({ a: [TIMEOUT], b: [TIMEOUT], c: [OVERLOADED, OVERLOADED] });
    await expect(run()).rejects.toBe(OVERLOADED);
  });
});
