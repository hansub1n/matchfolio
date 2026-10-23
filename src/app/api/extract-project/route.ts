import { NextResponse } from "next/server";
import Groq from "groq-sdk";

import { getRequestUser } from "@/shared/api/supabase-server";
import { env } from "@/shared/config/env";
import { describeGroqError, GROQ_TEXT_MODEL, isRetryable } from "@/shared/lib/groq";
import { isSameOrigin, unauthorizedResponse } from "@/shared/lib/request-guard";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 재시도 3회 × 25초 + 백오프 ≈ 78초가 최악의 경우 (Vercel Hobby 기본 300초 안에 넉넉히 들어옴).
export const maxDuration = 90;

function parseGithubRepo(githubUrl: string) {
  const match = githubUrl.match(/github\.com\/([^/]+)\/([^/#?]+)/i);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
}

async function fetchGithubReadme(githubUrl: string): Promise<string> {
  const parsed = parseGithubRepo(githubUrl);
  if (!parsed) {
    throw new Error("올바른 GitHub 저장소 URL이 아닙니다.");
  }

  const response = await fetch(
    `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/readme`,
    {
      headers: { Accept: "application/vnd.github.raw+json" },
      signal: AbortSignal.timeout(10000),
    }
  );

  if (!response.ok) {
    throw new Error(
      response.status === 404
        ? "저장소를 찾을 수 없거나 README가 없습니다."
        : "GitHub에서 README를 가져오지 못했습니다."
    );
  }

  return response.text();
}

const EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string", description: "프로젝트 이름" },
    description: { type: "string", description: "한두 문장으로 된 프로젝트 소개" },
    techStack: { type: "array", items: { type: "string" }, description: "사용한 기술스택 태그" },
    highlights: {
      type: "array",
      items: { type: "string" },
      description: "이력서/면접에서 어필할 만한 주요 기능이나 경험 3~5개, 짧은 구문으로",
    },
  },
  required: ["name", "description", "techStack", "highlights"],
  additionalProperties: false,
};

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "허용되지 않은 요청입니다." }, { status: 403 });
  }
  const { user } = await getRequestUser();
  if (!user) return unauthorizedResponse();

  const body = await request.json();
  const { githubUrl, text } = body as { githubUrl?: string; text?: string };

  let sourceText: string;
  try {
    if (githubUrl) {
      sourceText = await fetchGithubReadme(githubUrl);
    } else if (text && text.trim()) {
      sourceText = text.trim();
    } else {
      return NextResponse.json(
        { error: "githubUrl 또는 text 중 하나는 필수입니다." },
        { status: 400 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "불러오기에 실패했습니다." },
      { status: 400 }
    );
  }

  const prompt = `다음은 한 개발자가 만든 프로젝트에 대한 설명(README 또는 블로그 글)이다.

${sourceText}

위 내용을 바탕으로 프로젝트 이름, 한두 문장 소개, 기술스택 태그, 이력서/면접에서 어필할 만한 주요 기능이나 경험 3~5개를 뽑아줘.`;

  const groq = new Groq({ apiKey: env.groq.apiKey });
  const maxAttempts = 3;
  const attemptTimeoutMs = 25000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await groq.chat.completions.create(
        {
          model: GROQ_TEXT_MODEL,
          messages: [{ role: "user", content: prompt }],
          response_format: {
            type: "json_schema",
            json_schema: { name: "project_extraction", schema: EXTRACTION_SCHEMA, strict: true },
          },
        },
        { signal: AbortSignal.timeout(attemptTimeoutMs) }
      );

      const extracted = JSON.parse(response.choices[0]?.message?.content ?? "{}");
      return NextResponse.json(extracted);
    } catch (error) {
      console.error(`extract-project attempt ${attempt} failed:`, error);

      if (isRetryable(error) && attempt < maxAttempts) {
        await sleep(1000 * attempt);
        continue;
      }

      return NextResponse.json(
        { error: `프로젝트 정보 추출에 실패했습니다: ${describeGroqError(error)}` },
        { status: 500 }
      );
    }
  }
}
