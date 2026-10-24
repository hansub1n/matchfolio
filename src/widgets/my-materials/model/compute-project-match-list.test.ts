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
        matches: [{ projectName: "런픽", fitScore: 72, reason: "근거A", highlightPoints: [] }],
      }),
      buildRow({
        company: "당근",
        matches: [{ projectName: "런픽", fitScore: 91, reason: "근거B", highlightPoints: [] }],
      }),
      buildRow({
        company: "라인",
        matches: [{ projectName: "드림카드", fitScore: 60, reason: "", highlightPoints: [] }],
      }),
    ];
    expect(computeProjectMatchList("런픽", rows)).toEqual([
      { company: "당근", fitScore: 91, summary: "근거B" },
      { company: "토스", fitScore: 72, summary: "근거A" },
    ]);
  });

  it("신버전 매치면 summary 필드를 쓴다", () => {
    const rows = [
      buildRow({
        company: "토스",
        matches: [
          {
            projectId: "p1",
            projectName: "런픽",
            fitScore: 80,
            summary: "신버전 요약",
            evidence: [],
            gaps: [],
            pitch: "",
          },
        ],
      }),
    ];
    expect(computeProjectMatchList("런픽", rows)).toEqual([
      { company: "토스", fitScore: 80, summary: "신버전 요약" },
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
