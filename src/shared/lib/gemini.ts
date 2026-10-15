import "server-only";

export const GEMINI_MODEL = "gemini-3.8-flash";

// 분당 한도 초과는 retryDelay가 짧고, 일일 한도 초과는 몇 시간 단위로 길다.
const RATE_LIMIT_RETRY_THRESHOLD_SECONDS = 60;

function getRetryDelaySeconds(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const match = message.match(/"retryDelay":"([\d.]+)s"/);
  return match ? Number(match[1]) : null;
}

export function isQuotaExceeded(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (!message.includes("RESOURCE_EXHAUSTED")) return false;
  const retryDelaySeconds = getRetryDelaySeconds(error);
  return retryDelaySeconds === null || retryDelaySeconds > RATE_LIMIT_RETRY_THRESHOLD_SECONDS;
}

function isTimeout(error: unknown) {
  // @google/genai는 AbortSignal 타임아웃을 TimeoutError가 아니라
  // AbortError("This operation was aborted")로 감싸서 던진다.
  return error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
}

export function isRetryable(error: unknown) {
  if (isTimeout(error)) return true;
  const message = error instanceof Error ? error.message : "";
  if (message.includes("RESOURCE_EXHAUSTED")) {
    const retryDelaySeconds = getRetryDelaySeconds(error);
    return retryDelaySeconds !== null && retryDelaySeconds <= RATE_LIMIT_RETRY_THRESHOLD_SECONDS;
  }
  return message.includes("UNAVAILABLE") || message.includes('"code":503');
}

export function describeGeminiError(error: unknown) {
  if (isQuotaExceeded(error)) {
    return "오늘 Gemini 무료 사용량을 모두 썼습니다. 내일 다시 시도해주세요.";
  }
  if (isRetryable(error)) {
    return "Gemini 서버가 일시적으로 혼잡합니다. 잠시 후 다시 시도해주세요.";
  }
  return error instanceof Error ? error.message : "알 수 없는 오류";
}
