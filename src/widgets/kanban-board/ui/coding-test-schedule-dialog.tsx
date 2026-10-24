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

export function CodingTestScheduleDialog({
  application,
  schedule,
  onSelect,
  onOpenChange,
}: {
  application: Application | null;
  schedule?: Schedule | null;
  onSelect: (id: string, scheduledAt: string | null) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const [scheduledAt, setScheduledAt] = useState(toDatetimeLocalValue(schedule?.scheduledAt));

  function confirm() {
    if (!application) return;
    onSelect(application.id, fromDatetimeLocalValue(scheduledAt));
    setScheduledAt("");
  }

  return (
    <Dialog
      open={application !== null}
      onOpenChange={(open) => {
        if (!open) setScheduledAt("");
        onOpenChange(open);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-1">
            <DialogTitle>{application?.company} 코딩테스트 일정</DialogTitle>
            <HelpButton chapterId="schedule" label="일정" />
          </div>
        </DialogHeader>
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
          <Button variant="outline" className="min-w-20" onClick={confirm}>
            {scheduledAt ? "저장" : "건너뛰기"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
