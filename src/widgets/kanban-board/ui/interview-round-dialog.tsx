"use client";

import { useState } from "react";

import type { Application } from "@/entities/application";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";

const QUICK_ROUNDS = ["1차", "2차", "최종"];

export function InterviewRoundDialog({
  application,
  onSelect,
  onOpenChange,
}: {
  application: Application | null;
  onSelect: (id: string, round: string) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const [customRound, setCustomRound] = useState("");

  function select(round: string) {
    if (!application || !round.trim()) return;
    onSelect(application.id, round.trim());
    setCustomRound("");
  }

  return (
    <Dialog
      open={application !== null}
      onOpenChange={(open) => {
        if (!open) setCustomRound("");
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
