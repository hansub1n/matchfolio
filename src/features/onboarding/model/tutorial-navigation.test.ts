import { describe, expect, it } from "vitest";

import type { TutorialChapter } from "@/shared/config/tutorial";

import { chapterIndexOf, markChapterSeen, nextPosition, prevPosition } from "./tutorial-navigation";

const scene = (id: string) => ({ id, title: id, caption: "" });
const CHAPTERS: TutorialChapter[] = [
  { id: "basics", title: "기본", scenes: [scene("a"), scene("b")] },
  { id: "schedule", title: "일정", scenes: [scene("c"), scene("d"), scene("e")] },
];

describe("nextPosition", () => {
  it("챕터 안에서는 다음 장면으로", () => {
    expect(nextPosition(CHAPTERS, { chapterIndex: 0, sceneIndex: 0 }, "guide")).toEqual({ chapterIndex: 0, sceneIndex: 1 });
  });

  it("가이드 모드에서 챕터 마지막 장면의 '다음'은 다음 챕터 첫 장면", () => {
    expect(nextPosition(CHAPTERS, { chapterIndex: 0, sceneIndex: 1 }, "guide")).toEqual({ chapterIndex: 1, sceneIndex: 0 });
  });

  it("기본 흐름 모드는 첫 챕터 끝에서 끝난다", () => {
    expect(nextPosition(CHAPTERS, { chapterIndex: 0, sceneIndex: 1 }, "basic")).toBe("finish");
  });

  it("전체 마지막 장면이면 끝(시작하기)", () => {
    expect(nextPosition(CHAPTERS, { chapterIndex: 1, sceneIndex: 2 }, "guide")).toBe("finish");
  });
});

describe("prevPosition", () => {
  it("가이드 모드에서 챕터 첫 장면의 '이전'은 이전 챕터 마지막 장면", () => {
    expect(prevPosition(CHAPTERS, { chapterIndex: 1, sceneIndex: 0 }, "guide")).toEqual({ chapterIndex: 0, sceneIndex: 1 });
  });

  it("맨 처음이면 이전이 없다", () => {
    expect(prevPosition(CHAPTERS, { chapterIndex: 0, sceneIndex: 0 }, "guide")).toBeNull();
    expect(prevPosition(CHAPTERS, { chapterIndex: 0, sceneIndex: 0 }, "basic")).toBeNull();
  });
});

describe("chapterIndexOf / markChapterSeen", () => {
  it("모르는 챕터 id는 첫 챕터로", () => {
    expect(chapterIndexOf(CHAPTERS, "schedule")).toBe(1);
    expect(chapterIndexOf(CHAPTERS, undefined)).toBe(0);
  });

  it("본 챕터는 한 번만 기록한다", () => {
    expect(markChapterSeen(["basics"], "basics")).toEqual(["basics"]);
    expect(markChapterSeen(["basics"], "schedule")).toEqual(["basics", "schedule"]);
  });
});
