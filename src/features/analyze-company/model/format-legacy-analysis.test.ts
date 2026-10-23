import { describe, expect, it } from "vitest";

import { formatLegacyAnalysis } from "./format-legacy-analysis";

describe("formatLegacyAnalysis", () => {
  it("글자 그대로의 백슬래시-n을 실제 줄바꿈으로 바꾼다", () => {
    expect(formatLegacyAnalysis("첫 문단입니다.\\n\\n둘째 문단입니다.")).toBe(
      "첫 문단입니다.\n\n둘째 문단입니다."
    );
  });

  it("이미 실제 줄바꿈이면 그대로 둔다", () => {
    expect(formatLegacyAnalysis("첫 문단\n\n둘째 문단")).toBe("첫 문단\n\n둘째 문단");
  });
});
