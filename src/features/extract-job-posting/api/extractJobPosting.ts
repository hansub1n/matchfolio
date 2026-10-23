import { assertNotSampleMode } from "@/shared/lib/sample-mode";

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
    const error = (() => {
      try {
        return JSON.parse(body).error;
      } catch {
        return null;
      }
    })();
    throw new Error(error ?? `스크린샷 분석에 실패했습니다. (${response.status})`);
  }

  return response.json();
}
