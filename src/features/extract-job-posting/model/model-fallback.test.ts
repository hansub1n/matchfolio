import { describe, expect, it, vi } from "vitest";

import { runWithModelFallback } from "./model-fallback";

const OVERLOADED = new Error("503 UNAVAILABLE");
const OTHER = new Error("400 bad request");

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
      primary: "primary",
      fallback: "fallback",
      isOverloaded: (e) => e === OVERLOADED,
      retryDelayMs: 1500,
      sleep,
    });
  return { calls, sleep, run };
}

describe("runWithModelFallback", () => {
  it("1순위가 성공하면 그 결과를 쓴다", async () => {
    const { calls, run } = setup({ primary: ["ok"], fallback: [] });
    await expect(run()).resolves.toBe("ok");
    expect(calls).toEqual(["primary"]);
  });

  it("1순위가 503이면 1.5초 뒤 같은 모델로 한 번 더 시도한다", async () => {
    const { calls, sleep, run } = setup({ primary: [OVERLOADED, "retried"], fallback: [] });
    await expect(run()).resolves.toBe("retried");
    expect(calls).toEqual(["primary", "primary"]);
    expect(sleep).toHaveBeenCalledWith(1500);
  });

  it("재시도도 실패하면 2순위 모델로 넘어간다", async () => {
    const { calls, run } = setup({ primary: [OVERLOADED, OVERLOADED], fallback: ["fallback ok"] });
    await expect(run()).resolves.toBe("fallback ok");
    expect(calls).toEqual(["primary", "primary", "fallback"]);
  });

  it("503이 아닌 실패는 재시도 없이 바로 2순위로 넘어간다", async () => {
    const { calls, sleep, run } = setup({ primary: [OTHER], fallback: ["fallback ok"] });
    await expect(run()).resolves.toBe("fallback ok");
    expect(calls).toEqual(["primary", "fallback"]);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("2순위까지 실패하면 에러를 던진다 — 다른 모델로 지어낸 값을 채우지 않는다", async () => {
    const { run } = setup({ primary: [OVERLOADED, OVERLOADED], fallback: [OVERLOADED] });
    await expect(run()).rejects.toBe(OVERLOADED);
  });
});
