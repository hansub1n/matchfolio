"use client";

import { useEffect, useState } from "react";

import type { InterestedCompany } from "@/entities/interested-company";
import { getProjectMatches, type ProjectMatchItem } from "@/entities/project-match";
import { Button } from "@/shared/ui/button";

import { matchProjects } from "../api/matchProjects";

export function MatchProjectsPanel({ company }: { company: InterestedCompany }) {
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

  return (
    <div className="flex min-w-0 flex-col gap-3 border-t pt-3">
      {loading ? (
        <p className="text-sm text-muted-foreground">매칭 결과 불러오는 중...</p>
      ) : matches && matches.length > 0 ? (
        <div className="flex flex-col gap-3">
          {matches.map((match) => (
            <div key={match.projectName} className="flex flex-col gap-1">
              <div className="flex items-baseline gap-2">
                <span className="text-base font-semibold tabular-nums">{match.fitScore}%</span>
                <h3 className="text-sm font-semibold">{match.projectName}</h3>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">{match.reason}</p>
              {match.highlightPoints.length > 0 && (
                <ul className="list-inside list-disc text-sm leading-relaxed">
                  {match.highlightPoints.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      ) : matches ? (
        <p className="text-sm text-muted-foreground">관련 있는 프로젝트를 찾지 못했습니다.</p>
      ) : null}
      <Button variant="outline" size="sm" onClick={handleMatch} disabled={matching}>
        {matching
          ? "매칭 중... (최대 1분 정도 걸릴 수 있어요)"
          : matches
            ? "다시 매칭"
            : "프로젝트 매칭"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
