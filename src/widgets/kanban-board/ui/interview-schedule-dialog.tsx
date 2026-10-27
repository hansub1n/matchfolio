"use client";

import { useState } from "react";
import { cn } from "cn";

import type { Application } from "@/entities/application";
import { nextNumberedRound, ROUND_CHIPS, roundsAfter, type Schedule } from "@/entities/schedule";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { HelpButton } from "@/shared/ui/help-button";

function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocalValue(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

const CUSTOM = "__custom__";

// 1차/2차 고정 칩에 없는 차수(3차 이상, 최종, 커스텀 라벨)를 기본 선택으로
// 잡아야 할 때는 "직접 입력"을 미리 골라두고 값을 채워준다 — 칩 목록 자체를
// 늘리지 않으면서도 그 차수를 바로 보여줄 수 있다.
function resolveSelection(round: string | null): { chip: string; custom: string } {
  if (!round) return { chip: ROUND_CHIPS[0], custom: "" };
  if (ROUND_CHIPS.includes(round)) return { chip: round, custom: "" };
  return { chip: CUSTOM, custom: round };
}

function stopPropagation(e: React.SyntheticEvent) {
  e.stopPropagation();
}

// 면접 차수·일정 — 코딩테스트 일정(CodingTestScheduleDialog)과 같은 모양의 모달에 차수 칩만 더한 것.
// 카드/목록 항목 각자가 자기 트리거(일정 버튼, "다음 차수로 진행" 메뉴)에 맞춰 외부에서 open/defaultNext를
// 들고 있는 완전 제어형 컴포넌트. trigger는 모달 옆에 그대로 그린다.
export function InterviewScheduleDialog({
  application,
  schedule,
  recordedRounds,
  open,
  defaultNext = false,
  trigger,
  onOpenChange,
  onSave,
}: {
  application: Application;
  schedule: Schedule | null;
  recordedRounds: string[];
  open: boolean;
  defaultNext?: boolean;
  trigger: React.ReactNode;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, round: string, scheduledAt: string | null) => void;
}) {
  const currentRound = recordedRounds[recordedRounds.length - 1] ?? null;
  const targetRound = defaultNext
    ? (currentRound ? (nextNumberedRound(currentRound) ?? "") : ROUND_CHIPS[0])
    : currentRound;
  const defaultSelection = resolveSelection(targetRound);
  const initialValue = toDatetimeLocalValue(schedule?.scheduledAt);

  const [selected, setSelected] = useState(defaultSelection.chip);
  const [customValue, setCustomValue] = useState(defaultSelection.custom);
  const [scheduledAt, setScheduledAt] = useState(selected === currentRound ? initialValue : "");
  // 열린 상태를 부모가 바꾸므로(open prop) 열릴 때마다 이번 트리거 기준으로 다시 초기화한다.
  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setSelected(defaultSelection.chip);
      setCustomValue(defaultSelection.custom);
      setScheduledAt(defaultSelection.chip === currentRound ? initialValue : "");
    }
  }

  function selectChip(chip: string) {
    setSelected(chip);
    setCustomValue("");
    setScheduledAt(chip === currentRound ? initialValue : "");
  }

  function resolvedRound(): string {
    return selected === CUSTOM ? customValue.trim() : selected;
  }

  // 현재보다 앞 차수를 고르면, 저장 시 같이 지워질 뒤쪽 기록을 미리 보여준다.
  const revertWarningRounds = roundsAfter(recordedRounds, resolvedRound());

  function confirm() {
    const round = resolvedRound();
    if (!round) return;
    onSave(application.id, round, fromDatetimeLocalValue(scheduledAt));
    onOpenChange(false);
  }

  function handleOpenChange(next: boolean) {
    // 저장 버튼은 부모의 onOpenChange를 바로 불러서 여기로 오지 않는다 — 여기 오는 건 바깥 클릭/Esc·닫기 버튼뿐.
    if (!next) {
      // 아직 기록에 없는(새로 진행하려는) 차수를 고르던
      // 중이었다면 그 차수만 기록하고, 이미 기록된 차수(현재든 과거든)를 보던
      // 중이었다면 그냥 둔다 — 특히 과거 차수를 실수로 봤다가 그 뒤 기록을
      // 실수로 지워버리는 일이 없도록, 되돌리기는 명시적으로 저장을 눌러야만 된다.
      const resolved = resolvedRound();
      if (resolved && !recordedRounds.includes(resolved)) onSave(application.id, resolved, null);
    }
    onOpenChange(next);
  }

  return (
    <>
      {trigger}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        {/* 카드 안에서 열리면 모달 안 클릭·누르기가 React 트리를 따라 카드(상세 열기·드래그)로 올라가서 막는다. */}
        <DialogContent
          onClick={stopPropagation}
          onPointerDown={stopPropagation}
          onTouchStart={stopPropagation}
          onKeyDown={stopPropagation}
        >
          <DialogHeader>
            <div className="flex items-center gap-1">
              <DialogTitle>{application.company} 면접 일정</DialogTitle>
              <HelpButton chapterId="schedule" label="일정" />
            </div>
          </DialogHeader>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">차수</label>
            <div className="flex flex-wrap gap-1.5">
              {[...ROUND_CHIPS, CUSTOM].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => selectChip(chip)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs max-sm:px-3 max-sm:py-1.5 max-sm:text-[13px]",
                    selected === chip
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  {chip === CUSTOM ? "직접 입력" : chip === currentRound ? `${chip} · 현재` : chip}
                </button>
              ))}
            </div>
            {selected === CUSTOM && (
              <input
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                placeholder="3차, 임원면접 등"
                className="mt-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                autoFocus
              />
            )}
            {/* 경고가 생겼다 없어져도 아래 입력칸이 오르내리지 않게 줄 자리를 항상 둔다. */}
            <p className="min-h-4 text-[11px] text-muted-foreground">
              {revertWarningRounds.length > 0 && `${revertWarningRounds.join("·")} 기록이 지워져요`}
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">일정 (선택)</label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" className="min-w-20" onClick={confirm} disabled={!resolvedRound()}>
              {scheduledAt ? "저장" : "건너뛰기"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
