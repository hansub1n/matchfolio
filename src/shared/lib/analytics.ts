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
// 링크로 넣기 — 사이트별로 얼마나 읽히고 왜 실패하는지 본다(features/extract-from-url의 사이트·이유와 같은 값).
export type LinkSite = "wanted" | "remember" | "jumpit" | "saramin" | "jobkorea" | "rocketpunch" | "programmers" | "unknown";
export type LinkMethod = "url-jsonld" | "url-text" | "url-image";
export type LinkFailReason =
  | "invalid"
  | "unsupported"
  | "not_posting"
  | "duplicate"
  | "quota"
  | "blocked"
  | "not_found"
  | "timeout"
  | "too_large"
  | "redirect_blocked"
  | "private_ip"
  | "network"
  | "no_content"
  | "ai_failed";

export interface AnalyticsEvents {
  card_created: { method: "screenshot" | "url" | "manual"; stage: CardStage };
  extract_failed: { reason: ExtractFailReason };
  // 추출 뒤 저장 전에 사용자가 고친 칸 수 — 추출 정확도를 본다.
  extract_edited: { fields_changed: number };
  card_moved: { from: BoardColumn; to: BoardColumn };
  ai_used: { feature: AiFeature };
  tutorial: { action: "completed" | "skipped"; chapter: TutorialChapterId };
  feedback_sent: { kind: FeedbackKind };
  link_read: { site: LinkSite; method: LinkMethod };
  link_failed: { site: LinkSite; reason: LinkFailReason };
}

export function track<E extends keyof AnalyticsEvents>(event: E, properties: AnalyticsEvents[E]) {
  try {
    vercelTrack(event, properties);
  } catch {
    // 기록이 실패해도 기능에는 영향이 없어야 한다.
  }
}
