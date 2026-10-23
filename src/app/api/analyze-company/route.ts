import { NextResponse } from "next/server";
import Groq from "groq-sdk";

import {
  buildSearchQueries,
  COMPANY_SEARCH_JOB_SITE_DOMAINS,
  dedupeSourcesByUrl,
  filterSourcesByCompany,
} from "@/features/analyze-company/model/filter-sources";
import { matchRelatedProject } from "@/features/analyze-company/model/match-related-project";
import { env } from "@/shared/config/env";
import { supabaseAdmin } from "@/shared/api/supabase-admin";
import { describeGroqError, GROQ_TEXT_MODEL, isRetryable } from "@/shared/lib/groq";
import { isSameOrigin } from "@/shared/lib/request-guard";

import { generateProjectQuestions, shouldGenerateProjectQuestions } from "./project-questions/generate";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 재시도 3회 × 35초 + 백오프 ≈ 108초가 최악의 경우 (Vercel Hobby 기본 300초 안에 넉넉히 들어옴).
export const maxDuration = 120;

const MAX_SOURCES_FOR_PROMPT = 8;
const MAX_NEWS_FOR_PROMPT = 3;
// 한국어 본문은 토큰이 많이 들어서, 검색 결과 11개를 통째로 넣으면 입력만
// 5천 토큰 가까이 된다 — 출력 4000을 더하면 Groq TPM 한도(8000)를 넘는다.
const MAX_CONTENT_CHARS = 300;
const NO_INFO_SUMMARY = "공개된 회사 정보가 적어요. 아래 링크에서 직접 확인해보세요";

interface TavilySource {
  title: string;
  url: string;
  content: string;
  publishedDate?: string;
}

async function tavilySearch(
  query: string,
  options: { includeDomains?: string[]; news?: boolean } = {}
): Promise<TavilySource[]> {
  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: env.tavily.apiKey,
        query,
        search_depth: "basic",
        max_results: 5,
        ...(options.includeDomains ? { include_domains: options.includeDomains } : {}),
        ...(options.news ? { topic: "news", days: 365 } : {}),
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return [];

    const body = await response.json();
    const results = Array.isArray(body.results) ? body.results : [];
    return results.map(
      (r: { title: string; url: string; content: string; published_date?: string }) => ({
        title: r.title,
        url: r.url,
        content: r.content,
        publishedDate: r.published_date,
      })
    );
  } catch (error) {
    console.warn("Tavily 검색 실패:", error);
    return [];
  }
}

// 회사명 하나로만 검색하면 결과가 빈약해서, 일반 검색 여러 번 + 채용/기업정보
// 사이트 한정 검색 1회 + 최근 소식용 뉴스 검색 1회를 병렬로 보낸 뒤 합친다.
async function searchCompany(
  company: string,
  position: string
): Promise<{ web: TavilySource[]; news: TavilySource[] }> {
  const queries = buildSearchQueries(company, position);
  const [generalResults, domainResults, newsResults] = await Promise.all([
    Promise.all(queries.map((q) => tavilySearch(q))).then((results) => results.flat()),
    tavilySearch(`"${company}"`, { includeDomains: COMPANY_SEARCH_JOB_SITE_DOMAINS }),
    tavilySearch(`"${company}"`, { news: true }),
  ]);

  // 뉴스를 먼저 넣어서, 같은 기사가 일반 검색에도 걸리면 뉴스 쪽으로 남긴다.
  const news = filterSourcesByCompany(dedupeSourcesByUrl(newsResults), company).slice(
    0,
    MAX_NEWS_FOR_PROMPT
  );
  const web = filterSourcesByCompany(
    dedupeSourcesByUrl([...news, ...generalResults, ...domainResults]).slice(news.length),
    company
  ).slice(0, MAX_SOURCES_FOR_PROMPT);
  return { web, news };
}

const ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string", description: "이 회사가 뭘 하는 곳인지 한 문장으로 요약" },
    facts: {
      type: "array",
      description:
        "설립연도/업종/직원수/매출/투자단계 중, 외부 자료에서 확인된 짧은 단일 값만. 기술스택처럼 목록인 값은 여기 쓰지 말고 sections에 써라. 최대 4개. 확인된 게 없으면 빈 배열.",
      items: {
        type: "object",
        properties: {
          label: { type: "string", enum: ["설립연도", "업종", "직원수", "매출", "투자단계"] },
          value: {
            type: "string",
            description: "원문에 쓰인 단위를 그대로 옮긴다(예: '백만원'을 '만원'으로 바꾸지 말 것).",
          },
          source: { type: "string", description: "이 정보를 확인한 출처(사이트명 등)" },
          asOf: {
            type: ["string", "null"],
            description: "값이 특정 연도 기준이면 그 연도(예: '2024'). 아니면 null.",
          },
        },
        required: ["label", "value", "source", "asOf"],
        additionalProperties: false,
      },
    },
    briefing: {
      type: "object",
      description:
        "면접 준비용 회사 정보. 각 항목은 40자 안팎의 명사형/간결체 한 줄. 외부 근거가 없는 항목은 빈 배열.",
      properties: {
        business: {
          type: "array",
          items: { type: "string" },
          description: "무슨 사업을 하나요 — 주력 서비스, 고객, 수익 구조. 2~3개.",
        },
        recent: {
          type: "array",
          items: { type: "string" },
          description:
            "최근 소식 — 투자, 신규 서비스, 확장 등 사업상 최근 변화. 뉴스/검색 결과에 있는 것만 0~3개. 채용 공고 게시는 최근 소식이 아니다.",
        },
        reverseQuestions: {
          type: "array",
          description: "역질문 추천 — 지원자가 면접관에게 물어볼 질문 2~3개, 위 회사 정보 기반.",
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
      required: ["business", "recent", "reverseQuestions"],
      additionalProperties: false,
    },
    questions: {
      type: "array",
      description:
        "이 공고/기업 특성에 맞춘 기본 예상 면접 질문 정확히 6개 — 기술 2개, 프로젝트 경험 2개, 협업 1개, 회사·도메인 1개. 공고/회사 정보만으로 만들고, 지원자의 프로젝트 경험을 지어내지 말 것.",
      minItems: 6,
      maxItems: 6,
      items: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: ["기술", "프로젝트 경험", "회사·도메인", "협업"],
          },
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
          noExperience: {
            type: "boolean",
            description: "기본 질문에는 항상 false.",
          },
        },
        required: ["category", "question", "intent", "hint", "relatedProjectId", "noExperience"],
        additionalProperties: false,
      },
    },
    confidence: {
      type: "string",
      enum: ["high", "low"],
      description: "검색된 정보가 충분하고 신뢰할 만하면 high, 정보가 적거나 불확실하면 low",
    },
  },
  required: ["summary", "facts", "briefing", "questions", "confidence"],
  additionalProperties: false,
};

interface AnalysisResult {
  summary: string;
  facts: { label: string; value: string; source: string; asOf: string | null }[];
  briefing: {
    business: string[];
    recent: string[];
    reverseQuestions: { question: string; why: string }[];
  };
  questions: {
    category: string;
    question: string;
    intent: string;
    hint: string;
    relatedProjectId: string | null;
    noExperience: boolean;
  }[];
  confidence: "high" | "low";
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

  const { data: myProjects } = await supabaseAdmin
    .from("my_projects")
    .select("id, name, description, tech_stack, highlights");

  // "내 프로젝트 기반 질문"은 아직 한 번도 만들어진 적이 없을 때(이 지원이
  // 처음 분석되는 경우뿐 아니라, 과거에 분석은 했지만 그때는 프로젝트가
  // 없었거나 생성이 실패해서 project_questions가 비어 있는 경우도 포함) 그
  // 자리에서 같이 만든다 — 한 번 만들어진 뒤로는 "다시 분석"이 아니라 그
  // 그룹 전용 "다시 만들기"로만 갱신된다.
  const { data: existingPrep } = await supabaseAdmin
    .from("interview_prep")
    .select("id, project_questions, motivation")
    .eq("application_id", applicationId)
    .maybeSingle();
  // 지원 동기 포인트(motivation)는 이 레이어에 나중에 추가돼서, 프로젝트
  // 질문은 있는데 motivation만 비어 있는 레코드도 같이 채운다.
  const needsProjectQuestions =
    !existingPrep || existingPrep.project_questions === null || existingPrep.motivation === null;

  const { web, news } = await searchCompany(company, position ?? "");

  const searchContext =
    web.length > 0
      ? web.map((s) => `- ${s.title}: ${s.content.slice(0, MAX_CONTENT_CHARS)}`).join("\n")
      : "(웹 검색 결과 없음)";
  const newsContext =
    news.length > 0
      ? news
          .map(
            (s) =>
              `- ${s.publishedDate ? `[${s.publishedDate.slice(0, 10)}] ` : ""}${s.title}: ${s.content.slice(0, MAX_CONTENT_CHARS)}`
          )
          .join("\n")
      : "(뉴스 검색 결과 없음)";

  const prompt = `다음은 한 채용 지원자가 지원한 공고와 그 회사에 대한 웹 검색 결과다.

회사명: ${company}
직무: ${position ?? "(정보 없음)"}
기술스택: ${techStack.join(", ") || "(정보 없음)"}
공고 요약: ${description ?? "(정보 없음)"}

웹 검색 결과 (회사명 "${company}"가 실제로 언급된 것만 추려냄, 최대 ${MAX_SOURCES_FOR_PROMPT}개):
${searchContext}

최근 뉴스 (최대 ${MAX_NEWS_FOR_PROMPT}개):
${newsContext}

위 정보를 바탕으로 이 회사에 대한 분석과, 이 공고/기업 특성에 맞춘 예상 면접 질문을 만들어줘.

중요:
- 공고 회사(${company})와 다른 회사의 정보를 절대 섞지 마라. 이름이 비슷하지만 업종이나 사업 내용이 공고와 안 맞는 회사로 보이면 그 정보는 쓰지 마라.
- 공고 본문(업종, 주요업무)과 모순되는 내용은 제외해라.
- briefing은 면접 준비용이다. business(주력 서비스/고객/수익 구조), recent(투자/신규 서비스/확장 등 사업상 최근 변화 — 뉴스나 검색 결과에 있는 것만, 채용 공고 게시·채용 조건 변경은 넣지 마라), reverseQuestions(면접관에게 물어볼 질문 + 그 질문이 좋은 이유 한 줄(why), 위 회사 정보 기반)만 쓴다. 복지/혜택, 기술 스택은 넣지 마라(기술은 공고에 이미 있다). 공고 본문(주요업무, 자격요건, 우대사항)을 그대로 옮겨 적지 마라. 외부 근거가 없는 항목은 빈 배열로 둬라.
- briefing의 문장은 한 줄 40자 안팎으로 짧게, "~합니다" 같은 늘어지는 어미 대신 명사형/간결체로 써라(예: "카페24 기반 자사몰 운영", "2025년 오픈마켓 입점 확대"). reverseQuestions의 question만 질문형으로 끝내라.
- facts(설립연도/업종/직원수/매출/투자단계)도 외부 자료에서 확인된 것만 최대 4개. 목록형 값(기술스택 등)은 facts에 쓰지 말고 sections에 써라. 숫자 단위는 원문 그대로 옮기고("백만원"을 "만원"으로 바꾸는 식으로 바꾸지 마라), source에는 확인한 사이트명을 써라. 확인된 게 없으면 빈 배열로 둬라.
- 검색 결과로 확인되지 않은 내용은 지어내지 마라. 확실한 정보가 부족하면 confidence를 low로 표시해라.
- questions는 공고/회사 정보만으로 만드는 기본 질문이다. 지원자의 프로젝트 경험을 지어내지 마라 — 지원자가 어떤 프로젝트를 했는지 모른다고 가정하고 질문/hint를 써라. relatedProjectId는 모든 질문에서 항상 null로 두고(실제 매칭은 서버에서 따로 처리한다), noExperience도 모든 질문에서 false로 둬라.`;

  const groq = new Groq({ apiKey: env.groq.apiKey });
  const maxAttempts = 3;
  const attemptTimeoutMs = 35000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await groq.chat.completions.create(
        {
          model: GROQ_TEXT_MODEL,
          messages: [{ role: "user", content: prompt }],
          // Groq on_demand 티어 TPM 한도(분당 8000)에 걸리지 않도록 여유를
          // 둔다 — 이 스키마(요약+사실 4개+섹션+질문 6개)는 4000 토큰 안에서
          // 충분히 끝난다.
          max_completion_tokens: 4000,
          response_format: {
            type: "json_schema",
            json_schema: { name: "company_analysis", schema: ANALYSIS_SCHEMA, strict: true },
          },
        },
        { signal: AbortSignal.timeout(attemptTimeoutMs) }
      );

      const result = JSON.parse(response.choices[0]?.message?.content ?? "{}") as AnalysisResult;

      // relatedProjectId는 AI에게 안 맡긴다(프로젝트 정보를 아예 안 줬으니
      // 항상 null로 올 것) — 공고 기술스택과 가장 많이 겹치는 프로젝트를
      // 여기서 직접 골라 "프로젝트 경험" 질문에만 붙인다.
      const relatedProjectId = matchRelatedProject(
        techStack,
        (myProjects ?? []).map((p) => ({ id: p.id, techStack: p.tech_stack }))
      );
      const questions = result.questions.map((q) => ({
        ...q,
        relatedProjectId: q.category === "프로젝트 경험" ? relatedProjectId : null,
      }));

      // 외부에서 확인된 사실이 하나도 없으면, AI가 뭐라고 요약했든 "정보가
      // 적다"는 걸 그대로 드러낸다.
      const { business, recent } = result.briefing;
      const summary = business.length === 0 && recent.length === 0 ? NO_INFO_SUMMARY : result.summary;

      const { data, error } = await supabaseAdmin
        .from("interview_prep")
        .upsert(
          {
            application_id: applicationId,
            summary,
            facts: result.facts,
            briefing: result.briefing,
            sections: null,
            questions,
            confidence: result.confidence,
            company_analysis: null,
            interview_questions: null,
            sources: [
              ...web.map((s) => ({ title: s.title, url: s.url })),
              ...news.map((s) => ({ title: s.title, url: s.url, kind: "news" as const })),
            ],
            updated_at: new Date().toISOString(),
          },
          { onConflict: "application_id" }
        )
        .select()
        .single();

      if (error) throw error;

      let projectQuestions = data.project_questions;
      let motivation = data.motivation;
      let projectQuestionsUpdatedAt = data.project_questions_updated_at;
      if (needsProjectQuestions && shouldGenerateProjectQuestions(myProjects?.length ?? 0)) {
        const projectResult = await generateProjectQuestions(applicationId);
        if (!("error" in projectResult)) {
          projectQuestions = projectResult.projectQuestions;
          motivation = projectResult.motivation;
          projectQuestionsUpdatedAt = projectResult.projectQuestionsUpdatedAt;
        } else {
          console.warn("프로젝트 기반 질문 생성 실패:", projectResult.error);
        }
      }

      return NextResponse.json({
        id: data.id,
        applicationId: data.application_id,
        summary: data.summary,
        facts: data.facts,
        briefing: data.briefing,
        sections: data.sections,
        questions: data.questions,
        confidence: data.confidence,
        projectQuestions,
        motivation,
        projectQuestionsUpdatedAt,
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
        { error: `기업분석에 실패했습니다: ${describeGroqError(error)}` },
        { status: 500 }
      );
    }
  }
}
