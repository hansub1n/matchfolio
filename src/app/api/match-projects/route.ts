import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

import { env } from "@/shared/config/env";
import { supabaseAdmin } from "@/shared/api/supabase-admin";
import { describeGeminiError, GEMINI_MODEL, isRetryable } from "@/shared/lib/gemini";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const MATCH_SCHEMA = {
  type: "object",
  properties: {
    matches: {
      type: "array",
      description: "등록된 프로젝트 전부에 대해 fitScore 내림차순으로 나열 (관련 없어도 포함)",
      items: {
        type: "object",
        properties: {
          projectName: { type: "string" },
          fitScore: {
            type: "integer",
            description:
              "0~100. 공고에 명시된 구체적인 기술스택/업무와 겹치는 부분이 얼마나 있는지만 근거로 보수적으로 채점. 공고에 요구사항이 모호하거나 구체적인 정보가 적으면 점수를 낮게 준다.",
          },
          reason: {
            type: "string",
            description:
              "이 점수를 준 근거를 1~2문장으로. 맞는 부분과 안 맞거나 근거가 약한 부분을 모두 포함해서 균형 있게 설명",
          },
          highlightPoints: {
            type: "array",
            items: { type: "string" },
            description: "fitScore가 낮지 않을 때만, 자기소개서/면접에서 강조하면 좋을 포인트 2~4개. 점수가 낮으면 빈 배열",
          },
        },
        required: ["projectName", "fitScore", "reason", "highlightPoints"],
      },
    },
  },
  required: ["matches"],
};

export async function POST(request: Request) {
  const body = await request.json();
  const { interestedCompanyId } = body as { interestedCompanyId: string };

  if (!interestedCompanyId) {
    return NextResponse.json({ error: "interestedCompanyId는 필수입니다." }, { status: 400 });
  }

  const { data: company, error: companyError } = await supabaseAdmin
    .from("interested_companies")
    .select("company, position, description, tech_stack")
    .eq("id", interestedCompanyId)
    .single();

  if (companyError || !company) {
    return NextResponse.json({ error: "존재하지 않는 관심기업입니다." }, { status: 404 });
  }

  const { data: projects, error: projectsError } = await supabaseAdmin
    .from("my_projects")
    .select("name, description, tech_stack, highlights");

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
        `- ${p.name}: ${p.description ?? ""} (기술스택: ${p.tech_stack.join(", ") || "없음"}, 주요 기능/경험: ${p.highlights.join(", ") || "없음"})`
    )
    .join("\n");

  const prompt = `다음은 한 지원자가 관심 있는 채용 공고와, 그 지원자가 등록해둔 본인 프로젝트 목록이다.

공고 - 회사명: ${company.company}
공고 - 직무: ${company.position ?? "(정보 없음)"}
공고 - 기술스택: ${company.tech_stack.join(", ") || "(정보 없음)"}
공고 - 요약: ${company.description ?? "(정보 없음)"}

등록된 프로젝트 목록:
${projectsText}

너는 이 지원자의 커리어 코치가 아니라 냉정한 채용 담당자처럼 평가해야 한다. 모든 프로젝트를 무조건 긍정적으로 포장하지 말고, 공고에 실제로 명시된 요구사항과 겹치는 부분이 얼마나 되는지만 근거로 점수를 매겨라. 공고에 기술스택이나 구체적인 업무가 적혀있지 않다면 "완벽히 부합" 같은 말은 쓰지 말고, 근거가 약하다는 걸 그대로 드러내고 점수도 낮게 줘라. 등록된 프로젝트 전부에 대해 fitScore를 매겨서 반환해.`;

  const ai = new GoogleGenAI({ apiKey: env.gemini.apiKey });
  const maxAttempts = 3;
  // 프로젝트마다 fitScore/이유/강조포인트를 다 만들어야 해서 다른 라우트보다 출력량이 많다.
  const attemptTimeoutMs = 45000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          responseJsonSchema: MATCH_SCHEMA,
          abortSignal: AbortSignal.timeout(attemptTimeoutMs),
        },
      });

      const result = JSON.parse(response.text ?? "{}") as { matches: unknown };
      const sortedMatches = (result.matches as { fitScore: number }[]).sort(
        (a, b) => b.fitScore - a.fitScore
      );

      const { data, error } = await supabaseAdmin
        .from("project_matches")
        .upsert(
          {
            interested_company_id: interestedCompanyId,
            matches: sortedMatches,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "interested_company_id" }
        )
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({
        id: data.id,
        interestedCompanyId: data.interested_company_id,
        matches: data.matches,
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
        { error: `프로젝트 매칭에 실패했습니다: ${describeGeminiError(error)}` },
        { status: 500 }
      );
    }
  }
}
