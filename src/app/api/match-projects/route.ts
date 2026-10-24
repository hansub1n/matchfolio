import { NextResponse } from "next/server";

import { selectCoverLetter } from "@/entities/document";
import type { ApplicationReview, CoverLetterEdit, MotivationPoint } from "@/entities/project-match";
import { computeFitVerdict, describeFitForPrompt } from "@/features/match-projects/model/fit-verdict";
import {
  buildMaterialsPrompt,
  canRunApplicationMatch,
} from "@/features/match-projects/model/match-materials";
import {
  isMetaRewrite,
  stripBannedClosing,
  WRITING_RULES,
} from "@/features/match-projects/model/writing-rules";
import { getRequestUser } from "@/shared/api/supabase-server";
import { splitNameSubtitle } from "@/shared/lib/split-name-subtitle";
import { techSatisfies } from "@/shared/lib/tech-aliases";
import { env } from "@/shared/config/env";
import {
  createGroqClient,
  describeGroqError,
  GROQ_TEXT_MODEL,
  isRetryable,
  retryDelayMs,
} from "@/shared/lib/groq";
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
    coverLetterEdits: {
      type: "array",
      description:
        "자소서가 있을 때만: 이 공고 기준으로 고치면 좋을 문장 0~3개. 자소서가 없으면 빈 배열. 원문에 없는 경험을 지어내 넣지 말고, 지원자의 직무·목표를 바꾸지 말 것",
      items: {
        type: "object",
        properties: {
          original: { type: "string", description: "자소서 원문 문장을 그대로 인용" },
          suggestion: {
            type: "string",
            description:
              "원문 자리에 그대로 바꿔 넣을 문장 자체(지원자 본인의 말투·길이 유지). '~를 강조했습니다'처럼 고친 내용을 설명하지 말 것",
          },
          reason: { type: "string", description: "왜 고치는지 30자 안팎 한 줄, 평이한 말로(예: '공고가 상태 관리를 콕 집어 요구해서')" },
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
    opener: {
      type: "string",
      description: "공고 전체 기준 한두 문장 — 무엇을 쓸지는 프롬프트의 opener 지시를 따른다. 쓸 게 없으면 빈 문자열",
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
            description: "공고 요구사항과 이 프로젝트에만 있는 구체적 경험을 짝지은 근거 2~4개. 다른 프로젝트 근거와 같은 문장 금지",
            items: {
              type: "object",
              properties: {
                requirement: { type: "string", description: "공고 원문 표현을 짧게 인용" },
                experience: {
                  type: "string",
                  description: "이 프로젝트 설명/핵심 포인트에 실제로 있는 사실만, 40자 안팎 명사형(예: '비회원 임시 저장·방명록·참석 조사 구현'). 기술 이름만 쓰지 말고 그 기술로 무엇을 했는지. 프로젝트 이름은 넣지 않는다",
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
  required: ["matches", "coverLetterEdits", "resumeTips", "motivation", "opener"],
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
  matches: RawMatch[];
  coverLetterEdits: CoverLetterEdit[];
  resumeTips: string[];
  motivation: MotivationPoint[];
  opener: string;
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

  // 적합도는 AI가 아니라 기술스택 겹침으로 정한다 — 화면 맨 위 한 줄과 같은 계산.
  const fit = computeFitVerdict(
    company.tech_stack,
    projects.flatMap((p) => p.tech_stack)
  );
  // 겹치는 기술이 거의 없는 공고(다른 직무 공고 등)에 맞춰 자소서를 고치면 지원자의 직무·목표를
  // 바꾸는 첨삭이 나와서, 이때는 첨삭을 만들지 않는다.
  const skipEdits = fit.level === "low";
  // 맨 위 한두 문장 — 거의 안 맞는 공고면 부족한 점을 인정하는 말, 어느 정도 맞으면 내세울 점.
  const openerKind = fit.level === "low" ? "gap" : "strength";

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
기술 겹침(계산 결과, 이 사실과 다르게 쓰지 마라): ${describeFitForPrompt(fit)}

${buildMaterialsPrompt(materials)}

등록된 프로젝트 목록 (각 줄 맨 앞의 id를 응답의 projectId에 그대로 사용해라):
${projectsText}

너는 이 지원자의 커리어 코치가 아니라 냉정한 채용 담당자처럼 평가해야 한다. 모든 프로젝트를 무조건 긍정적으로 포장하지 말고, 공고에 실제로 명시된 요구사항과 겹치는 부분이 얼마나 되는지만 근거로 점수를 매겨라. 공고에 기술스택이나 구체적인 업무가 적혀있지 않다면 "완벽히 부합" 같은 말은 쓰지 말고, 근거가 약하다는 걸 그대로 드러내고 점수도 낮게 줘라. 등록된 프로젝트 전부에 대해 fitScore를 매겨서 반환해.

evidence는 공고 요구사항 중 이 프로젝트로 실제로 채워지는 것만 쓴다(못 채우는 건 gaps로). requirement는 공고 원문 표현을 짧게 인용하고, experience는 그 프로젝트의 설명/핵심 포인트에 실제로 있는 사실만 써라. Git·GitHub 사용처럼 개발자라면 누구나 하는 일은 근거로 쓰지 마라. 채워지는 게 하나뿐이면 하나만, 없으면 빈 배열로 둬라. 없는 경험을 지어내지 마라. gaps는 이 프로젝트로 채우지 못하는 요구사항이고, 채울 게 없으면 빈 배열로 둬라. 프로젝트마다 그 프로젝트에만 있는 사실로 근거를 써라 — 여러 프로젝트에 같은 근거 문장을 반복하지 말고, "○○ 사용 경험"처럼 기술 이름만 대지 말고 그 기술로 무엇을 만들었고 어떤 문제를 풀었는지 핵심 포인트에서 골라 써라. pitch는 이 프로젝트에서 공고 요구사항과 가장 맞닿은 일 하나를 골라 1~2문장으로 써라.

${skipEdits ? "coverLetterEdits는 빈 배열로 둬라(이 공고는 지원자 자료와 기술이 거의 겹치지 않는다)." : "coverLetterEdits는 자소서가 있을 때만 쓴다: 이 공고의 요구사항과 연결이 약하거나 막연한 문장을 원문 그대로 인용하고(original), 그 자리에 그대로 바꿔 넣을 문장(suggestion)과 이유를 써라. suggestion은 고친 결과 문장 자체다 — '~경험을 강조했습니다', '~라고 명시했습니다'처럼 무엇을 고쳤는지 설명하지 마라. 원문의 말투와 길이를 살리고 바꿀 부분만 바꾸되, 막연한 표현 자리에 자소서·프로젝트에 실제로 있는 구체적인 일 하나를 넣어라. 지원자의 직무·목표·관심 분야(예: 프론트엔드 개발자를 백엔드 지망으로)를 바꾸는 첨삭은 하지 마라 — 공고 직무가 지원자 자료의 직무와 다르면 그 차이를 메우려고 문장을 고치지 않는다. 고칠 게 없으면 빈 배열로 둬라."} motivation은 자소서 지원 동기에 쓸 포인트 1~2개다. point는 회사 사업(또는 공고 내용)과 지원자 자료에 실제로 있는 경험을 연결한 40자 안팎의 명사형 한 줄, example은 자소서에 바로 이어 붙일 1~2문장이다. 자료에 없는 경험은 지어내지 말고, 연결할 근거가 없으면 빈 배열로 둬라. resumeTips는 이력서가 있을 때만, 이 공고 기준으로 앞에 두거나 강조할 점을 이력서에 있는 사실로만 써라.

${
  openerKind === "gap"
    ? `opener: 이 공고는 지원자 자료와 기술이 거의 겹치지 않는다. 억지로 맞는 척하지 말고 공고가 요구하는 핵심 중 없는 것을 먼저 솔직히 인정한 뒤, 자료에 실제로 있는 가장 가까운 경험 하나로 어떻게 메울지 1~2문장으로 써라. 자료에 없는 학습 이력("현재 공부 중", "강의를 수강")은 지어내지 마라.
좋은 예: "Recoil은 아직 써보지 않았습니다. 다만 드림카드에서 여러 단계에 걸친 폼 상태를 Zustand로 한곳에 모아본 적이 있어, 상태를 어디에 두고 어떻게 나눌지는 같은 기준으로 판단할 수 있습니다."`
    : `opener: 이 공고와 지원자 자료가 어느 정도 맞는다. 부족한 점은 쓰지 말고, 공고의 핵심 업무와 가장 맞닿은 실제 경험을 프로젝트를 가로질러 묶어 자소서 첫 문단·자기소개에 쓸 1~2문장으로 써라(프로젝트별 pitch를 반복하지 말고 공고 기준으로 묶는다).`
}

모든 출력(summary, evidence, gaps, pitch, opener 등)에서 프로젝트 이름은 다음 표기만 쓴다(괄호 부제는 빼고): ${projects.map((p) => `"${splitNameSubtitle(p.name).main}"`).join(", ") || "(없음)"}.

${WRITING_RULES}`;

  const quota = await consumeAiQuota(user.id, "match_projects");
  if (!quota) return quotaExceededResponse();

  const groq = createGroqClient(env.groq.apiKey);
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
      // "런픽 (Run-Pick)"처럼 괄호 부제까지 붙은 등록 이름을 문장에 그대로 쓰면 읽기 어려워서 앞 이름만 남긴다.
      const shortenNames = (text: string) =>
        projects.reduce((acc, p) => {
          const { main } = splitNameSubtitle(p.name);
          return main === p.name ? acc : acc.split(p.name).join(main);
        }, text);
      for (const m of result.matches) {
        m.summary = shortenNames(m.summary);
        m.pitch = shortenNames(stripBannedClosing(m.pitch));
        for (const e of m.evidence) e.experience = shortenNames(e.experience);
      }
      for (const item of result.motivation) {
        item.point = shortenNames(item.point);
        item.example = shortenNames(item.example);
      }
      for (const edit of result.coverLetterEdits) edit.suggestion = shortenNames(edit.suggestion);
      // AI가 프로젝트 기술스택으로 이미 채워지는 기술(Next.js 프로젝트에 "React")을 부족하다고 할 때가 있어서,
      // 별칭·포함 관계로 채워지는 건 뺀다.
      const techById = new Map(projects.map((p) => [p.id, p.tech_stack as string[]]));
      for (const m of result.matches) {
        const owned = techById.get(m.projectId) ?? [];
        m.gaps = m.gaps.filter((gap) => !owned.some((tech) => techSatisfies(gap, tech)));
      }
      // 규칙을 줘도 틀에 박힌 맺음말이 섞일 때가 있어서 서버에서 한 번 더 뗀다.
      for (const item of result.motivation) item.example = stripBannedClosing(item.example);
      for (const edit of result.coverLetterEdits) edit.suggestion = stripBannedClosing(edit.suggestion);
      const opener = shortenNames(stripBannedClosing(result.opener ?? ""));

      const sortedMatches = result.matches
        .filter((m) => validIds.has(m.projectId))
        .sort((a, b) => b.fitScore - a.fitScore);

      // 자료가 없는 쪽은 AI가 뭘 돌려줘도 비운다(없는 자소서를 첨삭하지 않게).
      const review: ApplicationReview = {
        coverLetter: coverLetter
          ? {
              documentId: coverLetter.id,
              title: coverLetter.title,
              // 고친 문장 대신 "~를 강조했습니다"처럼 고친 내용을 설명한 첨삭은 붙여 쓸 수 없어서 버린다.
              edits: skipEdits
                ? []
                : result.coverLetterEdits.filter((e) => e.suggestion && !isMetaRewrite(e.suggestion)).slice(0, 3),
              ...(skipEdits && { editsSkipped: "low_fit" as const }),
            }
          : null,
        resumeTips: resume ? result.resumeTips.slice(0, 3) : [],
        motivation: result.motivation.filter((m) => m.example).slice(0, 2),
        ...(opener && { opener: { kind: openerKind, text: opener } }),
      };

      const { data, error } = await supabase
        .from("project_matches")
        .upsert(
          {
            application_id: applicationId,
            matches: sortedMatches,
            // 적합도 한 줄(기술 겹침 계산)과 같은 말을 반복해서 더 이상 만들지 않는다.
            recommendation: null,
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
        await sleep(retryDelayMs(error, attempt));
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
