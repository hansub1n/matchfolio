import { techSatisfies } from "@/shared/lib/tech-aliases";

export type FitLevel = "high" | "mid" | "low" | "unknown";

export interface FitVerdict {
  level: FitLevel;
  // 공고 기술 중 내 프로젝트에 있는 것 / 없는 것 — 표기는 공고 쪽 그대로.
  covered: string[];
  missing: string[];
}

// 공고 매칭 맨 위의 적합도 한 줄. AI 점수는 매번 흔들리고 근거를 확인하기 어려워서,
// 공고 기술스택과 내 프로젝트 기술스택이 얼마나 겹치는지로만 정한다(별칭·포함 관계는 techSatisfies 기준).
// 공고에 기술스택이 없으면 판단하지 않는다(unknown).
export function computeFitVerdict(postingTech: string[], ownedTech: string[]): FitVerdict {
  const seen = new Set<string>();
  const covered: string[] = [];
  const missing: string[] = [];
  for (const tech of postingTech) {
    const key = tech.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    if (ownedTech.some((owned) => techSatisfies(tech, owned))) covered.push(tech);
    else missing.push(tech);
  }

  const total = covered.length + missing.length;
  if (total === 0) return { level: "unknown", covered, missing };
  const ratio = covered.length / total;
  const level: FitLevel = ratio >= 0.6 ? "high" : ratio >= 0.3 ? "mid" : "low";
  return { level, covered, missing };
}

export const FIT_LABEL: Record<FitLevel, string> = {
  high: "기술이 많이 겹쳐요",
  mid: "기술이 일부 겹쳐요",
  low: "기술이 거의 안 겹쳐요",
  unknown: "공고에 기술스택이 없어요",
};

// 프롬프트에 넣는 한 줄 — AI가 적합도를 따로 지어내지 않고 이 사실을 바탕으로 쓰게 한다.
export function describeFitForPrompt(verdict: FitVerdict): string {
  if (verdict.level === "unknown") return "공고에 기술스택이 적혀 있지 않음";
  return `공고 기술 ${verdict.covered.length + verdict.missing.length}개 중 내 프로젝트에 있는 것: ${
    verdict.covered.join(", ") || "없음"
  } / 없는 것: ${verdict.missing.join(", ") || "없음"}`;
}
