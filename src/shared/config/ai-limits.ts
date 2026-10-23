export type AiUsageKind = "extract_job_posting" | "analyze_company" | "match_projects";

// 사용자 1명이 하루(KST)에 쓸 수 있는 횟수. 기업분석은 "다시 만들기"(프로젝트 기반 질문)도 같이 센다.
export const AI_DAILY_LIMITS: Record<AiUsageKind, number> = {
  extract_job_posting: 20,
  analyze_company: 5,
  match_projects: 10,
};

export const AI_LIMIT_EXCEEDED_MESSAGE = "오늘 사용할 수 있는 횟수를 다 썼어요. 내일 다시 쓸 수 있어요";
