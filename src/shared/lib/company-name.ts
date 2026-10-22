const BRACKET_PREFIX = /^\[[^\]]*\]\s*/;

// 괄호형/풀네임 법인 표기 + 영문 법인 접미사. 영문은 "Co"/"Ltd" 같은 짧은 단어가
// 일반 단어 안에서 오매치되지 않게, 뒤에 공백/끝이 오는지까지 확인한다.
const CORP_SUFFIX_PATTERNS: RegExp[] = [
  /\(주\)/g,
  /㈜/g,
  /\(유\)/g,
  /\(사\)/g,
  /\(재\)/g,
  /\(합\)/g,
  /농업회사법인/g,
  /주식회사/g,
  /유한회사/g,
  /사단법인/g,
  /재단법인/g,
  /\b(inc|corp|co|ltd)\.?(?=\s|$)/gi,
];

// 공고에서 긁어온 회사명엔 "[신입] 라인"처럼 채용 태그가 붙거나 "(주)"/"주식회사"
// 같은 법인 표기가 섞여 있어서, 모노그램·색상 계산 전에 이것부터 걷어낸다.
// 카드에 보이는 회사명 자체는 원래 문자열 그대로 둔다 — 이 함수는 표시용이 아니다.
export function normalizeCompanyName(name: string): string {
  let result = name.replace(BRACKET_PREFIX, "");
  for (const pattern of CORP_SUFFIX_PATTERNS) {
    result = result.replace(pattern, "");
  }
  return result.trim();
}

function firstAlphanumeric(value: string): string | null {
  const match = value.match(/[\p{L}\p{N}]/u);
  return match ? match[0] : null;
}

// 정규화한 이름에서 첫 한글/영문/숫자 한 글자를 모노그램으로 쓴다. 정규화 결과가
// 통째로 비면(예: "(주)"만 있던 경우) 원래 이름의 첫 글자로 그냥 되돌아간다.
export function getMonogram(name: string): string {
  const normalized = normalizeCompanyName(name);
  const char = firstAlphanumeric(normalized) ?? name.slice(0, 1);
  return /[a-z]/i.test(char) ? char.toUpperCase() : char;
}
