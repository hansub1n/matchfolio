import type { ExtractedJobPosting } from "@/features/extract-job-posting/model/normalize-extraction";
import { assertNotSampleMode } from "@/shared/lib/sample-mode";

import type { LinkFailReason, LinkReadMethod } from "../model/read-job-from-url";
import type { SiteId } from "../model/sites";

export interface LinkExtraction extends ExtractedJobPosting {
  sourceUrl: string;
  method: LinkReadMethod;
  site: SiteId;
}

export type LinkErrorReason = LinkFailReason | "invalid" | "unsupported" | "not_posting" | "duplicate" | "quota";

// 링크 읽기 실패 — 화면 문구, 이유(사용 기록·분기용), 사이트, 이미 있는 공고면 그 카드 id.
export class LinkError extends Error {
  constructor(
    message: string,
    readonly reason: LinkErrorReason,
    readonly site: SiteId | null,
    readonly applicationId: string | null = null
  ) {
    super(message);
    this.name = "LinkError";
  }
}

export async function extractFromUrl(url: string): Promise<LinkExtraction> {
  assertNotSampleMode();
  let response: Response;
  try {
    response = await fetch("/api/extract-from-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
  } catch {
    throw new LinkError("네트워크 연결이 끊겼습니다. 잠시 후 다시 시도해주세요.", "network", null);
  }
  const body = (await response.json().catch(() => null)) as
    | (Partial<LinkExtraction> & { error?: string; reason?: LinkErrorReason; site?: SiteId | null; applicationId?: string })
    | null;
  if (!response.ok) {
    throw new LinkError(
      body?.error ?? "이 링크는 읽지 못했어요",
      response.status === 429 ? "quota" : (body?.reason ?? "network"),
      body?.site ?? null,
      body?.applicationId ?? null
    );
  }
  return body as LinkExtraction;
}
