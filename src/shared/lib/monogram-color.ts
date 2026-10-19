// 회사명 해시로 연한 배경색을 고정해서, 같은 회사는 항상 같은 색으로 보이게 한다.
export function monogramColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return `oklch(0.9 0.06 ${hash % 360})`;
}
