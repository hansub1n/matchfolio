import type { ExtractFailReason } from "@/shared/lib/analytics";
import { assertNotSampleMode } from "@/shared/lib/sample-mode";

// 추출 실패 — 화면에 보여줄 문구와, 사용 기록용 실패 종류(서버가 알려준 것만, 그 밖엔 null).
export class ExtractError extends Error {
  constructor(
    message: string,
    readonly reason: ExtractFailReason | null
  ) {
    super(message);
    this.name = "ExtractError";
  }
}

const REASONS: ExtractFailReason[] = ["model", "timeout", "unreadable"];

export interface ExtractedJobPosting {
  screenshotPaths: string[];
  company: string;
  position: string;
  deadline: string | null;
  techStack: string[];
  description: string;
}

export async function extractJobPosting(files: File[]): Promise<ExtractedJobPosting> {
  assertNotSampleMode();
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  let response: Response;
  try {
    response = await fetch("/api/extract-job-posting", {
      method: "POST",
      body: formData,
    });
  } catch {
    throw new Error("네트워크 연결이 끊겼습니다. 잠시 후 다시 시도해주세요.");
  }

  if (!response.ok) {
    const body = await response.text();
    const parsed = (() => {
      try {
        return JSON.parse(body) as { error?: string; reason?: string };
      } catch {
        return null;
      }
    })();
    const reason = REASONS.find((r) => r === parsed?.reason) ?? null;
    throw new ExtractError(parsed?.error ?? `스크린샷 분석에 실패했습니다. (${response.status})`, reason);
  }

  return response.json();
}
