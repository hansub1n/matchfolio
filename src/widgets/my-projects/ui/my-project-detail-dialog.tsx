"use client";

import { useState } from "react";

import type { MyProject, UpdateMyProjectInput } from "@/entities/my-project";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";

const inputClassName =
  "rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

export function MyProjectDetailDialog({
  project,
  onOpenChange,
  onUpdate,
}: {
  project: MyProject | null;
  onOpenChange: (open: boolean) => void;
  onUpdate: (id: string, input: UpdateMyProjectInput) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [techStack, setTechStack] = useState("");
  const [highlights, setHighlights] = useState("");

  function handleOpenChange(open: boolean) {
    if (!open) {
      setEditing(false);
    }
    onOpenChange(open);
  }

  function handleStartEdit() {
    if (!project) return;
    setName(project.name);
    setDescription(project.description ?? "");
    setTechStack(project.techStack.join(", "));
    setHighlights(project.highlights.join(", "));
    setEditing(true);
  }

  function handleSave() {
    if (!project) return;
    onUpdate(project.id, {
      name: name.trim(),
      description: description.trim() || null,
      techStack: techStack
        .split(",")
        .map((tech) => tech.trim())
        .filter(Boolean),
      highlights: highlights
        .split(",")
        .map((highlight) => highlight.trim())
        .filter(Boolean),
    });
    setEditing(false);
  }

  return (
    <Dialog open={project !== null} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{project?.name}</DialogTitle>
        </DialogHeader>
        {project && !editing && (
          <div className="flex flex-col gap-3 text-sm">
            {project.description && (
              <p className="whitespace-pre-wrap leading-relaxed">{project.description}</p>
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
              <ul className="list-inside list-disc leading-relaxed">
                {project.highlights.map((highlight) => (
                  <li key={highlight}>{highlight}</li>
                ))}
              </ul>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={handleStartEdit}>
                수정
              </Button>
            </DialogFooter>
          </div>
        )}
        {project && editing && (
          <div className="flex flex-col gap-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="프로젝트 이름"
              className={inputClassName}
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="한 줄 소개"
              rows={2}
              className={inputClassName}
            />
            <input
              value={techStack}
              onChange={(e) => setTechStack(e.target.value)}
              placeholder="기술스택 (쉼표로 구분)"
              className={inputClassName}
            />
            <textarea
              value={highlights}
              onChange={(e) => setHighlights(e.target.value)}
              placeholder="주요 기능/경험 (쉼표로 구분)"
              rows={3}
              className={inputClassName}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(false)}>
                취소
              </Button>
              <Button onClick={handleSave}>저장</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
