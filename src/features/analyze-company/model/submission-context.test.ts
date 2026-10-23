import { describe, expect, it } from "vitest";

import { buildSubmissionContext, MAX_COVER_LETTER_CHARS } from "./submission-context";

describe("buildSubmissionContext", () => {
  it("기록이 없으면 null — 프롬프트에서 단락을 뺀다", () => {
    expect(buildSubmissionContext(null, [])).toBeNull();
    expect(buildSubmissionContext("   ", [])).toBeNull();
  });

  it("어필한 프로젝트와 자소서를 함께 넣는다", () => {
    expect(buildSubmissionContext("저는 폼 설계를...", ["DreamCard"])).toBe(
      "지원할 때 어필한 프로젝트: DreamCard\n지원할 때 제출한 자소서:\n저는 폼 설계를..."
    );
  });

  it("자소서만 있어도 넣는다", () => {
    expect(buildSubmissionContext("자소서", [])).toBe("지원할 때 제출한 자소서:\n자소서");
  });

  it("긴 자소서는 앞부분만 넣고 잘렸다고 표시한다", () => {
    const context = buildSubmissionContext("가".repeat(MAX_COVER_LETTER_CHARS + 100), []);
    expect(context).toContain("(앞부분)");
    expect(context!.length).toBeLessThan(MAX_COVER_LETTER_CHARS + 50);
  });
});
