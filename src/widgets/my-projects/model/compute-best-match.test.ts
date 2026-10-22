import { describe, expect, it } from "vitest";

import type { ProjectMatchWithCompany } from "@/entities/project-match";

import { computeBestMatch } from "./compute-best-match";

function buildRow(overrides: Partial<ProjectMatchWithCompany> = {}): ProjectMatchWithCompany {
  return {
    company: "토스",
    matches: [],
    ...overrides,
  };
}

describe("computeBestMatch", () => {
  it("returns null when the project never appears in any match result", () => {
    const rows = [buildRow({ matches: [{ projectName: "드림카드", fitScore: 80, reason: "", highlightPoints: [] }] })];
    expect(computeBestMatch("런픽", rows)).toBeNull();
  });

  it("picks the highest fitScore across multiple companies", () => {
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
        matches: [{ projectName: "런픽", fitScore: 60, reason: "", highlightPoints: [] }],
      }),
    ];
    expect(computeBestMatch("런픽", rows)).toEqual({ company: "당근", fitScore: 91 });
  });

  it("ignores rows where this project isn't among the matched entries", () => {
    const rows = [
      buildRow({
        company: "토스",
        matches: [{ projectName: "드림카드", fitScore: 95, reason: "", highlightPoints: [] }],
      }),
      buildRow({
        company: "당근",
        matches: [{ projectName: "런픽", fitScore: 50, reason: "", highlightPoints: [] }],
      }),
    ];
    expect(computeBestMatch("런픽", rows)).toEqual({ company: "당근", fitScore: 50 });
  });
});
