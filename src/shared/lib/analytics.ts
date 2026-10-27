import { track as vercelTrack } from "@vercel/analytics";

import type { TutorialChapterId } from "@/shared/config/tutorial";

// 사용 기록 — 이벤트 이름과 속성은 전부 여기서만 정의한다.
// 보내는 건 "무슨 일이 있었는지"뿐이다. 회사명·공고 내용·자소서처럼 사용자가 넣은 내용은 절대 넣지 않는다
// (속성 타입을 정해진 값·숫자로만 둬서 문자열을 그대로 흘려보낼 자리가 없게 했다).
export type CardStage = "interested" | "document";
export type BoardColumn = "interested" | "document" | "coding_test" | "interview" | "finished";
export type ExtractFailReason = "model" | "timeout" | "unreadable";
export type AiFeature = "company" | "match" | "interview";
export type FeedbackKind = "inconvenient" | "idea" | "good";

export interface AnalyticsEvents {
  card_created: { method: "screenshot" | "manual"; stage: CardStage };
  extract_failed: { reason: ExtractFailReason };
  // 추출 뒤 저장 전에 사용자가 고친 칸 수 — 추출 정확도를 본다.
  extract_edited: { fields_changed: number };
  card_moved: { from: BoardColumn; to: BoardColumn };
  ai_used: { feature: AiFeature };
  tutorial: { action: "completed" | "skipped"; chapter: TutorialChapterId };
  feedback_sent: { kind: FeedbackKind };
}

export function track<E extends keyof AnalyticsEvents>(event: E, properties: AnalyticsEvents[E]) {
  try {
    vercelTrack(event, properties);
  } catch {
    // 기록이 실패해도 기능에는 영향이 없어야 한다.
  }
}
