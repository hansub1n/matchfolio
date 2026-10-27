"use client";

import { useState } from "react";
import { Calendar, CalendarPlus } from "lucide-react";
import { cn } from "cn";

import {
  APPLICATION_STAGES,
  formatWaitingDays,
  type Application,
  type UpdateApplicationInput,
} from "@/entities/application";
import type { UserDocument } from "@/entities/document";
import type { Schedule } from "@/entities/schedule";
import {
  CompanyAnalysisSection,
  InterviewPrepSection,
  useInterviewPrep,
} from "@/features/analyze-company";
import { MatchProjectsPanel } from "@/features/match-projects";
import { SubmissionRow } from "@/features/record-submission";
import { formatDateTime } from "@/shared/lib/format-date-time";
import { todayKST } from "@/shared/lib/kst-date";
import { techSatisfies } from "@/shared/lib/tech-aliases";
import { blockInSampleMode } from "@/shared/lib/sample-mode";
import { requestTab } from "@/shared/lib/tab-store";
import { Button } from "@/shared/ui/button";
import { CompanyMonogram } from "@/shared/ui/company-monogram";
import { ConfirmDeleteDialog, ModalEditActions } from "@/shared/ui/confirm-delete-dialog";
import { Dialog, DialogContent } from "@/shared/ui/dialog";
import { AiBadge } from "@/shared/ui/ai-section";
import { HelpButton } from "@/shared/ui/help-button";
import { ScreenshotGallery } from "@/shared/ui/screenshot-gallery";
import { TagInput } from "@/shared/ui/tag-input";

import { defaultOpenGroups, type DetailGroupId } from "../model/detail-groups";
import { parseJobDescription } from "../model/parse-job-description";
import { CodingTestScheduleDialog } from "./coding-test-schedule-dialog";
import { DetailGroup } from "./detail-group";
import { InterviewScheduleDialog } from "./interview-schedule-dialog";

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
  const waiting =
    application.stage === "document" ? formatWaitingDays(application.appliedAt, todayKST()) : null;
  return {
    text: `${STAGE_LABELS[application.stage]} 진행 중${waiting ? ` · ${waiting}` : ""}`,
    variant: "normal",
  };
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
  // 내 자료의 이력서·자소서 — 공고 매칭과 제출 자료에서 쓴다.
  documents?: UserDocument[];
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
  // stage가 'interested'인 지원카드. 지원 전이라 "지원하기"가 붙는다.
  company: Application | null;
  onUpdate: (id: string, input: UpdateApplicationInput) => void;
  onApply?: (company: Application) => void;
};

type Props = ApplicationVariantProps | InterestedVariantProps;

export function ApplicationDetailDialog(props: Props) {
  const { myProjectTechStack = [], myProjects = [], documents = [], initialMode = "view", onOpenChange, onDelete } = props;
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
  const [openGroups, setOpenGroups] = useState<Set<DetailGroupId>>(
    () => new Set(entity ? defaultOpenGroups(entity) : [])
  );
  const { companyState, questionsState, analyzeCompany, generateQuestions, updateProjectLayer } = useInterviewPrep(
    entity?.id ?? null
  );

  function toggleGroup(id: DetailGroupId) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

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
  const hasMeta = hasSchedule || application !== null || deadlineLabel || entity.jobPostingUrl;
  const parsedDescription = entity.description ? parseJobDescription(entity.description) : null;

  function handleOpenChange(open: boolean) {
    if (!open) setEditing(false);
    onOpenChange(open);
  }

  function handleStartEdit() {
    if (blockInSampleMode()) return;
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
        position: position.trim() || null,
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
        className="flex max-h-[85dvh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
        onClick={stopClick}
      >
        <div className="flex shrink-0 items-center gap-2 border-b px-5 py-4 pr-12">
          <CompanyMonogram company={entity.company} size={28} />
          <p className="min-w-0 flex-1 truncate text-base font-medium">{entity.company}</p>
          {!editing && isInterested && (
            <Button
              size="sm"
              onClick={() => props.variant === "interested" && props.onApply?.(entity)}
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
                      <InterviewScheduleDialog
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
                {application && (
                  <SubmissionRow
                    key={application.id}
                    application={application}
                    myProjects={myProjects}
                    coverLetters={documents.filter((d) => d.kind === "cover_letter")}
                  />
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

            {entity.memo && (
              <div>
                <p className={cn(SECTION_LABEL, "mb-1.5")}>메모</p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {entity.memo}
                </p>
              </div>
            )}

            {(entity.description || entity.screenshotPaths.length > 0) && (
              <DetailGroup
                title="공고 내용"
                open={openGroups.has("posting")}
                onToggle={() => toggleGroup("posting")}
              >
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
                {entity.screenshotPaths.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <p className={SECTION_LABEL}>스크린샷</p>
                    <ScreenshotGallery paths={entity.screenshotPaths} />
                  </div>
                )}
              </DetailGroup>
            )}

            <DetailGroup
              title="회사 분석"
              open={openGroups.has("company")}
              onToggle={() => toggleGroup("company")}
              help={
                <>
                  <AiBadge />
                  <HelpButton chapterId="early-ai" label="회사 분석" />
                </>
              }
            >
              <CompanyAnalysisSection state={companyState} company={entity.company} onAnalyze={analyzeCompany} />
            </DetailGroup>

            <DetailGroup
              title="지원 준비"
              open={openGroups.has("application")}
              onToggle={() => toggleGroup("application")}
            >
              {/* "내 자료 →"는 안내 문구와 떨어뜨려 오른쪽 끝에. 자료가 하나도 없을 땐 아래 공고 매칭의
                  "내 자료 등록하기" 버튼이 같은 일을 해서 숨긴다. */}
              <div className="flex items-baseline justify-between gap-3 text-[11.5px]">
                <p className="text-muted-foreground">내 프로젝트·자소서·이력서를 이 공고에 맞춰봐요</p>
                {(myProjects.length > 0 || documents.length > 0) && (
                  <button
                    type="button"
                    onClick={() => requestTab("materials")}
                    className="shrink-0 text-foreground hover:underline"
                  >
                    내 자료 →
                  </button>
                )}
              </div>
              <MatchProjectsPanel
                key={entity.id}
                company={entity}
                materials={{
                  projectCount: myProjects.length,
                  projectTechStack: myProjectTechStack,
                  hasResume: documents.some((d) => d.kind === "resume"),
                  coverLetterCount: documents.filter((d) => d.kind === "cover_letter").length,
                }}
              />
            </DetailGroup>

            <DetailGroup
              title="면접 준비"
              help={
                <>
                  <AiBadge />
                  <HelpButton chapterId="interview" label="예상 질문" />
                </>
              }
              open={openGroups.has("interview")}
              onToggle={() => toggleGroup("interview")}
            >
              <InterviewPrepSection
                state={questionsState}
                submissionUpdatedAt={entity.submissionUpdatedAt}
                myProjects={myProjects}
                onGenerate={generateQuestions}
                onProjectLayerUpdated={updateProjectLayer}
              />
            </DetailGroup>

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
            <ModalEditActions
              onDelete={() => setConfirmOpen(true)}
              onCancel={() => setEditing(false)}
              onSave={handleSave}
            />
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

      <ConfirmDeleteDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        subject={isInterested ? "관심 공고" : "공고"}
        description="스크린샷과 회사 분석·공고 매칭 결과, 일정도 함께 지워져요."
        onConfirm={() => {
          onDelete?.(entity.id);
          onOpenChange(false);
        }}
      />
    </Dialog>
  );
}
