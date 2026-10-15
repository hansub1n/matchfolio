import type { InterviewPrep } from "@/entities/interview-prep";

export interface AnalyzeCompanyInput {
  applicationId: string;
  company: string;
  position: string;
  description: string | null;
  techStack: string[];
}

export async function analyzeCompany(input: AnalyzeCompanyInput): Promise<InterviewPrep> {
  let response: Response;
  try {
    response = await fetch("/api/analyze-company", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
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
    throw new Error(error ?? `기업분석에 실패했습니다. (${response.status})`);
  }

  return response.json();
}
