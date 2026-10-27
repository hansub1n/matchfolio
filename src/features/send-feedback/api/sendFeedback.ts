import { getBrowserSupabase } from "@/shared/api/supabase";
import type { FeedbackKind } from "@/shared/lib/analytics";

export interface FeedbackInput {
  kind: FeedbackKind;
  message: string;
  contact: string | null;
  page: string;
}

export const FEEDBACK_LIMIT_MESSAGE = "오늘은 의견을 충분히 보내주셨어요. 내일 다시 보낼 수 있어요";

// 의견 한 건 넣기 — 넣기만 하고 돌려받지 않는다(읽기 권한이 없어서 결과를 다시 읽으면 실패한다).
// 하루 10건 제한은 DB 트리거가 막는다(019).
export async function sendFeedback(input: FeedbackInput): Promise<void> {
  const { error } = await getBrowserSupabase()
    .from("feedback")
    .insert({
      kind: input.kind,
      message: input.message,
      contact: input.contact,
      page: input.page.slice(0, 200),
      user_agent: navigator.userAgent.slice(0, 500),
    });
  if (!error) return;
  if (error.message.includes("feedback_daily_limit")) throw new Error(FEEDBACK_LIMIT_MESSAGE);
  console.error("의견 보내기 실패:", error.message);
  throw new Error("보내지 못했어요. 잠시 후 다시 시도해주세요");
}
