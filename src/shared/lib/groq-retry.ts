// Groq 재시도 대기 시간. 분당 한도(429)면 Groq가 알려준 retry-after만큼(+조금) 기다리고, 그 외(타임아웃·
// 일시 오류)는 1초·2초로 늘린다. 너무 오래 기다리면 Vercel 함수 시간 안에 못 끝나서 상한을 둔다 —
// retry-after가 이보다 긴 일일 한도 초과는 애초에 재시도하지 않는다(groq.ts의 isRetryable).
export const MAX_RETRY_WAIT_MS = 30_000;

export function computeRetryDelayMs(retryAfterSeconds: number | null, attempt: number): number {
  if (retryAfterSeconds !== null) return Math.min(Math.ceil(retryAfterSeconds * 1000) + 200, MAX_RETRY_WAIT_MS);
  return 1000 * attempt;
}
