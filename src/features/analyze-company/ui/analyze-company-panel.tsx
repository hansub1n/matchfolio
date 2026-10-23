"use client";

import { useEffect, useState } from "react";

import type { Application } from "@/entities/application";
import { getInterviewPrep, type InterviewPrep } from "@/entities/interview-prep";
import { AiSection, AiSectionButton, AiSectionSkeleton } from "@/shared/ui/ai-section";

import { analyzeCompany } from "../api/analyzeCompany";

const TITLE = "기업분석 · 예상 질문";

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

  if (error) {
    return (
      <AiSection title={TITLE}>
        <p className="mb-3 text-xs text-destructive">{error}</p>
        <AiSectionButton onClick={handleAnalyze}>다시 시도</AiSectionButton>
      </AiSection>
    );
  }

  if (loading || analyzing) {
    return (
      <AiSection title={TITLE}>
        <p className="mb-3 text-xs text-muted-foreground">회사 정보를 찾는 중</p>
        <AiSectionSkeleton />
      </AiSection>
    );
  }

  if (!prep) {
    return (
      <AiSection title={TITLE}>
        <p className="mb-3 text-xs text-muted-foreground">
          회사 정보를 찾아서 정리하고 예상 면접 질문을 만들어요
        </p>
        <AiSectionButton onClick={handleAnalyze}>분석하기</AiSectionButton>
      </AiSection>
    );
  }

  return (
    <AiSection title={TITLE} headerAction={<LinkButton onClick={handleAnalyze}>다시 분석</LinkButton>}>
      {!expanded ? (
        <div className="mt-2 flex flex-col gap-2">
          <p className="line-clamp-2 text-sm leading-relaxed">{prep.companyAnalysis}</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              예상 질문 {prep.interviewQuestions.length}개
            </span>
            <LinkButton onClick={() => setExpanded(true)}>전체 보기</LinkButton>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex min-w-0 flex-col gap-3">
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
          <span className="self-start">
            <LinkButton onClick={() => setExpanded(false)}>접기</LinkButton>
          </span>
        </div>
      )}
    </AiSection>
  );
}
