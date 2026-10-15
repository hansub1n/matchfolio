"use client";

import { useState } from "react";

import type { Application, UpdateApplicationInput } from "@/entities/application";
import { AnalyzeCompanyPanel } from "@/features/analyze-company";
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

export function ApplicationDetailDialog({
  application,
  onOpenChange,
  onUpdate,
}: {
  application: Application | null;
  onOpenChange: (open: boolean) => void;
  onUpdate: (id: string, input: UpdateApplicationInput) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [company, setCompany] = useState("");
  const [position, setPosition] = useState("");
  const [deadline, setDeadline] = useState("");
  const [jobPostingUrl, setJobPostingUrl] = useState("");
  const [techStack, setTechStack] = useState("");
  const [description, setDescription] = useState("");
  const [memo, setMemo] = useState("");

  const deadlineLabel = formatDeadline(application?.deadline ?? null);

  function handleOpenChange(open: boolean) {
    if (!open) {
      setEditing(false);
    }
    onOpenChange(open);
  }

  function handleStartEdit() {
    if (!application) return;
    setCompany(application.company);
    setPosition(application.position);
    setDeadline(application.deadline ?? "");
    setJobPostingUrl(application.jobPostingUrl ?? "");
    setTechStack(application.techStack.join(", "));
    setDescription(application.description ?? "");
    setMemo(application.memo ?? "");
    setEditing(true);
  }

  function handleSave() {
    if (!application) return;
    onUpdate(application.id, {
      company: company.trim(),
      position: position.trim(),
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
    <Dialog open={application !== null} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{application?.company}</DialogTitle>
        </DialogHeader>
        {application && !editing && (
          <div className="flex min-w-0 flex-col gap-3 text-sm">
            <p className="text-muted-foreground">{application.position}</p>
            {deadlineLabel && <p className="text-muted-foreground">{deadlineLabel}</p>}
            {application.techStack.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {application.techStack.map((tech) => (
                  <Badge key={tech} variant="secondary">
                    {tech}
                  </Badge>
                ))}
              </div>
            )}
            {application.jobPostingUrl && (
              <a
                href={application.jobPostingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2"
              >
                공고 링크
              </a>
            )}
            {application.description && (
              <p className="whitespace-pre-wrap leading-relaxed">
                {application.description}
              </p>
            )}
            {application.memo && (
              <p className="whitespace-pre-wrap text-muted-foreground">
                메모: {application.memo}
              </p>
            )}
            <ScreenshotGallery paths={application.screenshotPaths} />
            {application.status !== "applied" && (
              <AnalyzeCompanyPanel key={application.id} application={application} />
            )}
            <DialogFooter>
              <Button variant="outline" onClick={handleStartEdit}>
                수정
              </Button>
            </DialogFooter>
          </div>
        )}
        {application && editing && (
          <div className="flex flex-col gap-3">
            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="회사명"
              className={inputClassName}
            />
            <input
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="직무"
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
