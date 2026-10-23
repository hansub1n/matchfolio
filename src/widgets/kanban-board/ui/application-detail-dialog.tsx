"use client";

import { useState } from "react";
import { Calendar, CalendarPlus } from "lucide-react";
import { cn } from "cn";

import { APPLICATION_STAGES, type Application, type UpdateApplicationInput } from "@/entities/application";
import type { InterestedCompany, UpdateInterestedCompanyInput } from "@/entities/interested-company";
import type { Schedule } from "@/entities/schedule";
import { AnalyzeCompanyPanel } from "@/features/analyze-company";
import { MatchProjectsPanel } from "@/features/match-projects";
import { formatDateTime } from "@/shared/lib/format-date-time";
import { techSatisfies } from "@/shared/lib/tech-aliases";
import { Button } from "@/shared/ui/button";
import { CompanyMonogram } from "@/shared/ui/company-monogram";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { ScreenshotGallery } from "@/shared/ui/screenshot-gallery";
import { TagInput } from "@/shared/ui/tag-input";

import { parseJobDescription } from "../model/parse-job-description";
import { CodingTestScheduleDialog } from "./coding-test-schedule-dialog";
import { InterviewSchedulePopover } from "./interview-schedule-popover";

const inputClassName =
  "rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

const SECTION_LABEL = "text-[11px] text-muted-foreground";

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

type CommonProps = {
  myProjectTechStack?: string[];
  // 기업분석의 "관련 프로젝트" 칩 이름을 AI 응답이 아니라 여기서 조인해서
  // 보여주는 용도라 id/name만 있으면 된다.
  myProjects?: { id: string; name: string; createdAt: string }[];
  initialMode?: "view" | "edit";
  onOpenChange: (open: boolean) => void;
  onDelete?: (id: string) => void;
};

type ApplicationVariantProps = CommonProps & {
  variant?: "application";
  application: Application | null;
  schedule?: Schedule | null;
  interviewRounds?: string[];
  onUpdate: (id: string, input: UpdateApplicationInput) => void;
  onSaveInterviewRound: (id: string, round: string, scheduledAt: string | null) => void;
  onSaveCodingTestSchedule: (id: string, scheduledAt: string | null) => void;
};

type InterestedVariantProps = CommonProps & {
  variant: "interested";
  company: InterestedCompany | null;
  myProjectCount?: number;
  onUpdate: (id: string, input: UpdateInterestedCompanyInput) => void;
  onApply?: (company: InterestedCompany) => void;
};

type Props = ApplicationVariantProps | InterestedVariantProps;

export function ApplicationDetailDialog(props: Props) {
  const { myProjectTechStack = [], myProjects = [], initialMode = "view", onOpenChange, onDelete } = props;
  const isInterested = props.variant === "interested";
  const entity = isInterested ? props.company : props.application;

  // 호출하는 쪽에서 entity 바뀔 때마다 key를 바꿔 매번 새로 마운트시키는
  // 전제로 작성했다 — 그래야 아래 초기값들이 "이번에 연 항목" 기준으로 맞다.
  const [editing, setEditing] = useState(initialMode === "edit");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [company, setCompany] = useState(entity?.company ?? "");
  const [position, setPosition] = useState(entity?.position ?? "");
  const [appliedAt, setAppliedAt] = useState(
    !isInterested ? (entity as Application | null)?.appliedAt ?? "" : ""
  );
  const [deadline, setDeadline] = useState(entity?.deadline ?? "");
  const [jobPostingUrl, setJobPostingUrl] = useState(entity?.jobPostingUrl ?? "");
  const [techStack, setTechStack] = useState<string[]>(entity?.techStack ?? []);
  const [description, setDescription] = useState(entity?.description ?? "");
  const [memo, setMemo] = useState(entity?.memo ?? "");

  if (!entity) {
    return (
      <Dialog open={false} onOpenChange={onOpenChange}>
        <DialogContent />
      </Dialog>
    );
  }

  const application = !isInterested ? (entity as Application) : null;
  const status = application ? getStatusLine(application, props.variant !== "interested" ? props.schedule : null) : null;
  const hasSchedule =
    application !== null &&
    (application.stage === "coding_test" || application.stage === "interview");
  const scheduleForApplication = props.variant !== "interested" ? props.schedule ?? null : null;
  const appliedAtLabel = application ? formatDateTime(application.appliedAt) : null;
  const deadlineLabel = formatDateTime(entity.deadline);
  const hasMeta = hasSchedule || appliedAtLabel || deadlineLabel || entity.jobPostingUrl;
  const showAnalysis =
    application !== null && application.outcome === "in_progress" && application.stage !== "document";
  const parsedDescription = entity.description ? parseJobDescription(entity.description) : null;

  function handleOpenChange(open: boolean) {
    if (!open) setEditing(false);
    onOpenChange(open);
  }

  function handleStartEdit() {
    if (!entity) return;
    setCompany(entity.company);
    setPosition(entity.position ?? "");
    if (application) setAppliedAt(application.appliedAt ?? "");
    setDeadline(entity.deadline ?? "");
    setJobPostingUrl(entity.jobPostingUrl ?? "");
    setTechStack(entity.techStack);
    setDescription(entity.description ?? "");
    setMemo(entity.memo ?? "");
    setEditing(true);
  }

  function handleSave() {
    if (!entity) return;
    const base = {
      company: company.trim(),
      deadline: deadline || null,
      jobPostingUrl: jobPostingUrl.trim() || null,
      description: description.trim() || null,
      memo: memo.trim() || null,
      techStack,
    };
    if (props.variant === "interested") {
      props.onUpdate(entity.id, { ...base, position: position.trim() || null });
    } else {
      props.onUpdate(entity.id, {
        ...base,
        position: position.trim(),
        appliedAt: appliedAt || null,
      });
    }
    setEditing(false);
  }

  const hasScheduleTime = Boolean(formatDateTime(scheduleForApplication?.scheduledAt ?? null));
  const scheduleTrigger = application && (
    <button
      type="button"
      onClick={(e) => {
        stopClick(e);
        setScheduleOpen(true);
      }}
      className="flex items-center gap-1 text-left hover:text-foreground"
    >
      {hasScheduleTime ? <Calendar className="size-3" /> : <CalendarPlus className="size-3" />}
      <span className={hasScheduleTime ? "num" : undefined}>
        {getScheduleLabel(application, scheduleForApplication)}
      </span>
    </button>
  );

  return (
    <Dialog open={entity !== null} onOpenChange={handleOpenChange}>
      <DialogContent
        className="flex max-h-[85dvh] w-full max-w-lg flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
        onClick={stopClick}
      >
        <div className="flex shrink-0 items-center gap-2 border-b px-5 py-4 pr-12">
          <CompanyMonogram company={entity.company} size={28} />
          <p className="min-w-0 flex-1 truncate text-base font-medium">{entity.company}</p>
          {!editing && isInterested && (
            <Button
              size="sm"
              onClick={() => props.variant === "interested" && props.onApply?.(entity as InterestedCompany)}
            >
              지원하기
            </Button>
          )}
          {!editing && (
            <Button variant="ghost" size="xs" className="text-xs" onClick={handleStartEdit}>
              수정
            </Button>
          )}
        </div>

        {!editing ? (
          <div className="flex flex-col gap-5 overflow-y-auto px-5 pt-4 pb-6 text-sm">
            <div className="flex flex-col gap-3">
              {entity.position && <p className="text-muted-foreground">{entity.position}</p>}
              {status && (
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
              )}
            </div>

            {hasMeta && (
              <div className="grid grid-cols-[72px_1fr] gap-y-1.5 text-xs">
                {hasSchedule && application && (
                  <>
                    <span className="text-muted-foreground">일정</span>
                    {application.stage === "interview" ? (
                      <InterviewSchedulePopover
                        application={application}
                        schedule={scheduleForApplication}
                        recordedRounds={props.variant !== "interested" ? props.interviewRounds ?? [] : []}
                        open={scheduleOpen}
                        onOpenChange={setScheduleOpen}
                        onSave={props.variant !== "interested" ? props.onSaveInterviewRound : () => {}}
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
                {entity.jobPostingUrl && (
                  <>
                    <span className="text-muted-foreground">링크</span>
                    <a
                      href={entity.jobPostingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline underline-offset-2"
                    >
                      공고 링크 ↗
                    </a>
                  </>
                )}
              </div>
            )}

            {showAnalysis && application && (
              <AnalyzeCompanyPanel key={application.id} application={application} myProjects={myProjects} />
            )}

            {isInterested && (
              <MatchProjectsPanel
                key={entity.id}
                company={entity as InterestedCompany}
                myProjectCount={props.variant === "interested" ? (props.myProjectCount ?? 0) : 0}
              />
            )}

            {entity.techStack.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <p className={SECTION_LABEL}>기술스택</p>
                <div className="flex flex-wrap gap-1.5">
                  {entity.techStack.map((tech) => {
                    const owned = myProjectTechStack.some((ownedTech) => techSatisfies(tech, ownedTech));
                    return (
                      <span
                        key={tech}
                        className={cn(
                          "rounded-full px-2.5 py-1 text-xs",
                          owned ? "bg-[var(--heat-1)]" : "border"
                        )}
                      >
                        {tech}
                      </span>
                    );
                  })}
                </div>
                {entity.techStack.some((tech) =>
                  myProjectTechStack.some((ownedTech) => techSatisfies(tech, ownedTech))
                ) && <p className={SECTION_LABEL}>연두색 = 내 프로젝트에 있는 기술</p>}
              </div>
            )}

            {entity.description && (
              <div>
                {parsedDescription ? (
                  <div className="flex flex-col gap-3">
                    {parsedDescription.sections.map((section, i) => (
                      <div key={i}>
                        {section.title && (
                          <p className="mb-1.5 text-xs font-medium text-foreground">
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
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{entity.description}</p>
                )}
              </div>
            )}

            {entity.memo && (
              <div>
                <p className={cn(SECTION_LABEL, "mb-1.5")}>메모</p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {entity.memo}
                </p>
              </div>
            )}

            {entity.screenshotPaths.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <p className={SECTION_LABEL}>스크린샷</p>
                <ScreenshotGallery paths={entity.screenshotPaths} />
              </div>
            )}
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
              placeholder={isInterested ? "직무 (선택)" : "직무"}
              className={inputClassName}
            />
            {!isInterested && (
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">지원일</label>
                <input
                  type="date"
                  value={appliedAt}
                  onChange={(e) => setAppliedAt(e.target.value)}
                  className={inputClassName}
                />
              </div>
            )}
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
            <TagInput value={techStack} onChange={setTechStack} placeholder="입력 후 Enter" />
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

      {application && (
        <CodingTestScheduleDialog
          application={application.stage === "coding_test" && scheduleOpen ? application : null}
          schedule={scheduleForApplication}
          onSelect={(id, scheduledAt) => {
            if (props.variant !== "interested") props.onSaveCodingTestSchedule(id, scheduledAt);
            setScheduleOpen(false);
          }}
          onOpenChange={setScheduleOpen}
        />
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent onClick={stopClick}>
          <DialogHeader>
            <DialogTitle>{isInterested ? "이 관심기업을 삭제할까요?" : "이 공고를 삭제할까요?"}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {isInterested
              ? "스크린샷과 매칭 기록도 함께 삭제돼요."
              : "스크린샷과 기업분석 기록도 함께 삭제돼요."}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                onDelete?.(entity.id);
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
