// 공고 매칭 프롬프트에 넣을 "내 자료" 단락. Groq TPM 한도(입력+출력 분당 8000)를 넘지 않게
// 자소서·이력서는 앞부분만 쓴다(한국어는 글자당 토큰이 많다).
export const MAX_COVER_LETTER_CHARS = 1200;
export const MAX_RESUME_CHARS = 800;

export interface MatchMaterials {
  projectCount: number;
  resume: string | null;
  coverLetter: { title: string; content: string } | null;
}

// 첨삭할 자소서·강조할 이력서·매칭할 프로젝트 중 하나라도 있어야 돌릴 수 있다.
export function canRunApplicationMatch({ projectCount, resume, coverLetter }: MatchMaterials): boolean {
  return projectCount > 0 || Boolean(resume?.trim()) || Boolean(coverLetter?.content.trim());
}

function truncate(text: string, max: number): string {
  const trimmed = text.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max)}\n(이하 생략)` : trimmed;
}

export function buildMaterialsPrompt({ resume, coverLetter }: MatchMaterials): string {
  const resumeText = resume?.trim() ? truncate(resume, MAX_RESUME_CHARS) : "(등록된 이력서 없음)";
  const coverLetterText = coverLetter?.content.trim()
    ? `[${coverLetter.title}]\n${truncate(coverLetter.content, MAX_COVER_LETTER_CHARS)}`
    : "(등록된 자소서 없음)";
  return `이력서:\n${resumeText}\n\n자소서:\n${coverLetterText}`;
}
