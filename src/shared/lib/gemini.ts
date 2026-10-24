import "server-only";

// 스크린샷 추출(extract-job-posting) 전용. 앞 모델이 혼잡하거나 멈추면 같은 Gemini flash 계열의 다음
// 모델로 넘어간다 — 혼잡 시점이 모델마다 달라서 실제로 폴백 효과가 있다(3.8이 몇 시간 멈췄을 때 3.6·3.5는
// 응답했음). 정확도가 낮은 다른 회사 모델(예전 Qwen 폴백)은 공고 내용을 지어내서 쓰지 않는다.
// pro 계열은 무료 요금제 한도가 0이고, 2.5 이하는 신규 사용자에게 막혀 있어서 넣지 않는다.
export const GEMINI_MODELS = ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.5-flash"];

// 서버 혼잡(503 UNAVAILABLE). 보통 금방 풀려서 잠깐 뒤 같은 모델로 한 번 더 시도할 가치가 있다.
export function isOverloaded(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  return message.includes("UNAVAILABLE") || message.includes('"code":503');
}
