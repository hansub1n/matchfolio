import type { InterviewPrepFact, InterviewPrepFactLabel } from "@/entities/interview-prep";

// facts는 구버전 레코드나 AI가 확인된 정보를 못 찾은 경우 null/빈 배열일 수
// 있다 — 화면에서는 "줄 자체를 숨긴다"로 통일해서 다루기 위해 항상 배열로
// 정규화한다.
export function normalizeFacts(facts: InterviewPrepFact[] | null): InterviewPrepFact[] {
  return facts ?? [];
}

// 라벨마다 자연스러운 한국어 어순으로 바꿔서 "2021년 설립 · 직원 12명" 같은
// 한 줄 문장으로 이어붙일 수 있게 한다.
const FACT_FORMATTERS: Record<InterviewPrepFactLabel, (value: string, asOf: string | null) => string> = {
  설립연도: (value) => `${value} 설립`,
  업종: (value) => value,
  직원수: (value) => `직원 ${value}`,
  매출: (value, asOf) => `매출 ${value}${asOf ? ` (${asOf})` : ""}`,
  투자단계: (value) => value,
};

export function formatFact(fact: InterviewPrepFact): string {
  return FACT_FORMATTERS[fact.label](fact.value, fact.asOf);
}

export function formatFactsLine(facts: InterviewPrepFact[]): string {
  return facts.map(formatFact).join(" · ");
}
