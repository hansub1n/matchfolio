import { normalizeTech } from "./normalize-tech";

// "이 기술을 쓰면 저 기술도 쓴 것으로 본다"는 명시적 관계 — 프레임워크가 다른
// 기술 위에서 동작해서, 표기 자체가 완전히 달라 포함 관계로는 못 잡는 경우.
const IMPLIES: Record<string, string[]> = {
  nextjs: ["react"],
  gatsby: ["react"],
  remix: ["react"],
  nuxt: ["vue"],
  nuxtjs: ["vue"],
  nestjs: ["nodejs", "typescript"],
  express: ["nodejs"],
  sveltekit: ["svelte"],
  django: ["python"],
  flask: ["python"],
  fastapi: ["python"],
  rails: ["ruby"],
  spring: ["java"],
  springboot: ["java"],
};

// 짧은 기술명(Go, C 등)은 포함 관계로 비교하면 다른 단어 속에 우연히 들어가
// 오탐이 나기 쉬워서(예: "go"가 "django/mongodb"에 포함됨) 이 길이 이상만
// 포함 관계 비교를 적용한다.
const MIN_CONTAINS_LENGTH = 3;

function impliedKeys(tech: string): Set<string> {
  const key = normalizeTech(tech);
  const result = new Set([key]);
  for (const implied of IMPLIES[key] ?? []) result.add(implied);
  return result;
}

// required 기술을 owned 기술이 만족하는지 본다 — 정확히 같거나(대소문자/공백/점
// 무시), 한쪽이 다른 쪽 표기를 포함하거나(React/ReactJS, Vue/Vue.js 같은 표기
// 차이), 명시적 별칭 관계(Next.js는 React 기반)로 연결돼 있으면 만족한 것으로
// 본다.
export function techSatisfies(required: string, owned: string): boolean {
  const req = normalizeTech(required);
  const own = normalizeTech(owned);
  if (!req || !own) return false;
  if (req === own) return true;
  if (req.length >= MIN_CONTAINS_LENGTH && own.length >= MIN_CONTAINS_LENGTH) {
    if (req.includes(own) || own.includes(req)) return true;
  }
  if (impliedKeys(owned).has(req)) return true;
  if (impliedKeys(required).has(own)) return true;
  return false;
}
