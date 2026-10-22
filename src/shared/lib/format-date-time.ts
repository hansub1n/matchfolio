const WEEKDAY_NAMES_KO = ["일", "월", "화", "수", "목", "금", "토"];

// 앱 전체(카드/캘린더/모달)에서 날짜·일시 표시를 하나로 통일한다. 입력에 "T"가
// 있으면(ISO 일시) 시각까지, 없으면(순수 날짜 문자열) 날짜만 보여준다. 초는
// 표시하지 않는다.
export function formatDateTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const hasTime = value.includes("T");
  const d = new Date(hasTime ? value : `${value}T00:00:00`);
  const pad = (n: number) => String(n).padStart(2, "0");
  const dateLabel = `${pad(d.getMonth() + 1)}.${pad(d.getDate())} (${WEEKDAY_NAMES_KO[d.getDay()]})`;
  if (!hasTime) return dateLabel;
  return `${dateLabel} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
