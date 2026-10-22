export interface JobDescriptionSection {
  title: string | null;
  items: string[];
}

export interface ParsedJobDescription {
  sections: JobDescriptionSection[];
}

const SECTION_TITLES = [
  "주요업무",
  "담당업무",
  "자격요건",
  "지원자격",
  "우대사항",
  "복지",
  "혜택",
];

// "[자격요건]", "■ 우대사항", "복지:" 처럼 앞뒤에 기호가 붙어도 섹션 제목으로
// 인식하되, 문장 중간에 섞여 들어간 경우까지 잡지 않게 정리한 뒤 완전히
// 일치할 때만 인정한다.
function matchSectionTitle(line: string): string | null {
  const cleaned = line
    .replace(/^[\[\(【■◆▶●·\-\s]+/, "")
    .replace(/[\]\)】:：\-\s]+$/, "")
    .trim();
  return SECTION_TITLES.find((title) => cleaned === title) ?? null;
}

function cleanItem(line: string): string {
  return line.replace(/^[-·•\s]+/, "").trim();
}

// 공고 본문에서 "주요업무/자격요건/우대사항" 같은 섹션 제목 줄을 찾아 제목+목록
// 구조로 바꾼다. 섹션 제목이 하나도 없으면 null을 돌려줘서 기존 whitespace-pre-wrap
// 표시로 그냥 두게 한다.
export function parseJobDescription(description: string): ParsedJobDescription | null {
  const lines = description.split("\n").map((line) => line.trim());

  const sections: JobDescriptionSection[] = [];
  let current: JobDescriptionSection | null = null;
  let foundAnySection = false;

  for (const line of lines) {
    if (!line) continue;
    const title = matchSectionTitle(line);
    if (title) {
      foundAnySection = true;
      current = { title, items: [] };
      sections.push(current);
      continue;
    }
    if (!current) {
      current = { title: null, items: [] };
      sections.push(current);
    }
    current.items.push(cleanItem(line));
  }

  return foundAnySection ? { sections } : null;
}
