import { describe, expect, it } from "vitest";

import type { ProjectMatchWithCompany } from "@/entities/project-match";

import { computeProjectMatchList } from "./compute-project-match-list";

function buildRow(overrides: Partial<ProjectMatchWithCompany> = {}): ProjectMatchWithCompany {
  return { company: "토스", matches: [], ...overrides };
}

describe("computeProjectMatchList", () => {
  it("returns every company this project appears in, sorted by fitScore descending", () => {
    const rows = [
      buildRow({
        company: "토스",
        matches: [{ projectName: "런픽", fitScore: 72, reason: "", highlightPoints: [] }],
      }),
      buildRow({
        company: "당근",
        matches: [{ projectName: "런픽", fitScore: 91, reason: "", highlightPoints: [] }],
      }),
      buildRow({
        company: "라인",
        matches: [{ projectName: "드림카드", fitScore: 60, reason: "", highlightPoints: [] }],
      }),
    ];
    expect(computeProjectMatchList("런픽", rows)).toEqual([
      { company: "당근", fitScore: 91 },
      { company: "토스", fitScore: 72 },
    ]);
  });

  it("returns an empty list when the project never appears in any match result", () => {
    const rows = [
      buildRow({
        matches: [{ projectName: "드림카드", fitScore: 80, reason: "", highlightPoints: [] }],
      }),
    ];
    expect(computeProjectMatchList("런픽", rows)).toEqual([]);
  });
});
