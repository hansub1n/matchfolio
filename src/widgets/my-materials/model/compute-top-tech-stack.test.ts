import { describe, expect, it } from "vitest";

import type { MyProject } from "@/entities/my-project";

import { computeTopTechStack } from "./compute-top-tech-stack";

function buildProject(overrides: Partial<MyProject> = {}): MyProject {
  return {
    id: "1",
    name: "런픽",
    description: null,
    techStack: [],
    highlights: [],
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("computeTopTechStack", () => {
  it("ranks tech stack by how many registered projects use it", () => {
    const projects = [
      buildProject({ id: "1", techStack: ["React", "TypeScript", "Supabase"] }),
      buildProject({ id: "2", techStack: ["React", "TypeScript"] }),
      buildProject({ id: "3", techStack: ["React"] }),
    ];
    expect(computeTopTechStack(projects, 2)).toEqual(["React", "TypeScript"]);
  });

  it("returns an empty list when there are no projects", () => {
    expect(computeTopTechStack([])).toEqual([]);
  });
});
