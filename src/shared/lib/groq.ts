import "server-only";
import Groq from "groq-sdk";

// Groq에서 셀프서브로 쓸 수 있는 비전(이미지 입력) 모델은 2026-10 기준 이거 하나뿐이라
// 스크린샷 추출(extract-job-posting)에서만 쓴다. (console.groq.com/docs/vision)
export const GROQ_VISION_MODEL = "qwen/qwen3.8-27b";

// 텍스트만 다루는 나머지 라우트(기업분석/프로젝트 추출/프로젝트 매칭)는 비전이 필요
// 없어서, 한국어 포함 다국어 벤치마크가 공개돼 있고 더 큰 gpt-oss-120b를 쓴다.
export const GROQ_TEXT_MODEL = "openai/gpt-oss-120b";

// 분당 한도 초과는 retry-after가 짧고, 일일 한도 초과는 더 길게 온다.
const RATE_LIMIT_RETRY_AFTER_THRESHOLD_SECONDS = 60;

function getRetryAfterSeconds(error: unknown) {
  if (!(error instanceof Groq.APIError) || !error.headers) return null;
  const raw = error.headers.get("retry-after");
  if (!raw) return null;
  const seconds = Number(raw);
  return Number.isFinite(seconds) ? seconds : null;
}

function isTimeout(error: unknown) {
  return error instanceof Groq.APIConnectionTimeoutError || error instanceof Groq.APIUserAbortError;
}

export function isQuotaExceeded(error: unknown) {
  if (!(error instanceof Groq.RateLimitError)) return false;
  const retryAfterSeconds = getRetryAfterSeconds(error);
  return retryAfterSeconds === null || retryAfterSeconds > RATE_LIMIT_RETRY_AFTER_THRESHOLD_SECONDS;
}

export function isRetryable(error: unknown) {
  if (isTimeout(error)) return true;
  if (error instanceof Groq.RateLimitError) {
    const retryAfterSeconds = getRetryAfterSeconds(error);
    return retryAfterSeconds !== null && retryAfterSeconds <= RATE_LIMIT_RETRY_AFTER_THRESHOLD_SECONDS;
  }
  return error instanceof Groq.InternalServerError;
}

export function describeGroqError(error: unknown) {
  if (isQuotaExceeded(error)) {
    return "오늘 무료 사용량을 모두 썼습니다. 내일 다시 시도해주세요.";
  }
  if (isTimeout(error)) {
    return "응답 생성이 너무 오래 걸려 중단됐습니다. 잠시 후 다시 시도해주세요.";
  }
  if (isRetryable(error)) {
    return "AI 서버가 일시적으로 혼잡합니다. 잠시 후 다시 시도해주세요.";
  }
  return error instanceof Error ? error.message : "알 수 없는 오류";
}
