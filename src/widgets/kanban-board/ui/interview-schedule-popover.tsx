"use client";

import { useRef, useState } from "react";
import { cn } from "cn";

import type { Application } from "@/entities/application";
import { buildRoundChips, roundsAfter, type Schedule } from "@/entities/schedule";
import { Button } from "@/shared/ui/button";
import { Popover, PopoverAnchor, PopoverContent } from "@/shared/ui/popover";

function splitDateTime(iso: string | null | undefined): { date: string; time: string } {
  if (!iso) return { date: "", time: "" };
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

function combineDateTime(date: string, time: string): string | null {
  if (!date) return null;
  return new Date(`${date}T${time || "00:00"}`).toISOString();
}

const CUSTOM = "__custom__";

// 카드/목록 항목 각자가 자기 트리거(일정 버튼, "다음 차수로 진행" 메뉴)에 맞춰
// 외부에서 open/defaultNext를 들고 있는 완전 제어형 컴포넌트 — 드롭다운 메뉴
// 항목처럼 트리거 자체가 Popover의 일부가 아닌 곳에서도 같은 Popover를 열 수 있다.
export function InterviewSchedulePopover({
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
  const chips = buildRoundChips(recordedRounds);
  const defaultChip = defaultNext
    ? (chips[recordedRounds.length] ?? chips[0])
    : (currentRound ?? chips[0]);
  const initialDateTime = splitDateTime(schedule?.scheduledAt);

  const [selected, setSelected] = useState(defaultChip);
  const [customValue, setCustomValue] = useState("");
  const [date, setDate] = useState(selected === currentRound ? initialDateTime.date : "");
  const [time, setTime] = useState(selected === currentRound ? initialDateTime.time : "");
  const savedRef = useRef(false);

  function selectChip(chip: string) {
    setSelected(chip);
    if (chip === currentRound) {
      setDate(initialDateTime.date);
      setTime(initialDateTime.time);
    } else {
      setDate("");
      setTime("");
    }
  }

  function resolvedRound(): string {
    return selected === CUSTOM ? customValue.trim() : selected;
  }

  // 현재보다 앞 차수를 고르면, 저장 시 같이 지워질 뒤쪽 기록을 미리 보여준다.
  const revertWarningRounds = roundsAfter(recordedRounds, selected);

  function commit(scheduledAt: string | null) {
    const round = resolvedRound();
    if (!round) return;
    onSave(application.id, round, scheduledAt);
  }

  function handleSave() {
    savedRef.current = true;
    commit(combineDateTime(date, time));
    onOpenChange(false);
  }

  function handleLater() {
    savedRef.current = true;
    commit(null);
    onOpenChange(false);
  }

  function handleOpenChange(next: boolean) {
    if (next) {
      // 새로 열릴 때마다 이번 트리거(기본 차수) 기준으로 다시 초기화한다.
      setSelected(defaultChip);
      setCustomValue("");
      if (defaultChip === currentRound) {
        setDate(initialDateTime.date);
        setTime(initialDateTime.time);
      } else {
        setDate("");
        setTime("");
      }
      savedRef.current = false;
    } else if (!savedRef.current) {
      // 바깥 클릭/Esc로 닫힘. 아직 기록에 없는(새로 진행하려는) 차수를 고르던
      // 중이었다면 그 차수만 기록하고, 이미 기록된 차수(현재든 과거든)를 보던
      // 중이었다면 그냥 둔다 — 특히 과거 차수를 실수로 봤다가 그 뒤 기록을
      // 실수로 지워버리는 일이 없도록, 되돌리기는 명시적으로 저장을 눌러야만 된다.
      if (!recordedRounds.includes(selected)) {
        commit(null);
      }
    }
    onOpenChange(next);
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverAnchor asChild>{trigger}</PopoverAnchor>
      <PopoverContent
        className="w-72"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <p className="text-sm font-medium">{application.company} · 면접 일정</p>

        <div className="flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => selectChip(chip)}
              className={cn(
                "rounded-md px-2 py-1 text-xs",
                selected === chip
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {chip === currentRound ? `${chip} · 현재` : chip}
            </button>
          ))}
          <button
            type="button"
            onClick={() => selectChip(CUSTOM)}
            className={cn(
              "rounded-md px-2 py-1 text-xs",
              selected === CUSTOM
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            직접 입력
          </button>
        </div>

        {revertWarningRounds.length > 0 && (
          <p className="text-[11px] text-muted-foreground">
            {revertWarningRounds.join("·")} 기록이 지워져요
          </p>
        )}

        {selected === CUSTOM && (
          <input
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            placeholder="임원면접"
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            autoFocus
          />
        )}

        <div className="flex gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-24 rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={handleLater}>
            나중에
          </Button>
          <Button type="button" size="sm" onClick={handleSave}>
            저장
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
