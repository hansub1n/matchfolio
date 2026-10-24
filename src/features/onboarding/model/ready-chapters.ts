import type { TutorialChapter } from "@/shared/config/tutorial";

// 장면(미니 UI)을 만든 것만 남긴다 — 장면 없는 장면은 빼고, 남은 장면이 없는 챕터는 통째로 뺀다.
// 배포된 화면에 "준비 중"이 보이지 않게 하려는 것이고, 장면을 SCENES에 등록하면 자동으로 다시 나타난다.
export function selectReadyChapters(chapters: TutorialChapter[], readySceneIds: Iterable<string>): TutorialChapter[] {
  const ready = new Set(readySceneIds);
  return chapters
    .map((chapter) => ({ ...chapter, scenes: chapter.scenes.filter((scene) => ready.has(scene.id)) }))
    .filter((chapter) => chapter.scenes.length > 0);
}
