import { describe, expect, it } from "vitest";

import { techSatisfies } from "./tech-aliases";

describe("techSatisfies", () => {
  it("matches exactly, ignoring case/whitespace/dots", () => {
    expect(techSatisfies("TypeScript", "typescript")).toBe(true);
  });

  it("matches via an explicit alias relationship (Next.js implies React)", () => {
    expect(techSatisfies("React", "Next.js")).toBe(true);
    expect(techSatisfies("Next.js", "React")).toBe(true);
  });

  it("matches via an explicit alias relationship (TypeScript implies JavaScript)", () => {
    expect(techSatisfies("JavaScript", "TypeScript")).toBe(true);
    expect(techSatisfies("TypeScript", "JavaScript")).toBe(true);
  });

  it("matches notation differences via containment (Vue vs Vue.js)", () => {
    expect(techSatisfies("Vue", "Vue.js")).toBe(true);
  });

  it("does not false-positive on short tech names appearing inside unrelated words", () => {
    expect(techSatisfies("Go", "Django")).toBe(false);
    expect(techSatisfies("Go", "MongoDB")).toBe(false);
  });

  it("treats a trailing .js as the same tech (React.js vs React, also via Next.js)", () => {
    expect(techSatisfies("React.js", "React")).toBe(true);
    expect(techSatisfies("React.js", "Next.js")).toBe(true);
    expect(techSatisfies("Node", "Node.js")).toBe(true);
    expect(techSatisfies("Next.js", "NextAuth")).toBe(false);
  });

  it("does not treat Java and JavaScript as the same tech", () => {
    expect(techSatisfies("Java", "JavaScript")).toBe(false);
    expect(techSatisfies("JavaScript", "Java")).toBe(false);
  });

  it("returns false for genuinely unrelated tech", () => {
    expect(techSatisfies("React", "Vue")).toBe(false);
  });
});
