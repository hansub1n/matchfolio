// 핵심 포인트는 문장 안에 쉼표가 자주 들어가서 쉼표 구분을 쓰면 문장이
// 쪼개진다. 그래서 줄바꿈 기준으로 하나씩 입력받는다.
export function parseHighlights(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function joinHighlights(highlights: string[]): string {
  return highlights.join("\n");
}
