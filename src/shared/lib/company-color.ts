import { normalizeCompanyName } from "./company-name";

const PALETTE_SIZE = 6;

export interface CompanyColor {
  background: string;
  foreground: string;
}

// 회사명을 해시해서 6색 팔레트 중 하나를 고정 배정한다 — 같은 회사는 항상 같은 색.
function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function getCompanyColor(company: string): CompanyColor {
  const normalized = normalizeCompanyName(company);
  const key = normalized.length > 0 ? normalized : company;
  const index = (hashString(key) % PALETTE_SIZE) + 1;
  return {
    background: `var(--avatar-${index}-bg)`,
    foreground: `var(--avatar-${index}-fg)`,
  };
}
