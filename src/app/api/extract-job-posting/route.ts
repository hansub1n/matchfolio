import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";

import { runWithModelFallback } from "@/features/extract-job-posting/model/model-fallback";
import {
  normalizeExtraction,
  type ExtractedJobPosting,
} from "@/features/extract-job-posting/model/normalize-extraction";
import { buildScreenshotPath } from "@/features/extract-job-posting/model/screenshot-path";
import { computeTileRects } from "@/features/extract-job-posting/model/split-tall-image";
import { getRequestUser } from "@/shared/api/supabase-server";
import { env } from "@/shared/config/env";
import { JOB_POSTING_SCREENSHOTS_BUCKET } from "@/shared/config/constants";
import { GEMINI_MODELS, isOverloaded } from "@/shared/lib/gemini";
import { consumeAiQuota, quotaExceededResponse } from "@/shared/lib/ai-quota";
import { isSameOrigin, unauthorizedResponse } from "@/shared/lib/request-guard";

// 시도 3번(1순위, 503 재시도, 2순위) × 25초 + 재시도 대기 1.5초가 최악의 경우.
export const maxDuration = 90;

const ATTEMPT_TIMEOUT_MS = 25000;
const OVERLOAD_RETRY_DELAY_MS = 1500;
const EXTRACTION_FAILED_MESSAGE = "지금 AI 요청이 몰려서 읽지 못했어요. 잠시 후 다시 시도해주세요";

const EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    company: { type: "string" },
    position: { type: "string" },
    deadline: { type: "string", description: "YYYY-MM-DD, 없으면 빈 문자열" },
    techStack: {
      type: "array",
      items: { type: "string" },
      description:
        "공고에 적힌 구체적인 기술 이름만(언어/프레임워크/라이브러리/DB/클라우드/도구, 예: React, TypeScript, AWS). 최대 10개. 업무 분야('빅데이터 분석', '사이버 보안'), 전공·자격, 설명 문구는 넣지 말고, 괄호 안 설명 없이 기술 이름만.",
    },
    description: {
      type: "string",
      description:
        "HTML 태그·엔티티 없는 평문. '주요업무', '자격요건', '우대사항' 소제목마다 줄바꿈으로 구분하고, 각 항목 아래에 '- '로 시작하는 불릿 1~3개를 줄바꿈으로 나열. 스크린샷에 보이는 내용만 쓰고 지어내지 말 것. 내용이 없는 소제목은 생략.",
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

interface ImagePart {
  buffer: Buffer;
  mimeType: string;
}

// 세로로 아주 긴 캡처는 조각으로 나눠 보낸다(computeTileRects 참고). 나머지는 그대로.
async function toModelImages(images: ImagePart[]): Promise<ImagePart[]> {
  const parts: ImagePart[] = [];
  for (const image of images) {
    const { width = 0, height = 0 } = await sharp(image.buffer).metadata();
    const rects = computeTileRects(width, height);
    if (rects.length === 1) {
      parts.push(image);
      continue;
    }
    for (const rect of rects) {
      const tile = await sharp(image.buffer)
        .extract({ left: 0, top: rect.top, width, height: rect.height })
        .png()
        .toBuffer();
      parts.push({ buffer: tile, mimeType: "image/png" });
    }
  }
  return parts;
}

async function extractWithGemini(images: ImagePart[], model: string): Promise<ExtractedJobPosting> {
  // SDK 자체 재시도(기본 5회, 최대 60초 간격)는 끈다 — 재시도/폴백 순서는 runWithModelFallback이 정한다.
  const ai = new GoogleGenAI({ apiKey: env.gemini.apiKey, httpOptions: { retryOptions: { attempts: 1 } } });
  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        role: "user",
        parts: [
          ...images.map(({ buffer, mimeType }) => ({
            inlineData: { data: buffer.toString("base64"), mimeType },
          })),
          { text: buildPrompt(images.length) },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: EXTRACTION_SCHEMA,
      abortSignal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
    },
  });
  return normalizeExtraction(JSON.parse(response.text ?? "{}"));
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
  const images: ImagePart[] = [];

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
    images.push({ buffer, mimeType });
  }

  let modelImages: ImagePart[];
  try {
    modelImages = await toModelImages(images);
  } catch (error) {
    // 깨졌거나 읽을 수 없는 이미지 — AI까지 가지 않았으니 횟수를 돌려준다.
    console.error("extract-job-posting 이미지 변환 실패:", error);
    await quota.refund();
    return NextResponse.json(
      { error: "이미지를 읽지 못했어요. 다른 캡처로 다시 올려주세요", reason: "unreadable" },
      { status: 422 }
    );
  }

  try {
    const extracted = await runWithModelFallback(
      (model) => {
        console.log(`extract-job-posting: ${model}로 추출 (이미지 ${modelImages.length}장)`);
        return extractWithGemini(modelImages, model);
      },
      {
        models: GEMINI_MODELS,
        isOverloaded,
        retryDelayMs: OVERLOAD_RETRY_DELAY_MS,
      }
    );
    return NextResponse.json({ screenshotPaths, ...extracted });
  } catch (error) {
    // 정확도가 낮은 다른 모델로 지어낸 값을 채우느니 실패를 알린다(직접 입력으로 넘어갈 수 있음).
    console.error("extract-job-posting 실패:", error);
    await quota.refund();
    // 사용 기록(extract_failed)용 — 마지막 실패가 응답 없음(시간 초과)이었는지, 모델이 거절했는지.
    const reason = isTimeout(error) ? "timeout" : "model";
    return NextResponse.json({ error: EXTRACTION_FAILED_MESSAGE, reason }, { status: 503 });
  }
}

function isTimeout(error: unknown): boolean {
  return error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
}
