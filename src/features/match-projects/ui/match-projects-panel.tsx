"use client";

import { useEffect, useState } from "react";

import type { InterestedCompany } from "@/entities/interested-company";
import { getProjectMatches, type ProjectMatchItem } from "@/entities/project-match";
import { CreateMyProjectDialog } from "@/features/create-my-project";
import { AiSection, AiSectionButton, AiSectionSkeleton } from "@/shared/ui/ai-section";

import { matchProjects } from "../api/matchProjects";

const TITLE = "프로젝트 매칭";

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

export function MatchProjectsPanel({
  company,
  myProjectCount,
}: {
  company: InterestedCompany;
  myProjectCount: number;
}) {
  const [matches, setMatches] = useState<ProjectMatchItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [matching, setMatching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getProjectMatches(company.id)
      .then((result) => {
        if (!cancelled) setMatches(result?.matches ?? null);
      })
      .catch((err) => {
        console.warn("프로젝트 매칭 조회 실패:", err);
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
    setMatching(true);
    setError(null);
    try {
      const result = await matchProjects(company.id);
      setMatches(result.matches);
    } catch (err) {
      console.warn("프로젝트 매칭 실패:", err);
      setError(err instanceof Error ? err.message : "알 수 없는 오류");
    } finally {
      setMatching(false);
    }
  }

  if (error) {
    return (
      <AiSection title={TITLE}>
        <p className="mb-3 text-xs text-destructive">{error}</p>
        <AiSectionButton onClick={handleMatch}>다시 시도</AiSectionButton>
      </AiSection>
    );
  }

  if (loading || matching) {
    return (
      <AiSection title={TITLE}>
        <p className="mb-3 text-xs text-muted-foreground">공고와 프로젝트를 비교하는 중</p>
        <AiSectionSkeleton />
      </AiSection>
    );
  }

  if (!matches) {
    if (myProjectCount === 0) {
      return (
        <AiSection title={TITLE}>
          <p className="mb-3 text-xs text-muted-foreground">
            먼저 내 프로젝트를 등록해야 매칭할 수 있어요
          </p>
          <CreateMyProjectDialog
            trigger={
              <AiSectionButton icon={false} type="button">
                프로젝트 추가
              </AiSectionButton>
            }
          />
        </AiSection>
      );
    }
    return (
      <AiSection title={TITLE}>
        <p className="mb-3 text-xs text-muted-foreground">
          내 프로젝트 {myProjectCount}개를 이 공고와 비교해서 어필할 포인트를 찾아요
        </p>
        <AiSectionButton onClick={handleMatch}>매칭하기</AiSectionButton>
      </AiSection>
    );
  }

  const topScore = matches.reduce((max, m) => Math.max(max, m.fitScore), 0);

  return (
    <AiSection title={TITLE} headerAction={<LinkButton onClick={handleMatch}>다시 매칭</LinkButton>}>
      {matches.length > 0 ? (
        <div className="mt-2 flex flex-col gap-3">
          {matches.map((match) => (
            <div key={match.projectName} className="flex flex-col gap-0.5">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-sm font-medium">{match.projectName}</h3>
                <span className="num shrink-0 text-sm">
                  <span
                    className={
                      match.fitScore === topScore
                        ? "bg-[linear-gradient(transparent_58%,var(--highlight)_58%)] px-0.5"
                        : undefined
                    }
                  >
                    {match.fitScore}
                  </span>
                  <span className="text-muted-foreground">점</span>
                </span>
              </div>
              {match.highlightPoints.length > 0 && (
                <p className="text-[11.5px] text-muted-foreground">{match.highlightPoints[0]}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">관련 있는 프로젝트를 찾지 못했습니다.</p>
      )}
    </AiSection>
  );
}
