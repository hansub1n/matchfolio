import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

import { env } from "@/shared/config/env";
import { supabaseAdmin } from "@/shared/api/supabase-admin";
import { describeGeminiError, GEMINI_MODEL, isRetryable } from "@/shared/lib/gemini";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 재시도 3회 × 25초 + 백오프 ≈ 78초가 최악의 경우 (Vercel Hobby 기본 300초 안에 넉넉히 들어옴).
export const maxDuration = 90;

interface TavilySource {
  title: string;
  url: string;
  content: string;
}

async function searchCompany(company: string): Promise<TavilySource[]> {
  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: env.tavily.apiKey,
        query: `${company} 기업 정보 기술스택 개발문화`,
        search_depth: "basic",
        max_results: 5,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return [];

    const body = await response.json();
    const results = Array.isArray(body.results) ? body.results : [];
    return results.map((r: { title: string; url: string; content: string }) => ({
      title: r.title,
      url: r.url,
      content: r.content,
    }));
  } catch (error) {
    console.warn("Tavily 검색 실패, 공고 정보만으로 분석을 진행합니다:", error);
    return [];
  }
}

const ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    companyAnalysis: {
      type: "string",
      description: "기업 소개, 사업 영역, 개발 문화나 기술스택 관련 특징을 3~5문단으로 요약",
    },
    interviewQuestions: {
      type: "array",
      items: { type: "string" },
      description: "이 공고/기업 특성에 맞춘 예상 면접 질문 5~8개",
    },
  },
  required: ["companyAnalysis", "interviewQuestions"],
};

export async function POST(request: Request) {
  const body = await request.json();
  const { applicationId } = body as { applicationId: string };

  if (!applicationId) {
    return NextResponse.json({ error: "applicationId는 필수입니다." }, { status: 400 });
  }

  // 클라이언트가 보낸 회사명/공고 정보를 그대로 믿지 않고, DB에 저장된 값을 기준으로 삼는다.
  const { data: application, error: applicationError } = await supabaseAdmin
    .from("applications")
    .select("company, position, description, tech_stack")
    .eq("id", applicationId)
    .single();

  if (applicationError || !application) {
    return NextResponse.json({ error: "존재하지 않는 지원 카드입니다." }, { status: 404 });
  }

  const { company, position, description, tech_stack: techStack } = application;

  const sources = await searchCompany(company);

  const searchContext =
    sources.length > 0
      ? sources.map((s) => `- ${s.title}: ${s.content}`).join("\n")
      : "(웹 검색 결과 없음)";

  const prompt = `다음은 한 채용 지원자가 지원한 공고와 그 회사에 대한 웹 검색 결과다.

회사명: ${company}
직무: ${position}
기술스택: ${techStack.join(", ") || "(정보 없음)"}
공고 요약: ${description ?? "(정보 없음)"}

웹 검색 결과:
${searchContext}

위 정보를 바탕으로 이 회사에 대한 기업분석과, 이 공고/기업 특성에 맞춘 예상 면접 질문을 만들어줘.`;

  const ai = new GoogleGenAI({ apiKey: env.gemini.apiKey });
  const maxAttempts = 3;
  const attemptTimeoutMs = 25000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          responseJsonSchema: ANALYSIS_SCHEMA,
          abortSignal: AbortSignal.timeout(attemptTimeoutMs),
        },
      });

      const result = JSON.parse(response.text ?? "{}") as {
        companyAnalysis: string;
        interviewQuestions: string[];
      };

      const { data, error } = await supabaseAdmin
        .from("interview_prep")
        .upsert(
          {
            application_id: applicationId,
            company_analysis: result.companyAnalysis,
            interview_questions: result.interviewQuestions,
            sources: sources.map((s) => ({ title: s.title, url: s.url })),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "application_id" }
        )
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({
        id: data.id,
        applicationId: data.application_id,
        companyAnalysis: data.company_analysis,
        interviewQuestions: data.interview_questions,
        sources: data.sources,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      });
    } catch (error) {
      console.error(`analyze-company attempt ${attempt} failed:`, error);

      if (isRetryable(error) && attempt < maxAttempts) {
        await sleep(1000 * attempt);
        continue;
      }

      return NextResponse.json(
        { error: `기업분석에 실패했습니다: ${describeGeminiError(error)}` },
        { status: 500 }
      );
    }
  }
}
