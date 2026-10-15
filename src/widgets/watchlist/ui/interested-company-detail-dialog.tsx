"use client";

import { useState } from "react";

import type {
  InterestedCompany,
  UpdateInterestedCompanyInput,
} from "@/entities/interested-company";
import { MatchProjectsPanel } from "@/features/match-projects";
import { formatDeadline } from "@/shared/lib/format-deadline";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { ScreenshotGallery } from "@/shared/ui/screenshot-gallery";

const inputClassName =
  "rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

export function InterestedCompanyDetailDialog({
  company,
  onOpenChange,
  onUpdate,
}: {
  company: InterestedCompany | null;
  onOpenChange: (open: boolean) => void;
  onUpdate: (id: string, input: UpdateInterestedCompanyInput) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [position, setPosition] = useState("");
  const [deadline, setDeadline] = useState("");
  const [jobPostingUrl, setJobPostingUrl] = useState("");
  const [techStack, setTechStack] = useState("");
  const [description, setDescription] = useState("");
  const [memo, setMemo] = useState("");

  const deadlineLabel = formatDeadline(company?.deadline ?? null);

  function handleOpenChange(open: boolean) {
    if (!open) {
      setEditing(false);
    }
    onOpenChange(open);
  }

  function handleStartEdit() {
    if (!company) return;
    setCompanyName(company.company);
    setPosition(company.position ?? "");
    setDeadline(company.deadline ?? "");
    setJobPostingUrl(company.jobPostingUrl ?? "");
    setTechStack(company.techStack.join(", "));
    setDescription(company.description ?? "");
    setMemo(company.memo ?? "");
    setEditing(true);
  }

  function handleSave() {
    if (!company) return;
    onUpdate(company.id, {
      company: companyName.trim(),
      position: position.trim() || null,
      deadline: deadline || null,
      jobPostingUrl: jobPostingUrl.trim() || null,
      description: description.trim() || null,
      memo: memo.trim() || null,
      techStack: techStack
        .split(",")
        .map((tech) => tech.trim())
        .filter(Boolean),
    });
    setEditing(false);
  }

  return (
    <Dialog open={company !== null} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{company?.company}</DialogTitle>
        </DialogHeader>
        {company && !editing && (
          <div className="flex min-w-0 flex-col gap-3 text-sm">
            {company.position && (
              <p className="text-muted-foreground">{company.position}</p>
            )}
            {deadlineLabel && <p className="text-muted-foreground">{deadlineLabel}</p>}
            {company.techStack.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {company.techStack.map((tech) => (
                  <Badge key={tech} variant="secondary">
                    {tech}
                  </Badge>
                ))}
              </div>
            )}
            {company.jobPostingUrl && (
              <a
                href={company.jobPostingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2"
              >
                공고 링크
              </a>
            )}
            {company.description && (
              <p className="whitespace-pre-wrap leading-relaxed">
                {company.description}
              </p>
            )}
            {company.memo && (
              <p className="whitespace-pre-wrap text-muted-foreground">
                메모: {company.memo}
              </p>
            )}
            <ScreenshotGallery paths={company.screenshotPaths} />
            <MatchProjectsPanel key={company.id} company={company} />
            <DialogFooter>
              <Button variant="outline" onClick={handleStartEdit}>
                수정
              </Button>
            </DialogFooter>
          </div>
        )}
        {company && editing && (
          <div className="flex flex-col gap-3">
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="회사명"
              className={inputClassName}
            />
            <input
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="직무 (선택)"
              className={inputClassName}
            />
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className={inputClassName}
            />
            <input
              value={jobPostingUrl}
              onChange={(e) => setJobPostingUrl(e.target.value)}
              placeholder="공고 링크 (선택)"
              className={inputClassName}
            />
            <input
              value={techStack}
              onChange={(e) => setTechStack(e.target.value)}
              placeholder="기술스택 (쉼표로 구분)"
              className={inputClassName}
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="공고 요약"
              rows={4}
              className={inputClassName}
            />
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="메모 (선택)"
              rows={2}
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
