import { useSyncExternalStore } from "react";

import type { TutorialChapterId } from "@/shared/config/tutorial";

// "사용법" 버튼과 기능 옆 "?" 버튼이 여러 feature에 흩어져 있어서(서로 참조할 수 없음),
// 튜토리얼을 여는 요청은 여기 작은 저장소로 주고받고 튜토리얼 모달 하나가 구독한다.
export type TutorialRequest =
  | { mode: "basic" }
  | { mode: "guide"; chapterId?: TutorialChapterId }
  | null;

// version은 열 때마다 올라간다 — 같은 챕터를 다시 열어도 모달 상태를 처음부터 시작하게.
export interface TutorialState {
  request: TutorialRequest;
  version: number;
}

// 장면을 만든 챕터 — 튜토리얼 feature가 불러와질 때 등록한다(shared는 장면 목록을 직접 볼 수 없어서).
// 기능 옆 "?" 버튼은 여기 없는 챕터면 숨는다. 등록 전에는 막지 않는다.
let readyChapters: ReadonlySet<TutorialChapterId> | null = null;

export function registerReadyChapters(ids: TutorialChapterId[]) {
  readyChapters = new Set(ids);
}

export function isChapterReady(id: TutorialChapterId): boolean {
  return readyChapters === null || readyChapters.has(id);
}

let state: TutorialState = { request: null, version: 0 };
const SERVER_STATE: TutorialState = { request: null, version: 0 };
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function openTutorial(next: Exclude<TutorialRequest, null>) {
  state = { request: next, version: state.version + 1 };
  emit();
}

export function closeTutorial() {
  state = { request: null, version: state.version };
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useTutorialState(): TutorialState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => SERVER_STATE
  );
}
