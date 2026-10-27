import type { ProjectMatches } from "@/entities/project-match";
import { track } from "@/shared/lib/analytics";
import { assertNotSampleMode } from "@/shared/lib/sample-mode";

export async function matchProjects(applicationId: string): Promise<ProjectMatches> {
  assertNotSampleMode();
  let response: Response;
  try {
    response = await fetch("/api/match-projects", {
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
    throw new Error(error ?? `공고 매칭에 실패했습니다. (${response.status})`);
  }

  track("ai_used", { feature: "match" });
  return response.json();
}
