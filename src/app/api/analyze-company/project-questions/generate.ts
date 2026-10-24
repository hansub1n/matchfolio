import "server-only";
import Groq from "groq-sdk";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { InterviewPrepMotivation, InterviewPrepQuestion } from "@/entities/interview-prep";
import {
  buildProjectQuestionsUpdatePayload,
  shouldGenerateProjectQuestions,
} from "@/features/analyze-company/model/project-questions-payload";
import { buildSubmissionContext } from "@/features/analyze-company/model/submission-context";
import { computeSkillGap } from "@/widgets/my-materials";
import { env } from "@/shared/config/env";
import { describeGroqError, GROQ_TEXT_MODEL, isRetryable } from "@/shared/lib/groq";

export { shouldGenerateProjectQuestions };

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type RawQuestion = InterviewPrepQuestion;

const PROJECT_QUESTIONS_SCHEMA = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      description:
        "정확히 5개: relatedProjectId를 채운 '내 경험' 질문 3개 + noExperience가 true인 '대비 필요' 질문 2개",
      items: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: ["기술", "프로젝트 경험", "회사·도메인", "협업"],
          },
          question: { type: "string" },
          intent: { type: "string", description: "이 질문으로 면접관이 무엇을 확인하려는지" },
          hint: { type: "string" },
          relatedProjectId: {
            type: ["string", "null"],
            description: "아래 등록된 프로젝트 목록의 id를 그대로 사용",
          },
          noExperience: { type: "boolean" },
        },
        required: ["category", "question", "intent", "hint", "relatedProjectId", "noExperience"],
        additionalProperties: false,
      },
    },
    motivation: {
      type: "array",
      description: "지원 동기에 쓸 포인트 1~2개",
      items: {
        type: "object",
        properties: {
          point: {
            type: "string",
            description: "회사 사업과 등록된 프로젝트 경험을 연결한 한 줄. 40자 안팎, 명사형/간결체.",
          },
          example: {
            type: "string",
            description: "자소서 지원 동기에 바로 넣을 수 있는 1~2문장. 프로젝트에 실제로 있는 사실만.",
          },
        },
        required: ["point", "example"],
        additionalProperties: false,
      },
    },
  },
  required: ["questions", "motivation"],
  additionalProperties: false,
};

export interface GenerateProjectQuestionsResult {
  projectQuestions: RawQuestion[];
  motivation: InterviewPrepMotivation[];
  projectQuestionsUpdatedAt: string;
}

// 호출한 사용자의 세션 클라이언트를 받는다 — RLS로 그 사용자 데이터만 읽고 쓴다.
export async function generateProjectQuestions(
  supabase: SupabaseClient,
  applicationId: string
): Promise<GenerateProjectQuestionsResult | { error: string; status: number }> {
  const { data: application, error: applicationError } = await supabase
    .from("applications")
    .select("company, position, description, tech_stack, submitted_project_ids, submitted_cover_letter_id")
    .eq("id", applicationId)
    .single();

  if (applicationError || !application) {
    return { error: "존재하지 않는 지원 카드입니다.", status: 404 };
  }

  const { data: myProjects } = await supabase
    .from("my_projects")
    .select("id, name, description, tech_stack, highlights");

  if (!myProjects || !shouldGenerateProjectQuestions(myProjects.length)) {
    return { error: "등록된 프로젝트가 없습니다. 먼저 '내 자료' 탭에서 추가해주세요.", status: 400 };
  }

  // "내 자료" 탭의 기술 격차와 같은 기준 — 실제로 지원한 공고(관심 단계 제외)만 센다.
  const { data: allApplications } = await supabase
    .from("applications")
    .select("tech_stack")
    .neq("stage", "interested");

  // 지원 동기 포인트를 회사 사업과 연결하려면 기업분석에서 정리한 사업 내용이
  // 필요하다 — 첫 분석에서는 기본 분석 저장 직후에 불리므로 항상 채워져 있다.
  const { data: prep } = await supabase
    .from("interview_prep")
    .select("briefing")
    .eq("application_id", applicationId)
    .maybeSingle();
  const businessPoints: string[] = prep?.briefing?.business ?? [];

  const skillGap = computeSkillGap(
    (allApplications ?? []).map((a) => ({ techStack: a.tech_stack })),
    myProjects.map((p) => ({ techStack: p.tech_stack }))
  );

  const { company, position, description, tech_stack: techStack } = application;
  const nameById = new Map(myProjects.map((p) => [p.id, p.name]));
  // 제출 기록에 고른 자소서의 본문 — 지워졌거나 고르지 않았으면 없음.
  const { data: submittedCoverLetter } = application.submitted_cover_letter_id
    ? await supabase
        .from("documents")
        .select("content")
        .eq("id", application.submitted_cover_letter_id)
        .maybeSingle()
    : { data: null };
  const submissionContext = buildSubmissionContext(
    submittedCoverLetter?.content ?? null,
    ((application.submitted_project_ids ?? []) as string[])
      .map((id) => nameById.get(id))
      .filter((name): name is string => Boolean(name))
  );

  const projectsText = myProjects
    .map(
      (p) =>
        `- id: ${p.id} / ${p.name}: ${p.description ?? ""} (기술스택: ${p.tech_stack.join(", ") || "없음"}, 핵심 포인트: ${p.highlights.join(", ") || "없음"})`
    )
    .join("\n");

  const prompt = `다음은 한 채용 지원자가 지원한 공고와, 지원자가 등록한 프로젝트, 그리고 지원자가 자주 지원하는 공고에서 요구하지만 아직 프로젝트로 못 채운 기술 목록이다.

회사명: ${company}
직무: ${position ?? "(정보 없음)"}
기술스택: ${techStack.join(", ") || "(정보 없음)"}
공고 요약: ${description ?? "(정보 없음)"}
회사 사업 내용(기업분석 결과): ${businessPoints.join(" / ") || "(정보 없음)"}

등록된 프로젝트 (각 줄 맨 앞 id를 relatedProjectId에 그대로 사용해라):
${projectsText}

지원자가 자주 지원하는 공고에서 요구하지만 등록된 프로젝트로는 아직 못 채운 기술: ${skillGap.map((s) => s.name).join(", ") || "없음"}
${submissionContext ? `\n이 공고에 지원하면서 낸 제출 기록 (면접 질문은 대부분 여기서 나온다):\n${submissionContext}\n` : ""}
다음 두 종류의 면접 질문을 정확히 5개 만들어줘.
1. "내 경험" 질문 3개: relatedProjectId를 반드시 채워라(등록된 프로젝트 중 가장 관련 있는 것). 제출 기록이 있으면 자소서에 쓴 내용과 어필한 프로젝트를 우선 근거로 삼아, 면접관이 자소서를 보고 파고들 만한 질문으로 만들어라. hint는 그 프로젝트의 설명/핵심 포인트에 실제로 있는 사실만으로 2~3문장짜리 답변 초안을 써라. 없는 경험을 지어내지 마라. noExperience는 false로 둬라.
2. "대비 필요" 질문 2개: noExperience를 true로 하고, 공고에는 있지만 등록된 프로젝트로는 못 채우는 요구사항(위 기술 목록 참고)에 대해 물어라. hint는 그 경험이 없다는 걸 인정하고 가까운 경험으로 연결해서 답하는 법을 써라. relatedProjectId는 null로 둬라.

category는 각 질문 성격에 맞게 기술/프로젝트 경험/회사·도메인/협업 중 하나로 골라라.

motivation에는 자기소개서 지원 동기에 쓸 포인트 1~2개를 써라. point는 회사 사업 내용과 등록된 프로젝트의 실제 경험을 연결한 한 줄로, 40자 안팎의 명사형/간결체로 써라("~합니다" 같은 늘어지는 어미 금지). example은 그 포인트를 자소서에 바로 이어 붙일 수 있는 1~2문장(자소서 문체)으로, 프로젝트 설명/핵심 포인트에 실제로 있는 사실만 써라. 프로젝트에 없는 경험은 지어내지 마라.`;

  const groq = new Groq({ apiKey: env.groq.apiKey });
  const maxAttempts = 3;
  const attemptTimeoutMs = 35000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await groq.chat.completions.create(
        {
          model: GROQ_TEXT_MODEL,
          messages: [{ role: "user", content: prompt }],
          // Groq on_demand 티어 TPM 한도(분당 8000, 입력 토큰까지 포함)를
          // 넘지 않도록 여유를 둔다 — 질문 5개 스키마는 이 안에서 충분하다.
          max_completion_tokens: 4000,
          response_format: {
            type: "json_schema",
            json_schema: { name: "project_questions", schema: PROJECT_QUESTIONS_SCHEMA, strict: true },
          },
        },
        { signal: AbortSignal.timeout(attemptTimeoutMs) }
      );

      const result = JSON.parse(response.choices[0]?.message?.content ?? "{}") as {
        questions: RawQuestion[];
        motivation: InterviewPrepMotivation[];
      };
      const motivation = result.motivation.slice(0, 2);

      const validProjectIds = new Set(myProjects.map((p) => p.id));
      const questions = result.questions.map((q) => ({
        ...q,
        relatedProjectId:
          q.relatedProjectId && validProjectIds.has(q.relatedProjectId) ? q.relatedProjectId : null,
      }));
      const updatedAt = new Date().toISOString();

      const { error } = await supabase
        .from("interview_prep")
        .upsert(buildProjectQuestionsUpdatePayload(applicationId, questions, motivation, updatedAt), {
          onConflict: "application_id",
        });

      if (error) throw error;

      return { projectQuestions: questions, motivation, projectQuestionsUpdatedAt: updatedAt };
    } catch (error) {
      console.error(`project-questions attempt ${attempt} failed:`, error);

      if (isRetryable(error) && attempt < maxAttempts) {
        await sleep(1000 * attempt);
        continue;
      }

      return {
        error: `프로젝트 기반 질문 생성에 실패했습니다: ${describeGroqError(error)}`,
        status: 500,
      };
    }
  }

  return { error: "프로젝트 기반 질문 생성에 실패했습니다.", status: 500 };
}
