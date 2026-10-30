import { describe, expect, it } from "vitest";

import { readJobFromUrl, type ReadJobDeps } from "./read-job-from-url";
import { FetchFailure } from "./safe-fetch";
import { SITE_ADAPTERS } from "./sites";

// 링크 읽기의 갈림길 — 받아오기 실패 이유가 그대로 전달되는지, AI가 실패해도 사이트가 적어둔 값(JSON-LD)으로
// 채우는지, JSON-LD가 AI의 회사명·마감일을 덮어쓰는지.
const wanted = SITE_ADAPTERS.find((a) => a.id === "wanted")!;
const LD = `<script type="application/ld+json">${JSON.stringify({
  "@type": "JobPosting",
  title: "프론트엔드 개발자",
  hiringOrganization: { name: "오로라랩" },
  validThrough: "2026-11-30",
  description: "주요업무 - 웹 프론트엔드 개발",
})}</script>`;
const BODY = `<main>${"주요업무 React로 웹 서비스를 개발합니다. 자격요건 TypeScript 경험. ".repeat(10)}</main>`;
const ai = { company: "오로라 랩(지어냄)", position: "프론트", deadline: "2026-12-31", techStack: ["React", "TypeScript"], description: "주요업무\n- 웹 개발" };

function deps(html: string | FetchFailure, extract: ReadJobDeps["extractFromText"] = async () => ai): ReadJobDeps {
  return {
    fetchHtml: async (url) => {
      if (html instanceof FetchFailure) throw html;
      return { html, finalUrl: url };
    },
    extractFromText: extract,
  };
}

describe("readJobFromUrl", () => {
  it("받아오기 실패는 이유를 그대로 돌려준다(AI 안 씀)", async () => {
    expect(await readJobFromUrl(wanted, "1", deps(new FetchFailure("blocked")))).toEqual({ ok: false, reason: "blocked", usedAi: false });
  });

  it("본문 글자를 AI로 정리하고, 회사명·직무·마감일은 JSON-LD로 덮어쓴다", async () => {
    const r = await readJobFromUrl(wanted, "1", deps(LD + BODY));
    expect(r).toMatchObject({ ok: true, method: "url-text", usedAi: true });
    if (!r.ok) return;
    expect(r.posting).toMatchObject({ company: "오로라랩", position: "프론트엔드 개발자", deadline: "2026-11-30", techStack: ["React", "TypeScript"] });
  });

  it("AI가 실패해도 JSON-LD에 회사명·직무가 있으면 그걸로 채운다", async () => {
    const r = await readJobFromUrl(wanted, "1", deps(LD + BODY, async () => { throw new Error("429"); }));
    expect(r).toMatchObject({ ok: true, method: "url-jsonld", posting: { company: "오로라랩", deadline: "2026-11-30" } });
  });

  it("JSON-LD도 없고 AI가 실패하면 ai_failed, 본문이 거의 없으면 no_content", async () => {
    expect(await readJobFromUrl(wanted, "1", deps(BODY, async () => { throw new Error("x"); }))).toEqual({ ok: false, reason: "ai_failed", usedAi: true });
    expect(await readJobFromUrl(wanted, "1", deps("<p>로그인이 필요합니다</p>"))).toEqual({ ok: false, reason: "no_content", usedAi: false });
  });
});
