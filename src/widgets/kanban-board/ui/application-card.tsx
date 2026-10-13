"use client";

import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { X } from "lucide-react";

import type { Application } from "@/entities/application";
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

export function ApplicationCard({
  application,
  onRequestResult,
  onRequestInterviewRound,
  onOpenDetail,
  onDelete,
}: {
  application: Application;
  onRequestResult?: (id: string) => void;
  onRequestInterviewRound?: (id: string) => void;
  onOpenDetail?: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const deadlineLabel = formatDeadline(application.deadline);
  const { setNodeRef, listeners, attributes, transform, isDragging } = useDraggable({
    id: application.id,
  });

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
          <CardTitle className="flex items-center gap-1.5 pr-4">
            {application.company}
            {application.status === "interview" ? (
              <Badge
                variant="outline"
                className={
                  application.interviewRound
                    ? "cursor-pointer"
                    : "cursor-pointer bg-amber-500/10 text-amber-600"
                }
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => onRequestInterviewRound?.(application.id)}
              >
                {application.interviewRound ?? "차수 선택"}
              </Badge>
            ) : (
              application.interviewRound && (
                <Badge variant="outline">{application.interviewRound}</Badge>
              )
            )}
            {application.result && (
              <Badge
                className={
                  application.result === "passed"
                    ? "ml-auto bg-emerald-500/10 text-emerald-600"
                    : "ml-auto"
                }
                variant={application.result === "passed" ? "outline" : "destructive"}
              >
                {application.result === "passed" ? "합격" : "불합격"}
              </Badge>
            )}
            {application.status === "result" && !application.result && (
              <Badge
                variant="outline"
                className="ml-auto cursor-pointer bg-amber-500/10 text-amber-600"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => onRequestResult?.(application.id)}
              >
                결과 미정
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">{application.position}</p>
          <div className="flex flex-col gap-1.5">
            {application.techStack.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {application.techStack.slice(0, 2).map((tech) => (
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
