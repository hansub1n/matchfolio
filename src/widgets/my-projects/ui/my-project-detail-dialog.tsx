"use client";

import { useState } from "react";

import type { MyProject, UpdateMyProjectInput } from "@/entities/my-project";
import type { ProjectMatchWithCompany } from "@/entities/project-match";
import { splitNameSubtitle } from "@/shared/lib/split-name-subtitle";
import { Button } from "@/shared/ui/button";
import { CompanyMonogram } from "@/shared/ui/company-monogram";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";

import { computeProjectMatchList } from "../model/compute-project-match-list";

const inputClassName =
  "rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

function stopClick(e: React.MouseEvent) {
  e.stopPropagation();
}

export function MyProjectDetailDialog({
  project,
  allProjectMatches = [],
  initialMode = "view",
  onOpenChange,
  onUpdate,
  onDelete,
  onNavigateToCompany,
}: {
  project: MyProject | null;
  allProjectMatches?: ProjectMatchWithCompany[];
  initialMode?: "view" | "edit";
  onOpenChange: (open: boolean) => void;
  onUpdate: (id: string, input: UpdateMyProjectInput) => void;
  onDelete?: (id: string) => void;
  onNavigateToCompany?: (company: string) => void;
}) {
  // 호출하는 쪽에서 project가 바뀔 때마다 key를 바꿔 매번 새로 마운트시키는
  // 전제로 작성했다 — 그래야 아래 초기값들이 "이번에 연 프로젝트" 기준으로 맞다.
  const [editing, setEditing] = useState(initialMode === "edit");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [name, setName] = useState(project?.name ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [techStack, setTechStack] = useState(project?.techStack.join(", ") ?? "");
  const [highlights, setHighlights] = useState(project?.highlights.join(", ") ?? "");

  if (!project) {
    return (
      <Dialog open={false} onOpenChange={onOpenChange}>
        <DialogContent />
      </Dialog>
    );
  }

  const { main, subtitle } = splitNameSubtitle(project.name);
  const matches = computeProjectMatchList(project.name, allProjectMatches);

  function handleOpenChange(open: boolean) {
    if (!open) setEditing(false);
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
      <DialogContent
        className="flex max-h-[85dvh] w-full max-w-lg flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
        onClick={stopClick}
      >
        <div className="flex shrink-0 items-center gap-2 border-b px-5 py-4 pr-12">
          <CompanyMonogram company={project.name} size={28} />
          <p className="min-w-0 flex-1 truncate text-base font-medium">
            {main}
            {subtitle && <span className="font-normal text-muted-foreground"> {subtitle}</span>}
          </p>
          {!editing && (
            <Button variant="ghost" size="xs" className="text-xs" onClick={handleStartEdit}>
              수정
            </Button>
          )}
        </div>

        {!editing ? (
          <div className="flex flex-col gap-5 overflow-y-auto px-5 py-4 text-sm">
            {project.description && (
              <p className="text-sm text-muted-foreground">{project.description}</p>
            )}

            {project.techStack.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {project.techStack.map((tech) => (
                  <span key={tech} className="rounded-full border px-2.5 py-1 text-xs">
                    {tech}
                  </span>
                ))}
              </div>
            )}

            {project.highlights.length > 0 && (
              <div>
                <p className="mb-1.5 text-[11px] text-muted-foreground">핵심 포인트</p>
                <ul className="list-inside list-disc text-sm leading-relaxed">
                  {project.highlights.map((highlight) => (
                    <li key={highlight}>{highlight}</li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <p className="mb-1.5 text-[11px] text-muted-foreground">잘 맞는 공고</p>
              {matches.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  {matches.map((match) => (
                    <button
                      key={match.company}
                      type="button"
                      onClick={() => onNavigateToCompany?.(match.company)}
                      className="flex items-center justify-between gap-2 text-left hover:text-foreground"
                    >
                      <span className="font-medium">{match.company}</span>
                      <span className="num text-muted-foreground">{match.fitScore}점</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">아직 매칭한 공고가 없어요</p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 overflow-y-auto px-5 py-4">
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
            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                className="text-sm text-destructive hover:underline"
                onClick={() => setConfirmOpen(true)}
              >
                삭제
              </button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditing(false)}>
                  취소
                </Button>
                <Button onClick={handleSave}>저장</Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent onClick={stopClick}>
          <DialogHeader>
            <DialogTitle>이 프로젝트를 삭제할까요?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">매칭 기록도 함께 삭제돼요.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                onDelete?.(project.id);
                setConfirmOpen(false);
                onOpenChange(false);
              }}
            >
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
