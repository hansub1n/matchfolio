import "server-only";

import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/shared/api/supabase-admin";
import { AI_DAILY_LIMITS, AI_LIMIT_EXCEEDED_MESSAGE, type AiUsageKind } from "@/shared/config/ai-limits";
import { todayKST } from "@/shared/lib/kst-date";

export interface AiQuotaTicket {
  // AI 호출이 실패했을 때 차감한 1회를 돌려준다. 차감한 날짜 기준이라 자정을 넘겨도 맞다.
  refund: () => Promise<void>;
}

// 사용량 쓰기는 service role로만 한다(013_ai_usage.sql — 사용자에게 쓰기 권한이 없음).
// 한도가 남았으면 1회 차감하고 티켓을, 이미 다 썼으면 null을 돌려준다.
export async function consumeAiQuota(userId: string, kind: AiUsageKind): Promise<AiQuotaTicket | null> {
  const date = todayKST();
  const { data, error } = await supabaseAdmin.rpc("consume_ai_usage", {
    p_user_id: userId,
    p_kind: kind,
    p_date: date,
    p_limit: AI_DAILY_LIMITS[kind],
  });
  if (error) throw error;
  if (data !== true) return null;

  return {
    refund: async () => {
      const { error: refundError } = await supabaseAdmin.rpc("refund_ai_usage", {
        p_user_id: userId,
        p_kind: kind,
        p_date: date,
      });
      if (refundError) console.warn("AI 사용량 환불 실패:", refundError.message);
    },
  };
}

export function quotaExceededResponse() {
  return NextResponse.json({ error: AI_LIMIT_EXCEEDED_MESSAGE }, { status: 429 });
}
