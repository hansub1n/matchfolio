// 자소서 전체를 넣으면 Groq TPM 한도(입력+출력 분당 8000)를 넘기 쉬워서 앞부분만 쓴다.
export const MAX_COVER_LETTER_CHARS = 1200;

// 프로젝트 기반 질문 프롬프트에 넣을 "제출 자료" 단락. 기록이 없으면 null —
// 그때는 프롬프트에서 단락 자체를 뺀다.
export function buildSubmissionContext(
  coverLetter: string | null,
  submittedProjectNames: string[]
): string | null {
  const letter = coverLetter?.trim() ?? "";
  if (!letter && submittedProjectNames.length === 0) return null;

  const lines: string[] = [];
  if (submittedProjectNames.length > 0) {
    lines.push(`지원할 때 어필한 프로젝트: ${submittedProjectNames.join(", ")}`);
  }
  if (letter) {
    const truncated = letter.length > MAX_COVER_LETTER_CHARS;
    lines.push(
      `지원할 때 제출한 자소서${truncated ? " (앞부분)" : ""}:\n${letter.slice(0, MAX_COVER_LETTER_CHARS)}`
    );
  }
  return lines.join("\n");
}
