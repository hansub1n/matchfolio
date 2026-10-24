import type { ComponentType } from "react";

// 장면 id(shared/config/tutorial.ts) → 움직이는 미니 UI. 여기 없는 장면은 "준비 중"으로 보인다.
export const SCENES: Partial<Record<string, ComponentType>> = {};

export function ComingSoonScene() {
  return (
    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
      이 장면은 준비 중이에요
    </div>
  );
}
