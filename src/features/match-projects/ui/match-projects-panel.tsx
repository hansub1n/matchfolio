"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "cn";

import type { Application } from "@/entities/application";
import {
  getProjectMatches,
  isDetailedProjectMatch,
  type ProjectMatchItem,
  type ProjectMatches,
} from "@/entities/project-match";
import { blockInSampleMode } from "@/shared/lib/sample-mode";
import { requestTab } from "@/shared/lib/tab-store";
import { AiDisclaimer, AiSection, AiSectionButton, AiSectionSkeleton } from "@/shared/ui/ai-section";
import { CopyButton } from "@/shared/ui/copy-button";
import { HelpButton } from "@/shared/ui/help-button";

import { matchProjects } from "../api/matchProjects";

const TITLE = "공고 매칭";
const HELP = <HelpButton chapterId="early-ai" label="공고 매칭" />;
const SUB_LABEL = "text-[11px] text-muted-foreground";

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
  const [copied, setCopied] = useState(false);
  const detailed = isDetailedProjectMatch(match) ? match : null;
  const summaryLine = isDetailedProjectMatch(match) ? match.summary : match.reason;

  async function handleCopy() {
    if (!detailed) return;
    try {
      await navigator.clipboard.writeText(detailed.pitch);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.warn("클립보드 복사 실패:", err);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-start gap-2 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate text-sm font-medium">{match.projectName}</h3>
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
          {summaryLine && <p className="truncate text-[11.5px] text-muted-foreground">{summaryLine}</p>}
        </div>
        <ChevronDown
          className={cn(
            "mt-0.5 size-3.5 shrink-0 text-muted-foreground transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <div className="flex flex-col gap-3 py-1 pl-0.5">
          {detailed ? (
            <>
              {detailed.evidence.length > 0 && (
                <div>
                  <p className="mb-1 text-[11px] text-muted-foreground">근거</p>
                  <div className="flex flex-col gap-1.5">
                    {detailed.evidence.map((e, i) => (
                      <div key={i} className="flex flex-col gap-0.5">
                        <p className="text-xs text-muted-foreground">{e.requirement}</p>
                        <p className="text-xs text-foreground">{e.experience}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {detailed.gaps.length > 0 && (
                <div>
                  <p className="mb-1 text-[11px] text-muted-foreground">부족한 부분</p>
                  <ul className="list-inside list-disc text-xs text-muted-foreground">
                    {detailed.gaps.map((gap, i) => (
                      <li key={i}>{gap}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-[11px] text-muted-foreground">어필 문장</p>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="w-9 text-right text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    {copied ? "복사됨" : "복사"}
                  </button>
                </div>
                <p className="rounded-md bg-card p-2.5 text-xs leading-relaxed">{detailed.pitch}</p>
              </div>
            </>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              다시 매칭하면 자세한 근거를 볼 수 있어요
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export interface MatchMaterialsSummary {
  projectCount: number;
  hasResume: boolean;
  coverLetterCount: number;
}

// 내 자료(프로젝트·자소서·이력서)를 이 공고에 맞춰본다 — 자소서 첨삭, 이력서 강조점,
// 어필할 프로젝트. 자료가 하나도 없으면 돌릴 수 없고 "내 자료"로 안내한다.
export function MatchProjectsPanel({
  company,
  materials,
}: {
  company: Application;
  materials: MatchMaterialsSummary;
}) {
  const hasMaterials = materials.projectCount > 0 || materials.hasResume || materials.coverLetterCount > 0;
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
        <p className="mb-3 text-xs text-muted-foreground">{describeMaterials(materials)}를 이 공고에 맞춰봐요</p>
        <AiSectionButton onClick={handleMatch}>매칭하기</AiSectionButton>
      </AiSection>
    );
  }

  const { matches, recommendation, review } = result;
  const topScore = matches.reduce((max, m) => Math.max(max, m.fitScore), 0);

  return (
    <AiSection title={TITLE} help={HELP} headerAction={<LinkButton onClick={handleMatch}>다시 매칭</LinkButton>}>
      <div className="mt-2 flex flex-col gap-3">
        {recommendation && <p className="text-xs text-foreground">{recommendation}</p>}
        {review?.coverLetter && review.coverLetter.edits.length > 0 && (
          <div className="flex flex-col gap-1">
            <p className={SUB_LABEL}>자소서 첨삭 · {review.coverLetter.title}</p>
            {review.coverLetter.edits.map((edit, i) => (
              <div key={i} className="flex flex-col gap-1 border-t py-2.5">
                <p className="text-xs text-muted-foreground">{edit.original}</p>
                <div className="flex items-start justify-between gap-3 rounded-md bg-card p-2.5">
                  <p className="text-xs leading-relaxed">{edit.suggestion}</p>
                  <CopyButton text={edit.suggestion} />
                </div>
                <p className="text-[11px] text-muted-foreground">{edit.reason}</p>
              </div>
            ))}
          </div>
        )}
        {review && review.resumeTips.length > 0 && (
          <div className="flex flex-col gap-1">
            <p className={SUB_LABEL}>이력서에서 강조할 점</p>
            <ul className="list-inside list-disc text-xs leading-relaxed">
              {review.resumeTips.map((tip, i) => (
                <li key={i}>{tip}</li>
              ))}
            </ul>
          </div>
        )}
        {matches.length > 0 && (
          <div className="flex flex-col gap-3">
            <p className={SUB_LABEL}>어필할 프로젝트</p>
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
        )}
        <AiDisclaimer />
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
