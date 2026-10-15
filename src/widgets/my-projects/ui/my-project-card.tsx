"use client";

import { useState } from "react";
import { X } from "lucide-react";

import type { MyProject } from "@/entities/my-project";
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

export function MyProjectCard({
  project,
  onOpenDetail,
  onDelete,
}: {
  project: MyProject;
  onOpenDetail?: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <Card size="sm" className="relative w-64">
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="absolute top-1.5 right-1.5 rounded-sm p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-3.5" />
          <span className="sr-only">삭제</span>
        </button>
        <CardHeader>
          <CardTitle className="pr-4">{project.name}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {project.description && (
            <p className="text-sm text-muted-foreground">{project.description}</p>
          )}
          {project.techStack.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {project.techStack.map((tech) => (
                <Badge key={tech} variant="secondary">
                  {tech}
                </Badge>
              ))}
            </div>
          )}
          {project.highlights.length > 0 && (
            <ul className="list-inside list-disc text-xs text-muted-foreground">
              {project.highlights.slice(0, 3).map((highlight) => (
                <li key={highlight}>{highlight}</li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => onOpenDetail?.(project.id)}
            className="self-start text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            자세히 보기
          </button>
        </CardContent>
      </Card>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{project.name} 프로젝트를 삭제할까요?</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                onDelete?.(project.id);
                setConfirmOpen(false);
              }}
            >
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
