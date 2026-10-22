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
  const [expanded, setExpanded] = useState(false);

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
      setExpanded(true);
    } catch (err) {
      console.warn("기업분석 실패:", err);
      setError(err instanceof Error ? err.message : "알 수 없는 오류");
    } finally {
      setAnalyzing(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">기업분석 불러오는 중...</p>;
  }

  if (!prep) {
    return (
      <>
        <Button variant="outline" size="sm" onClick={handleAnalyze} disabled={analyzing}>
          {analyzing ? "생성 중... (최대 1분 정도 걸릴 수 있어요)" : "기업분석 생성"}
        </Button>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </>
    );
  }

  if (!expanded) {
    return (
      <div className="flex flex-col gap-2">
        <p className="line-clamp-2 text-sm leading-relaxed">{prep.companyAnalysis}</p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            예상 질문 {prep.interviewQuestions.length}개
          </span>
          <Button variant="outline" size="sm" onClick={() => setExpanded(true)}>
            전체 보기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <p className="whitespace-pre-wrap text-sm leading-relaxed">{prep.companyAnalysis}</p>
      <div>
        <p className="mb-1 text-xs font-medium text-foreground">예상 면접질문</p>
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
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => setExpanded(false)}>
          접기
        </Button>
        <Button variant="outline" size="sm" onClick={handleAnalyze} disabled={analyzing}>
          {analyzing ? "다시 분석 중... (최대 1분 정도 걸릴 수 있어요)" : "다시 분석"}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
