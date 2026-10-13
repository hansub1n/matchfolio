"use client";

import { useDraggable } from "@dnd-kit/core";

import type { Application } from "@/entities/application";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

function formatDeadline(deadline: string | null) {
  if (!deadline) return null;
  const [, month, day] = deadline.split("-");
  return `마감 ${month}/${day}`;
}

export function ApplicationCard({
  application,
  onRequestResult,
}: {
  application: Application;
  onRequestResult?: (id: string) => void;
}) {
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
      <Card size="sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5">
            {application.company}
            {application.interviewRound && (
              <Badge variant="outline">{application.interviewRound}</Badge>
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
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1">
              {application.techStack.slice(0, 2).map((tech) => (
                <Badge key={tech} variant="secondary">
                  {tech}
                </Badge>
              ))}
            </div>
            {deadlineLabel && (
              <span className="text-xs text-muted-foreground">{deadlineLabel}</span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
