import { useEffect, useState } from "react";

import {
  getInterviewPrep,
  hasCompanyAnalysis,
  hasInterviewQuestions,
  type InterviewPrep,
} from "@/entities/interview-prep";
import { blockInSampleMode } from "@/shared/lib/sample-mode";

import { analyzeCompany } from "../api/analyzeCompany";
import { generateInterviewQuestions } from "../api/generateInterviewQuestions";
import type { GenerateProjectQuestionsResponse } from "../api/generateProjectQuestions";

export type InterviewPrepState =
  | { status: "loading" }
  | { status: "analyzing" }
  | { status: "error"; error: string }
  | { status: "empty" }
  | { status: "ready"; prep: InterviewPrep };

type Task = "company" | "questions";

// 회사 분석(회사 정보)과 예상 질문은 버튼도 AI 호출도 따로다. 같은 interview_prep 행에 저장돼서
// 조회는 모달에서 한 번만 하고, 영역마다 자기 상태(company / questions)를 나눠준다.
export function useInterviewPrep(applicationId: string | null) {
  const [prep, setPrep] = useState<InterviewPrep | null>(null);
  const [loading, setLoading] = useState(applicationId !== null);
  const [busy, setBusy] = useState<Record<Task, boolean>>({ company: false, questions: false });
  const [errors, setErrors] = useState<Record<Task, string | null>>({ company: null, questions: null });

  useEffect(() => {
    if (!applicationId) return;
    let cancelled = false;
    getInterviewPrep(applicationId)
      .then((result) => {
        if (!cancelled) setPrep(result);
      })
      .catch((err) => {
        console.warn("기업분석 조회 실패:", err);
        if (!cancelled) setErrors({ company: "불러오지 못했습니다.", questions: "불러오지 못했습니다." });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [applicationId]);

  async function run(task: Task, request: (id: string) => Promise<InterviewPrep>) {
    if (blockInSampleMode()) return;
    if (!applicationId) return;
    setBusy((prev) => ({ ...prev, [task]: true }));
    setErrors((prev) => ({ ...prev, [task]: null }));
    try {
      setPrep(await request(applicationId));
    } catch (err) {
      console.warn(task === "company" ? "기업분석 실패:" : "예상 질문 생성 실패:", err);
      setErrors((prev) => ({ ...prev, [task]: err instanceof Error ? err.message : "알 수 없는 오류" }));
    } finally {
      setBusy((prev) => ({ ...prev, [task]: false }));
    }
  }

  function updateProjectLayer(result: GenerateProjectQuestionsResponse) {
    setPrep((prev) => (prev ? { ...prev, ...result } : prev));
  }

  function stateFor(task: Task, isReady: (p: InterviewPrep) => boolean): InterviewPrepState {
    const error = errors[task];
    if (error) return { status: "error", error };
    if (loading) return { status: "loading" };
    if (busy[task]) return { status: "analyzing" };
    if (prep && isReady(prep)) return { status: "ready", prep };
    return { status: "empty" };
  }

  return {
    companyState: stateFor("company", hasCompanyAnalysis),
    questionsState: stateFor("questions", hasInterviewQuestions),
    analyzeCompany: () => run("company", analyzeCompany),
    generateQuestions: () => run("questions", generateInterviewQuestions),
    updateProjectLayer,
  };
}
