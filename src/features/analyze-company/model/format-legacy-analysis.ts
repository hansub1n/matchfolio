// 구조화 이전 버전의 company_analysis는 저장 당시 이스케이프 처리 문제로 실제
// 줄바꿈 대신 글자 그대로의 "\n"(백슬래시+n 두 글자)이 들어있는 경우가 있다.
// 보여주기 전에 실제 줄바꿈으로 되돌린다.
export function formatLegacyAnalysis(text: string): string {
  return text.replace(/\\n/g, "\n");
}
