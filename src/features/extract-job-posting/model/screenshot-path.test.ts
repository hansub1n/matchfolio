import { describe, expect, it } from "vitest";

import { buildScreenshotPath } from "./screenshot-path";

describe("buildScreenshotPath", () => {
  it("첫 폴더가 사용자 id여야 Storage 정책을 통과한다", () => {
    const path = buildScreenshotPath("user-1", "abc", "공고.png");
    expect(path).toBe("user-1/abc-공고.png");
    expect(path.split("/")[0]).toBe("user-1");
  });
});
