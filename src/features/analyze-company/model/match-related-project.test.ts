import { describe, expect, it } from "vitest";

import { matchRelatedProject } from "./match-related-project";

describe("matchRelatedProject", () => {
  it("공고 기술스택과 겹치는 게 가장 많은 프로젝트를 고른다", () => {
    const projects = [
      { id: "p1", techStack: ["Vue", "Nuxt"] },
      { id: "p2", techStack: ["React", "TypeScript", "Next.js"] },
    ];
    expect(matchRelatedProject(["React", "TypeScript"], projects)).toBe("p2");
  });

  it("겹치는 기술이 하나도 없으면 null", () => {
    const projects = [{ id: "p1", techStack: ["Vue"] }];
    expect(matchRelatedProject(["React", "TypeScript"], projects)).toBeNull();
  });

  it("프로젝트가 없으면 null", () => {
    expect(matchRelatedProject(["React"], [])).toBeNull();
  });

  it("별칭 관계(Next.js → React)도 겹침으로 본다", () => {
    const projects = [{ id: "p1", techStack: ["Next.js"] }];
    expect(matchRelatedProject(["React"], projects)).toBe("p1");
  });
});
