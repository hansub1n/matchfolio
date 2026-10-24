"use client";

import { useState } from "react";

import {
  joinHighlights,
  parseHighlights,
  type MyProject,
  type UpdateMyProjectInput,
} from "@/entities/my-project";
import type { ProjectMatchWithCompany } from "@/entities/project-match";
import { splitNameSubtitle } from "@/shared/lib/split-name-subtitle";
import { Button } from "@/shared/ui/button";
import { CompanyMonogram } from "@/shared/ui/company-monogram";
import { ConfirmDeleteDialog, ModalEditActions } from "@/shared/ui/confirm-delete-dialog";
import { Dialog, DialogContent } from "@/shared/ui/dialog";
import { TagInput } from "@/shared/ui/tag-input";

import { computeProjectMatchList } from "../model/compute-project-match-list";

const inputClassName =
  "rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

function stopClick(e: React.MouseEvent) {
  e.stopPropagation();
}

function DetailBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
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
  const [techStack, setTechStack] = useState<string[]>(project?.techStack ?? []);
  const [highlights, setHighlights] = useState(joinHighlights(project?.highlights ?? []));

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
    setTechStack(project.techStack);
    setHighlights(joinHighlights(project.highlights));
    setEditing(true);
  }

  function handleSave() {
    if (!project) return;
    onUpdate(project.id, {
      name: name.trim(),
      description: description.trim() || null,
      techStack,
      highlights: parseHighlights(highlights),
    });
    setEditing(false);
  }

  return (
    <Dialog open={project !== null} onOpenChange={handleOpenChange}>
      <DialogContent
        className="flex max-h-[85dvh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
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
          <div className="flex flex-col gap-6 overflow-y-auto px-5 py-5 text-sm">
            {(project.description || project.techStack.length > 0) && (
              <div className="flex flex-col gap-3">
                {project.description && <p className="text-justify leading-relaxed">{project.description}</p>}
                {project.techStack.length > 0 && (
                  // 칩은 작게, 테두리 없이 — 본문보다 눈에 띄지 않게.
                  <div className="flex flex-wrap gap-1">
                    {project.techStack.map((tech) => (
                      <span key={tech} className="rounded bg-muted px-1.5 py-0.5 text-[11.5px] text-muted-foreground">
                        {tech}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {project.highlights.length > 0 && (
              <DetailBlock title="핵심 포인트">
                {/* 줄이 넘어가도 글머리표 뒤에 맞춰 들여쓰이게 list-outside. */}
                <ul className="flex list-outside list-disc flex-col gap-2 pl-4 text-[13px] leading-relaxed marker:text-muted-foreground">
                  {project.highlights.map((highlight) => (
                    <li key={highlight}>{highlight}</li>
                  ))}
                </ul>
              </DetailBlock>
            )}

            <DetailBlock title="잘 맞는 공고">
              {matches.length > 0 ? (
                <div className="flex flex-col">
                  {matches.map((match) => (
                    <button
                      key={match.company}
                      type="button"
                      onClick={() => onNavigateToCompany?.(match.company)}
                      className="-mx-2 flex items-start gap-2.5 rounded-md px-2 py-2 text-left hover:bg-accent"
                    >
                      <CompanyMonogram company={match.company} />
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate font-medium">{match.company}</span>
                          <span className="num shrink-0 text-xs text-muted-foreground">{match.fitScore}점</span>
                        </span>
                        {match.summary && (
                          <span className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                            {match.summary}
                          </span>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">아직 매칭한 공고가 없어요</p>
              )}
            </DetailBlock>
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
            <TagInput value={techStack} onChange={setTechStack} placeholder="입력 후 Enter" />
            <textarea
              value={highlights}
              onChange={(e) => setHighlights(e.target.value)}
              placeholder="한 줄에 하나씩 적어주세요"
              rows={3}
              className={inputClassName}
            />
            <ModalEditActions
              onDelete={() => setConfirmOpen(true)}
              onCancel={() => setEditing(false)}
              onSave={handleSave}
            />
          </div>
        )}
      </DialogContent>

      <ConfirmDeleteDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        subject="프로젝트"
        onConfirm={() => {
          onDelete?.(project.id);
          onOpenChange(false);
        }}
      />
    </Dialog>
  );
}
