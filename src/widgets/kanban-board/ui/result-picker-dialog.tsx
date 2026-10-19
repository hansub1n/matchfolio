"use client";

import type { Application } from "@/entities/application";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";

export function ResultPickerDialog({
  application,
  onSelect,
  onOpenChange,
}: {
  application: Application | null;
  onSelect: (id: string, outcome: "passed" | "failed") => void;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={application !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{application?.company} 결과를 선택해주세요</DialogTitle>
          <DialogDescription>
            닫으면 이동이 취소돼요. 나중에 다시 드래그해서 선택할 수 있어요.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => application && onSelect(application.id, "failed")}
          >
            탈락
          </Button>
          <Button
            className="flex-1 bg-highlight text-highlight-foreground hover:bg-highlight/80"
            onClick={() => application && onSelect(application.id, "passed")}
          >
            합격
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
