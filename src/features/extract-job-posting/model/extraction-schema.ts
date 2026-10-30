// 공고 읽기 결과 모양 — 스크린샷(Gemini)과 링크(Groq) 읽기가 같은 모양으로 받아 같은 정리(normalizeExtraction)를 거친다.
export const EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    company: { type: "string" },
    position: { type: "string" },
    deadline: { type: "string", description: "YYYY-MM-DD, 없으면 빈 문자열" },
    techStack: {
      type: "array",
      items: { type: "string" },
      description:
        "공고에 적힌 구체적인 기술 이름만(언어/프레임워크/라이브러리/DB/클라우드/도구, 예: React, TypeScript, AWS). 최대 10개. 업무 분야('빅데이터 분석', '사이버 보안'), 전공·자격, 설명 문구는 넣지 말고, 괄호 안 설명 없이 기술 이름만.",
    },
    description: {
      type: "string",
      description:
        "HTML 태그·엔티티 없는 평문. '주요업무', '자격요건', '우대사항' 소제목마다 줄바꿈으로 구분하고, 각 항목 아래에 '- '로 시작하는 불릿 1~3개를 줄바꿈으로 나열. 공고에 있는 내용만 쓰고 지어내지 말 것. 내용이 없는 소제목은 생략.",
    },
  },
  required: ["company", "position", "deadline", "techStack", "description"],
  additionalProperties: false,
};
