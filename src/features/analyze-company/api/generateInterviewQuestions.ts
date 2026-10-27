import type { InterviewPrep } from "@/entities/interview-prep";
import { track } from "@/shared/lib/analytics";
import { assertNotSampleMode } from "@/shared/lib/sample-mode";

export async function generateInterviewQuestions(applicationId: string): Promise<InterviewPrep> {
  assertNotSampleMode();
  let response: Response;
  try {
    response = await fetch("/api/analyze-company/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId }),
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
    throw new Error(error ?? `예상 질문을 만들지 못했습니다. (${response.status})`);
  }

  track("ai_used", { feature: "interview" });
  return response.json();
}
