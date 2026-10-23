import { useEffect, useState } from "react";

import { getInterviewPrep, type InterviewPrep } from "@/entities/interview-prep";

import { analyzeCompany } from "../api/analyzeCompany";
import type { GenerateProjectQuestionsResponse } from "../api/generateProjectQuestions";

export type InterviewPrepState =
  | { status: "loading" }
  | { status: "analyzing" }
  | { status: "error"; error: string }
  | { status: "empty" }
  | { status: "ready"; prep: InterviewPrep };

// 상세 모달의 회사 분석 / 지원 준비 / 면접 준비 세 영역이 같은 기업분석 결과를
// 나눠 보여줘서, 조회·분석 실행은 모달에서 한 번만 하고 상태를 나눠준다.
export function useInterviewPrep(applicationId: string | null) {
  const [prep, setPrep] = useState<InterviewPrep | null>(null);
  const [loading, setLoading] = useState(applicationId !== null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!applicationId) return;
    let cancelled = false;
    getInterviewPrep(applicationId)
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
  }, [applicationId]);

  async function analyze() {
    if (!applicationId) return;
    setAnalyzing(true);
    setError(null);
    try {
      setPrep(await analyzeCompany(applicationId));
    } catch (err) {
      console.warn("기업분석 실패:", err);
      setError(err instanceof Error ? err.message : "알 수 없는 오류");
    } finally {
      setAnalyzing(false);
    }
  }

  function updateProjectLayer(result: GenerateProjectQuestionsResponse) {
    setPrep((prev) => (prev ? { ...prev, ...result } : prev));
  }

  const state: InterviewPrepState = error
    ? { status: "error", error }
    : loading
      ? { status: "loading" }
      : analyzing
        ? { status: "analyzing" }
        : prep
          ? { status: "ready", prep }
          : { status: "empty" };

  return { state, analyze, updateProjectLayer };
}
