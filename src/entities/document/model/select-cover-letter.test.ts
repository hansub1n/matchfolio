import { describe, expect, it } from "vitest";

import { selectCoverLetter } from "./select-cover-letter";
import type { UserDocument } from "./types";

function doc(overrides: Partial<UserDocument>): UserDocument {
  return {
    id: "d1",
    kind: "cover_letter",
    title: "자소서",
    content: "내용",
    isPrimary: false,
    createdAt: "2026-10-01T00:00:00Z",
    updatedAt: "2026-10-01T00:00:00Z",
    ...overrides,
  };
}

describe("selectCoverLetter", () => {
  it("그 공고에 낸 자소서가 있으면 대표보다 먼저 쓴다", () => {
    const docs = [doc({ id: "a", isPrimary: true }), doc({ id: "b" })];
    expect(selectCoverLetter(docs, "b")?.id).toBe("b");
  });

  it("제출 자료이 없으면 대표 자소서", () => {
    const docs = [doc({ id: "a" }), doc({ id: "b", isPrimary: true })];
    expect(selectCoverLetter(docs, null)?.id).toBe("b");
  });

  it("대표가 없으면 가장 최근에 고친 자소서", () => {
    const docs = [doc({ id: "a", updatedAt: "2026-10-01T00:00:00Z" }), doc({ id: "b", updatedAt: "2026-10-05T00:00:00Z" })];
    expect(selectCoverLetter(docs, null)?.id).toBe("b");
  });

  it("제출 자료이 지워진 자소서를 가리키면 대표로 넘어간다", () => {
    const docs = [doc({ id: "a", isPrimary: true })];
    expect(selectCoverLetter(docs, "deleted")?.id).toBe("a");
  });

  it("이력서는 자소서로 고르지 않는다", () => {
    expect(selectCoverLetter([doc({ kind: "resume" })], null)).toBeNull();
  });
});
