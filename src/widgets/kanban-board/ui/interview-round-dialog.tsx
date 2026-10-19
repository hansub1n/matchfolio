"use client";

import { useState } from "react";

import type { Application } from "@/entities/application";
import type { Schedule } from "@/entities/schedule";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";

const QUICK_ROUNDS = ["1차", "2차", "최종"];

function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocalValue(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

export function InterviewRoundDialog({
  application,
  schedule,
  onSelect,
  onOpenChange,
}: {
  application: Application | null;
  schedule?: Schedule | null;
  onSelect: (id: string, round: string, scheduledAt: string | null) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const [customRound, setCustomRound] = useState(schedule?.roundLabel ?? "");
  const [scheduledAt, setScheduledAt] = useState(toDatetimeLocalValue(schedule?.scheduledAt));

  function select(round: string) {
    if (!application || !round.trim()) return;
    onSelect(application.id, round.trim(), fromDatetimeLocalValue(scheduledAt));
    setCustomRound("");
    setScheduledAt("");
  }

  return (
    <Dialog
      open={application !== null}
      onOpenChange={(open) => {
        if (!open) {
          setCustomRound("");
          setScheduledAt("");
        }
        onOpenChange(open);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{application?.company} 몇 차 면접인가요?</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2">
          {QUICK_ROUNDS.map((round) => (
            <Button
              key={round}
              variant="outline"
              className="flex-1"
              onClick={() => select(round)}
            >
              {round}
            </Button>
          ))}
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
          <input
            value={customRound}
            onChange={(e) => setCustomRound(e.target.value)}
            placeholder="직접 입력 (예: 임원면접)"
            className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <Button variant="outline" onClick={() => select(customRound)}>
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
