import { describe, expect, it } from "vitest";

import { computeFitVerdict, describeFitForPrompt } from "./fit-verdict";

// 적합도 한 줄은 AI가 아니라 이 계산으로 정해지고, 낮으면 자소서 첨삭을 건너뛰는 기준도 된다.
describe("computeFitVerdict", () => {
  it("별칭 관계(Next.js → React)까지 겹친 것으로 본다", () => {
    const v = computeFitVerdict(["React", "TypeScript"], ["Next.js", "TypeScript"]);
    expect(v).toEqual({ level: "high", covered: ["React", "TypeScript"], missing: [] });
  });

  it("겹치는 기술이 30% 미만이면 low", () => {
    const v = computeFitVerdict(["Java", "Spring", "JSP", "JavaScript"], ["React", "Python"]);
    expect(v.level).toBe("low");
    expect(v.missing).toEqual(["Java", "Spring", "JSP", "JavaScript"]);
  });

  it("공고 기술스택이 없으면 판단하지 않는다", () => {
    expect(computeFitVerdict([], ["React"]).level).toBe("unknown");
  });

  it("공고에 같은 기술이 두 번 있어도 한 번만 센다", () => {
    const v = computeFitVerdict(["React", "react", "Vue"], ["React"]);
    expect(v.covered).toEqual(["React"]);
    expect(v.missing).toEqual(["Vue"]);
    expect(v.level).toBe("mid");
  });

  it("프롬프트용 한 줄에 있는 것/없는 것을 그대로 적는다", () => {
    expect(describeFitForPrompt(computeFitVerdict(["React", "Java"], ["React"]))).toBe(
      "공고 기술 2개 중 내 프로젝트에 있는 것: React / 없는 것: Java"
    );
  });
});
