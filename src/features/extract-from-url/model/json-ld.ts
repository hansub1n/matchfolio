// 공고 페이지의 JSON-LD(schema.org JobPosting) — 사이트가 검색엔진용으로 넣어둔 정보라 AI보다 정확하다.
// 회사명·직무·마감일은 AI 결과를 이걸로 덮어쓴다. 원티드·리멤버는 있고 점핏은 없다(2026-10-30 조사).

export interface JobPostingLd {
  company: string | null;
  title: string | null;
  // YYYY-MM-DD
  deadline: string | null;
  description: string | null;
  skills: string[];
}

function asText(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (value && typeof value === "object" && "name" in value) return asText((value as { name: unknown }).name);
  return null;
}

function findJobPosting(node: unknown): Record<string, unknown> | null {
  const stack = [node];
  while (stack.length) {
    const current = stack.pop();
    if (Array.isArray(current)) stack.push(...current);
    else if (current && typeof current === "object") {
      const obj = current as Record<string, unknown>;
      const types = ([] as unknown[]).concat(obj["@type"] ?? []);
      if (types.includes("JobPosting")) return obj;
      if (obj["@graph"]) stack.push(obj["@graph"]);
    }
  }
  return null;
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

// JSON-LD 본문은 HTML이 섞여 올 때가 있다 — 줄바꿈 태그만 살리고 나머지는 지운다.
function htmlToText(html: string): string {
  return html
    .replace(/<\s*(br|\/p|\/li|\/div|\/h\d)\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&(#\d+|[a-z]+);/gi, (m, code: string) =>
      code.startsWith("#") ? String.fromCharCode(Number(code.slice(1))) : (ENTITIES[code.toLowerCase()] ?? m)
    )
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function parseJobPostingLd(html: string): JobPostingLd | null {
  for (const match of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    let data: unknown;
    try {
      data = JSON.parse(match[1].trim());
    } catch {
      continue;
    }
    const job = findJobPosting(data);
    if (!job) continue;
    const validThrough = asText(job.validThrough);
    const description = asText(job.description);
    const skills = ([] as unknown[])
      .concat(job.skills ?? [])
      .flatMap((s) => (typeof s === "string" ? s.split(",") : []))
      .map((s) => s.trim())
      .filter(Boolean);
    return {
      company: asText(job.hiringOrganization),
      title: asText(job.title),
      deadline: validThrough?.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? null,
      description: description ? htmlToText(description) : null,
      skills,
    };
  }
  return null;
}

// 공고 페이지에서 눈에 보이는 글자만 — 스크립트·스타일을 빼고 태그를 지운다. Groq에 보낼 본문.
export function visibleText(html: string): string {
  return htmlToText(
    html
      .replace(/<(script|style|noscript|template|svg|head)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}
