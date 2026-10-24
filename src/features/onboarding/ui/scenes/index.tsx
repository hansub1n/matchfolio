import type { ComponentType } from "react";

import { AiPrepScene, ApplyScene, FlowScene, ProgressScene, UploadScene } from "./basics";
import { ScheduleAddScene, ScheduleResultScene, ScheduleRevertScene, ScheduleRoundScene } from "./schedule";

// 장면 id(shared/config/tutorial.ts) → 움직이는 미니 UI. 여기 없는 장면은 "준비 중"으로 보인다.
export const SCENES: Partial<Record<string, ComponentType>> = {
  "basics.upload": UploadScene,
  "basics.apply": ApplyScene,
  "basics.progress": ProgressScene,
  "basics.ai": AiPrepScene,
  "basics.flow": FlowScene,
  "schedule.add": ScheduleAddScene,
  "schedule.round": ScheduleRoundScene,
  "schedule.revert": ScheduleRevertScene,
  "schedule.result": ScheduleResultScene,
};

export function ComingSoonScene() {
  return (
    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
      이 장면은 준비 중이에요
    </div>
  );
}
