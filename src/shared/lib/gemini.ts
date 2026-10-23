import "server-only";

// 스크린샷 추출(extract-job-posting) 전용. 1순위 모델이 혼잡하면 같은 Gemini의 다른
// 모델로 넘어간다 — 혼잡 시점이 모델마다 달라서 실제로 폴백 효과가 있다. 정확도가
// 낮은 다른 회사 모델(예전 Qwen 폴백)은 공고 내용을 지어내서 쓰지 않는다.
export const GEMINI_MODEL = "gemini-3.8-flash";
export const GEMINI_FALLBACK_MODEL = "gemini-3.5-flash";

// 서버 혼잡(503 UNAVAILABLE). 보통 금방 풀려서 잠깐 뒤 같은 모델로 한 번 더 시도할 가치가 있다.
export function isOverloaded(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  return message.includes("UNAVAILABLE") || message.includes('"code":503');
}
