"use client";

import { useState } from "react";

import type { Application, UpdateApplicationInput } from "@/entities/application";
import type { Schedule } from "@/entities/schedule";
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
  schedule,
  initialMode = "view",
  onOpenChange,
  onUpdate,
}: {
  application: Application | null;
  schedule?: Schedule | null;
  initialMode?: "view" | "edit";
  onOpenChange: (open: boolean) => void;
  onUpdate: (id: string, input: UpdateApplicationInput) => void;
}) {
  // 호출하는 쪽에서 application 바뀔 때마다 key를 바꿔 매번 새로 마운트시키는
  // 전제로 작성했다 — 그래야 아래 초기값들이 "이번에 연 지원 건" 기준으로 맞다.
  const [editing, setEditing] = useState(initialMode === "edit");
  const [company, setCompany] = useState(application?.company ?? "");
  const [position, setPosition] = useState(application?.position ?? "");
  const [appliedAt, setAppliedAt] = useState(application?.appliedAt ?? "");
  const [deadline, setDeadline] = useState(application?.deadline ?? "");
  const [jobPostingUrl, setJobPostingUrl] = useState(application?.jobPostingUrl ?? "");
  const [techStack, setTechStack] = useState(application?.techStack.join(", ") ?? "");
  const [description, setDescription] = useState(application?.description ?? "");
  const [memo, setMemo] = useState(application?.memo ?? "");

  const deadlineLabel = formatDeadline(application?.deadline ?? null);
  const appliedAtLabel = application?.appliedAt
    ? `지원 ${application.appliedAt.slice(5).replace("-", "/")}`
    : null;

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
    setAppliedAt(application.appliedAt ?? "");
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
      appliedAt: appliedAt || null,
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
            {schedule && (
              <p className="text-muted-foreground">
                {schedule.roundLabel ?? "면접"}
                {schedule.scheduledAt
                  ? ` · ${new Date(schedule.scheduledAt).toLocaleString("ko-KR")}`
                  : " · 일정 미정"}
              </p>
            )}
            {appliedAtLabel && <p className="text-muted-foreground">{appliedAtLabel}</p>}
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
            {application.outcome === "in_progress" && application.stage !== "document" && (
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
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">지원일</label>
              <input
                type="date"
                value={appliedAt}
                onChange={(e) => setAppliedAt(e.target.value)}
                className={inputClassName}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">마감일</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className={inputClassName}
              />
            </div>
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
