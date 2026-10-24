"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import { cn } from "cn";

import {
  isLegacyInterviewPrep,
  type InterviewPrepQuestion,
  type InterviewPrepReverseQuestion,
  type InterviewPrepSection,
  type InterviewPrepSource,
} from "@/entities/interview-prep";
import { CreateMyProjectDialog } from "@/features/create-my-project";
import { buildCompanySearchLinks } from "@/shared/lib/company-search-links";
import { KST_TIME_ZONE } from "@/shared/lib/kst-date";
import { useExpandable } from "@/shared/lib/use-expandable";
import { blockInSampleMode } from "@/shared/lib/sample-mode";
import { AiSectionButton, AiSectionSkeleton } from "@/shared/ui/ai-section";
import { HelpButton } from "@/shared/ui/help-button";
import { ExpandToggle } from "@/shared/ui/expand-toggle";

import {
  generateProjectQuestions,
  type GenerateProjectQuestionsResponse,
} from "../api/generateProjectQuestions";
import { domainToSiteName, extractDomain } from "../model/filter-sources";
import { formatLegacyAnalysis } from "../model/format-legacy-analysis";
import { formatFact, normalizeFacts } from "../model/normalize-facts";
import {
  hasNewerProjectSinceGeneration,
  hasNewerSubmissionSinceGeneration,
} from "../model/project-questions-staleness";
import { countQuestionGroups, type QuestionGroupTab } from "../model/question-groups";
import type { InterviewPrepState } from "../model/use-interview-prep";

const QUESTION_PAGE_SIZE = 3;
const SOURCE_PAGE_SIZE = 4;
const LEGACY_SECTION_PAGE_SIZE = 2;
const EXAMPLE_PROJECT_QUESTIONS = [
  "OO 프로젝트에서 △△를 어떻게 해결했나요?",
  "공고의 □□ 경험이 없다면 어떻게 답할까요?",
];

type MyProjectRef = { id: string; name: string; createdAt: string };
type ProjectLayerUpdate = GenerateProjectQuestionsResponse;

function LinkButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-[11px] text-muted-foreground hover:text-foreground"
    >
      {children}
    </button>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="text-[11px] text-muted-foreground">{children}</p>;
}

function BulletSection({ title, points }: { title: string; points: string[] }) {
  if (points.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      <SectionLabel>{title}</SectionLabel>
      <ul className="list-inside list-disc text-[13px] leading-relaxed">
        {points.map((point, i) => (
          <li key={i}>{point}</li>
        ))}
      </ul>
    </div>
  );
}

function ReverseQuestionRows({ items }: { items: InterviewPrepReverseQuestion[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      <SectionLabel>역질문 추천</SectionLabel>
      <div className="flex flex-col">
        {items.map((item, i) => (
          <div key={i} className="border-t py-2.5">
            <p className="text-[13px] leading-normal">{item.question}</p>
            <p className="mt-0.5 text-[11.5px] text-muted-foreground">{item.why}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function LegacySections({ sections }: { sections: InterviewPrepSection[] }) {
  const { visible, canExpand, expanded, hiddenCount, toggle } = useExpandable(
    sections,
    LEGACY_SECTION_PAGE_SIZE
  );
  return (
    <>
      {visible.map((section, i) => (
        <BulletSection key={i} title={section.title} points={section.points} />
      ))}
      {canExpand && (
        <ExpandToggle
          expanded={expanded}
          hiddenCount={hiddenCount}
          onToggle={toggle}
          collapsedLabel="회사 정보 더 보기"
        />
      )}
    </>
  );
}

function SourceLinks({ title, sources }: { title: string; sources: InterviewPrepSource[] }) {
  const { visible, canExpand, expanded, hiddenCount, toggle } = useExpandable(sources, SOURCE_PAGE_SIZE);
  if (sources.length === 0) return null;

  return (
    <div className="flex flex-col">
      <p className="mb-1.5 text-[11px] text-muted-foreground">{title}</p>
      <div className="flex flex-col gap-1">
        {visible.map((s) => (
          <a
            key={s.url}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block truncate text-xs hover:underline"
          >
            <span className="text-muted-foreground">
              {domainToSiteName(extractDomain(s.url) ?? s.url)}
            </span>{" "}
            · {s.title}
          </a>
        ))}
      </div>
      {canExpand && (
        <span className="mt-1">
          <ExpandToggle expanded={expanded} hiddenCount={hiddenCount} onToggle={toggle} />
        </span>
      )}
    </div>
  );
}

function MoreLinksRow({ company }: { company: string }) {
  const links = buildCompanySearchLinks(company);
  return (
    <div>
      <p className="mb-1.5 text-[11px] text-muted-foreground">더 찾아보기</p>
      <div className="flex flex-wrap gap-1.5">
        {links.map((link) => (
          <a
            key={link.url}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs hover:bg-accent"
          >
            {link.label}
            <ExternalLink className="size-3" />
          </a>
        ))}
      </div>
    </div>
  );
}

// 최근 기사는 "최근 소식" 바로 아래에서 보여주므로(showNews=false), 고정 구조가 없는 구버전
// 결과일 때만 여기서 같이 보여준다.
function Footer({
  sources,
  company,
  showNews,
}: {
  sources: InterviewPrepSource[];
  company: string;
  showNews: boolean;
}) {
  const webSources = sources.filter((s) => s.kind !== "news");
  const newsSources = sources.filter((s) => s.kind === "news");
  return (
    <div className="mt-4 flex flex-col gap-3 border-t pt-3">
      <SourceLinks title="참고한 자료" sources={webSources} />
      {showNews && <SourceLinks title="최근 기사" sources={newsSources} />}
      <MoreLinksRow company={company} />
    </div>
  );
}

function QuestionRow({
  question,
  group,
  projectNameById,
  isOpen,
  onToggle,
}: {
  question: InterviewPrepQuestion;
  group: "basic" | "project";
  projectNameById: Map<string, string>;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const relatedProjectName = question.relatedProjectId
    ? (projectNameById.get(question.relatedProjectId) ?? null)
    : null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle();
        }
      }}
      className="grid cursor-pointer grid-cols-[1fr_16px] items-start gap-2 border-t py-3"
    >
      <div className="min-w-0">
        <p className="text-[13.5px] font-medium leading-normal">{question.question}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
          {group === "project" && question.noExperience && <span className="text-urgent">대비 필요</span>}
          {group === "project" && !question.noExperience && relatedProjectName && (
            <span className="rounded bg-[var(--heat-1)] px-1.5 py-0.5 text-highlight-foreground">
              {relatedProjectName}
            </span>
          )}
          <span>{question.category}</span>
        </div>
      </div>
      <ChevronDown
        className={cn(
          "mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform",
          isOpen && "rotate-180"
        )}
      />
      {isOpen && (
        <div className="col-span-2 mt-2 flex flex-col gap-2">
          <div>
            <p className="text-[11px] text-muted-foreground">왜 묻나요</p>
            <p className="text-[12.5px] text-muted-foreground">{question.intent}</p>
          </div>
          {question.hint && (
            <div className="rounded-lg bg-muted px-3 py-2.5">
              <p className="mb-0.5 text-[11px] text-muted-foreground">답변 힌트</p>
              <p className="text-[12.5px] text-foreground">{question.hint}</p>
              {group === "basic" && relatedProjectName && (
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  연결할 수 있는 내 프로젝트: {relatedProjectName}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function QuestionGroupBlock({
  title,
  group,
  questions,
  projectNameById,
  headerExtra,
}: {
  title?: string;
  group: "basic" | "project";
  questions: InterviewPrepQuestion[];
  projectNameById: Map<string, string>;
  headerExtra?: ReactNode;
}) {
  const { visible, canExpand, expanded, hiddenCount, toggle } = useExpandable(
    questions,
    QUESTION_PAGE_SIZE
  );
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-1">
      {(title || headerExtra) && (
        <div className="flex items-center justify-between gap-2">
          <SectionLabel>{title}</SectionLabel>
          {headerExtra}
        </div>
      )}
      <div className="flex flex-col">
        {visible.map((q, i) => (
          <QuestionRow
            key={`${q.question}-${i}`}
            question={q}
            group={group}
            projectNameById={projectNameById}
            isOpen={openIndex === i}
            onToggle={() => setOpenIndex((prev) => (prev === i ? null : i))}
          />
        ))}
      </div>
      {canExpand && <ExpandToggle expanded={expanded} hiddenCount={hiddenCount} onToggle={toggle} />}
    </div>
  );
}

function EmptyProjectQuestionsGroup() {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] text-muted-foreground">
        내 자료에 프로젝트를 등록하면 내 경험 기준 질문 3개와 약점 대비 질문 2개가 추가돼요{" "}
        <CreateMyProjectDialog
          trigger={
            <button type="button" className="underline underline-offset-2 hover:text-foreground">
              프로젝트 추가
            </button>
          }
        />
      </p>
      <div className="pointer-events-none flex flex-col opacity-50">
        {EXAMPLE_PROJECT_QUESTIONS.map((q) => (
          <div key={q} className="border-t py-3">
            <p className="text-[13.5px] font-medium leading-normal">{q}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuestionsArea({
  applicationId,
  basicQuestions,
  projectQuestions,
  projectQuestionsUpdatedAt,
  submissionUpdatedAt,
  myProjects,
  onProjectLayerUpdated,
  onRegenerateAll,
}: {
  applicationId: string;
  basicQuestions: InterviewPrepQuestion[];
  projectQuestions: InterviewPrepQuestion[] | null;
  projectQuestionsUpdatedAt: string | null;
  submissionUpdatedAt: string | null;
  myProjects: MyProjectRef[];
  onProjectLayerUpdated: (result: ProjectLayerUpdate) => void;
  // 기본 질문·역질문·프로젝트 기반 질문을 전부 다시 만든다.
  onRegenerateAll: () => void;
}) {
  const [tab, setTab] = useState<QuestionGroupTab>("all");
  const [regenerating, setRegenerating] = useState(false);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);

  const counts = countQuestionGroups(basicQuestions, projectQuestions ?? []);
  const projectNameById = new Map(myProjects.map((p) => [p.id, p.name]));
  const hasProjects = myProjects.length > 0;
  const submissionChanged =
    hasProjects && hasNewerSubmissionSinceGeneration(submissionUpdatedAt, projectQuestionsUpdatedAt);
  const isOutdated = hasProjects && hasNewerProjectSinceGeneration(myProjects, projectQuestionsUpdatedAt);

  async function handleRegenerate() {
    if (blockInSampleMode()) return;
    setRegenerating(true);
    setRegenerateError(null);
    try {
      const result = await generateProjectQuestions(applicationId);
      onProjectLayerUpdated(result);
    } catch (err) {
      console.warn("프로젝트 기반 질문 재생성 실패:", err);
      setRegenerateError(err instanceof Error ? err.message : "알 수 없는 오류");
    } finally {
      setRegenerating(false);
    }
  }

  const tabs: { key: QuestionGroupTab; label: string }[] = [
    { key: "all", label: "전체" },
    { key: "basic", label: `기본 ${counts.basic}` },
    { key: "project", label: `내 프로젝트 ${counts.project}` },
  ];
  const showBasic = tab !== "project";
  const showProject = tab !== "basic";

  const projectHeaderExtra = regenerating ? (
    <span className="text-[11px] text-muted-foreground">다시 만드는 중</span>
  ) : !projectQuestions ? (
    <LinkButton onClick={handleRegenerate}>만들기</LinkButton>
  ) : submissionChanged ? (
    <LinkButton onClick={handleRegenerate}>제출 자료 반영 안 됨 · 다시 만들기</LinkButton>
  ) : isOutdated ? (
    <LinkButton onClick={handleRegenerate}>새 프로젝트 반영 안 됨 · 다시 만들기</LinkButton>
  ) : undefined;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <p className="text-[13px] font-medium">예상 질문 {counts.all}</p>
          <HelpButton chapterId="interview" label="예상 질문" />
          <LinkButton onClick={onRegenerateAll}>다시 만들기</LinkButton>
        </div>
        <div className="flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[11.5px]",
                tab === t.key
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {showBasic && (
        <QuestionGroupBlock
          title={tab === "all" ? `기본 질문 ${basicQuestions.length}` : undefined}
          group="basic"
          questions={basicQuestions}
          projectNameById={projectNameById}
        />
      )}

      {showProject &&
        (hasProjects ? (
          <QuestionGroupBlock
            title={tab === "all" ? `내 프로젝트 기반 질문 ${(projectQuestions ?? []).length}` : undefined}
            group="project"
            questions={projectQuestions ?? []}
            projectNameById={projectNameById}
            headerExtra={projectHeaderExtra}
          />
        ) : (
          <EmptyProjectQuestionsGroup />
        ))}

      {regenerateError && <p className="text-xs text-destructive">{regenerateError}</p>}
    </div>
  );
}

// 만들기 전/중/실패 상태. 회사 분석과 예상 질문은 버튼과 AI 호출이 따로다.
function AnalysisStatus({
  state,
  idleText,
  actionLabel,
  busyText,
  onAnalyze,
}: {
  state: Exclude<InterviewPrepState, { status: "ready" }>;
  idleText: string;
  actionLabel: string;
  busyText: string;
  onAnalyze: () => void;
}) {
  return (
    <div className="rounded-lg bg-muted px-4 py-3.5">
      {state.status === "error" ? (
        <>
          <p className="mb-3 text-xs text-destructive">{state.error}</p>
          <AiSectionButton onClick={onAnalyze}>다시 시도</AiSectionButton>
        </>
      ) : state.status === "empty" ? (
        <>
          <p className="mb-3 text-xs text-muted-foreground">{idleText}</p>
          <AiSectionButton onClick={onAnalyze}>{actionLabel}</AiSectionButton>
        </>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {state.status === "analyzing" ? busyText : "불러오는 중"}
          </p>
          <AiSectionSkeleton />
        </>
      )}
    </div>
  );
}

function LegacyAnalysisText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="flex flex-col gap-1">
      <p className={cn("whitespace-pre-wrap text-sm leading-relaxed", !expanded && "line-clamp-4")}>{text}</p>
      <ExpandToggle
        expanded={expanded}
        hiddenCount={0}
        onToggle={() => setExpanded((v) => !v)}
        collapsedLabel="전체 보기"
      />
    </div>
  );
}

export function CompanyAnalysisSection({
  state,
  company,
  onAnalyze,
}: {
  state: InterviewPrepState;
  company: string;
  onAnalyze: () => void;
}) {
  if (state.status !== "ready") {
    return (
      <AnalysisStatus
        state={state}
        idleText="회사가 하는 일과 최근 소식을 찾아 출처와 함께 정리해요"
        actionLabel="분석하기"
        busyText="회사 정보를 찾는 중"
        onAnalyze={onAnalyze}
      />
    );
  }

  const { prep } = state;
  const facts = normalizeFacts(prep.facts);
  const analyzedDate = formatInTimeZone(prep.updatedAt, KST_TIME_ZONE, "M.d");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] text-muted-foreground">
          {prep.confidence === "low" ? "공개된 정보가 적어서 일부 내용이 부정확할 수 있어요" : ""}
        </p>
        <span className="shrink-0 text-[11px] whitespace-nowrap text-muted-foreground">
          {analyzedDate} 분석 ·{" "}
          <button type="button" onClick={onAnalyze} className="hover:text-foreground">
            다시 분석
          </button>
        </span>
      </div>

      {isLegacyInterviewPrep(prep) ? (
        <LegacyAnalysisText text={formatLegacyAnalysis(prep.companyAnalysis ?? "")} />
      ) : (
        <>
          <div>
            <p className="text-[15px] leading-normal font-medium">{prep.summary}</p>
            {facts.length > 0 && (
              <p className="mt-1 flex flex-wrap gap-x-1 text-[12.5px] text-muted-foreground">
                {facts.map((fact, i) => (
                  <span key={i}>
                    <span title={fact.source}>{formatFact(fact)}</span>
                    {i < facts.length - 1 && " · "}
                  </span>
                ))}
              </p>
            )}
          </div>
          {prep.briefing ? (
            <>
              <BulletSection title="무슨 사업을 하나요" points={prep.briefing.business} />
              <BulletSection title="최근 소식" points={prep.briefing.recent} />
              <SourceLinks title="최근 기사" sources={prep.sources.filter((s) => s.kind === "news")} />
            </>
          ) : (
            <LegacySections sections={prep.sections ?? []} />
          )}
        </>
      )}

      <Footer sources={prep.sources} company={company} showNews={!prep.briefing} />
    </div>
  );
}

export function InterviewPrepSection({
  state,
  submissionUpdatedAt,
  myProjects,
  onGenerate,
  onProjectLayerUpdated,
}: {
  state: InterviewPrepState;
  submissionUpdatedAt: string | null;
  myProjects: MyProjectRef[];
  onGenerate: () => void;
  onProjectLayerUpdated: (result: ProjectLayerUpdate) => void;
}) {
  if (state.status !== "ready") {
    return (
      <AnalysisStatus
        state={state}
        idleText="공고와 회사 분석 결과로 예상 질문과 역질문을 만들어요. 제출 자료를 골라두면 내 프로젝트 기반 질문에 반영돼요"
        actionLabel="예상 질문 만들기"
        busyText="예상 질문을 만드는 중"
        onAnalyze={onGenerate}
      />
    );
  }

  const { prep } = state;

  if (prep.questions === null) {
    return (
      <div className="flex flex-col gap-2">
        <ul className="list-inside list-disc text-sm leading-relaxed">
          {(prep.interviewQuestions ?? []).map((q, i) => (
            <li key={i}>{q}</li>
          ))}
        </ul>
        <p className="text-[11px] text-muted-foreground">
          예전 형식으로 만든 질문이에요.{" "}
          <LinkButton onClick={onGenerate}>다시 만들면</LinkButton> 질문별 의도와 답변 힌트가 붙어요
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <QuestionsArea
        applicationId={prep.applicationId}
        basicQuestions={prep.questions ?? []}
        projectQuestions={prep.projectQuestions}
        projectQuestionsUpdatedAt={prep.projectQuestionsUpdatedAt}
        submissionUpdatedAt={submissionUpdatedAt}
        myProjects={myProjects}
        onProjectLayerUpdated={onProjectLayerUpdated}
        onRegenerateAll={onGenerate}
      />
      {prep.reverseQuestions && prep.reverseQuestions.length > 0 && (
        <ReverseQuestionRows items={prep.reverseQuestions} />
      )}
    </div>
  );
}
