import { useSyncExternalStore } from "react";

import type { FeedbackKind } from "@/shared/lib/analytics";

// "의견 보내기"는 계정 메뉴·화면 아래 링크·공고 추출 실패 화면 등 여러 feature에서 연다(서로 참조할 수 없음).
// 여는 요청은 이 작은 저장소로 주고받고, 의견 모달 하나가 구독한다.
export interface FeedbackRequest {
  kind?: FeedbackKind;
  // 어디서 열었는지 — 없으면 현재 경로. 공고 추출 실패 화면은 "extract".
  page?: string;
}

export interface FeedbackState {
  request: FeedbackRequest | null;
  // 열 때마다 올라간다 — 다시 열면 모달 상태를 처음부터.
  version: number;
}

let state: FeedbackState = { request: null, version: 0 };
const SERVER_STATE: FeedbackState = { request: null, version: 0 };
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function openFeedback(request: FeedbackRequest = {}) {
  state = { request, version: state.version + 1 };
  emit();
}

export function closeFeedback() {
  state = { request: null, version: state.version };
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useFeedbackState(): FeedbackState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => SERVER_STATE
  );
}
