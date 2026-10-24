import "server-only";
import Groq from "groq-sdk";

import { computeRetryDelayMs } from "./groq-retry";

// 텍스트만 다루는 라우트(기업분석/프로젝트 추출/공고 매칭) 전용. 스크린샷 추출은
// Gemini만 쓴다 — 예전 Groq 비전 폴백(Qwen)은 한국어 공고를 못 읽고 내용을 지어내서 뺐다.
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

// SDK 기본 재시도(2회)는 retry-after를 상한 없이 그대로 기다린다 — 하루 한도에 걸리면(retry-after가 수 시간)
// 요청이 타임아웃까지 붙잡혀 있다가 "너무 오래 걸림"으로 끝났다. 재시도는 라우트 반복문 한 곳에서만 한다.
export function createGroqClient(apiKey: string) {
  return new Groq({ apiKey, maxRetries: 0 });
}

// 라우트 반복문에서 다음 시도 전에 기다릴 시간.
export function retryDelayMs(error: unknown, attempt: number) {
  return computeRetryDelayMs(error instanceof Groq.RateLimitError ? getRetryAfterSeconds(error) : null, attempt);
}

function isTimeout(error: unknown) {
  return error instanceof Groq.APIConnectionTimeoutError || error instanceof Groq.APIUserAbortError;
}

// strict json_schema 모드는 스키마가 복잡할수록(필드가 많을수록) 모델이 스키마를
// 못 맞춰서 "json_validate_failed" 400으로 실패하는 경우가 체감상 꽤 있다(커뮤니티
// 보고로도 ~10%). 요청 자체가 잘못된 게 아니라 생성 품질 문제라 재시도하면 보통
// 넘어간다.
function isJsonValidateFailed(error: unknown) {
  return (
    error instanceof Groq.BadRequestError &&
    (error.message ?? "").includes("json_validate_failed")
  );
}

export function isQuotaExceeded(error: unknown) {
  if (!(error instanceof Groq.RateLimitError)) return false;
  const retryAfterSeconds = getRetryAfterSeconds(error);
  return retryAfterSeconds === null || retryAfterSeconds > RATE_LIMIT_RETRY_AFTER_THRESHOLD_SECONDS;
}

export function isRetryable(error: unknown) {
  if (isTimeout(error)) return true;
  if (isJsonValidateFailed(error)) return true;
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
  if (error instanceof Error) return error.message;
  // Supabase(PostgrestError) 등 Error를 상속하지 않는 에러 객체도 많아서,
  // message 필드가 있으면 그걸 그대로 보여준다 — 안 그러면 DB 컬럼 누락처럼
  // 원인이 분명한 에러까지 전부 "알 수 없는 오류"로 뭉개져서 디버깅이 안 된다.
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return "알 수 없는 오류";
}
