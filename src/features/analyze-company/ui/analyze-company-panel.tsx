"use client";

import { useEffect, useState } from "react";

import type { Application } from "@/entities/application";
import { getInterviewPrep, type InterviewPrep } from "@/entities/interview-prep";
import { Button } from "@/shared/ui/button";

import { analyzeCompany } from "../api/analyzeCompany";

export function AnalyzeCompanyPanel({ application }: { application: Application }) {
  const [prep, setPrep] = useState<InterviewPrep | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getInterviewPrep(application.id)
      .then((result) => {
        if (!cancelled) setPrep(result);
      })
      .catch((err) => {
        console.warn("기업분석 조회 실패:", err);
        if (!cancelled) setError("기업분석을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [application.id]);

  async function handleAnalyze() {
    setAnalyzing(true);
    setError(null);
    try {
      const result = await analyzeCompany(application.id);
      setPrep(result);
    } catch (err) {
      console.warn("기업분석 실패:", err);
      setError(err instanceof Error ? err.message : "알 수 없는 오류");
    } finally {
      setAnalyzing(false);
    }
  }

  // 로딩 전/분석 전에는 작은 버튼 하나뿐이라 액션 버튼 한 줄에 다른 버튼들과
  // 나란히 들어갈 수 있게 감싸는 div 없이 그대로 반환한다 — border-t 섹션은
  // 실제 분석 결과가 생겼을 때만 씌운다.
  if (loading) {
    return <p className="text-sm text-muted-foreground">기업분석 불러오는 중...</p>;
  }

  if (!prep) {
    return (
      <>
        <Button variant="outline" size="sm" onClick={handleAnalyze} disabled={analyzing}>
          {analyzing ? "분석 중... (최대 1분 정도 걸릴 수 있어요)" : "기업분석 보기"}
        </Button>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-3 border-t pt-3">
      <div>
        <h3 className="mb-1 text-sm font-semibold">기업분석</h3>
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{prep.companyAnalysis}</p>
      </div>
      <div>
        <h3 className="mb-1 text-sm font-semibold">예상 면접질문</h3>
        <ul className="list-inside list-disc text-sm leading-relaxed">
          {prep.interviewQuestions.map((q, i) => (
            <li key={i}>{q}</li>
          ))}
        </ul>
      </div>
      {prep.sources.length > 0 && (
        <div className="flex min-w-0 flex-col gap-0.5 text-xs text-muted-foreground">
          {prep.sources.map((source) => (
            <a
              key={source.url}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block min-w-0 truncate underline underline-offset-2"
            >
              {source.title}
            </a>
          ))}
        </div>
      )}
      <Button variant="outline" size="sm" onClick={handleAnalyze} disabled={analyzing}>
        {analyzing ? "다시 분석 중... (최대 1분 정도 걸릴 수 있어요)" : "다시 분석"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
