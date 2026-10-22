// 대소문자/공백/점을 무시하고 비교한다 — "Next.js"/"nextjs"/"NEXT JS"를 같은
// 기술로 취급하기 위해서다. 기술스택 비교가 필요한 모든 곳(기술 격차, 공고
// 모달의 기술 하이라이트)에서 같이 쓴다.
export function normalizeTech(tech: string): string {
  return tech.toLowerCase().replace(/[\s.]/g, "");
}
