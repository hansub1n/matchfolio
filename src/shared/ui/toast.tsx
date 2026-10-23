"use client";

import { useSyncExternalStore } from "react";

const DISPLAY_MS = 2500;

let message: string | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

// 화면 아래에 잠깐 떴다 사라지는 한 줄 안내. 어디서든 부를 수 있게 모듈 상태로 둔다.
export function showToast(text: string) {
  message = text;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    message = null;
    emit();
  }, DISPLAY_MS);
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function Toaster() {
  const current = useSyncExternalStore(
    subscribe,
    () => message,
    () => null
  );
  if (!current) return null;
  return (
    <div
      role="status"
      className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-foreground px-4 py-2 text-xs text-background shadow-lg"
    >
      {current}
    </div>
  );
}
