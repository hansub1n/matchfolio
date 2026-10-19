"use client";

import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { X } from "lucide-react";

import { APPLICATION_STAGES, type Application } from "@/entities/application";
import type { Schedule } from "@/entities/schedule";
import { formatDeadline } from "@/shared/lib/format-deadline";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";

const STAGE_LABELS = Object.fromEntries(
  APPLICATION_STAGES.map((stage) => [stage.value, stage.label])
);

function formatScheduleTime(scheduledAt: string | null) {
  if (!scheduledAt) return null;
  return new Date(scheduledAt).toLocaleString("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ApplicationCard({
  application,
  schedule,
  onRequestInterviewRound,
  onRequestCodingTestSchedule,
  onOpenDetail,
  onDelete,
}: {
  application: Application;
  schedule?: Schedule | null;
  onRequestInterviewRound?: (id: string) => void;
  onRequestCodingTestSchedule?: (id: string) => void;
  onOpenDetail?: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const deadlineLabel = formatDeadline(application.deadline);
  const { setNodeRef, listeners, attributes, transform, isDragging } = useDraggable({
    id: application.id,
  });

  const isInterviewing = application.stage === "interview" && application.outcome === "in_progress";
  const isCodingTest = application.stage === "coding_test" && application.outcome === "in_progress";
  const codingTestTimeLabel = formatScheduleTime(schedule?.scheduledAt ?? null);

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
        touchAction: "none",
      }}
      className={isDragging ? "cursor-grabbing opacity-50" : "cursor-grab"}
    >
      <Card size="sm" className="relative">
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setConfirmOpen(true)}
          className="absolute top-1.5 right-1.5 rounded-sm p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-3.5" />
          <span className="sr-only">삭제</span>
        </button>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-1.5 pr-4">
            {application.company}
            {isInterviewing && (
              <Badge
                variant="outline"
                className={
                  schedule
                    ? "cursor-pointer"
                    : "cursor-pointer bg-amber-500/10 text-amber-600"
                }
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => onRequestInterviewRound?.(application.id)}
              >
                {schedule ? (schedule.roundLabel ?? "면접") : "차수 선택"}
              </Badge>
            )}
            {isCodingTest && (
              <Badge
                variant="outline"
                className={codingTestTimeLabel ? "cursor-pointer" : "cursor-pointer bg-amber-500/10 text-amber-600"}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => onRequestCodingTestSchedule?.(application.id)}
              >
                {codingTestTimeLabel ?? "일정 입력"}
              </Badge>
            )}
            {application.outcome === "passed" && (
              <Badge className="ml-auto bg-highlight text-highlight-foreground">최종 합격</Badge>
            )}
            {application.outcome === "failed" && (
              <Badge variant="destructive" className="ml-auto">
                {application.stage === "interview" && schedule?.roundLabel
                  ? `${schedule.roundLabel} 면접 탈락`
                  : `${STAGE_LABELS[application.stage]} 탈락`}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">{application.position}</p>
          <div className="flex flex-col gap-1.5">
            {application.techStack.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {application.techStack.slice(0, 3).map((tech) => (
                  <Badge key={tech} variant="secondary">
                    {tech}
                  </Badge>
                ))}
              </div>
            )}
            {deadlineLabel && (
              <span className="text-xs text-muted-foreground">{deadlineLabel}</span>
            )}
          </div>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onOpenDetail?.(application.id)}
            className="self-start text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            자세히 보기
          </button>
        </CardContent>
      </Card>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{application.company} 카드를 삭제할까요?</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                onDelete?.(application.id);
                setConfirmOpen(false);
              }}
            >
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
