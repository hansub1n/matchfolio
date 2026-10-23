import { describe, expect, it } from "vitest";

import { cleanDescription, dedupeTechStack, normalizeDeadline, normalizeExtraction } from "./normalize-extraction";

describe("normalizeDeadline", () => {
  it("YYYY-MM-DD는 그대로 둔다", () => {
    expect(normalizeDeadline("2026-11-30")).toBe("2026-11-30");
  });

  it("문장 안에 섞인 날짜만 꺼낸다", () => {
    expect(normalizeDeadline("채용 진행중 (2024-11-30 23:59)")).toBe("2024-11-30");
  });

  it("점/슬래시/한글 표기와 한 자리 월·일도 맞춘다", () => {
    expect(normalizeDeadline("2026.1.5")).toBe("2026-01-05");
    expect(normalizeDeadline("~2026/12/03까지")).toBe("2026-12-03");
    expect(normalizeDeadline("2026년 3월 7일 마감")).toBe("2026-03-07");
  });

  it("날짜가 없으면 null(상시 채용)", () => {
    expect(normalizeDeadline("상시채용")).toBeNull();
    expect(normalizeDeadline("")).toBeNull();
    expect(normalizeDeadline(null)).toBeNull();
  });

  it("존재하지 않는 날짜는 null", () => {
    expect(normalizeDeadline("2026-02-30")).toBeNull();
  });
});

describe("dedupeTechStack", () => {
  it("같은 기술이 여러 번 나오면 처음 표기만 남긴다", () => {
    expect(dedupeTechStack(["Java", "AWS", "Spring", "Java", "AWS"])).toEqual(["Java", "AWS", "Spring"]);
  });

  it("대소문자/점/공백 차이도 같은 기술로 본다", () => {
    expect(dedupeTechStack(["Next.js", "nextjs", "React", " react "])).toEqual(["Next.js", "React"]);
  });

  it("빈 문자열은 뺀다", () => {
    expect(dedupeTechStack(["", "  ", "Vue"])).toEqual(["Vue"]);
  });
});

describe("dedupeTechStack — 기술이 아닌 항목 거르기", () => {
  it("업무 분야처럼 한글로만 된 항목은 뺀다", () => {
    expect(dedupeTechStack(["Java", "사물인터넷", "빅데이터 분석", "네트워크/구조체/기타", "SQL/파이썬"])).toEqual([
      "Java",
      "SQL/파이썬",
    ]);
  });

  it("끝에 붙은 괄호 설명은 떼고 기술 이름만 남긴다", () => {
    expect(dedupeTechStack(["iOS (정가 iOS, .NET(iOS, IoT), IoT)", "Android"])).toEqual(["iOS", "Android"]);
  });

  it("너무 긴 설명 문구는 빼고, 최대 12개까지만 남긴다", () => {
    expect(dedupeTechStack(["React", "a".repeat(31)])).toEqual(["React"]);
    const many = Array.from({ length: 20 }, (_, i) => `Tech${i}`);
    expect(dedupeTechStack(many)).toHaveLength(12);
  });
});

describe("cleanDescription", () => {
  it("HTML 태그는 줄바꿈/삭제하고 엔티티를 푼다", () => {
    const raw = "<p>- 차량 관제 시스템 개발<br />- 관련 문서 운영</p><p><b>&#9654; [자격요건]</b></p><p>- 정규대학 &amp; 경력</p>";
    expect(cleanDescription(raw)).toBe("- 차량 관제 시스템 개발\n- 관련 문서 운영\n▶ [자격요건]\n- 정규대학 & 경력");
  });

  it("평문은 그대로 둔다", () => {
    expect(cleanDescription("주요업무\n- 웹 개발")).toBe("주요업무\n- 웹 개발");
  });
});

describe("normalizeExtraction", () => {
  it("마감일과 기술스택만 정리하고 나머지는 그대로 둔다", () => {
    const raw = {
      company: "토스",
      position: "프론트엔드",
      deadline: "채용 진행중 (2026-11-30 23:59)",
      techStack: ["Java", "Java"],
      description: "요약",
    };
    expect(normalizeExtraction(raw)).toEqual({ ...raw, deadline: "2026-11-30", techStack: ["Java"] });
  });
});
