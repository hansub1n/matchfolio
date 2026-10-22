import { getCompanyColor } from "@/shared/lib/company-color";
import { getMonogram } from "@/shared/lib/company-name";

// 회사 모노그램(색 배지 + 첫 글자)을 쓰는 모든 곳(보드 카드, 통계 기다리는 중 목록
// 등)이 같은 색/글자 규칙을 쓰도록 한 곳에 모았다 — 법인 표기 정규화까지 포함.
export function CompanyMonogram({
  company,
  size = 22,
  muted = false,
}: {
  company: string;
  size?: 22 | 24 | 28;
  muted?: boolean;
}) {
  const color = getCompanyColor(company);
  const monogram = getMonogram(company);

  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-md font-medium"
      style={{
        width: size,
        height: size,
        fontSize: size >= 24 ? 12 : 11,
        backgroundColor: color.background,
        color: color.foreground,
        opacity: muted ? 0.5 : 1,
      }}
    >
      {monogram}
    </span>
  );
}
