export interface ModelFallbackOptions {
  primary: string;
  fallback: string;
  // 서버 혼잡(503)이면 잠깐 뒤 같은 모델로 한 번 더 — 혼잡은 보통 금방 풀린다.
  isOverloaded: (error: unknown) => boolean;
  retryDelayMs: number;
  sleep?: (ms: number) => Promise<void>;
}

// 공고 추출 순서: 1순위 모델 → (503이면 잠깐 뒤 1순위 재시도) → 2순위 모델.
// 둘 다 실패하면 마지막 에러를 던진다 — 정확도가 낮은 모델로 지어낸 값을 채우느니
// 실패를 알리는 게 낫다.
export async function runWithModelFallback<T>(
  call: (model: string) => Promise<T>,
  { primary, fallback, isOverloaded, retryDelayMs, sleep = defaultSleep }: ModelFallbackOptions
): Promise<T> {
  try {
    return await call(primary);
  } catch (error) {
    if (isOverloaded(error)) {
      await sleep(retryDelayMs);
      try {
        return await call(primary);
      } catch {
        // 2순위 모델로 넘어간다.
      }
    }
  }
  return call(fallback);
}

function defaultSleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
