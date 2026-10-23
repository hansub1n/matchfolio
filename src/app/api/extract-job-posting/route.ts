import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";
import sharp from "sharp";

import {
  normalizeExtraction,
  type ExtractedJobPosting,
} from "@/features/extract-job-posting/model/normalize-extraction";
import { buildScreenshotPath } from "@/features/extract-job-posting/model/screenshot-path";
import { getRequestUser } from "@/shared/api/supabase-server";
import { env } from "@/shared/config/env";
import { JOB_POSTING_SCREENSHOTS_BUCKET } from "@/shared/config/constants";
import { isRetryable as isGeminiRetryable, GEMINI_MODEL } from "@/shared/lib/gemini";
import { describeGroqError, GROQ_VISION_MODEL, isRetryable as isGroqRetryable } from "@/shared/lib/groq";
import { consumeAiQuota, quotaExceededResponse } from "@/shared/lib/ai-quota";
import { isSameOrigin, unauthorizedResponse } from "@/shared/lib/request-guard";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// qwen/qwen3.8-27b(Groq 폴백)가 받는 이미지 1장당 최대 픽셀 수 / 요청당 최대 장수.
const MAX_GROQ_IMAGE_PIXELS = 33_177_600;
const MAX_GROQ_IMAGES = 3;

async function toGroqImageDataUrl(buffer: Buffer, mimeType: string): Promise<string> {
  const metadata = await sharp(buffer).metadata();
  const pixels = (metadata.width ?? 0) * (metadata.height ?? 0);

  if (pixels <= MAX_GROQ_IMAGE_PIXELS || !metadata.width) {
    return `data:${mimeType};base64,${buffer.toString("base64")}`;
  }

  const scale = Math.sqrt(MAX_GROQ_IMAGE_PIXELS / pixels);
  const resized = await sharp(buffer)
    .resize({ width: Math.floor(metadata.width * scale) })
    .toBuffer();

  return `data:${mimeType};base64,${resized.toString("base64")}`;
}

// 재시도 2회 × 25초 + 백오프가 Gemini/Groq 각각 최악의 경우라, 폴백까지 가면 최대
// 두 배가 된다 (Vercel Hobby 기본 300초 안에 넉넉히 들어옴).
export const maxDuration = 150;

const EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    company: { type: "string" },
    position: { type: "string" },
    deadline: { type: "string", description: "YYYY-MM-DD, 없으면 빈 문자열" },
    techStack: { type: "array", items: { type: "string" } },
    description: {
      type: "string",
      description:
        "'주요업무', '자격요건', '우대사항' 소제목마다 줄바꿈으로 구분하고, 각 항목 아래에 '- '로 시작하는 불릿 1~3개를 줄바꿈으로 나열. 내용이 없는 소제목은 생략.",
    },
  },
  required: ["company", "position", "deadline", "techStack", "description"],
  additionalProperties: false,
};

function buildPrompt(imageCount: number) {
  return imageCount > 1
    ? "이 채용공고 스크린샷들(같은 공고를 나눠서 캡처한 것)을 모두 종합해서 회사명, 직무, 마감일, 기술스택 태그를 추출하고, 주요업무/자격요건/우대사항을 소제목과 불릿으로 정리해줘."
    : "이 채용공고 스크린샷에서 회사명, 직무, 마감일, 기술스택 태그를 추출하고, 주요업무/자격요건/우대사항을 소제목과 불릿으로 정리해줘.";
}

async function extractWithGemini(
  buffers: { buffer: Buffer; mimeType: string }[]
): Promise<ExtractedJobPosting> {
  const ai = new GoogleGenAI({ apiKey: env.gemini.apiKey });
  const maxAttempts = 2;
  const attemptTimeoutMs = 25000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [
          {
            role: "user",
            parts: [
              ...buffers.map(({ buffer, mimeType }) => ({
                inlineData: { data: buffer.toString("base64"), mimeType },
              })),
              { text: buildPrompt(buffers.length) },
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
      return normalizeExtraction(extracted);
    } catch (error) {
      console.error(`extract-job-posting(gemini) attempt ${attempt} failed:`, error);
      if (isGeminiRetryable(error) && attempt < maxAttempts) {
        await sleep(1000 * attempt);
        continue;
      }
      throw error;
    }
  }
  throw new Error("Gemini 추출 실패");
}

async function extractWithGroq(
  buffers: { buffer: Buffer; mimeType: string }[]
): Promise<ExtractedJobPosting> {
  const groq = new Groq({ apiKey: env.groq.apiKey });
  const maxAttempts = 2;
  const attemptTimeoutMs = 25000;
  const limited = buffers.slice(0, MAX_GROQ_IMAGES);

  const imageParts = await Promise.all(
    limited.map(async ({ buffer, mimeType }) => ({
      type: "image_url" as const,
      image_url: { url: await toGroqImageDataUrl(buffer, mimeType) },
    }))
  );

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await groq.chat.completions.create(
        {
          model: GROQ_VISION_MODEL,
          messages: [
            {
              role: "user",
              content: [...imageParts, { type: "text", text: buildPrompt(imageParts.length) }],
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: { name: "job_posting_extraction", schema: EXTRACTION_SCHEMA, strict: true },
          },
        },
        { signal: AbortSignal.timeout(attemptTimeoutMs) }
      );

      const extracted = JSON.parse(response.choices[0]?.message?.content ?? "{}");
      return normalizeExtraction(extracted);
    } catch (error) {
      console.error(`extract-job-posting(groq) attempt ${attempt} failed:`, error);
      if (isGroqRetryable(error) && attempt < maxAttempts) {
        await sleep(1000 * attempt);
        continue;
      }
      throw error;
    }
  }
  throw new Error("Groq 추출 실패");
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "허용되지 않은 요청입니다." }, { status: 403 });
  }
  const { supabase, user } = await getRequestUser();
  if (!user) return unauthorizedResponse();

  const formData = await request.formData();
  const files = formData.getAll("files").filter((f): f is File => f instanceof File);

  if (files.length === 0) {
    return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
  }

  const quota = await consumeAiQuota(user.id, "extract_job_posting");
  if (!quota) return quotaExceededResponse();

  const screenshotPaths: string[] = [];
  const buffers: { buffer: Buffer; mimeType: string }[] = [];

  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || "image/png";
    const screenshotPath = buildScreenshotPath(user.id, randomUUID(), file.name);

    const { error: uploadError } = await supabase.storage
      .from(JOB_POSTING_SCREENSHOTS_BUCKET)
      .upload(screenshotPath, buffer, { contentType: mimeType });

    if (uploadError) {
      await quota.refund();
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    screenshotPaths.push(screenshotPath);
    buffers.push({ buffer, mimeType });
  }

  try {
    const extracted = await extractWithGemini(buffers);
    return NextResponse.json({ screenshotPaths, ...extracted });
  } catch (geminiError) {
    console.warn("Gemini 추출 실패, Groq(Qwen)로 폴백:", geminiError);
    try {
      const extracted = await extractWithGroq(buffers);
      return NextResponse.json({ screenshotPaths, ...extracted });
    } catch (groqError) {
      await quota.refund();
      return NextResponse.json(
        { error: `이미지 분석에 실패했습니다: ${describeGroqError(groqError)}` },
        { status: 500 }
      );
    }
  }
}
