"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import { Check } from "lucide-react";
import { cn } from "cn";

import { track } from "@/shared/lib/analytics";
import { TUTORIAL_CHAPTERS as ALL_CHAPTERS, type TutorialChapterId } from "@/shared/config/tutorial";
import {
  closeTutorial,
  openTutorial,
  useTutorialState,
  type TutorialRequest,
} from "@/shared/lib/tutorial-store";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/shared/ui/dialog";

import {
  chapterIndexOf,
  markChapterSeen,
  nextPosition,
  prevPosition,
  type TutorialMode,
  type TutorialPosition,
} from "../model/tutorial-navigation";
import { selectReadyChapters } from "../model/ready-chapters";
import { ComingSoonScene, SCENES } from "./scenes";

// 장면을 만든 챕터·장면만 보여준다("준비 중"이 배포 화면에 보이지 않게). 없는 챕터로 열면 첫 챕터(기본 흐름).
const TUTORIAL_CHAPTERS = selectReadyChapters(ALL_CHAPTERS, Object.keys(SCENES));

const SEEN_KEY = "matchfolio:tutorial-seen";
const CHAPTERS_SEEN_KEY = "matchfolio:tutorial-chapters-seen";

// localStorage는 시크릿 창/차단 설정에서 못 쓸 수 있어서 전부 실패해도 그냥 넘어간다.
function readSeenChapters(): TutorialChapterId[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(CHAPTERS_SEEN_KEY) ?? "[]");
    return Array.isArray(parsed) ? (parsed as TutorialChapterId[]) : [];
  } catch {
    return [];
  }
}

function writeSeenChapters(ids: TutorialChapterId[]) {
  try {
    localStorage.setItem(CHAPTERS_SEEN_KEY, JSON.stringify(ids));
  } catch {
    // 기억 못 해도 튜토리얼 자체는 동작한다.
  }
}

function markTutorialSeen() {
  try {
    localStorage.setItem(SEEN_KEY, "1");
  } catch {
    // 위와 같음.
  }
}

// 헤더 "사용법"·기능 옆 "?"·첫 접속 자동 재생이 모두 이 모달 하나를 연다(tutorial-store).
export function TutorialDialog() {
  const { request, version } = useTutorialState();

  useEffect(() => {
    let seen = true;
    try {
      seen = localStorage.getItem(SEEN_KEY) === "1";
    } catch {
      // 못 읽으면 자동 재생하지 않는다.
    }
    if (!seen) openTutorial({ mode: "basic" });
  }, []);

  function handleClose() {
    markTutorialSeen();
    closeTutorial();
  }

  return (
    <Dialog open={request !== null} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent showCloseButton={false} className="gap-0 overflow-hidden p-0 sm:max-w-[720px]">
        <DialogTitle className="sr-only">사용법</DialogTitle>
        {request && <TutorialContent key={version} request={request} onClose={handleClose} />}
      </DialogContent>
    </Dialog>
  );
}

function TutorialContent({
  request,
  onClose,
}: {
  request: Exclude<TutorialRequest, null>;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<TutorialMode>(request.mode);
  const [position, setPosition] = useState<TutorialPosition>({
    chapterIndex: request.mode === "guide" ? chapterIndexOf(TUTORIAL_CHAPTERS, request.chapterId) : 0,
    sceneIndex: 0,
  });
  const [seenChapters, setSeenChapters] = useState<TutorialChapterId[]>(readSeenChapters);

  const chapter = TUTORIAL_CHAPTERS[position.chapterIndex];
  const scene = chapter.scenes[position.sceneIndex];
  const Scene = SCENES[scene.id] ?? ComingSoonScene;
  const next = nextPosition(TUTORIAL_CHAPTERS, position, mode);
  const prev = prevPosition(TUTORIAL_CHAPTERS, position, mode);
  const showMoreButton = mode === "basic" && next === "finish";

  function goTo(target: TutorialPosition) {
    setPosition(target);
    const targetChapter = TUTORIAL_CHAPTERS[target.chapterIndex];
    if (target.sceneIndex === targetChapter.scenes.length - 1) {
      setSeenChapters((current) => {
        const updated = markChapterSeen(current, targetChapter.id);
        writeSeenChapters(updated);
        return updated;
      });
    }
  }

  function handleNext() {
    if (next === "finish") {
      track("tutorial", { action: "completed", chapter: chapter.id });
      onClose();
    } else goTo(next);
  }

  function handlePrev() {
    if (prev) goTo(prev);
  }

  function openGuide() {
    setMode("guide");
    goTo({ chapterIndex: Math.min(1, TUTORIAL_CHAPTERS.length - 1), sceneIndex: 0 });
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      handleNext();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      handlePrev();
    }
  }

  return (
    // 장면이 바뀌어도 모달 크기와 버튼 위치가 그대로이도록 높이를 고정한다.
    <div className="flex h-[440px] min-w-0 outline-none" onKeyDown={handleKeyDown} tabIndex={-1}>
      {mode === "guide" && (
        // 휴대폰은 폭이 좁아 챕터 목록을 숨긴다 — 챕터는 "다음"으로 이어서 넘어간다.
        <nav className="flex w-48 shrink-0 flex-col gap-0.5 overflow-y-auto border-r bg-muted/40 p-3 max-sm:hidden">
          {TUTORIAL_CHAPTERS.map((c, i) => (
            <button
              key={c.id}
              type="button"
              onClick={() => goTo({ chapterIndex: i, sceneIndex: 0 })}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-[13px]",
                i === position.chapterIndex
                  ? "bg-card text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Check
                className={cn("size-3.5 shrink-0", seenChapters.includes(c.id) ? "opacity-100" : "opacity-0")}
                aria-label={seenChapters.includes(c.id) ? "본 챕터" : undefined}
              />
              <span className="truncate">{c.title}</span>
            </button>
          ))}
        </nav>
      )}

      <section className="flex min-w-0 flex-1 flex-col p-4 sm:p-6">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="tabular-nums">
            {chapter.title} · {position.sceneIndex + 1} / {chapter.scenes.length}
          </span>
          <button
            type="button"
            onClick={() => {
              track("tutorial", { action: "skipped", chapter: chapter.id });
              onClose();
            }}
            className="hover:text-foreground"
          >
            건너뛰기
          </button>
        </div>

        <div className="mt-3 h-[200px] shrink-0 overflow-hidden rounded-xl bg-muted">
          <Scene key={scene.id} />
        </div>

        <p className="mt-4 text-base font-medium">{scene.title}</p>
        <p className="mt-1 line-clamp-2 min-h-10 text-[13px] text-muted-foreground">{scene.caption}</p>

        <div className="mt-auto flex items-center justify-between gap-3">
          <div className="flex gap-1.5" aria-hidden>
            {chapter.scenes.map((s, i) => (
              <span
                key={s.id}
                className={cn("size-1.5 rounded-full", i === position.sceneIndex ? "bg-foreground" : "bg-border")}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {/* 자리를 미리 잡아두고 기본 흐름 마지막 장면에서만 보이게 한다 — 버튼 위치가 흔들리지 않게. */}
            <Button
              variant="ghost"
              size="sm"
              onClick={openGuide}
              className={cn(!showMoreButton && "invisible")}
              tabIndex={showMoreButton ? 0 : -1}
            >
              기능별로 더 보기
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrev} disabled={!prev}>
              이전
            </Button>
            <Button size="sm" className="min-w-20" onClick={handleNext}>
              {next === "finish" ? "시작하기" : "다음"}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
