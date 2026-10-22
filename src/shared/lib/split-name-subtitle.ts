// "런픽 (Run-Pick)"처럼 뒤에 괄호 부제가 붙어 있으면 분리한다 — 제목이 있는
// 곳(프로젝트 행/카드, 상세 모달 헤더)에서 공통으로 쓴다.
export function splitNameSubtitle(name: string): { main: string; subtitle: string | null } {
  const match = name.match(/^(.*?)\s*(\([^)]*\))\s*$/);
  if (!match) return { main: name, subtitle: null };
  return { main: match[1], subtitle: match[2] };
}
