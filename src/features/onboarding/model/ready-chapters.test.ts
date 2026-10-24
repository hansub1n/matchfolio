import { describe, expect, it } from "vitest";

import type { TutorialChapter } from "@/shared/config/tutorial";

import { selectReadyChapters } from "./ready-chapters";

// 이 결과로 튜토리얼 목록과 기능 옆 "?" 버튼 노출이 정해진다 — 빈 챕터가 남으면 "준비 중"이 배포 화면에 보인다.
describe("selectReadyChapters", () => {
  const chapters = [
    { id: "basics", title: "기본 흐름", scenes: [{ id: "basics.a" }, { id: "basics.b" }] },
    { id: "interview", title: "면접 준비", scenes: [{ id: "interview.a" }] },
  ] as unknown as TutorialChapter[];

  it("장면이 하나도 없는 챕터는 뺀다", () => {
    expect(selectReadyChapters(chapters, ["basics.a", "basics.b"]).map((c) => c.id)).toEqual(["basics"]);
  });

  it("챕터 안에서도 만든 장면만 남긴다", () => {
    expect(selectReadyChapters(chapters, ["basics.b"])[0].scenes.map((s) => s.id)).toEqual(["basics.b"]);
  });
});
