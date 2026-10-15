import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

import { env } from "@/shared/config/env";
import { JOB_POSTING_SCREENSHOTS_BUCKET } from "@/shared/config/constants";
import { supabaseAdmin } from "@/shared/api/supabase-admin";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRetryDelaySeconds(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const match = message.match(/"retryDelay":"([\d.]+)s"/);
  return match ? Number(match[1]) : null;
}

// 분당 한도 초과는 retryDelay가 짧고, 일일 한도 초과는 몇 시간 단위로 길다.
const RATE_LIMIT_RETRY_THRESHOLD_SECONDS = 60;

function isQuotaExceeded(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (!message.includes("RESOURCE_EXHAUSTED")) return false;
  const retryDelaySeconds = getRetryDelaySeconds(error);
  return retryDelaySeconds === null || retryDelaySeconds > RATE_LIMIT_RETRY_THRESHOLD_SECONDS;
}

function isRetryable(error: unknown) {
  if (error instanceof Error && error.name === "TimeoutError") return true;
  const message = error instanceof Error ? error.message : "";
  if (message.includes("RESOURCE_EXHAUSTED")) {
    const retryDelaySeconds = getRetryDelaySeconds(error);
    return retryDelaySeconds !== null && retryDelaySeconds <= RATE_LIMIT_RETRY_THRESHOLD_SECONDS;
  }
  return message.includes("UNAVAILABLE") || message.includes('"code":503');
}

const EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    company: { type: "string" },
    position: { type: "string" },
    deadline: { type: ["string", "null"], description: "YYYY-MM-DD, 없으면 null" },
    techStack: { type: "array", items: { type: "string" } },
    description: {
      type: "string",
      description:
        "'주요업무', '자격요건', '우대사항' 소제목마다 줄바꿈으로 구분하고, 각 항목 아래에 '- '로 시작하는 불릿 1~3개를 줄바꿈으로 나열. 내용이 없는 소제목은 생략.",
    },
  },
  required: ["company", "position", "techStack", "description"],
};

export async function POST(request: Request) {
  const formData = await request.formData();
  const files = formData.getAll("files").filter((f): f is File => f instanceof File);

  if (files.length === 0) {
    return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
  }

  const imageParts: { inlineData: { data: string; mimeType: string } }[] = [];
  const screenshotPaths: string[] = [];

  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || "image/png";
    const screenshotPath = `${randomUUID()}-${file.name}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(JOB_POSTING_SCREENSHOTS_BUCKET)
      .upload(screenshotPath, buffer, { contentType: mimeType });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    screenshotPaths.push(screenshotPath);
    imageParts.push({ inlineData: { data: buffer.toString("base64"), mimeType } });
  }

  const ai = new GoogleGenAI({ apiKey: env.gemini.apiKey });
  const maxAttempts = 2;
  const attemptTimeoutMs = 25000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: [
          {
            role: "user",
            parts: [
              ...imageParts,
              {
                text:
                  imageParts.length > 1
                    ? "이 채용공고 스크린샷들(같은 공고를 나눠서 캡처한 것)을 모두 종합해서 회사명, 직무, 마감일, 기술스택 태그를 추출하고, 주요업무/자격요건/우대사항을 소제목과 불릿으로 정리해줘."
                    : "이 채용공고 스크린샷에서 회사명, 직무, 마감일, 기술스택 태그를 추출하고, 주요업무/자격요건/우대사항을 소제목과 불릿으로 정리해줘.",
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseJsonSchema: EXTRACTION_SCHEMA,
          abortSignal: AbortSignal.timeout(attemptTimeoutMs),
        },
      });

      const extracted = JSON.parse(response.text ?? "{}");

      return NextResponse.json({ screenshotPaths, ...extracted });
    } catch (error) {
      console.error(`extract-job-posting attempt ${attempt} failed:`, error);

      if (isRetryable(error) && attempt < maxAttempts) {
        await sleep(1000 * attempt);
        continue;
      }

      const message = isQuotaExceeded(error)
        ? "오늘 Gemini 무료 사용량을 모두 썼습니다. 내일 다시 시도해주세요."
        : isRetryable(error)
          ? "Gemini 서버가 일시적으로 혼잡합니다. 잠시 후 다시 시도해주세요."
          : error instanceof Error
            ? error.message
            : "알 수 없는 오류";
      return NextResponse.json(
        { error: `이미지 분석에 실패했습니다: ${message}` },
        { status: 500 }
      );
    }
  }
}
