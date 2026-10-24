export interface ModelFallbackOptions {
  // 시도할 모델 순서(같은 Gemini flash 계열, 앞이 1순위).
  models: string[];
  // 서버 혼잡(503)이면 잠깐 뒤 같은 모델로 한 번 더 — 즉시 돌아오는 혼잡은 보통 금방 풀린다.
  isOverloaded: (error: unknown) => boolean;
  retryDelayMs: number;
  sleep?: (ms: number) => Promise<void>;
}

// 공고 추출 순서: 모델을 앞에서부터 하나씩 시도한다. 503(혼잡)으로 바로 거절되면 잠깐 뒤 같은 모델로 한 번 더,
// 응답 없이 멈춘 경우(시간 초과)나 다른 실패는 기다리지 않고 다음 모델로 — 멈춘 모델을 다시 기다리면
// 함수 제한 시간 안에 다음 모델까지 못 간다. 전부 실패하면 마지막 에러를 던진다 — 정확도가 낮은 모델로
// 지어낸 값을 채우느니 실패를 알리는 게 낫다.
export async function runWithModelFallback<T>(
  call: (model: string) => Promise<T>,
  { models, isOverloaded, retryDelayMs, sleep = defaultSleep }: ModelFallbackOptions
): Promise<T> {
  let lastError: unknown = new Error("시도할 모델이 없습니다");
  for (const model of models) {
    try {
      return await call(model);
    } catch (error) {
      lastError = error;
      if (!isOverloaded(error)) continue;
    }
    await sleep(retryDelayMs);
    try {
      return await call(model);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

function defaultSleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
