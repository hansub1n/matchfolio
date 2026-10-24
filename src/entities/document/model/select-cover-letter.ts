import type { UserDocument } from "./types";

// 공고 매칭이 기준으로 삼을 자소서: 그 공고에 낸 자소서(제출 기록)가 있으면 그것,
// 없으면 대표 자소서, 대표도 없으면 가장 최근 자소서. 하나도 없으면 null.
export function selectCoverLetter(
  documents: UserDocument[],
  submittedCoverLetterId: string | null
): UserDocument | null {
  const coverLetters = documents.filter((d) => d.kind === "cover_letter");
  if (coverLetters.length === 0) return null;
  const submitted = coverLetters.find((d) => d.id === submittedCoverLetterId);
  if (submitted) return submitted;
  const primary = coverLetters.find((d) => d.isPrimary);
  if (primary) return primary;
  return [...coverLetters].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
}
