import { NextResponse } from "next/server";
import Groq from "groq-sdk";

import { toInterviewPrep } from "@/entities/interview-prep";
import { matchRelatedProject } from "@/features/analyze-company/model/match-related-project";
import { getRequestUser } from "@/shared/api/supabase-server";
import { env } from "@/shared/config/env";
import { consumeAiQuota, quotaExceededResponse } from "@/shared/lib/ai-quota";
import { describeGroqError, GROQ_TEXT_MODEL, isRetryable } from "@/shared/lib/groq";
import { isSameOrigin, unauthorizedResponse } from "@/shared/lib/request-guard";

import { generateProjectQuestions, shouldGenerateProjectQuestions } from "../project-questions/generate";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 기본 질문(재시도 3회 × 35초) + 프로젝트 기반 질문(같은 규모)이 이어서 돌 수 있다.
export const maxDuration = 240;

const QUESTIONS_SCHEMA = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      description:
        "이 공고/기업 특성에 맞춘 기본 예상 면접 질문 정확히 6개 — 기술 2개, 프로젝트 경험 2개, 협업 1개, 회사·도메인 1개. 공고/회사 정보만으로 만들고, 지원자의 프로젝트 경험을 지어내지 말 것.",
      minItems: 6,
      maxItems: 6,
      items: {
        type: "object",
        properties: {
          category: { type: "string", enum: ["기술", "프로젝트 경험", "회사·도메인", "협업"] },
          question: { type: "string" },
          intent: { type: "string", description: "이 질문으로 면접관이 무엇을 확인하려는지" },
          hint: {
            type: "string",
            description:
              "답변 구조 안내(상황 → 한 일 → 결과 순서로 1분 분량) + 어떤 종류의 사례를 준비해두면 좋을지. 특정 프로젝트의 실제 내용을 지어내지 말 것.",
          },
          relatedProjectId: {
            type: ["string", "null"],
            description: "항상 null로 둬라 — 실제 매칭은 별도 로직이 처리한다.",
          },
          noExperience: { type: "boolean", description: "기본 질문에는 항상 false." },
        },
        required: ["category", "question", "intent", "hint", "relatedProjectId", "noExperience"],
        additionalProperties: false,
      },
    },
    reverseQuestions: {
      type: "array",
      description: "역질문 추천 — 지원자가 면접관에게 물어볼 질문 2~3개.",
      items: {
        type: "object",
        properties: {
          question: { type: "string" },
          why: { type: "string", description: "이 질문이 좋은 이유 한 줄" },
        },
        required: ["question", "why"],
        additionalProperties: false,
      },
    },
  },
  required: ["questions", "reverseQuestions"],
  additionalProperties: false,
};

interface QuestionsResult {
  questions: {
    category: string;
    question: string;
    intent: string;
    hint: string;
    relatedProjectId: string | null;
    noExperience: boolean;
  }[];
  reverseQuestions: { question: string; why: string }[];
}

// 면접 준비의 "예상 질문 만들기". 회사 분석과 따로 돈다 — 회사 분석을 이미 했으면 그 결과(요약·사업·
// 최근 소식)를 참고하고, 안 했으면 공고 내용만으로 만든다. 프로젝트가 있으면 이어서 프로젝트 기반
// 질문(제출 자료 반영)도 만든다.
export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "허용되지 않은 요청입니다." }, { status: 403 });
  }
  const { supabase, user } = await getRequestUser();
  if (!user) return unauthorizedResponse();

  const { applicationId } = (await request.json()) as { applicationId: string };
  if (!applicationId) {
    return NextResponse.json({ error: "applicationId는 필수입니다." }, { status: 400 });
  }

  const { data: application, error: applicationError } = await supabase
    .from("applications")
    .select("company, position, description, tech_stack")
    .eq("id", applicationId)
    .single();
  if (applicationError || !application) {
    return NextResponse.json({ error: "존재하지 않는 지원 카드입니다." }, { status: 404 });
  }

  const { data: prep } = await supabase
    .from("interview_prep")
    .select("summary, briefing")
    .eq("application_id", applicationId)
    .maybeSingle();
  const { data: myProjects } = await supabase.from("my_projects").select("id, tech_stack");

  const quota = await consumeAiQuota(user.id, "analyze_company");
  if (!quota) return quotaExceededResponse();

  const { company, position, description, tech_stack: techStack } = application;
  const business: string[] = prep?.briefing?.business ?? [];
  const recent: string[] = prep?.briefing?.recent ?? [];

  const prompt = `다음은 한 채용 지원자가 지원한 공고와, (있으면) 그 회사에 대해 미리 정리해둔 정보다.

회사명: ${company}
직무: ${position ?? "(정보 없음)"}
기술스택: ${techStack.join(", ") || "(정보 없음)"}
공고 요약: ${description ?? "(정보 없음)"}
회사 요약: ${prep?.summary ?? "(정보 없음)"}
무슨 사업을 하나요: ${business.join(" / ") || "(정보 없음)"}
최근 소식: ${recent.join(" / ") || "(정보 없음)"}

이 공고/회사에 맞춘 예상 면접 질문과 역질문을 만들어줘.

- questions는 공고/회사 정보만으로 만드는 기본 질문이다. 지원자의 프로젝트 경험을 지어내지 마라 — 지원자가 어떤 프로젝트를 했는지 모른다고 가정하고 질문/hint를 써라. relatedProjectId는 모든 질문에서 항상 null, noExperience는 모든 질문에서 false로 둬라.
- reverseQuestions는 지원자가 면접관에게 물어볼 질문과 그 질문이 좋은 이유 한 줄(why)이다. 위 회사 정보에 근거해서 쓰고, 정보가 없으면 공고 내용(업무·조직)에 근거해라. 복지·연봉 질문은 넣지 마라.`;

  const groq = new Groq({ apiKey: env.groq.apiKey });
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await groq.chat.completions.create(
        {
          model: GROQ_TEXT_MODEL,
          messages: [{ role: "user", content: prompt }],
          // 이어서 프로젝트 기반 질문 호출이 있어서 Groq TPM 한도(분당 8000) 안에 둘 다 들어가게 작게 둔다.
          max_completion_tokens: 3000,
          response_format: {
            type: "json_schema",
            json_schema: { name: "interview_questions", schema: QUESTIONS_SCHEMA, strict: true },
          },
        },
        { signal: AbortSignal.timeout(35000) }
      );
      const result = JSON.parse(response.choices[0]?.message?.content ?? "{}") as QuestionsResult;

      // relatedProjectId는 AI에게 맡기지 않고(프로젝트 정보를 안 줬다) 공고 기술스택과 가장 많이
      // 겹치는 프로젝트를 "프로젝트 경험" 질문에만 붙인다.
      const relatedProjectId = matchRelatedProject(
        techStack,
        (myProjects ?? []).map((p) => ({ id: p.id, techStack: p.tech_stack }))
      );
      const questions = result.questions.map((q) => ({
        ...q,
        relatedProjectId: q.category === "프로젝트 경험" ? relatedProjectId : null,
      }));

      const { error } = await supabase.from("interview_prep").upsert(
        {
          application_id: applicationId,
          questions,
          reverse_questions: result.reverseQuestions.slice(0, 3),
          interview_questions: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "application_id" }
      );
      if (error) throw error;

      // 프로젝트 기반 질문은 실패해도 기본 질문은 살린다(그 그룹에 "만들기"가 남는다).
      if (shouldGenerateProjectQuestions(myProjects?.length ?? 0)) {
        const projectResult = await generateProjectQuestions(supabase, applicationId);
        if ("error" in projectResult) console.warn("프로젝트 기반 질문 생성 실패:", projectResult.error);
      }

      const { data, error: readError } = await supabase
        .from("interview_prep")
        .select("*")
        .eq("application_id", applicationId)
        .single();
      if (readError) throw readError;
      return NextResponse.json(toInterviewPrep(data));
    } catch (error) {
      console.error(`interview-questions attempt ${attempt} failed:`, error);
      if (isRetryable(error) && attempt < maxAttempts) {
        await sleep(1000 * attempt);
        continue;
      }
      await quota.refund();
      return NextResponse.json(
        { error: `예상 질문을 만들지 못했습니다: ${describeGroqError(error)}` },
        { status: 500 }
      );
    }
  }
}
