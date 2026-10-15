export interface ExtractedProject {
  name: string;
  description: string;
  techStack: string[];
  highlights: string[];
}

export async function extractProject(
  input: { githubUrl: string } | { text: string }
): Promise<ExtractedProject> {
  let response: Response;
  try {
    response = await fetch("/api/extract-project", {
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
    throw new Error(error ?? `프로젝트 정보 추출에 실패했습니다. (${response.status})`);
  }

  return response.json();
}
