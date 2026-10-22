"use client";

import { useState } from "react";
import { MoreHorizontal, Trash2 } from "lucide-react";
import { cn } from "cn";

import { APPLICATION_STAGES, type Application, type UpdateApplicationInput } from "@/entities/application";
import type { Schedule } from "@/entities/schedule";
import { AnalyzeCompanyPanel } from "@/features/analyze-company";
import { formatDateTime } from "@/shared/lib/format-date-time";
import { normalizeTech } from "@/shared/lib/normalize-tech";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { ScreenshotGallery } from "@/shared/ui/screenshot-gallery";

import { parseJobDescription } from "../model/parse-job-description";
import { CodingTestScheduleDialog } from "./coding-test-schedule-dialog";
import { InterviewSchedulePopover } from "./interview-schedule-popover";

const inputClassName =
  "rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

const STAGE_LABELS = Object.fromEntries(
  APPLICATION_STAGES.map((stage) => [stage.value, stage.label])
);

function stopClick(e: React.MouseEvent) {
  e.stopPropagation();
}

function getStatusLine(
  application: Application,
  schedule: Schedule | null | undefined
): { text: string; variant: "highlight" | "destructive" | "normal" } {
  if (application.outcome === "passed") {
    return { text: "최종 합격", variant: "highlight" };
  }
  if (application.outcome === "failed") {
    const text =
      application.stage === "interview" && schedule?.roundLabel
        ? `${schedule.roundLabel} 면접 탈락`
        : `${STAGE_LABELS[application.stage]} 탈락`;
    return { text, variant: "destructive" };
  }
  if (application.stage === "interview") {
    return { text: schedule?.roundLabel ? `면접 · ${schedule.roundLabel}` : "면접", variant: "normal" };
  }
  return { text: `${STAGE_LABELS[application.stage]} 진행 중`, variant: "normal" };
}

function getScheduleLabel(application: Application, schedule: Schedule | null | undefined): string {
  const prefix =
    application.stage === "interview" ? (schedule?.roundLabel ?? "면접") : "코딩테스트";
  const time = formatDateTime(schedule?.scheduledAt ?? null);
  return time ? `${prefix} · ${time}` : "일정 미정";
}

export function ApplicationDetailDialog({
  application,
  schedule,
  myProjectTechStack = [],
  initialMode = "view",
  onOpenChange,
  onUpdate,
  onDelete,
  onSaveInterviewRound,
  onSaveCodingTestSchedule,
}: {
  application: Application | null;
  schedule?: Schedule | null;
  myProjectTechStack?: string[];
  initialMode?: "view" | "edit";
  onOpenChange: (open: boolean) => void;
  onUpdate: (id: string, input: UpdateApplicationInput) => void;
  onDelete?: (id: string) => void;
  onSaveInterviewRound: (id: string, round: string, scheduledAt: string | null) => void;
  onSaveCodingTestSchedule: (id: string, scheduledAt: string | null) => void;
}) {
  // 호출하는 쪽에서 application 바뀔 때마다 key를 바꿔 매번 새로 마운트시키는
  // 전제로 작성했다 — 그래야 아래 초기값들이 "이번에 연 지원 건" 기준으로 맞다.
  const [editing, setEditing] = useState(initialMode === "edit");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [company, setCompany] = useState(application?.company ?? "");
  const [position, setPosition] = useState(application?.position ?? "");
  const [appliedAt, setAppliedAt] = useState(application?.appliedAt ?? "");
  const [deadline, setDeadline] = useState(application?.deadline ?? "");
  const [jobPostingUrl, setJobPostingUrl] = useState(application?.jobPostingUrl ?? "");
  const [techStack, setTechStack] = useState(application?.techStack.join(", ") ?? "");
  const [description, setDescription] = useState(application?.description ?? "");
  const [memo, setMemo] = useState(application?.memo ?? "");

  if (!application) {
    return (
      <Dialog open={false} onOpenChange={onOpenChange}>
        <DialogContent />
      </Dialog>
    );
  }

  const { main, subtitle } = splitNameSubtitle(application.company);
  const status = getStatusLine(application, schedule);
  const hasSchedule = application.stage === "coding_test" || application.stage === "interview";
  const appliedAtLabel = formatDateTime(application.appliedAt);
  const deadlineLabel = formatDateTime(application.deadline);
  const parsedDescription = application.description ? parseJobDescription(application.description) : null;

  function handleOpenChange(open: boolean) {
    if (!open) setEditing(false);
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

  const scheduleTrigger = (
    <button
      type="button"
      onClick={(e) => {
        stopClick(e);
        setScheduleOpen(true);
      }}
      className="text-left hover:text-foreground"
    >
      {getScheduleLabel(application, schedule)}
    </button>
  );

  return (
    <Dialog open={application !== null} onOpenChange={handleOpenChange}>
      <DialogContent
        className="flex max-h-[85dvh] w-full max-w-lg flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
        onClick={stopClick}
      >
        <div className="flex shrink-0 items-center gap-2 border-b px-5 py-4 pr-12">
          <CompanyMonogram company={application.company} size={28} />
          <p className="min-w-0 flex-1 truncate text-base font-medium">
            {main}
            {subtitle && <span className="font-normal text-muted-foreground"> {subtitle}</span>}
          </p>
          {!editing && (
            <>
              <Button variant="ghost" size="xs" className="text-xs" onClick={handleStartEdit}>
                수정
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="rounded-sm p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <MoreHorizontal className="size-3.5" />
                    <span className="sr-only">더보기</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem variant="destructive" onSelect={() => setConfirmOpen(true)}>
                    <Trash2 className="size-3.5" />
                    삭제
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>

        {!editing ? (
          <div className="flex flex-col gap-5 overflow-y-auto px-5 py-4 text-sm">
            <div className="flex flex-col gap-3">
              <p className="text-muted-foreground">{application.position}</p>
              <p
                className={cn(
                  "text-xs",
                  status.variant === "destructive"
                    ? "text-destructive"
                    : status.variant === "highlight"
                      ? "text-foreground"
                      : "text-muted-foreground"
                )}
              >
                {status.variant === "highlight" ? (
                  <span className="bg-[linear-gradient(transparent_58%,var(--highlight)_58%)] px-0.5">
                    {status.text}
                  </span>
                ) : (
                  status.text
                )}
              </p>
            </div>

            {(hasSchedule || appliedAtLabel || deadlineLabel) && (
              <div className="grid grid-cols-[72px_1fr] gap-y-1.5 text-xs">
                {hasSchedule && (
                  <>
                    <span className="text-muted-foreground">일정</span>
                    {application.stage === "interview" ? (
                      <InterviewSchedulePopover
                        application={application}
                        schedule={schedule ?? null}
                        open={scheduleOpen}
                        onOpenChange={setScheduleOpen}
                        onSave={onSaveInterviewRound}
                        trigger={scheduleTrigger}
                      />
                    ) : (
                      scheduleTrigger
                    )}
                  </>
                )}
                {appliedAtLabel && (
                  <>
                    <span className="text-muted-foreground">지원일</span>
                    <span>{appliedAtLabel}</span>
                  </>
                )}
                {deadlineLabel && (
                  <>
                    <span className="text-muted-foreground">마감일</span>
                    <span>{deadlineLabel}</span>
                  </>
                )}
              </div>
            )}

            {application.techStack.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <p className="text-[11px] text-muted-foreground">기술스택</p>
                <div className="flex flex-wrap gap-1.5">
                  {application.techStack.map((tech) => {
                    const owned = myProjectTechStack.some(
                      (t) => normalizeTech(t) === normalizeTech(tech)
                    );
                    return (
                      <span
                        key={tech}
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-xs",
                          owned && "bg-[linear-gradient(transparent_58%,var(--highlight)_58%)]"
                        )}
                      >
                        {tech}
                      </span>
                    );
                  })}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  형광펜 = 내 프로젝트에 있는 기술
                </p>
              </div>
            )}

            {application.description && (
              <div>
                <p className="mb-1.5 text-[11px] text-muted-foreground">공고 내용</p>
                {parsedDescription ? (
                  <div className="flex flex-col gap-3">
                    {parsedDescription.sections.map((section, i) => (
                      <div key={i}>
                        {section.title && (
                          <p className="mb-1.5 text-[11px] text-muted-foreground">
                            {section.title}
                          </p>
                        )}
                        <ul className="list-inside list-disc text-sm leading-relaxed">
                          {section.items.map((item, j) => (
                            <li key={j}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {application.description}
                  </p>
                )}
              </div>
            )}

            {application.memo && (
              <div>
                <p className="mb-1.5 text-[11px] text-muted-foreground">메모</p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {application.memo}
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              {application.jobPostingUrl && (
                <Button variant="outline" size="sm" asChild>
                  <a href={application.jobPostingUrl} target="_blank" rel="noopener noreferrer">
                    공고 링크 ↗
                  </a>
                </Button>
              )}
              <ScreenshotGallery paths={application.screenshotPaths} />
              {application.outcome === "in_progress" && application.stage !== "document" && (
                <AnalyzeCompanyPanel key={application.id} application={application} />
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 overflow-y-auto px-5 py-4">
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
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setEditing(false)}>
                취소
              </Button>
              <Button onClick={handleSave}>저장</Button>
            </div>
          </div>
        )}
      </DialogContent>

      <CodingTestScheduleDialog
        application={application.stage === "coding_test" && scheduleOpen ? application : null}
        schedule={schedule ?? null}
        onSelect={(id, scheduledAt) => {
          onSaveCodingTestSchedule(id, scheduledAt);
          setScheduleOpen(false);
        }}
        onOpenChange={setScheduleOpen}
      />

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent onClick={stopClick}>
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
