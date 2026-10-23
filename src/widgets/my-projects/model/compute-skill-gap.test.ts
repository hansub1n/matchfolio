import { describe, expect, it } from "vitest";

import type { Application } from "@/entities/application";
import type { MyProject } from "@/entities/my-project";

import { computeSkillGap } from "./compute-skill-gap";

function buildApplication(overrides: Partial<Application> = {}): Application {
  return {
    id: "1",
    company: "토스",
    position: "프론트엔드",
    stage: "document",
    outcome: "in_progress",
    appliedAt: null,
    deadline: null,
    jobPostingUrl: null,
    screenshotPaths: [],
    description: null,
    memo: null,
    techStack: [],
    submittedProjectIds: [],
    coverLetter: null,
    submissionUpdatedAt: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

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

describe("computeSkillGap", () => {
  it("lists tech required in 2+ applications but absent from every registered project", () => {
    const applications = [
      buildApplication({ id: "1", techStack: ["React", "GraphQL"] }),
      buildApplication({ id: "2", techStack: ["GraphQL"] }),
    ];
    const projects = [buildProject({ techStack: ["React"] })];
    expect(computeSkillGap(applications, projects)).toEqual([{ name: "GraphQL", count: 2 }]);
  });

  it("excludes tech that only appeared in a single posting", () => {
    const applications = [buildApplication({ id: "1", techStack: ["Rust"] })];
    expect(computeSkillGap(applications, [])).toEqual([]);
  });

  it("treats case/whitespace/dot variants as the same tech (Next.js == nextjs)", () => {
    const applications = [
      buildApplication({ id: "1", techStack: ["Next.js"] }),
      buildApplication({ id: "2", techStack: ["nextjs"] }),
    ];
    const projects = [buildProject({ techStack: ["NEXT JS"] })];
    expect(computeSkillGap(applications, projects)).toEqual([]);
  });

  it("closes the gap via an alias relationship (owning Next.js counts as owning React)", () => {
    const applications = [
      buildApplication({ id: "1", techStack: ["React"] }),
      buildApplication({ id: "2", techStack: ["React"] }),
    ];
    const projects = [buildProject({ techStack: ["Next.js"] })];
    expect(computeSkillGap(applications, projects)).toEqual([]);
  });

  it("sorts by how many postings asked for it, most first", () => {
    const applications = [
      buildApplication({ id: "1", techStack: ["Rust"] }),
      buildApplication({ id: "2", techStack: ["Go", "Rust", "Elixir"] }),
      buildApplication({ id: "3", techStack: ["Go"] }),
      buildApplication({ id: "4", techStack: ["Elixir"] }),
    ];
    const result = computeSkillGap(applications, []);
    expect(result.map((r) => r.name)).toEqual(["Rust", "Go", "Elixir"]);
    expect(result.map((r) => r.count)).toEqual([2, 2, 2]);
  });

  it("caps the result at the given limit", () => {
    const applications = Array.from({ length: 10 }, (_, i) => [
      buildApplication({ id: `${i}a`, techStack: [`Tech${i}`] }),
      buildApplication({ id: `${i}b`, techStack: [`Tech${i}`] }),
    ]).flat();
    expect(computeSkillGap(applications, [], 8)).toHaveLength(8);
  });

  it("returns an empty list when there's no gap", () => {
    const applications = [
      buildApplication({ id: "1", techStack: ["React"] }),
      buildApplication({ id: "2", techStack: ["React"] }),
    ];
    const projects = [buildProject({ techStack: ["React"] })];
    expect(computeSkillGap(applications, projects)).toEqual([]);
  });
});
