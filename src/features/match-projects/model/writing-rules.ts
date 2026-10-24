// 공고 매칭이 만드는 "자소서에 그대로 붙여 쓸 문장"(어필 문장·지원 동기 예시·첨삭 문장) 공통 규칙.
// 규칙 없이 "그대로 쓸 수 있는 1~2문장"만 요구하면 "~경험은 ○○ 개발에 기여할 수 있습니다" 같은
// 틀에 박힌 문장이 나와서, 피해야 할 표현과 좋은 예를 같이 준다.
export const BANNED_CLOSINGS = [
  "기여할 수 있습니다",
  "바로 적용할 수 있습니다",
  "도움이 될 것입니다",
  "역량을 갖추고 있습니다",
  "높은 연관성",
  "시너지",
];

export const WRITING_RULES = `자소서에 그대로 붙여 쓸 문장(pitch, motivation의 example, coverLetterEdits의 suggestion) 작성 규칙:
- 1인칭 자소서 문체("~했습니다")로, 내가 실제로 한 일을 구체적으로 쓴다: 어떤 문제/요구가 있었고 → 무엇을 어떻게 했고 → 결과가 어땠는지. 자료에 수치나 결과가 있으면 그대로 쓴다.
- 기술 이름을 나열하지 말고, 그 기술로 해결한 일 하나에 집중한다.
- 회사명이나 "○○ 개발에 기여" 같은 맺음말을 붙이지 않는다. 다음 표현은 쓰지 마라: ${BANNED_CLOSINGS.join(", ")}.
- 프로젝트 이름은 등록된 이름을 그대로 쓴다(영문으로 바꾸지 않는다).
- 자료에 없는 경험·수치는 지어내지 않는다.
나쁜 예: "A 프로젝트에서 Next.js와 Supabase로 전체 스택을 구현한 경험은 귀사 프론트엔드 개발에 기여할 수 있습니다."
좋은 예: "A에서 러닝 기록이 많아지면 목록이 느려지는 문제를 무한 스크롤과 낙관적 업데이트로 풀어, 기록 저장 후 화면이 바로 바뀌도록 만들었습니다."`;

// 응답에 금지 표현이 섞였는지 — 섞였으면 서버에서 문장 끝의 해당 절을 떼어낸다.
export function stripBannedClosing(text: string): string {
  const trimmed = text.trim();
  for (const phrase of BANNED_CLOSINGS) {
    const index = trimmed.lastIndexOf(phrase);
    if (index === -1) continue;
    // 금지 표현이 들어간 마지막 문장을 통째로 뺀다(앞 문장이 있으면 그것만 남김).
    // 문장 경계는 마침표 뒤에 공백이 오는 곳만 본다("Next.js"의 점은 문장 끝이 아니다).
    const boundaries = [...trimmed.slice(0, index).matchAll(/[.!?](?=\s)/g)];
    const last = boundaries.at(-1);
    const kept = last?.index === undefined ? "" : trimmed.slice(0, last.index + 1).trim();
    return kept || trimmed;
  }
  return trimmed;
}
