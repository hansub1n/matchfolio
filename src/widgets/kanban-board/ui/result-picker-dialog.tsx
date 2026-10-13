"use client";

import type { Application, ApplicationResult } from "@/entities/application";
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
  onSelect: (id: string, result: ApplicationResult) => void;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={application !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{application?.company} 결과를 선택해주세요</DialogTitle>
          <DialogDescription>나중에 카드의 &quot;결과 미정&quot; 배지를 눌러 다시 선택할 수 있어요.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => application && onSelect(application.id, "failed")}
          >
            불합격
          </Button>
          <Button
            className="flex-1 bg-emerald-600 text-white hover:bg-emerald-600/90"
            onClick={() => application && onSelect(application.id, "passed")}
          >
            합격
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
