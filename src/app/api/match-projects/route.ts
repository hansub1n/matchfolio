import { NextResponse } from "next/server";
import Groq from "groq-sdk";

import { env } from "@/shared/config/env";
import { supabaseAdmin } from "@/shared/api/supabase-admin";
import { describeGroqError, GROQ_TEXT_MODEL, isRetryable } from "@/shared/lib/groq";
import { isSameOrigin } from "@/shared/lib/request-guard";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 재시도 3회 × 60초 + 백오프 ≈ 183초가 최악의 경우 (Vercel Hobby 기본 300초 안에 들어옴).
export const maxDuration = 200;

const MATCH_SCHEMA = {
  type: "object",
  properties: {
    recommendation: {
      type: "string",
      description:
        "전체 추천을 한 줄로. 예: '이 공고에는 A를 메인으로, B는 보조로 어필하면 좋아요'",
    },
    matches: {
      type: "array",
      description: "등록된 프로젝트 전부에 대해 fitScore 내림차순으로 나열 (관련 없어도 포함)",
      items: {
        type: "object",
        properties: {
          projectId: { type: "string", description: "아래 프로젝트 목록에 주어진 id를 그대로 사용" },
          fitScore: {
            type: "integer",
            description:
              "0~100. 공고에 명시된 구체적인 기술스택/업무와 겹치는 부분이 얼마나 있는지만 근거로 보수적으로 채점. 공고에 요구사항이 모호하거나 구체적인 정보가 적으면 점수를 낮게 준다.",
          },
          summary: { type: "string", description: "이 프로젝트가 이 공고와 왜 맞는지(또는 안 맞는지) 한 줄 요약" },
          evidence: {
            type: "array",
            description: "공고 요구사항과 프로젝트 경험을 짝지은 근거 2~4개",
            items: {
              type: "object",
              properties: {
                requirement: { type: "string", description: "공고 원문 표현을 짧게 인용" },
                experience: {
                  type: "string",
                  description: "프로젝트 설명/핵심 포인트에 실제로 있는 사실만",
                },
              },
              required: ["requirement", "experience"],
              additionalProperties: false,
            },
          },
          gaps: {
            type: "array",
            items: { type: "string" },
            description: "이 프로젝트로 못 채우는 요구사항 0~3개. 없으면 빈 배열",
          },
          pitch: {
            type: "string",
            description: "자기소개서/면접에서 바로 쓸 수 있는 1~2문장 어필 문구. 프로젝트에 실제로 있는 내용만.",
          },
        },
        required: ["projectId", "fitScore", "summary", "evidence", "gaps", "pitch"],
        additionalProperties: false,
      },
    },
  },
  required: ["recommendation", "matches"],
  additionalProperties: false,
};

interface RawMatch {
  projectId: string;
  fitScore: number;
  summary: string;
  evidence: { requirement: string; experience: string }[];
  gaps: string[];
  pitch: string;
}

interface MatchResult {
  recommendation: string;
  matches: RawMatch[];
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "허용되지 않은 요청입니다." }, { status: 403 });
  }

  const body = await request.json();
  const { applicationId } = body as { applicationId: string };

  if (!applicationId) {
    return NextResponse.json({ error: "applicationId는 필수입니다." }, { status: 400 });
  }

  const { data: company, error: companyError } = await supabaseAdmin
    .from("applications")
    .select("company, position, description, tech_stack")
    .eq("id", applicationId)
    .single();

  if (companyError || !company) {
    return NextResponse.json({ error: "존재하지 않는 공고입니다." }, { status: 404 });
  }

  const { data: projects, error: projectsError } = await supabaseAdmin
    .from("my_projects")
    .select("id, name, description, tech_stack, highlights");

  if (projectsError) {
    return NextResponse.json({ error: projectsError.message }, { status: 500 });
  }

  if (!projects || projects.length === 0) {
    return NextResponse.json(
      { error: "등록된 프로젝트가 없습니다. 먼저 '내 프로젝트' 탭에서 추가해주세요." },
      { status: 400 }
    );
  }

  const projectsText = projects
    .map(
      (p) =>
        `- id: ${p.id} / ${p.name}: ${p.description ?? ""} (기술스택: ${p.tech_stack.join(", ") || "없음"}, 핵심 포인트: ${p.highlights.join(", ") || "없음"})`
    )
    .join("\n");

  const prompt = `다음은 한 지원자가 관심 있는 채용 공고와, 그 지원자가 등록해둔 본인 프로젝트 목록이다.

공고 - 회사명: ${company.company}
공고 - 직무: ${company.position ?? "(정보 없음)"}
공고 - 기술스택: ${company.tech_stack.join(", ") || "(정보 없음)"}
공고 - 요약: ${company.description ?? "(정보 없음)"}

등록된 프로젝트 목록 (각 줄 맨 앞의 id를 응답의 projectId에 그대로 사용해라):
${projectsText}

너는 이 지원자의 커리어 코치가 아니라 냉정한 채용 담당자처럼 평가해야 한다. 모든 프로젝트를 무조건 긍정적으로 포장하지 말고, 공고에 실제로 명시된 요구사항과 겹치는 부분이 얼마나 되는지만 근거로 점수를 매겨라. 공고에 기술스택이나 구체적인 업무가 적혀있지 않다면 "완벽히 부합" 같은 말은 쓰지 말고, 근거가 약하다는 걸 그대로 드러내고 점수도 낮게 줘라. 등록된 프로젝트 전부에 대해 fitScore를 매겨서 반환해.

evidence의 requirement는 공고 원문 표현을 짧게 인용하고, experience는 그 프로젝트의 설명/핵심 포인트에 실제로 있는 사실만 써라. 없는 경험을 지어내지 마라. gaps는 이 프로젝트로 채우지 못하는 요구사항이고, 채울 게 없으면 빈 배열로 둬라. pitch는 자기소개서나 면접에서 그대로 쓸 수 있는 1~2문장으로, 역시 프로젝트에 실제로 있는 내용만 써라. recommendation은 등록된 프로젝트 중 어떤 걸 메인/보조로 어필하면 좋을지 한 줄로 요약해라.`;

  const groq = new Groq({ apiKey: env.groq.apiKey });
  const maxAttempts = 3;
  // 프로젝트마다 근거/부족한 점/어필 문구까지 다 만들어야 해서 다른 라우트보다 출력량이 많다.
  const attemptTimeoutMs = 60000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await groq.chat.completions.create(
        {
          model: GROQ_TEXT_MODEL,
          messages: [{ role: "user", content: prompt }],
          // Groq on_demand 티어 TPM 한도(분당 8000, 입력 토큰까지 포함)를
          // 넘으면 안 돼서 출력량이 많은 라우트지만 이 안에서 맞춘다.
          max_completion_tokens: 6000,
          response_format: {
            type: "json_schema",
            json_schema: { name: "project_matches", schema: MATCH_SCHEMA, strict: true },
          },
        },
        { signal: AbortSignal.timeout(attemptTimeoutMs) }
      );

      const result = JSON.parse(response.choices[0]?.message?.content ?? "{}") as MatchResult;

      // AI가 존재하지 않는 projectId를 지어내는 경우를 대비해, 실제 등록된
      // 프로젝트 id만 신뢰한다.
      const validIds = new Set(projects.map((p) => p.id));
      const sortedMatches = result.matches
        .filter((m) => validIds.has(m.projectId))
        .sort((a, b) => b.fitScore - a.fitScore);

      const { data, error } = await supabaseAdmin
        .from("project_matches")
        .upsert(
          {
            application_id: applicationId,
            matches: sortedMatches,
            recommendation: result.recommendation,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "application_id" }
        )
        .select()
        .single();

      if (error) throw error;

      // 이름은 AI 응답이 아니라 방금 조회한 my_projects 기준으로 붙인다.
      const nameById = new Map(projects.map((p) => [p.id, p.name]));
      const resolvedMatches = (data.matches as RawMatch[]).map((m) => ({
        ...m,
        projectName: nameById.get(m.projectId) ?? "(삭제된 프로젝트)",
      }));

      return NextResponse.json({
        id: data.id,
        applicationId: data.application_id,
        recommendation: data.recommendation,
        matches: resolvedMatches,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      });
    } catch (error) {
      console.error(`match-projects attempt ${attempt} failed:`, error);

      if (isRetryable(error) && attempt < maxAttempts) {
        await sleep(1000 * attempt);
        continue;
      }

      return NextResponse.json(
        { error: `프로젝트 매칭에 실패했습니다: ${describeGroqError(error)}` },
        { status: 500 }
      );
    }
  }
}
