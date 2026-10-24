"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "cn";

import type { Application } from "@/entities/application";
import {
  getProjectMatches,
  isDetailedProjectMatch,
  type ProjectMatchItem,
  type ProjectMatches,
} from "@/entities/project-match";
import { blockInSampleMode } from "@/shared/lib/sample-mode";
import { splitNameSubtitle } from "@/shared/lib/split-name-subtitle";
import { requestTab } from "@/shared/lib/tab-store";
import { AiSection, AiSectionButton, AiSectionSkeleton } from "@/shared/ui/ai-section";
import { CopyButton } from "@/shared/ui/copy-button";
import { HelpButton } from "@/shared/ui/help-button";

import { matchProjects } from "../api/matchProjects";
import { computeFitVerdict, FIT_LABEL, type FitVerdict } from "../model/fit-verdict";

const TITLE = "공고 매칭";
const HELP = <HelpButton chapterId="early-ai" label="공고 매칭" />;

function LinkButton({ onClick, children }: { onClick: () => void; children: string }) {
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

// 결과의 각 묶음 — 제목(굵게) + 선택적 한 줄 설명. 묶음 사이는 구분선으로 나눈다.
function Block({ title, hint, children }: { title?: string; hint?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2 py-3.5 first:pt-0 last:pb-0">
      {title && (
        <div className="flex items-baseline gap-2">
          <h3 className="text-xs font-medium">{title}</h3>
          {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
        </div>
      )}
      {children}
    </section>
  );
}

// 자소서에 그대로 붙여 쓸 문장 — 어디서 나오든 같은 모양(흰 상자 + 복사).
function CopyableSentence({ text }: { text: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-md bg-card p-2.5">
      <p className="text-xs leading-relaxed">{text}</p>
      <CopyButton text={text} />
    </div>
  );
}

// 적합도 — AI가 아니라 공고 기술스택과 내 프로젝트 기술스택의 겹침. 있는 기술/없는 기술은 여기서만 보여준다
// (프로젝트마다 반복하지 않는다).
function FitSummary({ verdict }: { verdict: FitVerdict }) {
  const total = verdict.covered.length + verdict.missing.length;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm">
        <span className="font-medium">{FIT_LABEL[verdict.level]}</span>
        {verdict.level !== "unknown" && (
          <span className="text-xs text-muted-foreground">
            {" "}
            · 공고 기술 {total}개 중 {verdict.covered.length}개
          </span>
        )}
      </p>
      {verdict.level !== "unknown" && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
          <dt className="text-muted-foreground">있음</dt>
          <dd>{verdict.covered.join(" · ") || "—"}</dd>
          <dt className="text-muted-foreground">없음</dt>
          <dd>{verdict.missing.join(" · ") || "—"}</dd>
        </dl>
      )}
    </div>
  );
}

function MatchRow({
  match,
  isTop,
  isOpen,
  onToggle,
}: {
  match: ProjectMatchItem;
  isTop: boolean;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const detailed = isDetailedProjectMatch(match) ? match : null;
  const { main, subtitle } = splitNameSubtitle(match.projectName);
  // 접혀 있을 땐 이 프로젝트로 채워지는 요구를 한 줄로 — AI 요약은 위 적합도와 같은 말이라 쓰지 않는다.
  const preview = isDetailedProjectMatch(match)
    ? match.evidence.map((e) => e.requirement).join(" · ") || "이 공고 요구와 겹치는 경험이 없어요"
    : match.reason;

  return (
    <div className="flex flex-col gap-2">
      <button type="button" onClick={onToggle} className="flex items-start gap-2 text-left">
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-medium">
              {main}
              {subtitle && <span className="ml-1 font-normal text-muted-foreground">{subtitle}</span>}
            </p>
            <span className="num shrink-0 text-sm">
              <span
                className={
                  isTop ? "bg-[linear-gradient(transparent_58%,var(--highlight)_58%)] px-0.5" : undefined
                }
              >
                {match.fitScore}
              </span>
              <span className="text-muted-foreground">점</span>
            </span>
          </div>
          <p className="truncate text-[11.5px] text-muted-foreground">{preview}</p>
        </div>
        <ChevronDown
          className={cn(
            "mt-0.5 size-3.5 shrink-0 text-muted-foreground transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen &&
        (detailed ? (
          <div className="flex flex-col gap-2.5 pl-0.5">
            {detailed.evidence.length > 0 && (
              <ul className="flex flex-col gap-1.5">
                {detailed.evidence.map((e, i) => (
                  <li key={i} className="flex gap-2 text-xs">
                    <Check className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                    <p>
                      <span className="font-medium">{e.requirement}</span>
                      <span className="text-muted-foreground"> — {e.experience}</span>
                    </p>
                  </li>
                ))}
              </ul>
            )}
            {detailed.pitch && <CopyableSentence text={detailed.pitch} />}
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground">다시 매칭하면 자세한 근거를 볼 수 있어요</p>
        ))}
    </div>
  );
}

export interface MatchMaterialsSummary {
  projectCount: number;
  // 내 프로젝트 기술스택 전체 — 적합도 계산용.
  projectTechStack: string[];
  hasResume: boolean;
  coverLetterCount: number;
}

// 내 자료(프로젝트·자소서·이력서)를 이 공고에 맞춰본다 — 적합도, 부족한 점을 말하는 문장, 지원 동기,
// 자소서 첨삭, 이력서 강조점, 어필할 프로젝트. 자료가 하나도 없으면 돌릴 수 없고 "내 자료"로 안내한다.
export function MatchProjectsPanel({
  company,
  materials,
}: {
  company: Application;
  materials: MatchMaterialsSummary;
}) {
  const hasMaterials = materials.projectCount > 0 || materials.hasResume || materials.coverLetterCount > 0;
  const verdict = computeFitVerdict(company.techStack, materials.projectTechStack);
  const [result, setResult] = useState<ProjectMatches | null>(null);
  const [loading, setLoading] = useState(true);
  const [matching, setMatching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 프로젝트끼리 비교하면서 보려고 여러 개를 동시에 펼칠 수 있게 한다.
  const [openIndices, setOpenIndices] = useState<Set<number>>(new Set());

  function toggleOpen(index: number) {
    setOpenIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  useEffect(() => {
    let cancelled = false;
    getProjectMatches(company.id)
      .then((r) => {
        if (!cancelled) setResult(r);
      })
      .catch((err) => {
        console.warn("공고 매칭 조회 실패:", err);
        if (!cancelled) setError("매칭 결과를 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [company.id]);

  async function handleMatch() {
    if (blockInSampleMode()) return;
    setMatching(true);
    setError(null);
    setOpenIndices(new Set());
    try {
      const r = await matchProjects(company.id);
      setResult(r);
    } catch (err) {
      console.warn("공고 매칭 실패:", err);
      setError(err instanceof Error ? err.message : "알 수 없는 오류");
    } finally {
      setMatching(false);
    }
  }

  if (error) {
    return (
      <AiSection title={TITLE} help={HELP}>
        <p className="mb-3 text-xs text-destructive">{error}</p>
        <AiSectionButton onClick={handleMatch}>다시 시도</AiSectionButton>
      </AiSection>
    );
  }

  if (loading || matching) {
    return (
      <AiSection title={TITLE} help={HELP}>
        <p className="mb-3 text-xs text-muted-foreground">내 자료를 공고와 맞춰보는 중</p>
        <AiSectionSkeleton />
      </AiSection>
    );
  }

  if (!result) {
    if (!hasMaterials) {
      return (
        <AiSection title={TITLE} help={HELP}>
          <p className="mb-3 text-xs text-muted-foreground">
            내 자료에 프로젝트·자소서·이력서를 등록하면 이 공고에 맞춰 볼 수 있어요
          </p>
          <AiSectionButton icon={false} onClick={() => requestTab("materials")}>
            내 자료로 가기
          </AiSectionButton>
        </AiSection>
      );
    }
    return (
      <AiSection title={TITLE} help={HELP}>
        <div className="mt-3 mb-3 flex flex-col gap-3">
          <FitSummary verdict={verdict} />
          <p className="text-xs text-muted-foreground">{describeMaterials(materials)}를 이 공고에 맞춰봐요</p>
        </div>
        <AiSectionButton onClick={handleMatch}>매칭하기</AiSectionButton>
      </AiSection>
    );
  }

  const { matches, review } = result;
  const topScore = matches.reduce((max, m) => Math.max(max, m.fitScore), 0);
  const coverLetter = review?.coverLetter ?? null;
  // 구버전 캐시는 적합도와 상관없이 부족한 점만 만들었다 — 거의 안 맞는 공고일 때만 보여준다.
  const opener =
    review?.opener ??
    (review?.gapStatement && verdict.level === "low" ? { kind: "gap" as const, text: review.gapStatement } : null);

  return (
    <AiSection title={TITLE} help={HELP} headerAction={<LinkButton onClick={handleMatch}>다시 매칭</LinkButton>}>
      <div className="mt-3 flex flex-col divide-y">
        <Block>
          <FitSummary verdict={verdict} />
        </Block>

        {opener && (
          <Block
            title={opener.kind === "gap" ? "부족한 점을 말할 때" : "이 공고에 내세울 점"}
            hint={opener.kind === "gap" ? "없는 경험을 묻는 질문·자소서에" : "자소서 첫 문단·자기소개에"}
          >
            <CopyableSentence text={opener.text} />
          </Block>
        )}

        {matches.length > 0 && (
          <Block title="어필할 프로젝트">
            <div className="flex flex-col gap-3">
              {matches.map((match, i) => (
                <MatchRow
                  key={match.projectName + i}
                  match={match}
                  isTop={match.fitScore === topScore}
                  isOpen={openIndices.has(i)}
                  onToggle={() => toggleOpen(i)}
                />
              ))}
            </div>
          </Block>
        )}

        {review?.motivation && review.motivation.length > 0 && (
          <Block title="지원 동기" hint="자소서 지원 동기에 이어 붙여 쓸 수 있어요">
            {review.motivation.map((item, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <p className="text-xs text-muted-foreground">{item.point}</p>
                <CopyableSentence text={item.example} />
              </div>
            ))}
          </Block>
        )}

        {coverLetter && (coverLetter.edits.length > 0 || coverLetter.editsSkipped) && (
          <Block title="자소서 첨삭" hint={coverLetter.title}>
            {coverLetter.editsSkipped === "low_fit" ? (
              <p className="text-[11.5px] text-muted-foreground">
                공고와 겹치는 기술이 적어서 첨삭은 만들지 않았어요
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                {coverLetter.edits.map((edit, i) => (
                  // 원문과 고친 문장을 같은 들여쓰기로 위아래에 — 어디가 바뀌었는지 눈으로 비교하기 쉽게.
                  <dl key={i} className="grid grid-cols-[2rem_1fr] gap-x-2 gap-y-1.5 text-xs leading-relaxed">
                    <dt className="pt-px text-[11px] text-muted-foreground">원문</dt>
                    <dd className="text-muted-foreground">{edit.original}</dd>
                    <dt className="pt-2.5 text-[11px] text-muted-foreground">수정</dt>
                    <dd className="flex flex-col gap-1">
                      <CopyableSentence text={edit.suggestion} />
                      <span className="text-[11px] text-muted-foreground">{edit.reason}</span>
                    </dd>
                  </dl>
                ))}
              </div>
            )}
          </Block>
        )}

        {review && review.resumeTips.length > 0 && (
          <Block title="이력서에서 강조할 점">
            <ul className="list-inside list-disc text-xs leading-relaxed">
              {review.resumeTips.map((tip, i) => (
                <li key={i}>{tip}</li>
              ))}
            </ul>
          </Block>
        )}
      </div>
    </AiSection>
  );
}

function describeMaterials({ projectCount, hasResume, coverLetterCount }: MatchMaterialsSummary): string {
  const parts: string[] = [];
  if (hasResume) parts.push("이력서");
  if (coverLetterCount > 0) parts.push("자소서");
  if (projectCount > 0) parts.push(`프로젝트 ${projectCount}개`);
  return parts.join("·");
}
