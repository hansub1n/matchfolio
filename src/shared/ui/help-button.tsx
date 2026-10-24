"use client";

import { CircleHelp } from "lucide-react";

import type { TutorialChapterId } from "@/shared/config/tutorial";
import { openTutorial } from "@/shared/lib/tutorial-store";

// 기능 이름 옆 "?" — 누르면 사용법(가이드 모드)을 그 기능 챕터로 바로 연다.
// 크기는 고정이고 hover에는 색만 바뀐다.
export function HelpButton({ chapterId, label }: { chapterId: TutorialChapterId; label: string }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        openTutorial({ mode: "guide", chapterId });
      }}
      aria-label={`${label} 사용법`}
      title={`${label} 사용법`}
      className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      <CircleHelp className="size-3.5" />
    </button>
  );
}
