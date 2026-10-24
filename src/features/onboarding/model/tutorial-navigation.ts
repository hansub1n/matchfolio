import type { TutorialChapter, TutorialChapterId } from "@/shared/config/tutorial";

export type TutorialMode = "basic" | "guide";

export interface TutorialPosition {
  chapterIndex: number;
  sceneIndex: number;
}

// 기본 흐름 모드는 첫 챕터 안에서만 움직이고, 가이드 모드는 챕터 끝에서 다음 챕터로 이어진다.
export function nextPosition(
  chapters: TutorialChapter[],
  { chapterIndex, sceneIndex }: TutorialPosition,
  mode: TutorialMode
): TutorialPosition | "finish" {
  if (sceneIndex < chapters[chapterIndex].scenes.length - 1) {
    return { chapterIndex, sceneIndex: sceneIndex + 1 };
  }
  if (mode === "guide" && chapterIndex < chapters.length - 1) {
    return { chapterIndex: chapterIndex + 1, sceneIndex: 0 };
  }
  return "finish";
}

export function prevPosition(
  chapters: TutorialChapter[],
  { chapterIndex, sceneIndex }: TutorialPosition,
  mode: TutorialMode
): TutorialPosition | null {
  if (sceneIndex > 0) return { chapterIndex, sceneIndex: sceneIndex - 1 };
  if (mode === "guide" && chapterIndex > 0) {
    return { chapterIndex: chapterIndex - 1, sceneIndex: chapters[chapterIndex - 1].scenes.length - 1 };
  }
  return null;
}

export function chapterIndexOf(chapters: TutorialChapter[], chapterId: TutorialChapterId | undefined): number {
  const index = chapters.findIndex((c) => c.id === chapterId);
  return index === -1 ? 0 : index;
}

// 챕터 마지막 장면까지 보면 "본 챕터"로 친다(가이드 목록의 체크 표시).
export function markChapterSeen(seen: TutorialChapterId[], chapterId: TutorialChapterId): TutorialChapterId[] {
  return seen.includes(chapterId) ? seen : [...seen, chapterId];
}
