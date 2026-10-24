import { NextResponse } from "next/server";
import Groq from "groq-sdk";

import { selectCoverLetter } from "@/entities/document";
import type { ApplicationReview, CoverLetterEdit, MotivationPoint } from "@/entities/project-match";
import {
  buildMaterialsPrompt,
  canRunApplicationMatch,
} from "@/features/match-projects/model/match-materials";
import { stripBannedClosing, WRITING_RULES } from "@/features/match-projects/model/writing-rules";
import { getRequestUser } from "@/shared/api/supabase-server";
import { env } from "@/shared/config/env";
import { describeGroqError, GROQ_TEXT_MODEL, isRetryable } from "@/shared/lib/groq";
import { consumeAiQuota, quotaExceededResponse } from "@/shared/lib/ai-quota";
import { isSameOrigin, unauthorizedResponse } from "@/shared/lib/request-guard";

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
    coverLetterEdits: {
      type: "array",
      description:
        "자소서가 있을 때만: 이 공고 기준으로 고치면 좋을 문장 0~3개. 자소서가 없으면 빈 배열. 원문에 없는 경험을 지어내 넣지 말 것",
      items: {
        type: "object",
        properties: {
          original: { type: "string", description: "자소서 원문 문장을 그대로 인용" },
          suggestion: { type: "string", description: "고친 문장. 원문에 있는 사실만 다시 배치·강조" },
          reason: { type: "string", description: "이 공고 요구사항 기준으로 왜 고치는지 한 줄" },
        },
        required: ["original", "suggestion", "reason"],
        additionalProperties: false,
      },
    },
    motivation: {
      type: "array",
      description:
        "자소서 지원 동기에 쓸 포인트 0~2개. 회사 사업/공고와 지원자 자료(프로젝트·자소서·이력서)에 실제로 있는 경험을 연결한다. 연결할 근거가 없으면 빈 배열",
      items: {
        type: "object",
        properties: {
          point: { type: "string", description: "회사 사업과 내 경험을 연결한 한 줄. 40자 안팎, 명사형/간결체" },
          example: { type: "string", description: "자소서 지원 동기에 바로 넣을 1~2문장. 아래 작성 규칙을 따른다." },
        },
        required: ["point", "example"],
        additionalProperties: false,
      },
    },
    resumeTips: {
      type: "array",
      items: { type: "string" },
      description: "이력서가 있을 때만: 이 공고 기준으로 이력서에서 앞에 두거나 강조할 점 0~3개(이력서에 있는 사실만). 이력서가 없으면 빈 배열",
    },
    matches: {
      type: "array",
      description: "등록된 프로젝트 전부에 대해 fitScore 내림차순으로 나열 (관련 없어도 포함). 프로젝트가 없으면 빈 배열",
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
            description: "자소서에 그대로 붙여 쓸 1~2문장. 아래 작성 규칙을 따른다.",
          },
        },
        required: ["projectId", "fitScore", "summary", "evidence", "gaps", "pitch"],
        additionalProperties: false,
      },
    },
  },
  required: ["recommendation", "matches", "coverLetterEdits", "resumeTips", "motivation"],
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
  coverLetterEdits: CoverLetterEdit[];
  resumeTips: string[];
  motivation: MotivationPoint[];
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "허용되지 않은 요청입니다." }, { status: 403 });
  }
  const { supabase, user } = await getRequestUser();
  if (!user) return unauthorizedResponse();

  const body = await request.json();
  const { applicationId } = body as { applicationId: string };

  if (!applicationId) {
    return NextResponse.json({ error: "applicationId는 필수입니다." }, { status: 400 });
  }

  const { data: company, error: companyError } = await supabase
    .from("applications")
    .select("company, position, description, tech_stack, submitted_cover_letter_id")
    .eq("id", applicationId)
    .single();

  if (companyError || !company) {
    return NextResponse.json({ error: "존재하지 않는 공고입니다." }, { status: 404 });
  }

  // 지원 동기를 회사 사업과 엮으려고, 회사 분석을 이미 돌렸으면 그 사업 내용을 같이 넘긴다(없으면 공고만).
  const { data: prep } = await supabase
    .from("interview_prep")
    .select("briefing")
    .eq("application_id", applicationId)
    .maybeSingle();
  const businessPoints: string[] = prep?.briefing?.business ?? [];

  const { data: projects, error: projectsError } = await supabase
    .from("my_projects")
    .select("id, name, description, tech_stack, highlights");

  if (projectsError) {
    return NextResponse.json({ error: projectsError.message }, { status: 500 });
  }

  const { data: documentRows, error: documentsError } = await supabase
    .from("documents")
    .select("id, kind, title, content, is_primary, created_at, updated_at");
  if (documentsError) {
    return NextResponse.json({ error: documentsError.message }, { status: 500 });
  }
  const documents = documentRows.map((d) => ({
    id: d.id,
    kind: d.kind,
    title: d.title,
    content: d.content,
    isPrimary: d.is_primary,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  }));
  const resume = documents.find((d) => d.kind === "resume") ?? null;
  const coverLetter = selectCoverLetter(documents, company.submitted_cover_letter_id);
  const materials = {
    projectCount: projects?.length ?? 0,
    resume: resume?.content ?? null,
    coverLetter: coverLetter ? { title: coverLetter.title, content: coverLetter.content } : null,
  };

  if (!projects || !canRunApplicationMatch(materials)) {
    return NextResponse.json(
      { error: "내 자료에 프로젝트·자소서·이력서 중 하나를 먼저 등록해주세요." },
      { status: 400 }
    );
  }

  const projectsText = projects.length === 0 ? "(등록된 프로젝트 없음)" : projects
    .map(
      (p) =>
        `- id: ${p.id} / ${p.name}: ${p.description ?? ""} (기술스택: ${p.tech_stack.join(", ") || "없음"}, 핵심 포인트: ${p.highlights.join(", ") || "없음"})`
    )
    .join("\n");

  const prompt = `다음은 한 지원자가 관심 있는 채용 공고와, 그 지원자가 등록해둔 프로젝트·자소서·이력서 목록이다.

공고 - 회사명: ${company.company}
공고 - 직무: ${company.position ?? "(정보 없음)"}
공고 - 기술스택: ${company.tech_stack.join(", ") || "(정보 없음)"}
공고 - 요약: ${company.description ?? "(정보 없음)"}
회사 사업 내용(회사 분석 결과): ${businessPoints.join(" / ") || "(정보 없음)"}

${buildMaterialsPrompt(materials)}

등록된 프로젝트 목록 (각 줄 맨 앞의 id를 응답의 projectId에 그대로 사용해라):
${projectsText}

너는 이 지원자의 커리어 코치가 아니라 냉정한 채용 담당자처럼 평가해야 한다. 모든 프로젝트를 무조건 긍정적으로 포장하지 말고, 공고에 실제로 명시된 요구사항과 겹치는 부분이 얼마나 되는지만 근거로 점수를 매겨라. 공고에 기술스택이나 구체적인 업무가 적혀있지 않다면 "완벽히 부합" 같은 말은 쓰지 말고, 근거가 약하다는 걸 그대로 드러내고 점수도 낮게 줘라. 등록된 프로젝트 전부에 대해 fitScore를 매겨서 반환해.

evidence의 requirement는 공고 원문 표현을 짧게 인용하고, experience는 그 프로젝트의 설명/핵심 포인트에 실제로 있는 사실만 써라. 없는 경험을 지어내지 마라. gaps는 이 프로젝트로 채우지 못하는 요구사항이고, 채울 게 없으면 빈 배열로 둬라. pitch는 이 프로젝트에서 공고 요구사항과 가장 맞닿은 일 하나를 골라 1~2문장으로 써라. recommendation은 이 공고에 지원할 때 내 자료(프로젝트·자소서·이력서) 중 무엇을 중심으로 어필하면 좋을지 한 줄로 요약해라.

coverLetterEdits는 자소서가 있을 때만 쓴다: 이 공고의 요구사항과 연결이 약하거나 막연한 문장을 원문 그대로 인용하고, 자소서·프로젝트에 실제로 있는 사실만으로 고친 문장과 이유를 써라. 고칠 게 없으면 빈 배열로 둬라. motivation은 자소서 지원 동기에 쓸 포인트 1~2개다. point는 회사 사업(또는 공고 내용)과 지원자 자료에 실제로 있는 경험을 연결한 40자 안팎의 명사형 한 줄, example은 자소서에 바로 이어 붙일 1~2문장이다. 자료에 없는 경험은 지어내지 말고, 연결할 근거가 없으면 빈 배열로 둬라. resumeTips는 이력서가 있을 때만, 이 공고 기준으로 앞에 두거나 강조할 점을 이력서에 있는 사실로만 써라.

${WRITING_RULES}`;

  const quota = await consumeAiQuota(user.id, "match_projects");
  if (!quota) return quotaExceededResponse();

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
          // 자소서·이력서가 입력에 들어가서(최대 약 2000자) 출력 상한을 그만큼 줄였다.
          max_completion_tokens: 4500,
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
      // 규칙을 줘도 틀에 박힌 맺음말이 섞일 때가 있어서 서버에서 한 번 더 뗀다.
      for (const m of result.matches) m.pitch = stripBannedClosing(m.pitch);
      for (const item of result.motivation) item.example = stripBannedClosing(item.example);
      for (const edit of result.coverLetterEdits) edit.suggestion = stripBannedClosing(edit.suggestion);

      const sortedMatches = result.matches
        .filter((m) => validIds.has(m.projectId))
        .sort((a, b) => b.fitScore - a.fitScore);

      // 자료가 없는 쪽은 AI가 뭘 돌려줘도 비운다(없는 자소서를 첨삭하지 않게).
      const review: ApplicationReview = {
        coverLetter: coverLetter
          ? { documentId: coverLetter.id, title: coverLetter.title, edits: result.coverLetterEdits.slice(0, 3) }
          : null,
        resumeTips: resume ? result.resumeTips.slice(0, 3) : [],
        motivation: result.motivation.slice(0, 2),
      };

      const { data, error } = await supabase
        .from("project_matches")
        .upsert(
          {
            application_id: applicationId,
            matches: sortedMatches,
            recommendation: result.recommendation,
            review,
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
        review: data.review,
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

      await quota.refund();
      return NextResponse.json(
        { error: `공고 매칭에 실패했습니다: ${describeGroqError(error)}` },
        { status: 500 }
      );
    }
  }
}
